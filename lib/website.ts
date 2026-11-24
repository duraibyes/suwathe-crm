import "server-only";
import { query } from "./db";

// Website content (suwathetechsolutions.com) kept in the CRM database.
// The site reads it through /api/public/site-content.

export const PACKAGE_IDS = ["starter", "business", "ecom", "software"] as const;
export const FESTIVALS = [
  { id: "diwali", en: "Diwali", scene: "Crackers: bomb, flower pot, rocket, chakkaram" },
  { id: "karthigai", en: "Karthigai Deepam", scene: "She lights a tray of agal vilakku and a row of lamps; Maha Deepam on the hill" },
  { id: "christmas", en: "Christmas", scene: "Santa dress, she cuts a cake, snow" },
  { id: "newyear", en: "New Year", scene: "Party dress, party popper, confetti" },
  { id: "pongal", en: "Pongal", scene: "Decorations and greeting only (scene not made yet)" },
] as const;
export const LAYOUTS = [
  { id: "classic", en: "Classic", desc: "Clean reading column with the cover photo on top. Best for most posts." },
  { id: "magazine", en: "Magazine", desc: "Big photo with the title over it, and a side panel with a call to action." },
  { id: "guide", en: "Step-by-step guide", desc: "Numbered sections with a table of contents. Best for how-to posts." },
  { id: "showcase", en: "Zig-zag showcase", desc: "Photos and text side by side, swapping sides each section. Best for posts with several photos." },
] as const;

/** A photo attached to a post (stored in blog_media). */
export type PostImage = { id: number; alt: string; caption: string };
export const MEDIA_PATH = "/api/public/media/";
export const mediaUrl = (id: number) => `${MEDIA_PATH}${id}`;

export type SitePackage = {
  id: string; name: string; name_ta: string; price: number; starting_at: boolean; for_text: string;
  includes: string; days: string; popular: boolean; sort: number; updated_at: Date;
};
export type SiteOffer = {
  id: number; festival: string; name: string; name_ta: string; greeting: string; greeting_ta: string;
  starts_on: string; ends_on: string; pct_starter: number; pct_business: number; pct_ecom: number;
  pct_software: number; pct_school: number; active: boolean; updated_at: Date;
};
export type BlogPost = {
  id: number; slug: string; title: string; excerpt: string; cover_url: string | null; cover_alt: string | null;
  layout: string; body: string; tags: string; status: string; published_on: string | null;
  seo_title: string | null; seo_description: string | null; author: string; updated_at: Date;
  publish_at: Date | null; images: PostImage[];
};

export const getPackages = () => query<SitePackage>("SELECT * FROM site_packages ORDER BY sort, id");
export const getOffers = () => query<SiteOffer>("SELECT * FROM site_offers ORDER BY starts_on");
// Drafts first, then scheduled posts (soonest first), then live posts (newest first).
export const getPosts = () =>
  query<BlogPost>(
    `SELECT * FROM blog_posts
      ORDER BY (status = 'draft') DESC, (status = 'published' AND publish_at > now()) DESC,
               CASE WHEN publish_at > now() THEN publish_at END ASC NULLS LAST,
               publish_at DESC NULLS FIRST, id ASC`,
  );

/** A post is "scheduled" when it is set to go live at a time that hasn't come yet. */
export const isScheduled = (p: Pick<BlogPost, "status" | "publish_at">) =>
  p.status === "published" && !!p.publish_at && p.publish_at.getTime() > Date.now();

/** Date + time in India, e.g. "24 Nov, 9:00 am". */
export const istDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(d);

/** "YYYY-MM-DDTHH:mm" in India time, for <input type="datetime-local">. */
export const istLocalInput = (d: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
};

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

/** What the public website receives. Only published posts; no internal ids or users.
 *  `origin` is this CRM's address, so photo links work from the website. */
export async function publicContent(origin: string) {
  const [packages, offers, posts] = await Promise.all([
    getPackages(),
    getOffers(),
    // Scheduled posts stay hidden until their date and time (India) has passed.
    query<BlogPost>(
      `SELECT * FROM blog_posts
        WHERE status = 'published'
          AND coalesce(publish_at, (published_on + time '09:00') AT TIME ZONE 'Asia/Kolkata') <= now()
        ORDER BY coalesce(publish_at, published_on::timestamptz) DESC, id DESC`,
    ),
  ]);
  // Photo sizes, so the website can reserve space before they load.
  const ids = posts.flatMap((p) => (p.images ?? []).map((i) => i.id));
  const sizes = new Map(
    ids.length
      ? (await query<{ id: number; width: number | null; height: number | null }>("SELECT id, width, height FROM blog_media WHERE id = ANY($1::int[])", [ids])).map((m) => [m.id, m])
      : [],
  );
  // Uploaded photos are saved as "/api/public/media/12"; the website needs the full address.
  const abs = (u: string) => (u.startsWith(MEDIA_PATH) ? `${origin}${u}` : u);
  const absBody = (b: string) => b.replaceAll(`](${MEDIA_PATH}`, `](${origin}${MEDIA_PATH}`);
  return {
    version: 1,
    packages: packages.map((p) => ({
      id: p.id, name: p.name, ta: p.name_ta, price: p.price, startingAt: p.starting_at, for: p.for_text,
      includes: lines(p.includes), days: p.days, popular: p.popular,
    })),
    offers: offers.filter((o) => o.active).map((o) => ({
      festival: o.festival, name: o.name, ta: o.name_ta, greeting: o.greeting, greetingTa: o.greeting_ta,
      startsAt: `${o.starts_on}T00:00:00+05:30`, endsAt: `${o.ends_on}T23:59:59+05:30`,
      percent: { starter: o.pct_starter, business: o.pct_business, ecom: o.pct_ecom, software: o.pct_software },
      schoolPercent: o.pct_school,
    })),
    posts: posts.map((p) => ({
      slug: p.slug, title: p.title, excerpt: p.excerpt, cover: p.cover_url ? { src: abs(p.cover_url), alt: p.cover_alt ?? "" } : null,
      layout: p.layout, body: absBody(p.body),
      images: (p.images ?? []).filter((i) => sizes.has(i.id)).map((i) => ({
        src: `${origin}${mediaUrl(i.id)}`, alt: i.alt, caption: i.caption,
        width: sizes.get(i.id)!.width, height: sizes.get(i.id)!.height,
      })), tags: lines(p.tags.replace(/,/g, "\n")), publishedOn: p.published_on,
      updatedOn: istLocalInput(p.publish_at && p.publish_at > p.updated_at ? p.publish_at : p.updated_at).slice(0, 10), seoTitle: p.seo_title, seoDescription: p.seo_description, author: p.author,
    })),
  };
}
export type PublicContent = Awaited<ReturnType<typeof publicContent>>;
