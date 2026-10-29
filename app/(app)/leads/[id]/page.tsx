import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { assertLead } from "@/lib/leads";
import { addPayment, addRenewal, deleteActivity, deletePayment, logActivity, renewNow, saveReferral, setFollowUp, setStatus, stopRenewal } from "@/app/actions";
import { ACTIVITY_TYPES, PAYMENT_MODES, RENEWAL_ITEMS, STATUSES, WEBSITE_STATUS, activityType, source } from "@/lib/constants";
import { addMonths, dateTime, daysFromToday, inr, niceDate, relative, todayISO } from "@/lib/format";
import { CallButtons, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

type Lead = {
  id: number; business_name: string; contact_name: string | null; phone: string; alt_phone: string | null; business_type: string | null;
  area: string | null; city: string | null; website_status: string | null; current_website: string | null; source: string | null;
  referred_by_lead_id: number | null; referred_by_name: string | null; referral_reward: number | null; referral_reward_paid: boolean;
  interest: string | null; quoted_amount: number | null; deal_amount: number | null; status: string; next_follow_up: string | null;
  meeting_at: string | null; lost_reason: string | null; notes: string | null; won_on: string | null; created_at: string;
  assigned_name: string | null; referrer_name: string | null;
};

const FOLLOW = [["+1", "Tomorrow"], ["+3", "3 days"], ["+7", "1 week"], ["+30", "1 month"], ["+90", "3 months"]];

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string; error?: string }> }) {
  const user = await requireUser();
  const id = parseInt((await params).id, 10);
  if (!id) notFound();
  await assertLead(user, id);
  const sp = await searchParams;
  const today = todayISO();

  const [lead, acts, payments, renewals, referred] = await Promise.all([
    one<Lead>(
      `SELECT l.*, u.name AS assigned_name, r.business_name AS referrer_name FROM leads l
         LEFT JOIN users u ON u.id = l.assigned_to LEFT JOIN leads r ON r.id = l.referred_by_lead_id WHERE l.id = $1`,
      [id],
    ),
    query<{ id: number; type: string; summary: string; created_at: string; user_id: number | null; user_name: string | null }>(
      "SELECT a.id, a.type, a.summary, a.created_at, a.user_id, u.name AS user_name FROM activities a LEFT JOIN users u ON u.id = a.user_id WHERE a.lead_id = $1 ORDER BY a.created_at DESC LIMIT 200",
      [id],
    ),
    query<{ id: number; amount: number; paid_on: string; mode: string | null; note: string | null; kind: string }>("SELECT id, amount, paid_on, mode, note, kind FROM payments WHERE lead_id = $1 ORDER BY paid_on DESC, id DESC", [id]),
    query<{ id: number; item: string; amount: number | null; due_date: string; cycle_months: number; last_renewed_on: string | null; notes: string | null; active: boolean }>(
      "SELECT id, item, amount, due_date, cycle_months, last_renewed_on, notes, active FROM renewals WHERE lead_id = $1 ORDER BY active DESC, due_date",
      [id],
    ),
    query<{ id: number; business_name: string; status: string; referral_reward: number | null; referral_reward_paid: boolean }>(
      "SELECT id, business_name, status, referral_reward, referral_reward_paid FROM leads WHERE referred_by_lead_id = $1 ORDER BY created_at DESC",
      [id],
    ),
  ]);
  if (!lead) notFound();

  const paid = payments.filter((p) => p.kind === "project").reduce((s, p) => s + p.amount, 0);
  const renewalPaid = payments.filter((p) => p.kind === "renewal").reduce((s, p) => s + p.amount, 0);
  const balance = lead.deal_amount ? Math.max(lead.deal_amount - paid, 0) : null;
  const fuDays = daysFromToday(lead.next_follow_up);
  const closed = lead.status === "won" || lead.status === "lost";
  const back = `/leads/${id}`;

  return (
    <div className="space-y-5">
      {sp.added && <p className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">Lead saved. Set a follow-up date so you don't forget them.</p>}

      {/* Header */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{lead.business_name}</h1>
              <StatusPill status={lead.status} />
            </div>
            <p className="mt-1 text-muted">{[lead.contact_name, lead.business_type, [lead.area, lead.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>
            <p className="mt-1 font-semibold">{lead.phone}{lead.alt_phone ? ` · ${lead.alt_phone}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <CallButtons phone={lead.phone} name={lead.contact_name} from={user.name} />
            <Link href={`/leads/${id}/edit`} className="btn-ghost py-2 text-sm">Edit</Link>
          </div>
        </div>
        {lead.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-amber-50 px-3 py-2.5 text-[0.95rem] text-amber-950">{lead.notes}</p>}
      </section>

      {/* Follow-up + status */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">Next follow-up</h2>
          <p className={`mt-1 text-lg font-extrabold ${fuDays !== null && fuDays < 0 ? "text-rose-600" : fuDays === 0 ? "text-amber-700" : ""}`}>
            {lead.next_follow_up ? `${niceDate(lead.next_follow_up)} · ${relative(lead.next_follow_up)}` : closed ? "Not needed" : "Not set"}
          </p>
          {lead.meeting_at && <p className="mt-1 text-sm font-semibold text-violet-800">Meeting: {dateTime(lead.meeting_at)}</p>}
          <form action={setFollowUp} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={id} />
            {FOLLOW.map(([v, l]) => (
              <button key={v} name="follow_up" value={v} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">{l}</button>
            ))}
            {lead.next_follow_up && <button name="follow_up" value="clear" className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted ring-1 ring-line">Clear</button>}
          </form>
          <form action={setFollowUp} className="mt-2 flex gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="date" name="follow_up" min={today} className="field py-2" aria-label="Pick a follow-up date" required />
            <button className="btn-ghost shrink-0 py-2 text-sm">Set</button>
          </form>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">Status</h2>
          <form action={setStatus} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={id} />
            {STATUSES.map((s) => (
              <button key={s.id} name="status" value={s.id} aria-pressed={lead.status === s.id}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${lead.status === s.id ? `${s.tone} ring-2 ring-current` : "bg-white text-ink ring-1 ring-line"}`}>
                {s.en}
              </button>
            ))}
          </form>
          <p className="mt-2 text-xs text-muted">Marking Won or Lost clears the follow-up date.</p>
          {lead.status === "lost" && lead.lost_reason && <p className="mt-2 text-sm text-rose-700">Reason: {lead.lost_reason}</p>}
        </section>
      </div>

      {/* Log conversation */}
      <section className="card p-4 sm:p-5">
        <h2 className="font-bold">What happened? <span className="font-medium text-muted">· என்ன பேசினீங்க?</span></h2>
        {sp.error === "summary" && <p className="mt-2 text-sm font-semibold text-rose-700">Write a short note about the conversation.</p>}
        <form action={logActivity} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
            {ACTIVITY_TYPES.map((a, i) => (
              <label key={a.id} className="cursor-pointer">
                <input type="radio" name="type" value={a.id} defaultChecked={i === 0} className="peer sr-only" />
                <span className="inline-block rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-line peer-checked:bg-brand-dark peer-checked:text-white peer-checked:ring-brand-dark peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{a.icon} {a.en}</span>
              </label>
            ))}
          </div>
          <textarea name="summary" rows={3} required className="field" placeholder="e.g. Interested in a website with booking. Asked to call after 15th. Budget around ₹15,000." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Next follow-up</span>
              <select name="follow_up" className="field" defaultValue="">
                <option value="">Keep as is{lead.next_follow_up ? ` (${niceDate(lead.next_follow_up)})` : ""}</option>
                {FOLLOW.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                <option value="clear">No follow-up</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Change status</span>
              <select name="status" className="field" defaultValue="">
                <option value="">Keep as is ({STATUSES.find((s) => s.id === lead.status)?.en})</option>
                {STATUSES.filter((s) => s.id !== lead.status).map((s) => <option key={s.id} value={s.id}>{s.en}</option>)}
              </select>
            </label>
          </div>
          <button className="btn w-full sm:w-auto">Save</button>
        </form>
      </section>

      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        {/* Timeline */}
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">History</h2>
          <ol className="mt-3 space-y-0">
            {acts.map((a, i) => {
              const t = activityType(a.type);
              const system = ["status", "followup", "payment", "renewal"].includes(a.type);
              return (
                <li key={a.id} className="relative flex gap-3 pb-4">
                  {i < acts.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-line" aria-hidden="true" />}
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${system ? "bg-slate-100" : "bg-brand-soft"}`} aria-hidden="true">
                    {a.type === "status" ? "🔄" : a.type === "followup" ? "📅" : a.type === "payment" ? "💰" : a.type === "renewal" ? "♻️" : t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`whitespace-pre-line ${system ? "text-sm text-muted" : ""}`}>{a.summary}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {dateTime(a.created_at)}{a.user_name ? ` · ${a.user_name}` : ""}{!system && t.en ? ` · ${t.en}` : ""}
                    </p>
                  </div>
                  {!system && (user.role === "admin" || a.user_id === user.id) && (
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-muted hover:text-rose-600" aria-label="Delete this note">✕</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-5">
          {/* Details */}
          <section className="card p-4 sm:p-5">
            <h2 className="font-bold">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Interested in", lead.interest],
                ["Website today", WEBSITE_STATUS.find((w) => w.id === lead.website_status)?.en],
                ["Current site", lead.current_website],
                ["Source", source(lead.source)],
                ["Quoted", lead.quoted_amount ? inr(lead.quoted_amount) : null],
                ["Assigned to", lead.assigned_name],
                ["Added", niceDate(lead.created_at)],
                ["Won on", lead.won_on ? niceDate(lead.won_on) : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold">
                    {k === "Current site" && /^https?:\/\//.test(String(v)) ? <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-brand underline">{v}</a> : v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Money */}
          <section id="money" className="card scroll-mt-20 p-4 sm:p-5">
            <h2 className="font-bold">Money</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-2"><p className="text-xs text-muted">Deal</p><p className="font-extrabold">{inr(lead.deal_amount)}</p></div>
              <div className="rounded-xl bg-emerald-50 p-2"><p className="text-xs text-emerald-800">Received</p><p className="font-extrabold text-emerald-800">{inr(paid)}</p></div>
              <div className="rounded-xl bg-amber-50 p-2"><p className="text-xs text-amber-800">Balance</p><p className="font-extrabold text-amber-800">{balance === null ? "—" : inr(balance)}</p></div>
            </div>
            {!lead.deal_amount && <p className="mt-2 text-xs text-muted">Set the final deal price in Edit to see the balance.</p>}
            {renewalPaid > 0 && <p className="mt-2 text-xs text-muted">Plus {inr(renewalPaid)} received for renewals (not counted in the balance).</p>}
            {payments.length > 0 && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <span><span className="font-semibold">{inr(p.amount)}</span> <span className="text-muted">· {niceDate(p.paid_on)}{p.mode ? ` · ${p.mode}` : ""}{p.note ? ` · ${p.note}` : ""}</span>{p.kind === "renewal" && <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted">renewal</span>}</span>
                    {user.role === "admin" && (
                      <form action={deletePayment}><input type="hidden" name="payment_id" value={p.id} /><button className="text-xs text-muted hover:text-rose-600" aria-label="Remove payment">✕</button></form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {sp.error === "amount" && <p className="mt-2 text-sm font-semibold text-rose-700">Enter an amount.</p>}
            <form action={addPayment} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={id} />
              <input name="amount" inputMode="numeric" placeholder="Amount ₹" required className="field py-2" aria-label="Amount" />
              <input name="paid_on" type="date" defaultValue={today} className="field py-2" aria-label="Paid on" />
              <select name="mode" className="field py-2" aria-label="Mode">{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select>
              <input name="note" placeholder="Note (advance…)" className="field py-2" aria-label="Note" />
              <select name="kind" className="field col-span-2 py-2" aria-label="Payment for">
                <option value="project">For the project (counts towards balance)</option>
                <option value="renewal">For a renewal / care plan</option>
              </select>
              <button className="btn col-span-2 py-2">Add payment</button>
            </form>
          </section>

          {/* Renewals */}
          <section id="renewals" className="card scroll-mt-20 p-4 sm:p-5">
            <h2 className="font-bold">Renewals</h2>
            {sp.error === "renewal" && <p className="mt-2 text-sm font-semibold text-rose-700">Choose what to renew and the due date.</p>}
            <ul className="mt-2 space-y-3">
              {renewals.map((r) => {
                const n = daysFromToday(r.due_date)!;
                return (
                  <li key={r.id} className={`rounded-xl p-3 ring-1 ${!r.active ? "opacity-50 ring-line" : n < 0 ? "bg-rose-50 ring-rose-200" : n <= 30 ? "bg-amber-50 ring-amber-200" : "ring-line"}`}>
                    <div className="flex justify-between gap-2">
                      <p className="font-bold">{r.item} <span className="font-medium text-muted">· {inr(r.amount)} every {r.cycle_months === 12 ? "year" : `${r.cycle_months} mo`}</span></p>
                    </div>
                    <p className="text-sm">{r.active ? <>Due <strong>{niceDate(r.due_date)}</strong> · {relative(r.due_date)}</> : "Stopped"}</p>
                    {r.last_renewed_on && <p className="text-xs text-muted">Last renewed {niceDate(r.last_renewed_on)}</p>}
                    {r.active && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={renewNow} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="renewal_id" value={r.id} />
                          <input type="hidden" name="back" value={`${back}#renewals`} />
                          <label className="flex items-center gap-1 text-xs font-semibold text-muted"><input type="checkbox" name="record_payment" defaultChecked /> record payment</label>
                          <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Renewed → next {niceDate(addMonths(r.due_date, r.cycle_months))}</button>
                        </form>
                        <form action={stopRenewal}><input type="hidden" name="renewal_id" value={r.id} /><button className="text-xs font-semibold text-muted underline">Stop</button></form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-bold text-brand">+ Add renewal</summary>
              <form action={addRenewal} className="mt-3 grid grid-cols-2 gap-2">
                <input type="hidden" name="id" value={id} />
                <select name="item" className="field py-2" aria-label="Item">{RENEWAL_ITEMS.map((i) => <option key={i}>{i}</option>)}</select>
                <input name="amount" inputMode="numeric" placeholder="Amount ₹" className="field py-2" aria-label="Amount" />
                <label className="block"><span className="label">Due date</span><input name="due_date" type="date" required defaultValue={addMonths(today, 12)} className="field py-2" /></label>
                <label className="block"><span className="label">Every</span>
                  <select name="cycle_months" defaultValue="12" className="field py-2"><option value="1">Month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">Year</option><option value="24">2 years</option></select>
                </label>
                <input name="notes" placeholder="Notes (domain name, provider…)" className="field col-span-2 py-2" aria-label="Notes" />
                <button className="btn col-span-2 py-2">Add renewal</button>
              </form>
            </details>
          </section>

          {/* Referrals */}
          <section id="referral" className="card scroll-mt-20 p-4 sm:p-5">
            <h2 className="font-bold">Referrals</h2>
            {(lead.referrer_name || lead.referred_by_name) ? (
              <div className="mt-2 text-sm">
                <p>Referred by{" "}
                  {lead.referred_by_lead_id ? <Link href={`/leads/${lead.referred_by_lead_id}`} className="font-bold text-brand underline">{lead.referrer_name}</Link> : <strong>{lead.referred_by_name}</strong>}
                </p>
                <form action={saveReferral} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={id} />
                  <input name="referral_reward" inputMode="numeric" defaultValue={lead.referral_reward ?? ""} placeholder="Reward ₹" className="field w-28 py-1.5" aria-label="Referral reward" />
                  <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" name="referral_reward_paid" defaultChecked={lead.referral_reward_paid} /> Paid</label>
                  <button className="btn-ghost py-1.5 text-sm">Save</button>
                </form>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Not referred by anyone. Set it in Edit.</p>
            )}
            {referred.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold">They referred {referred.length}:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {referred.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <Link href={`/leads/${r.id}`} className="truncate font-semibold text-brand">{r.business_name}</Link>
                      <span className="flex shrink-0 items-center gap-2"><StatusPill status={r.status} small />{r.referral_reward ? <span className="text-xs">{inr(r.referral_reward)} {r.referral_reward_paid ? "paid" : "due"}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
