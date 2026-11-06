import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LAYOUTS, getPosts } from "@/lib/website";
import { Empty, PageTitle } from "@/components/ui";
import { Flash, WebsiteTabs } from "@/components/WebsiteUI";
import { longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function BlogList({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const posts = await getPosts();
  return (
    <div className="space-y-5">
      <PageTitle title="Blog" sub="Posts for the website's Blog section" action={<Link href="/website/blog/new" className="btn">+ New post</Link>} />
      <WebsiteTabs active="blog" />
      <Flash saved={saved} error={error} />
      {posts.length === 0 ? (
        <Empty href="/website/blog/new" cta="Write the first post">No posts yet. Posts help people find you on Google.</Empty>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/website/blog/${p.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-paper">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.title}</span>
                  <span className="block truncate text-sm text-muted">/blog/{p.slug}/ · {LAYOUTS.find((l) => l.id === p.layout)?.en}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {p.status === "published" ? `Published ${p.published_on ? longDate(p.published_on) : ""}` : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
