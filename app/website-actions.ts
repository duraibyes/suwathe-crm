"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { FESTIVALS, LAYOUTS, PACKAGE_IDS, slugify } from "@/lib/website";

// Every action here is admin-only and changes website content.
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").replace(/[^\d]/g, "");
  return v ? Math.min(parseInt(v, 10), 100_000_000) : null;
};
const pct = (f: FormData, k: string) => Math.max(0, Math.min(50, int(f, k) ?? 0));
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const done = (path: string, msg: string) => redirect(`${path}?saved=${encodeURIComponent(msg)}`);
const fail = (path: string, msg: string) => redirect(`${path}?error=${encodeURIComponent(msg)}`);

// ── packages ───────────────────────────────────────────
export async function savePackage(f: FormData) {
  const user = await requireAdmin();
  const id = str(f, "id");
  if (!(PACKAGE_IDS as readonly string[]).includes(id)) fail("/website/packages", "Unknown package");
  const name = str(f, "name", 80);
  const price = int(f, "price");
  if (!name || !price) fail("/website/packages", "Name and price are required");
  const popular = f.get("popular") === "on";
  if (popular) await query("UPDATE site_packages SET popular = FALSE WHERE id <> $1", [id]);
  await query(
    `UPDATE site_packages SET name = $2, name_ta = $3, price = $4, starting_at = $5, for_text = $6, includes = $7,
            days = $8, popular = $9, updated_at = now(), updated_by = $10 WHERE id = $1`,
    [id, name, str(f, "name_ta", 80), price, f.get("starting_at") === "on", str(f, "for_text", 300), str(f, "includes", 3000), str(f, "days", 60), popular, user.id],
  );
  revalidatePath("/website");
  done("/website/packages", `${name} saved`);
}

