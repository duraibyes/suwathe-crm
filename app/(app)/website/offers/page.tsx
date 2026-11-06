import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { FESTIVALS, getOffers, type SiteOffer } from "@/lib/website";
import { deleteOffer, saveOffer } from "@/app/website-actions";
import { PageTitle } from "@/components/ui";
import { Flash, WebsiteTabs } from "@/components/WebsiteUI";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Festival offers" };
export const dynamic = "force-dynamic";

const PCTS = [["pct_starter", "Starter"], ["pct_business", "Business"], ["pct_ecom", "E-commerce"], ["pct_software", "Software"], ["pct_school", "School site"]] as const;

function OfferForm({ o }: { o?: SiteOffer }) {
  const k = o?.id ?? "new";
  return (
    <form action={saveOffer} className="space-y-4">
      {o && <input type="hidden" name="id" value={o.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`fe-${k}`}>Festival (decorations & Chutty&apos;s scene)</label>
          <select id={`fe-${k}`} name="festival" defaultValue={o?.festival ?? "diwali"} className="field">
            {FESTIVALS.map((f) => <option key={f.id} value={f.id}>{f.en}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor={`s-${k}`}>Starts</label><input id={`s-${k}`} type="date" name="starts_on" defaultValue={o?.starts_on} required className="field" /></div>
          <div><label className="label" htmlFor={`e-${k}`}>Ends (last day)</label><input id={`e-${k}`} type="date" name="ends_on" defaultValue={o?.ends_on} required className="field" /></div>
        </div>
        <div><label className="label" htmlFor={`n-${k}`}>Offer name</label><input id={`n-${k}`} name="name" defaultValue={o?.name} placeholder="Christmas offer" required className="field" /></div>
        <div><label className="label" htmlFor={`nt-${k}`}>Offer name in Tamil</label><input id={`nt-${k}`} name="name_ta" defaultValue={o?.name_ta} className="field" /></div>
        <div><label className="label" htmlFor={`g-${k}`}>Greeting</label><input id={`g-${k}`} name="greeting" defaultValue={o?.greeting} placeholder="Merry Christmas" required className="field" /></div>
        <div><label className="label" htmlFor={`gt-${k}`}>Greeting in Tamil</label><input id={`gt-${k}`} name="greeting_ta" defaultValue={o?.greeting_ta} className="field" /></div>
      </div>
      <fieldset>
        <legend className="label">Discount % (0–50)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PCTS.map(([name, label]) => (
            <div key={name}>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor={`${name}-${k}`}>{label}</label>
              <input id={`${name}-${k}`} name={name} inputMode="numeric" defaultValue={o ? o[name] : 0} className="field" />
            </div>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={o?.active ?? true} className="h-4 w-4" /> Active</label>
      <button className="btn">{o ? "Save offer" : "Add offer"}</button>
    </form>
  );
}

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const offers = await getOffers();
  const today = todayISO();
  return (
    <div className="space-y-5">
      <PageTitle title="Festival offers" sub="Each offer switches on and off by itself on these dates (Indian time)" />
      <WebsiteTabs active="offers" />
      <Flash saved={saved} error={error} />
      {offers.map((o) => {
        const state = !o.active ? "Off" : o.ends_on < today ? "Finished" : o.starts_on <= today ? "On now" : "Upcoming";
        return (
          <section key={o.id} className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">{o.name}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state === "On now" ? "bg-emerald-100 text-emerald-800" : state === "Upcoming" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>{state}</span>
            </div>
            <OfferForm o={o} />
            <form action={deleteOffer} className="mt-3 text-right">
              <input type="hidden" name="id" value={o.id} />
              <button className="text-sm font-semibold text-rose-700 underline">Delete this offer</button>
            </form>
          </section>
        );
      })}
      <details className="card p-5">
        <summary className="cursor-pointer text-lg font-extrabold">+ Add an offer</summary>
        <div className="mt-4"><OfferForm /></div>
      </details>
    </div>
  );
}
