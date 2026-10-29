import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { scopeSql } from "@/lib/leads";
import { renewNow } from "@/app/actions";
import { addMonths, daysFromToday, inr, niceDate, relative } from "@/lib/format";
import { CallButtons, Empty, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Renewals" };
export const dynamic = "force-dynamic";

type Row = { id: number; lead_id: number; item: string; amount: number | null; due_date: string; cycle_months: number; business_name: string; phone: string; contact_name: string | null };

export default async function RenewalsPage() {
  const user = await requireUser();
  const rows = await query<Row>(
    `SELECT r.id, r.lead_id, r.item, r.amount, r.due_date, r.cycle_months, l.business_name, l.phone, l.contact_name
       FROM renewals r JOIN leads l ON l.id = r.lead_id WHERE r.active AND ${scopeSql(user)} ORDER BY r.due_date`,
    [user.id],
  );
  const groups = [
    { title: "Overdue", tone: "text-rose-700", rows: rows.filter((r) => daysFromToday(r.due_date)! < 0) },
    { title: "Next 30 days", tone: "text-amber-700", rows: rows.filter((r) => { const n = daysFromToday(r.due_date)!; return n >= 0 && n <= 30; }) },
    { title: "Later", tone: "", rows: rows.filter((r) => daysFromToday(r.due_date)! > 30) },
  ];
  const yearly = rows.reduce((s, r) => s + (r.amount ?? 0) * (12 / r.cycle_months), 0);

  return (
    <div>
      <PageTitle title="Renewals" sub={`${rows.length} active · about ${inr(Math.round(yearly))} a year`} />
      {rows.length === 0 && <Empty>No renewals yet. Add them from a customer's page (domain, hosting, care plan…).</Empty>}
      <div className="space-y-6">
        {groups.filter((g) => g.rows.length).map((g) => (
          <section key={g.title}>
            <h2 className={`mb-2 font-bold ${g.tone}`}>{g.title} · {g.rows.length}</h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {g.rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/leads/${r.lead_id}#renewals`} className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.business_name}</span>
                    <span className="text-sm text-muted">{r.item} · {inr(r.amount)} · due {niceDate(r.due_date)} ({relative(r.due_date)})</span>
                  </Link>
                  <CallButtons phone={r.phone} name={r.contact_name} from={user.name} compact />
                  <form action={renewNow}>
                    <input type="hidden" name="renewal_id" value={r.id} />
                    <input type="hidden" name="record_payment" value="on" />
                    <input type="hidden" name="back" value="/renewals" />
                    <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" title={`Next due ${addMonths(r.due_date, r.cycle_months)}`}>Renewed</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {rows.length > 0 && <p className="mt-4 text-sm text-muted">“Renewed” records the payment and moves the due date forward by one cycle.</p>}
    </div>
  );
}