// ── offers ─────────────────────────────────────────────
export async function saveOffer(f: FormData) {
  const user = await requireAdmin();
  const id = int(f, "id");
  const festival = str(f, "festival");
  const starts = str(f, "starts_on");
  const ends = str(f, "ends_on");
  if (!FESTIVALS.some((x) => x.id === festival)) fail("/website/offers", "Choose a festival");
  if (!isDate(starts) || !isDate(ends) || ends < starts) fail("/website/offers", "Check the start and end dates");
  // windows must not overlap with another active offer
  const clash = await one<{ name: string }>(
    "SELECT name FROM site_offers WHERE active AND id <> coalesce($1, -1) AND starts_on <= $3 AND ends_on >= $2 LIMIT 1",
    [id, starts, ends],
  );
  if (clash && f.get("active") === "on") fail("/website/offers", `Dates overlap with “${clash.name}”`);
  const vals = [
    festival, str(f, "name", 80) || "Festival offer", str(f, "name_ta", 80), str(f, "greeting", 80) || "Season's greetings", str(f, "greeting_ta", 120),
    starts, ends, pct(f, "pct_starter"), pct(f, "pct_business"), pct(f, "pct_ecom"), pct(f, "pct_software"), pct(f, "pct_school"),
    f.get("active") === "on", user.id,
  ];
  if (id) {
    await query(
      `UPDATE site_offers SET festival=$2, name=$3, name_ta=$4, greeting=$5, greeting_ta=$6, starts_on=$7, ends_on=$8,
              pct_starter=$9, pct_business=$10, pct_ecom=$11, pct_software=$12, pct_school=$13, active=$14,
              updated_at=now(), updated_by=$15 WHERE id=$1`,
      [id, ...vals],
    );
  } else {
    await query(
      `INSERT INTO site_offers (festival, name, name_ta, greeting, greeting_ta, starts_on, ends_on, pct_starter, pct_business,
              pct_ecom, pct_software, pct_school, active, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      vals,
    );
  }
  revalidatePath("/website");
  done("/website/offers", "Offer saved");
}

export async function deleteOffer(f: FormData) {
  await requireAdmin();
  const id = int(f, "id");
  if (id) await query("DELETE FROM site_offers WHERE id = $1", [id]);
  done("/website/offers", "Offer deleted");
}

// ── blog ───────────────────────────────────────────────
export async function savePost(f: FormData) {
  const user = await requireAdmin();
  const id = int(f, "id");
  const back = id ? `/website/blog/${id}` : "/website/blog/new";
  const title = str(f, "title", 160);
  if (!title) fail(back, "Give the post a title");
  const slug = slugify(str(f, "slug", 100) || title);
  if (!slug) fail(back, "The web address needs letters or numbers");
  const layout = LAYOUTS.some((l) => l.id === str(f, "layout")) ? str(f, "layout") : "classic";
  const publish = str(f, "intent") === "publish" ? true : str(f, "intent") === "draft" ? false : null;
  const cover = str(f, "cover_url", 500);
  if (cover && !/^https:\/\//.test(cover)) fail(back, "The cover photo link must start with https://");
  const pubDate = str(f, "published_on");
  const taken = await one<{ id: number }>("SELECT id FROM blog_posts WHERE slug = $1 AND id <> coalesce($2, -1)", [slug, id]);
  if (taken) fail(back, "Another post already uses that web address");

  const vals = [
    slug, title, str(f, "excerpt", 400), cover || null, str(f, "cover_alt", 200) || null, layout, str(f, "body", 60000),
    str(f, "tags", 300), str(f, "seo_title", 120) || null, str(f, "seo_description", 300) || null, str(f, "author", 80) || "Durairaj S", user.id,
  ];
  let postId = id;
  if (id) {
    await query(
      `UPDATE blog_posts SET slug=$2, title=$3, excerpt=$4, cover_url=$5, cover_alt=$6, layout=$7, body=$8, tags=$9,
              seo_title=$10, seo_description=$11, author=$12, updated_by=$13, updated_at=now() WHERE id=$1`,
      [id, ...vals],
    );
  } else {
    const row = await one<{ id: number }>(
      `INSERT INTO blog_posts (slug, title, excerpt, cover_url, cover_alt, layout, body, tags, seo_title, seo_description, author, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      vals,
    );
    postId = row!.id;
  }
  if (publish === true) {
    await query(
      "UPDATE blog_posts SET status = 'published', published_on = coalesce($2::date, published_on, (now() AT TIME ZONE 'Asia/Kolkata')::date) WHERE id = $1",
      [postId, isDate(pubDate) ? pubDate : null],
    );
  } else if (publish === false) {
    await query("UPDATE blog_posts SET status = 'draft' WHERE id = $1", [postId]);
  } else if (isDate(pubDate)) {
    await query("UPDATE blog_posts SET published_on = $2 WHERE id = $1", [postId, pubDate]);
  }
  revalidatePath("/website");
  done(`/website/blog/${postId}`, publish === true ? "Published. It shows on the website after the next update." : publish === false ? "Moved back to draft" : "Saved");
}

export async function deletePost(f: FormData) {
  await requireAdmin();
  const id = int(f, "id");
  if (id) await query("DELETE FROM blog_posts WHERE id = $1", [id]);
  done("/website/blog", "Post deleted");
}

// ── publish: ask GitHub to pull the content into the website now ──
// Needs GITHUB_DISPATCH_TOKEN (fine-grained token, suwathe-website repo, "Contents: read and write").
// Without it, the website still picks up changes on its own within the hour.
export async function publishNow() {
  const user = await requireAdmin();
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.WEBSITE_REPO || "duraibyes/suwathe-website";
  if (!token) {
    await query("INSERT INTO site_publishes (user_id, ok, note) VALUES ($1, FALSE, 'no token')", [user.id]);
    fail("/website", "Publish-now is not set up yet (GITHUB_DISPATCH_TOKEN). The website will still update on its own within an hour.");
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "suwathe-crm" },
    body: JSON.stringify({ event_type: "content-updated" }),
  }).catch(() => null);
  const ok = !!res && res.status === 204;
  await query("INSERT INTO site_publishes (user_id, ok, note) VALUES ($1, $2, $3)", [user.id, ok, ok ? null : `GitHub ${res?.status ?? "unreachable"}`]);
  if (!ok) fail("/website", `Couldn't reach GitHub (${res?.status ?? "no response"}). The website will still update on its own within an hour.`);
  done("/website", "Sent. The website updates in about 2–3 minutes.");
}
