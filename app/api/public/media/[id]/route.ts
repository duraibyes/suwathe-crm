import { one } from "@/lib/db";

// Public blog photos uploaded in the CRM. A photo never changes once uploaded
// (a new upload gets a new id), so browsers and the CDN may keep it for a year.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/public/media/[id]">) {
  const { id } = await ctx.params;
  const n = /^\d{1,9}/.exec(id)?.[0];
  if (!n) return new Response("Not found", { status: 404 });
  const m = await one<{ data: Buffer; mime: string }>("SELECT data, mime FROM blog_media WHERE id = $1", [Number(n)]);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
