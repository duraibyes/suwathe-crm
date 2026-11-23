import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LAYOUTS, getPosts, isScheduled, istDateTime } from "@/lib/website";
import { scheduleDrafts } from "@/app/website-actions";
import { Empty, PageTitle } from "@/components/ui";
import { Flash, WebsiteTabs } from "@/components/WebsiteUI";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function BlogList({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const posts = await getPosts();
  const drafts = posts.filter((p) => p.status === "draft");
  const upcoming = posts.filter(isScheduled);
  return (
    <div className="space-y-5">
      <PageTitle title="Blog" sub="Posts for the website's Blog section" action={<Link href="/website/blog/new" className="btn">+ New post</Link>} />
      <WebsiteTabs active="blog" />
      <Flash saved={saved} error={error} />
      {upcoming.length > 0 && (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
          {upcoming.length} post{upcoming.length > 1 ? "s" : ""} scheduled. Next: {istDateTime(upcoming[0].publish_at!)}. They go on the website by themselves; nothing to press.
        </p>
      )}
      {drafts.length > 0 && (
        <form action={scheduleDrafts} className="card space-y-3 p-5">
          <h2 className="text-lg font-extrabold">Schedule drafts automatically</h2>
          <p className="text-sm text-muted">Tick the drafts to schedule (none ticked = all {drafts.length}). They go out in this order, one per time slot.</p>
          <ul className="space-y-1">
            {drafts.map((d) => (
              <li key={d.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="post" value={d.id} /> {d.title}</label></li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <div><label className="label" htmlFor="start">Start on</label><input id="start" name="start" type="date" defaultValue={todayISO()} required className="field" /></div>
            <div><label className="label" htmlFor="times">Times each day (India) – 3 times = 3 posts a day</label><input id="times" name="times" defaultValue="09:00, 13:00, 18:00" required className="field" /></div>
            <button className="btn">Schedule</button>
          </div>
        </form>
      )}
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
                {isScheduled(p) ? (
                  <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">Scheduled {istDateTime(p.publish_at!)}</span>
                ) : (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {p.status === "published" ? `Live${p.publish_at ? ` since ${istDateTime(p.publish_at)}` : ""}` : "Draft"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
