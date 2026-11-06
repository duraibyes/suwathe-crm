import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getPackages } from "@/lib/website";
import { savePackage } from "@/app/website-actions";
import { PageTitle } from "@/components/ui";
import { Flash, WebsiteTabs, inr } from "@/components/WebsiteUI";

export const metadata: Metadata = { title: "Website packages" };
export const dynamic = "force-dynamic";

export default async function PackagesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const packages = await getPackages();
  return (
    <div className="space-y-5">
      <PageTitle title="Packages" sub="Names, prices and what's included, as shown on the website" />
      <WebsiteTabs active="packages" />
      <Flash saved={saved} error={error} />
      <p className="text-sm text-muted">Festival discounts are set under Offers and are worked out from these prices.</p>
      {packages.map((p) => (
        <form key={p.id} action={savePackage} className="card space-y-4 p-5">
          <input type="hidden" name="id" value={p.id} />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">{p.name} <span className="font-semibold text-muted">· {inr(p.price)}</span></h2>
            <span className="text-xs text-muted">{p.id}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor={`n-${p.id}`}>Name</label><input id={`n-${p.id}`} name="name" defaultValue={p.name} required className="field" /></div>
            <div><label className="label" htmlFor={`t-${p.id}`}>Tamil name</label><input id={`t-${p.id}`} name="name_ta" defaultValue={p.name_ta} className="field" /></div>
            <div><label className="label" htmlFor={`p-${p.id}`}>Price (₹)</label><input id={`p-${p.id}`} name="price" inputMode="numeric" defaultValue={p.price} required className="field" /></div>
            <div><label className="label" htmlFor={`d-${p.id}`}>Delivery time</label><input id={`d-${p.id}`} name="days" defaultValue={p.days} className="field" placeholder="10–14 days" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor={`f-${p.id}`}>Who it&apos;s for</label><input id={`f-${p.id}`} name="for_text" defaultValue={p.for_text} className="field" /></div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`i-${p.id}`}>What&apos;s included (one per line)</label>
              <textarea id={`i-${p.id}`} name="includes" defaultValue={p.includes} rows={7} className="field" />
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-semibold">
            <label className="flex items-center gap-2"><input type="checkbox" name="starting_at" defaultChecked={p.starting_at} className="h-4 w-4" /> Show as &ldquo;Starting at&rdquo;</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="popular" defaultChecked={p.popular} className="h-4 w-4" /> Most popular badge</label>
          </div>
          <button className="btn">Save {p.name}</button>
        </form>
      ))}
    </div>
  );
}
