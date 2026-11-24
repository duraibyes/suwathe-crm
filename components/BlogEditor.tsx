"use client";

import { useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { deletePost, savePost } from "@/app/website-actions";
import BlogPhotos, { uploadPhoto, photoUrl, type Photo } from "@/components/BlogPhotos";

type Post = {
  id: number; slug: string; title: string; excerpt: string; cover_url: string | null; cover_alt: string | null;
  layout: string; body: string; tags: string; status: string; published_on: string | null;
  seo_title: string | null; seo_description: string | null; author: string; images?: Photo[];
};
// When the post goes live: "YYYY-MM-DDTHH:mm" in India time (or ""), and a friendly label.
type When = { local: string; label: string | null; scheduled: boolean };
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
      {id === "showcase" && (<>
        {[0, 1, 2].map((r) => {
          const y = 6 + r * 25, left = r % 2 === 0;
          return (<g key={r}>
            <rect x={left ? 8 : 66} y={y} width="46" height="20" rx="3" fill={b} />
            <rect x={left ? 60 : 8} y={y + 3} width="40" height="4" rx="2" fill={d} />
            <rect x={left ? 60 : 8} y={y + 10} width="52" height="3" rx="1.5" fill={b} />
            <rect x={left ? 60 : 8} y={y + 15} width="44" height="3" rx="1.5" fill={b} />
          </g>);
        })}
      </>)}
      {id === "guide" && (<>
        <rect x="8" y="8" width="26" height="40" rx="3" fill={b} opacity="0.7" />
        {[14, 22, 30, 38].map((y) => <rect key={y} x="12" y={y} width="18" height="3" rx="1.5" fill={d} />)}
        {[10, 34, 58].map((y, i) => (<g key={y}><circle cx="46" cy={y + 3} r="5" fill={d} /><text x="46" y={y + 5.5} fontSize="7" textAnchor="middle" fill="#fff">{i + 1}</text><rect x="56" y={y} width="56" height="4" rx="2" fill={b} /><rect x="56" y={y + 8} width="48" height="3" rx="1.5" fill={b} /></g>))}
      </>)}
    </svg>
  );
}

// Is "YYYY-MM-DDTHH:mm" (India time) still in the future?
const isLater = (v: string) => !!v && Date.parse(`${v}:00+05:30`) > Date.now();

