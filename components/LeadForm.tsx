import { saveLead } from "@/app/actions";
import { ACTIVITY_TYPES, BUSINESS_TYPES, INTERESTS, SOURCES, STATUSES, WEBSITE_STATUS } from "@/lib/constants";
import { dateTimeInput } from "@/lib/format";

export type LeadFormData = Partial<{
  id: number;
  business_name: string;
  contact_name: string | null;
  phone: string;
  alt_phone: string | null;
  business_type: string | null;
  area: string | null;
  city: string | null;
  website_status: string | null;
  current_website: string | null;
  source: string | null;
  referred_by_lead_id: number | null;
  referred_by_name: string | null;
  interest: string | null;
  quoted_amount: number | null;
  deal_amount: number | null;
  status: string;
  next_follow_up: string | null;
  meeting_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  assigned_to: number | null;
}>;

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export default function LeadForm({
  lead = {},
  users,
  leads,
  isNew,
  allowDuplicate,
}: {
  lead?: LeadFormData;
  users: { id: number; name: string }[];
  leads: { id: number; business_name: string }[];
  isNew?: boolean;
  allowDuplicate?: boolean;
}) {
  return (
    <form action={saveLead} className="space-y-5">
      {lead.id && <input type="hidden" name="id" value={lead.id} />}
      {allowDuplicate && <input type="hidden" name="allow_duplicate" value="1" />}

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-bold">Business</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name *"><input name="business_name" required defaultValue={lead.business_name ?? ""} className="field" /></Field>
          <Field label="Contact person"><input name="contact_name" defaultValue={lead.contact_name ?? ""} className="field" /></Field>
          <Field label="Phone *"><input name="phone" required inputMode="tel" defaultValue={lead.phone ?? ""} className="field" placeholder="98765 43210" /></Field>
          <Field label="Other phone"><input name="alt_phone" inputMode="tel" defaultValue={lead.alt_phone ?? ""} className="field" /></Field>
          <Field label="Business type">
            <select name="business_type" defaultValue={lead.business_type ?? ""} className="field">
              <option value="">Choose…</option>
              {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Area"><input name="area" defaultValue={lead.area ?? ""} className="field" placeholder="e.g. Velachery" /></Field>
          <Field label="City"><input name="city" defaultValue={lead.city ?? "Chennai"} className="field" /></Field>
          <Field label="Website today">
            <select name="website_status" defaultValue={lead.website_status ?? "none"} className="field">
              {WEBSITE_STATUS.map((w) => <option key={w.id} value={w.id}>{w.en}</option>)}
            </select>
          </Field>
          <Field label="Current website / Instagram link" wide><input name="current_website" defaultValue={lead.current_website ?? ""} className="field" /></Field>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-bold">How they came</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source">
            <select name="source" defaultValue={lead.source ?? "google_maps"} className="field">
              {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.en}</option>)}
            </select>
          </Field>
          <Field label="Referred by (existing customer)">
            <select name="referred_by_lead_id" defaultValue={lead.referred_by_lead_id ?? ""} className="field">
              <option value="">— none —</option>
              {leads.filter((l) => l.id !== lead.id).map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          </Field>
          <Field label="Or referred by (name)" wide><input name="referred_by_name" defaultValue={lead.referred_by_name ?? ""} className="field" placeholder="Friend, relative, another client…" /></Field>
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-bold">What they need</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interested in">
            <select name="interest" defaultValue={lead.interest ?? ""} className="field">
              <option value="">Not sure yet</option>
              {INTERESTS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={lead.status ?? "new"} className="field">
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.en} · {s.ta}</option>)}
            </select>
          </Field>
          <Field label="Quoted price (₹)"><input name="quoted_amount" inputMode="numeric" defaultValue={lead.quoted_amount ?? ""} className="field" /></Field>
          <Field label="Final deal price (₹)"><input name="deal_amount" inputMode="numeric" defaultValue={lead.deal_amount ?? ""} className="field" /></Field>
          <Field label="Next follow-up date"><input name="next_follow_up" type="date" defaultValue={lead.next_follow_up ?? ""} className="field" /></Field>
          <Field label="Meeting date & time"><input name="meeting_at" type="datetime-local" defaultValue={dateTimeInput(lead.meeting_at ?? null)} className="field" /></Field>
          {!isNew && <Field label="If lost, why?" wide><input name="lost_reason" defaultValue={lead.lost_reason ?? ""} className="field" placeholder="Budget, already has a developer…" /></Field>}
          {users.length > 1 && (
            <Field label="Assigned to">
              <select name="assigned_to" defaultValue={lead.assigned_to ?? ""} className="field">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Notes (always visible on top)" wide><textarea name="notes" rows={3} defaultValue={lead.notes ?? ""} className="field" /></Field>
        </div>
      </section>

      {isNew && (
        <section className="card space-y-4 p-4 sm:p-5">
          <h2 className="font-bold">First conversation (optional)</h2>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Type">
              <select name="first_type" className="field" defaultValue="call">
                {ACTIVITY_TYPES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.en}</option>)}
              </select>
            </Field>
            <Field label="What did they say?"><textarea name="first_note" rows={2} className="field" placeholder="Interested, asked to call after Pongal…" /></Field>
          </div>
        </section>
      )}

      <div className="sticky bottom-20 z-10 flex gap-3 md:bottom-4">
        <button className="btn flex-1 py-3.5 text-base shadow-lg shadow-brand/25">{isNew ? "Save lead" : "Save changes"}</button>
      </div>
    </form>
  );
}
