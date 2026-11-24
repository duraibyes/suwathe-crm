import { publicContent } from "@/lib/website";

// Public, read-only content for suwathetechsolutions.com (packages, offers,
// published blog posts). Nothing private is included.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const body = await publicContent(new URL(request.url).origin);
  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
