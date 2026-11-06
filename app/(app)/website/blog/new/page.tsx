import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { LAYOUTS } from "@/lib/website";
import BlogEditor from "@/components/BlogEditor";
import { PageTitle } from "@/components/ui";
import { WebsiteTabs } from "@/components/WebsiteUI";

export const metadata: Metadata = { title: "New blog post" };

export default async function NewPost({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <div>
      <PageTitle title="New blog post" />
      <WebsiteTabs active="blog" />
      <BlogEditor layouts={LAYOUTS} error={error} />
    </div>
  );
}
