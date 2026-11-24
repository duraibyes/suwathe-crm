"use client";

import { useRef, useState } from "react";

// Photos for a blog post: upload many at once (drag & drop or pick), reorder,
// describe, set one as the cover, or drop one into the text.
// Uploaded photos live in the CRM (blog_media) at /api/public/media/<id>.

export type Photo = { id: number; alt: string; caption: string };
export const photoUrl = (id: number) => `/api/public/media/${id}`;

const MAX_SIDE = 1600;

/** Shrinks a photo in the browser (max 1600 px) and re-encodes it, so uploads stay small. */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.type === "image/gif") {
    // keep animations as they are
    const bmp = await createImageBitmap(file);
    return { blob: file, width: bmp.width, height: bmp.height };
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale), height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, width, height);
  const as = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await as("image/webp", 0.82);
  // Older Safari can't write WebP and quietly gives PNG: use JPEG then.
  if (!blob || blob.type !== "image/webp") blob = await as("image/jpeg", 0.85);
  if (!blob || blob.size > file.size) blob = file; // already small: keep the original
  return { blob, width, height };
}

/** Uploads one photo. Returns its id. */
export async function uploadPhoto(file: File): Promise<number> {
  const { blob, width, height } = await shrink(file);
  const fd = new FormData();
  fd.append("file", blob, file.name.replace(/\.[^.]+$/, "") + (blob.type === "image/webp" ? ".webp" : blob.type === "image/jpeg" ? ".jpg" : ""));
  fd.append("width", String(width));
  fd.append("height", String(height));
  fd.append("name", file.name);
  const res = await fetch("/api/media", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.id as number;
}

const niceName = (n: string) => n.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

export default function BlogPhotos({
  photos, setPhotos, coverUrl, onCover, onInsert, layout,
}: {
  photos: Photo[]; setPhotos: (fn: (p: Photo[]) => Photo[]) => void; coverUrl: string;
  onCover: (url: string, alt: string) => void; onInsert: (markdown: string) => void; layout: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);

  async function add(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setErr("");
    setBusy({ done: 0, total: list.length });
    const failed: string[] = [];
    for (const [i, f] of list.entries()) {
      try {
        const id = await uploadPhoto(f);
        setPhotos((p) => [...p, { id, alt: niceName(f.name), caption: "" }]);
      } catch (e) {
        failed.push(`${f.name}: ${(e as Error).message}`);
      }
      setBusy({ done: i + 1, total: list.length });
    }
    setBusy(null);
    if (failed.length) setErr(failed.join(" · "));
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setPhotos((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const edit = (i: number, k: "alt" | "caption", v: string) => setPhotos((p) => p.map((x, n) => (n === i ? { ...x, [k]: v } : x)));

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Photos</h2>
          <p className="text-xs text-muted">
            {layout === "showcase"
              ? "Zig-zag design: photo 1 sits beside the first ## section, photo 2 beside the second, and so on. Use the arrows to change the order."
              : "Shown as a photo gallery at the end of the post. Choose the Zig-zag design to place them beside each section."}
          </p>
        </div>
        <span className="text-xs font-semibold text-muted">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${over ? "border-brand bg-brand-soft" : "border-line bg-paper"}`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>
        <p className="font-semibold">Drop photos here, or</p>
        <button type="button" onClick={() => input.current?.click()} disabled={!!busy} className="btn">
          {busy ? `Uploading ${busy.done + 1 > busy.total ? busy.total : busy.done + 1} of ${busy.total}…` : "Choose photos"}
        </button>
        <p className="text-xs text-muted">You can pick many at once. JPG, PNG or WebP; big photos are made smaller automatically.</p>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      {busy && <div className="h-2 overflow-hidden rounded-full bg-paper"><div className="h-full bg-brand transition-all" style={{ width: `${(busy.done / busy.total) * 100}%` }} /></div>}
      {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Some photos didn&apos;t upload: {err}</p>}

      {photos.length > 0 && (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((ph, i) => {
            const url = photoUrl(ph.id);
            const isCover = coverUrl === url;
            return (
              <li key={ph.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-[4/3] w-full bg-paper object-contain" />
                  <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-xs font-bold text-white">{i + 1}</span>
                  {isCover && <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">Cover</span>}
                </div>
                <div className="space-y-2 p-3">
                  <input value={ph.alt} onChange={(e) => edit(i, "alt", e.target.value)} maxLength={200} className="field !py-1.5 text-sm" placeholder="Describe the photo (for Google)" aria-label={`Photo ${i + 1} description`} />
                  <input value={ph.caption} onChange={(e) => edit(i, "caption", e.target.value)} maxLength={300} className="field !py-1.5 text-sm" placeholder="Caption under the photo (optional)" aria-label={`Photo ${i + 1} caption`} />
                  <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg px-2 py-1 ring-1 ring-line disabled:opacity-30" aria-label="Move earlier">←</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="rounded-lg px-2 py-1 ring-1 ring-line disabled:opacity-30" aria-label="Move later">→</button>
                    <button type="button" onClick={() => onCover(isCover ? "" : url, isCover ? "" : ph.alt)} className="rounded-lg px-2 py-1 text-brand ring-1 ring-line">{isCover ? "Remove cover" : "Set as cover"}</button>
                    <button type="button" onClick={() => onInsert(`![${ph.alt.replace(/[\[\]]/g, "")}](${url})`)} className="rounded-lg px-2 py-1 ring-1 ring-line">Put in text</button>
                    <button type="button" onClick={() => { if (confirm("Remove this photo from the post?")) setPhotos((p) => p.filter((x) => x.id !== ph.id)); }} className="ml-auto rounded-lg px-2 py-1 text-rose-700">Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
