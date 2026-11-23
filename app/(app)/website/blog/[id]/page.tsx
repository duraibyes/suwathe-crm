import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { LAYOUTS, isScheduled, istDateTime, istLocalInput, type BlogPost } from "@/lib/website";
import BlogEditor from "@/components/BlogEditor";
import { PageTitle } from "@/components/ui";
import { WebsiteTabs } from "@/components/WebsiteUI";

export const metadata: Metadata = { title: "Edit blog post" };
export const dynamic = "force-dynamic";

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const post = await one<BlogPost>("SELECT * FROM blog_posts WHERE id = $1", [Number(id)]);
  if (!post) notFound();
  const { updated_at: _u, publish_at, ...plain } = post;
  const scheduled = isScheduled(post);
  const when = { local: publish_at ? istLocalInput(publish_at) : "", label: publish_at ? istDateTime(publish_at) : null, scheduled };
  return (
    <div>
      <PageTitle
        title={scheduled ? "Scheduled post" : post.status === "published" ? "Edit post" : "Draft"}
        sub={scheduled ? `Goes live ${when.label} · /blog/${post.slug}/` : post.status === "published" ? `suwathetechsolutions.com/blog/${post.slug}/` : "Not on the website yet"}
      />
      <WebsiteTabs active="blog" />
      <BlogEditor key={`${post.id}-${post.slug}-${post.status}`} post={plain} when={when} layouts={LAYOUTS} saved={saved} error={error} />
    </div>
  );
}