export default function BlogEditor({ post, when, layouts, saved, error }: { post?: Post; when?: When; layouts: readonly Layout[]; saved?: string; error?: string }) {
  const [at, setAt] = useState(when?.local ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [layout, setLayout] = useState(post?.layout ?? "classic");
  const [body, setBody] = useState(post?.body ?? "");
  const [photos, setPhotos] = useState<Photo[]>(post?.images ?? []);
  const [cover, setCover] = useState(post?.cover_url ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.cover_alt ?? "");
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Put markdown (e.g. a photo) where the cursor is in the post text.
  const insert = (md: string) => {
    const el = bodyRef.current;
    setTab("write");
    const at = el ? el.selectionEnd : body.length;
    const next = `${body.slice(0, at)}\n\n${md}\n\n${body.slice(at)}`.replace(/\n{3,}/g, "\n\n");
    setBody(next);
    requestAnimationFrame(() => { el?.focus(); const pos = next.indexOf(md) + md.length; el?.setSelectionRange(pos, pos); });
  };
  async function uploadCover(f?: File) {
    if (!f) return;
    setCoverErr(""); setCoverBusy(true);
    try {
      const id = await uploadPhoto(f);
      setCover(photoUrl(id));
      if (!coverAlt) setCoverAlt(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    } catch (e) { setCoverErr((e as Error).message); }
    setCoverBusy(false);
  }
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
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper ring-1 ring-line sm:aspect-square">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : <span className="grid h-full place-items-center text-xs text-muted">No cover yet</span>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="cover_url">Cover photo</label>
              <div className="flex flex-wrap gap-2">
                <label className={`btn cursor-pointer ${coverBusy ? "opacity-60" : ""}`}>
                  {coverBusy ? "Uploading…" : "Upload cover"}
                  <input type="file" accept="image/*" hidden disabled={coverBusy} onChange={(e) => { uploadCover(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {cover && <button type="button" onClick={() => setCover("")} className="btn-ghost">Remove</button>}
              </div>
              <input id="cover_url" name="cover_url" type="text" inputMode="url" value={cover} onChange={(e) => setCover(e.target.value.trim())} className="field mt-2 text-sm" placeholder="…or paste a photo link (https://…)" />
              {coverErr && <p role="alert" className="mt-1 text-sm font-semibold text-rose-700">{coverErr}</p>}
            </div>
            <div>
              <label className="label" htmlFor="cover_alt">Describe the photo</label>
              <input id="cover_alt" name="cover_alt" value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} maxLength={200} className="field" placeholder="Doctor talking to a patient" />
            </div>
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
          <textarea ref={bodyRef} name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} hidden={tab !== "write"} className="field font-mono text-sm leading-relaxed"
            placeholder={"## A heading\n\nA paragraph. **Bold**, *italic*, [a link](https://…).\n\n- a list item\n- another\n\n![photo description](https://…)"} />
          {tab === "preview" && layout === "showcase" && photos.length > 0 && (
            <p className="mb-2 rounded-xl bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">On the website, photo 1 sits beside the first ## section, photo 2 beside the second, and so on, swapping sides.</p>
          )}
          {tab === "preview" && <div className="blog-preview min-h-64 rounded-xl bg-white p-5 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: html }} />}
          <p className="mt-2 text-xs text-muted">
            Use <code>## Heading</code> for sections (the Step-by-step design numbers them), <code>**bold**</code>, <code>- list</code>, <code>[text](link)</code>, <code>![photo](link)</code>.
          </p>
        </div>
      </section>

      <input type="hidden" name="images" value={JSON.stringify(photos)} />
      <BlogPhotos photos={photos} setPhotos={setPhotos} coverUrl={cover} layout={layout} onInsert={insert}
        onCover={(url, alt) => { setCover(url); if (url) setCoverAlt(alt); }} />

      <details className="card p-5">
        <summary className="cursor-pointer font-extrabold">Google & details</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="seo_title">Google title (optional)</label><input id="seo_title" name="seo_title" defaultValue={post?.seo_title ?? ""} maxLength={120} className="field" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="seo_description">Google description (optional)</label><textarea id="seo_description" name="seo_description" defaultValue={post?.seo_description ?? ""} maxLength={300} rows={2} className="field" /></div>
          <div><label className="label" htmlFor="tags">Tags (comma separated)</label><input id="tags" name="tags" defaultValue={post?.tags ?? ""} className="field" placeholder="clinic, SEO" /></div>
          <div><label className="label" htmlFor="author">Author</label><input id="author" name="author" defaultValue={post?.author ?? "Durairaj S"} className="field" /></div>
        </div>
      </details>

      <section className="card space-y-2 p-5">
        <label className="label" htmlFor="publish_at">Go live on (date & time, India)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="publish_at" name="publish_at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="field max-w-xs" />
          {at && <button type="button" onClick={() => setAt("")} className="text-sm font-semibold text-muted underline">Clear</button>}
        </div>
        <p className="text-xs text-muted">
          {published && when?.scheduled
            ? `Scheduled: goes on the website by itself on ${when.label}.`
            : published
              ? `Live on the website${when?.label ? ` since ${when.label}` : ""}.`
              : "Leave empty to publish straight away, or pick a later time to schedule it."}
        </p>
      </section>

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-line backdrop-blur md:bottom-4">
        {published ? (
          <>
            <button name="intent" value="save" className="btn">Save changes</button>
            <button name="intent" value="draft" className="btn-ghost">{when?.scheduled ? "Cancel schedule (back to draft)" : "Unpublish"}</button>
          </>
        ) : (
          <>
            <button name="intent" value="publish" className="btn">{isLater(at) ? "Schedule" : "Publish now"}</button>
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
