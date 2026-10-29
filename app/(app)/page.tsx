import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, one } from "@/lib/db";
import { scopeSql } from "@/lib/leads";
import { STATUSES } from "@/lib/constants";
import { addDays, dateTime, inr, niceDate, relative, todayISO } from "@/lib/format";
import LeadRow, { type LeadListItem } from "@/components/LeadRow";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

const LAST_NOTE = `(SELECT summary FROM activities a WHERE a.lead_id = l.id AND a.type NOT IN ('status', 'followup') ORDER BY a.created_at DESC LIMIT 1) AS last_note`;

export default async function Today({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const today = todayISO();
  const scope = scopeSql(user);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [due, meetings, renewals, counts, money] = await Promise.all([
    query<LeadListItem>(
      `SELECT l.id, l.business_name, l.contact_name, l.phone, l.area, l.business_type, l.status, l.next_follow_up, ${LAST_NOTE}
         FROM leads l WHERE ${scope} AND l.next_follow_up IS NOT NULL AND l.next_follow_up <= $2 AND l.status NOT IN ('won', 'lost')
        ORDER BY l.next_follow_up, l.updated_at LIMIT 60`,
      [user.id, today],
    ),
    query<{ id: number; business_name: string; meeting_at: string; area: string | null }>(
      `SELECT l.id, l.business_name, l.meeting_at, l.area FROM leads l
        WHERE ${scope} AND l.meeting_at >= ($2::date AT TIME ZONE 'Asia/Kolkata') AND l.meeting_at < (($2::date + 8) AT TIME ZONE 'Asia/Kolkata')
        ORDER BY l.meeting_at LIMIT 20`,
      [user.id, today],
    ),
    query<{ id: number; lead_id: number; item: string; due_date: string; amount: number | null; business_name: string }>(
      `SELECT r.id, r.lead_id, r.item, r.due_date, r.amount, l.business_name FROM renewals r JOIN leads l ON l.id = r.lead_id
        WHERE r.active AND ${scope} AND r.due_date <= $2 ORDER BY r.due_date LIMIT 20`,
      [user.id, addDays(today, 30)],
    ),
    query<{ status: string; n: number }>(`SELECT l.status, count(*)::int AS n FROM leads l WHERE ${scope} GROUP BY l.status`, [user.id]),
    user.role === "admin"
      ? one<{ received: number; pending: number; won: number; added: number }>(
          `SELECT
             (SELECT COALESCE(sum(amount), 0)::int FROM payments WHERE paid_on >= $1) AS received,
             (SELECT COALESCE(sum(GREATEST(l.deal_amount - COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.lead_id = l.id AND p.kind = 'project'), 0), 0)), 0)::int
                FROM leads l WHERE l.status = 'won' AND l.deal_amount IS NOT NULL) AS pending,
             (SELECT count(*)::int FROM leads WHERE won_on >= $1) AS won,
             (SELECT count(*)::int FROM leads WHERE created_at >= ($1::date AT TIME ZONE 'Asia/Kolkata')) AS added`,
          [monthStart],
        )
      : null,
  ]);

  const overdue = due.filter((l) => l.next_follow_up! < today);
  const todays = due.filter((l) => l.next_follow_up === today);
  const total = counts.reduce((s, c) => s + c.n, 0);
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {welcome && <p className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">Password saved. You're all set.</p>}

      <div>
        <p className="text-muted">{greet}, {user.name.split(" ")[0]}</p>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {due.length ? `${due.length} follow-up${due.length > 1 ? "s" : ""} today` : "No follow-ups due today"}
        </h1>
      </div>

      {money && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Received this month", inr(money.received)],
            ["Balance to collect", inr(money.pending)],
            ["Won this month", String(money.won)],
            ["New leads this month", String(money.added)],
          ].map(([k, v]) => (
            <div key={k} className="card p-4">
              <p className="text-xs font-semibold text-muted">{k}</p>
              <p className="mt-1 text-xl font-extrabold">{v}</p>
            </div>
          ))}
        </section>
      )}

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-rose-700">Overdue · {overdue.length}</h2>
          <ul className="card divide-y divide-line overflow-hidden">{overdue.map((l) => <LeadRow key={l.id} lead={l} from={user.name} />)}</ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold">Today · {todays.length}</h2>
        {todays.length ? (
          <ul className="card divide-y divide-line overflow-hidden">{todays.map((l) => <LeadRow key={l.id} lead={l} from={user.name} showFollowUp={false} />)}</ul>
        ) : (
          <Empty href={total ? "/leads?status=new" : "/leads/new"} cta={total ? "See new leads" : "Add your first lead"}>
            {total ? "Nothing planned for today. Call a new lead?" : "Start by adding a business that doesn't have a website."}
          </Empty>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-bold">Meetings · next 7 days</h2>
          {meetings.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {meetings.map((m) => (
                <li key={m.id}>
                  <Link href={`/leads/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0"><span className="block truncate font-bold">{m.business_name}</span><span className="text-sm text-muted">{m.area}</span></span>
                    <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">{dateTime(m.meeting_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No meetings this week.</Empty>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-center justify-between font-bold">Renewals · next 30 days <Link href="/renewals" className="text-sm font-semibold text-brand">All</Link></h2>
          {renewals.length ? (
            <ul className="card divide-y divide-line overflow-hidden">
              {renewals.map((r) => (
                <li key={r.id}>
                  <Link href={`/leads/${r.lead_id}#renewals`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0"><span className="block truncate font-bold">{r.business_name}</span><span className="text-sm text-muted">{r.item} · {inr(r.amount)}</span></span>
                    <span className={`shrink-0 text-right text-xs font-bold ${r.due_date < today ? "text-rose-600" : "text-amber-700"}`}>{niceDate(r.due_date)}<span className="block font-medium">{relative(r.due_date)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No renewals due soon.</Empty>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-bold">Pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const n = counts.find((c) => c.status === s.id)?.n ?? 0;
            return (
              <Link key={s.id} href={`/leads?status=${s.id}`} className={`rounded-2xl px-3.5 py-2 ${s.tone}`}>
                <span className="block text-lg font-extrabold leading-tight">{n}</span>
                <span className="text-xs font-semibold">{s.en}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
