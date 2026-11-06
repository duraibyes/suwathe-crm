import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { getOffers, getPackages, getPosts } from "@/lib/website";
import { publishNow } from "@/app/website-actions";
import { PageTitle } from "@/components/ui";
import { Flash, WebsiteTabs, inr } from "@/components/WebsiteUI";
import { longDate, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Website" };
export const dynamic = "force-dynamic";

export default async function WebsiteHome({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const [packages, offers, posts] = await Promise.all([getPackages(), getOffers(), getPosts()]);
  const last = await one<{ ok: boolean; created_at: Date; note: string | null }>("SELECT ok, created_at, note FROM site_publishes ORDER BY id DESC LIMIT 1");
  const today = todayISO();
  const live = offers.find((o) => o.active && o.starts_on <= today && o.ends_on >= today);
  const next = offers.find((o) => o.active && o.starts_on > today);
  const published = posts.filter((p) => p.status === "published").length;

  return (
    <div className="space-y-5">
      <PageTitle title="Website" sub="Prices, festival offers and blog posts on suwathetechsolutions.com" />
      <WebsiteTabs active="home" />
      <Flash saved={saved} error={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/website/packages" className="card block p-5 hover:ring-2 hover:ring-brand">
          <p className="text-sm font-semibold text-muted">Packages</p>
          <p className="mt-1 text-2xl font-extrabold">{packages.length}</p>
          <p className="mt-1 text-sm text-muted">from {inr(Math.min(...packages.map((p) => p.price)))}</p>
        </Link>
        <Link href="/website/offers" className="card block p-5 hover:ring-2 hover:ring-brand">
          <p className="text-sm font-semibold text-muted">Festival offer</p>
          <p className="mt-1 text-lg font-extrabold">{live ? `${live.name} · on now` : "None running"}</p>
          <p className="mt-1 text-sm text-muted">{live ? `till ${longDate(live.ends_on)}` : next ? `Next: ${next.name}, ${longDate(next.starts_on)}` : "No offer planned"}</p>
        </Link>
        <Link href="/website/blog" className="card block p-5 hover:ring-2 hover:ring-brand">
          <p className="text-sm font-semibold text-muted">Blog</p>
          <p className="mt-1 text-2xl font-extrabold">{published} <span className="text-base font-semibold text-muted">published</span></p>
          <p className="mt-1 text-sm text-muted">{posts.length - published} draft{posts.length - published === 1 ? "" : "s"}</p>
        </Link>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-extrabold">Update the website</h2>
        <p className="mt-1 text-sm text-muted">
          The website checks for changes here every hour and updates itself. Press the button to update it now (about 2–3 minutes).
        </p>
        <form action={publishNow} className="mt-4">
          <button className="btn">Publish changes now</button>
        </form>
        {last && (
          <p className="mt-3 text-sm text-muted">
            Last: {last.created_at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} · {last.ok ? "sent ✓" : `not sent (${last.note})`}
          </p>
        )}
        <a href="https://suwathetechsolutions.com" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-brand underline">Open the website ↗</a>
      </section>
    </div>
  );
}
