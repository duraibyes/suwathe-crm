import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { mediaUrl } from "@/lib/website";

// Admin-only photo upload for blog posts. The editor shrinks each photo in the
// browser first (max 1600 px, WebP/JPEG), so one request carries one small file.
const TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif", "image/avif"];
const MAX = 4 * 1024 * 1024; // Vercel allows ~4.5 MB per request

// Check the file really is the image type it claims (first bytes).
function sniff(b: Uint8Array): string | null {
  const s = (i: number, t: string) => [...t].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && s(1, "PNG")) return "image/png";
  if (s(0, "GIF8")) return "image/gif";
  if (s(0, "RIFF") && s(8, "WEBP")) return "image/webp";
  if (s(4, "ftypavif")) return "image/avif";
  return null;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "No photo received." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No photo received." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "That photo is too big (max 4 MB)." }, { status: 413 });
  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(data);
  if (!mime || !TYPES.includes(mime)) return Response.json({ error: "Only JPG, PNG, WebP, GIF or AVIF photos." }, { status: 415 });
  const dim = (k: string) => { const v = Number(form.get(k)); return Number.isInteger(v) && v > 0 && v < 20000 ? v : null; };
  const name = String(form.get("name") ?? file.name ?? "").slice(0, 120) || null;
  const row = await one<{ id: number }>(
    "INSERT INTO blog_media (data, mime, width, height, bytes, name, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [Buffer.from(data), mime, dim("width"), dim("height"), data.length, name, user.id],
  );
  return Response.json({ id: row!.id, url: mediaUrl(row!.id) });
}
