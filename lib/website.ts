import "server-only";
import { query } from "./db";

// Website content (suwathetechsolutions.com) kept in the CRM database.
// The site reads it through /api/public/site-content.

export const PACKAGE_IDS = ["starter", "business", "ecom", "software"] as const;
export const FESTIVALS = [
  { id: "diwali", en: "Diwali" },
  { id: "christmas", en: "Christmas" },
  { id: "newyear", en: "New Year" },
  { id: "pongal", en: "Pongal" },
] as const;
export const LAYOUTS = [
  { id: "classic", en: "Classic", desc: "Clean reading column with the cover photo on top. Best for most posts." },
  { id: "magazine", en: "Magazine", desc: "Big photo with the title over it, and a side panel with a call to action." },
  { id: "guide", en: "Step-by-step guide", desc: "Numbered sections with a table of contents. Best for how-to posts." },
] as const;

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
};

export const getPackages = () => query<SitePackage>("SELECT * FROM site_packages ORDER BY sort, id");
export const getOffers = () => query<SiteOffer>("SELECT * FROM site_offers ORDER BY starts_on");
export const getPosts = () => query<BlogPost>("SELECT * FROM blog_posts ORDER BY (status = 'draft') DESC, published_on DESC NULLS FIRST, updated_at DESC");

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

/** What the public website receives. Only published posts; no internal ids or users. */
export async function publicContent() {
  const [packages, offers, posts] = await Promise.all([
    getPackages(),
    getOffers(),
    query<BlogPost>("SELECT * FROM blog_posts WHERE status = 'published' AND published_on <= (now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY published_on DESC, id DESC"),
  ]);
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
      slug: p.slug, title: p.title, excerpt: p.excerpt, cover: p.cover_url ? { src: p.cover_url, alt: p.cover_alt ?? "" } : null,
      layout: p.layout, body: p.body, tags: lines(p.tags.replace(/,/g, "\n")), publishedOn: p.published_on,
      updatedOn: p.updated_at.toISOString().slice(0, 10), seoTitle: p.seo_title, seoDescription: p.seo_description, author: p.author,
    })),
  };
}
export type PublicContent = Awaited<ReturnType<typeof publicContent>>;
