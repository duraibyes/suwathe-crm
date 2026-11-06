"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import { deletePost, savePost } from "@/app/website-actions";

type Post = {
  id: number; slug: string; title: string; excerpt: string; cover_url: string | null; cover_alt: string | null;
  layout: string; body: string; tags: string; status: string; published_on: string | null;
  seo_title: string | null; seo_description: string | null; author: string;
};
type Layout = { id: string; en: string; desc: string };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

// Tiny pictures of the three layouts, so the choice is visual.
function LayoutThumb({ id }: { id: string }) {
  const b = "#c9d6ea", d = "#0a66d8";
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full rounded-lg bg-white" aria-hidden="true">
      {id === "classic" && (<>
        <rect x="30" y="6" width="60" height="22" rx="3" fill={b} />
        <rect x="30" y="33" width="50" height="5" rx="2" fill={d} />
        {[43, 50, 57, 64, 71].map((y) => <rect key={y} x="30" y={y} width={y % 2 ? 60 : 54} height="3" rx="1.5" fill={b} />)}
      </>)}
      {id === "magazine" && (<>
        <rect x="0" y="0" width="120" height="34" fill={b} />
        <rect x="8" y="22" width="56" height="6" rx="2" fill="#fff" />
        {[42, 49, 56, 63, 70].map((y) => <rect key={y} x="8" y={y} width="66" height="3" rx="1.5" fill={b} />)}
        <rect x="82" y="40" width="30" height="34" rx="4" fill={d} opacity="0.85" />
      </>)}
      {id === "guide" && (<>
        <rect x="8" y="8" width="26" height="40" rx="3" fill={b} opacity="0.7" />
        {[14, 22, 30, 38].map((y) => <rect key={y} x="12" y={y} width="18" height="3" rx="1.5" fill={d} />)}
        {[10, 34, 58].map((y, i) => (<g key={y}><circle cx="46" cy={y + 3} r="5" fill={d} /><text x="46" y={y + 5.5} fontSize="7" textAnchor="middle" fill="#fff">{i + 1}</text><rect x="56" y={y} width="56" height="4" rx="2" fill={b} /><rect x="56" y={y + 8} width="48" height="3" rx="1.5" fill={b} /></g>))}
      </>)}
    </svg>
  );
}

export default function BlogEditor({ post, layouts, saved, error }: { post?: Post; layouts: readonly Layout[]; saved?: string; error?: string }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [layout, setLayout] = useState(post?.layout ?? "classic");
  const [body, setBody] = useState(post?.body ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const html = useMemo(() => (tab === "preview" ? (marked.parse(body || "_Nothing written yet._", { async: false }) as string) : ""), [tab, body]);
  const shownSlug = slugTouched ? slug : slugify(title);
  const published = post?.status === "published";

  return (
    <form action={savePost} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">{error}</p>}
      {saved && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">✓ {saved}</p>}

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} className="field text-lg font-bold" placeholder="How much does a clinic website cost in Chennai?" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Web address</label>
          <div className="flex items-center gap-1 rounded-xl bg-paper px-3 text-sm text-muted ring-1 ring-line">
            <span className="shrink-0">suwathetechsolutions.com/blog/</span>
            <input id="slug" name="slug" value={shownSlug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} className="min-w-0 flex-1 bg-transparent py-2.5 font-semibold text-ink outline-none" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="excerpt">Short summary (shown on the blog list and Google)</label>
          <textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt} maxLength={400} rows={2} className="field" />
        </div>
      </section>

      <section className="card p-5">
        <fieldset>
          <legend className="text-lg font-extrabold">Design</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {layouts.map((l) => (
              <label key={l.id} className={`cursor-pointer rounded-2xl p-3 ring-2 transition ${layout === l.id ? "bg-brand-soft ring-brand" : "bg-paper ring-transparent hover:ring-line"}`}>
                <input type="radio" name="layout" value={l.id} checked={layout === l.id} onChange={() => setLayout(l.id)} className="sr-only" />
                <LayoutThumb id={l.id} />
                <span className="mt-2 block font-bold">{l.en}</span>
                <span className="block text-xs text-muted">{l.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cover_url">Cover photo link (https://…)</label>
            <input id="cover_url" name="cover_url" type="url" defaultValue={post?.cover_url ?? ""} className="field" placeholder="https://images.unsplash.com/…" />
          </div>
          <div>
            <label className="label" htmlFor="cover_alt">Describe the photo</label>
            <input id="cover_alt" name="cover_alt" defaultValue={post?.cover_alt ?? ""} className="field" placeholder="Doctor talking to a patient" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="label !mb-0">Post</span>
            <div className="flex rounded-full bg-paper p-1 text-sm font-semibold ring-1 ring-line" role="tablist">
              {(["write", "preview"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 ${tab === t ? "bg-white shadow" : "text-muted"}`}>
                  {t === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
          </div>
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} hidden={tab !== "write"} className="field font-mono text-sm leading-relaxed"
            placeholder={"## A heading\n\nA paragraph. **Bold**, *italic*, [a link](https://…).\n\n- a list item\n- another\n\n![photo description](https://…)"} />
          {tab === "preview" && <div className="blog-preview min-h-64 rounded-xl bg-white p-5 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: html }} />}
          <p className="mt-2 text-xs text-muted">
            Use <code>## Heading</code> for sections (the Step-by-step design numbers them), <code>**bold**</code>, <code>- list</code>, <code>[text](link)</code>, <code>![photo](link)</code>.
          </p>
        </div>
      </section>

      <details className="card p-5">
        <summary className="cursor-pointer font-extrabold">Google & details</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="seo_title">Google title (optional)</label><input id="seo_title" name="seo_title" defaultValue={post?.seo_title ?? ""} maxLength={120} className="field" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="seo_description">Google description (optional)</label><textarea id="seo_description" name="seo_description" defaultValue={post?.seo_description ?? ""} maxLength={300} rows={2} className="field" /></div>
          <div><label className="label" htmlFor="tags">Tags (comma separated)</label><input id="tags" name="tags" defaultValue={post?.tags ?? ""} className="field" placeholder="clinic, SEO" /></div>
          <div><label className="label" htmlFor="author">Author</label><input id="author" name="author" defaultValue={post?.author ?? "Durairaj S"} className="field" /></div>
          <div><label className="label" htmlFor="published_on">Publish date</label><input id="published_on" name="published_on" type="date" defaultValue={post?.published_on ?? ""} className="field" /></div>
        </div>
      </details>

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-line backdrop-blur md:bottom-4">
        {published ? (
          <>
            <button name="intent" value="save" className="btn">Save changes</button>
            <button name="intent" value="draft" className="btn-ghost">Unpublish</button>
          </>
        ) : (
          <>
            <button name="intent" value="publish" className="btn">Publish</button>
            <button name="intent" value="save" className="btn-ghost">Save draft</button>
          </>
        )}
        {post && (
          <button formAction={deletePost} formNoValidate onClick={(e) => { if (!confirm("Delete this post?")) e.preventDefault(); }} className="ml-auto text-sm font-semibold text-rose-700 underline">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
