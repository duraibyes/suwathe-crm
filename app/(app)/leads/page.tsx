import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { scopeSql } from "@/lib/leads";
import { SOURCES, STATUSES } from "@/lib/constants";
import LeadRow, { type LeadListItem } from "@/components/LeadRow";
import { Empty, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const SORTS = {
  follow: "l.next_follow_up NULLS LAST, l.updated_at DESC",
  recent: "l.updated_at DESC",
  new: "l.created_at DESC",
  name: "lower(l.business_name)",
};
const PAGE = 50;

type SP = { q?: string; status?: string; source?: string; sort?: string; mine?: string; page?: string; deleted?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = STATUSES.some((s) => s.id === sp.status) ? sp.status! : sp.status === "open" ? "open" : "";
  const source = SOURCES.some((s) => s.id === sp.source) ? sp.source! : "";
  const sort = (sp.sort && sp.sort in SORTS ? sp.sort : "follow") as keyof typeof SORTS;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = [scopeSql(user)];
  const params: unknown[] = [user.id];
  if (q) {
    params.push(`%${q}%`);
    const t = params.length;
    const digits = q.replace(/\D/g, "");
    let phoneMatch = "";
    if (digits.length >= 4) {
      params.push(`%${digits}%`);
      phoneMatch = ` OR regexp_replace(l.phone, '\\D', '', 'g') LIKE $${params.length}`;
    }
    where.push(`(l.business_name ILIKE $${t} OR l.contact_name ILIKE $${t} OR l.area ILIKE $${t} OR l.notes ILIKE $${t}${phoneMatch})`);
  }
  if (status === "open") where.push("l.status NOT IN ('won', 'lost')");
  else if (status) {
    params.push(status);
    where.push(`l.status = $${params.length}`);
  }
  if (source) {
    params.push(source);
    where.push(`l.source = $${params.length}`);
  }
  if (sp.mine === "1") where.push("l.assigned_to = $1");

  const rows = await query<LeadListItem & { total: number }>(
    `SELECT l.id, l.business_name, l.contact_name, l.phone, l.area, l.business_type, l.status, l.next_follow_up, count(*) OVER()::int AS total
       FROM leads l WHERE ${where.join(" AND ")} ORDER BY ${SORTS[sort]} LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
    params,
  );
  const total = rows[0]?.total ?? 0;

  const link = (patch: Partial<SP>) => {
    const next = { q, status, source, sort, mine: sp.mine, ...patch };
    const u = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && !(k === "sort" && v === "follow") && u.set(k, String(v)));
    const s = u.toString();
    return `/leads${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageTitle title="Leads" sub={`${total} ${total === 1 ? "lead" : "leads"}`} action={<Link href="/leads/new" className="btn hidden md:inline-flex">+ Add lead</Link>} />
      {sp.deleted && <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 font-semibold">Lead deleted.</p>}

      <form className="mb-3 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        {source && <input type="hidden" name="source" value={source} />}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search</span>
          <input name="q" defaultValue={q} placeholder="Search name, phone, area…" className="field" type="search" />
        </label>
        <button className="btn">Search</button>
      </form>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "", en: "All" }, { id: "open", en: "Open" }, ...STATUSES].map((s) => (
          <Link key={s.id || "all"} href={link({ status: s.id, page: undefined })} aria-current={status === s.id ? "true" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === s.id ? "bg-brand-dark text-white" : "bg-white text-ink ring-1 ring-line"}`}>
            {s.en}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <form className="flex flex-wrap items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {status && <input type="hidden" name="status" value={status} />}
          <select name="source" defaultValue={source} className="field w-auto py-1.5 text-sm" aria-label="Source">
            <option value="">All sources</option>
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.en}</option>)}
          </select>
          <select name="sort" defaultValue={sort} className="field w-auto py-1.5 text-sm" aria-label="Sort">
            <option value="follow">Next follow-up</option>
            <option value="recent">Recently updated</option>
            <option value="new">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
          {user.role === "admin" && (
            <label className="flex items-center gap-1.5 font-semibold text-muted"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} /> Mine only</label>
          )}
          <button className="btn-ghost py-1.5 text-sm">Apply</button>
        </form>
      </div>

      {rows.length ? (
        <ul className="card divide-y divide-line overflow-hidden">{rows.map((l) => <LeadRow key={l.id} lead={l} from={user.name} />)}</ul>
      ) : (
        <Empty href="/leads/new" cta="Add a lead">{q || status || source ? "No leads match these filters." : "No leads yet."}</Empty>
      )}

      {total > PAGE && (
        <div className="mt-4 flex items-center justify-between">
          {page > 1 ? <Link href={link({ page: String(page - 1) })} className="btn-ghost">← Previous</Link> : <span />}
          <span className="text-sm text-muted">Page {page} of {Math.ceil(total / PAGE)}</span>
          {page * PAGE < total ? <Link href={link({ page: String(page + 1) })} className="btn-ghost">Next →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
