import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { LAYOUTS, type BlogPost } from "@/lib/website";
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
  const { updated_at: _u, ...plain } = post;
  return (
    <div>
      <PageTitle title={post.status === "published" ? "Edit post" : "Draft"} sub={post.status === "published" ? `suwathetechsolutions.com/blog/${post.slug}/` : "Not on the website yet"} />
      <WebsiteTabs active="blog" />
      <BlogEditor key={`${post.id}-${post.slug}-${post.status}`} post={plain} layouts={LAYOUTS} saved={saved} error={error} />
    </div>
  );
}
