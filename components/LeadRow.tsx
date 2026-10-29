import Link from "next/link";
import { CallButtons, StatusPill } from "./ui";
import { daysFromToday, niceDate } from "@/lib/format";

export type LeadListItem = {
  id: number;
  business_name: string;
  contact_name: string | null;
  phone: string;
  area: string | null;
  business_type: string | null;
  status: string;
  next_follow_up: string | null;
  last_note?: string | null;
};

export default function LeadRow({ lead, from, showFollowUp = true }: { lead: LeadListItem; from?: string; showFollowUp?: boolean }) {
  const n = daysFromToday(lead.next_follow_up);
  const fuTone = n === null ? "text-muted" : n < 0 ? "text-rose-600" : n === 0 ? "text-amber-700" : "text-muted";
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-bold">{lead.business_name}</span>
          <StatusPill status={lead.status} small />
        </span>
        <span className="block truncate text-sm text-muted">
          {[lead.contact_name, lead.business_type, lead.area].filter(Boolean).join(" · ") || lead.phone}
        </span>
        {lead.last_note && <span className="mt-0.5 block truncate text-sm text-ink/80">“{lead.last_note}”</span>}
        {showFollowUp && lead.next_follow_up && (
          <span className={`mt-0.5 block text-xs font-semibold ${fuTone}`}>
            Follow up: {niceDate(lead.next_follow_up)}{n !== null && n < 0 ? ` (${-n}d overdue)` : ""}
          </span>
        )}
      </Link>
      <CallButtons phone={lead.phone} name={lead.contact_name} from={from} compact />
    </li>
  );
}
