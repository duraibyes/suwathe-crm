import Link from "next/link";
import { status as statusOf } from "@/lib/constants";
import { phoneDigits } from "@/lib/format";

export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const s = statusOf(status);
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full font-semibold ${s.tone} ${small ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-xs"}`}>
      {s.en}
    </span>
  );
}

export function CallButtons({ phone, name, from, compact }: { phone: string; name?: string | null; from?: string; compact?: boolean }) {
  const d = phoneDigits(phone);
  const hello = encodeURIComponent(`Hi${name ? ` ${name}` : ""}, this is ${from ? from.split(" ")[0] : "the team"} from Suwathe Tech Solutions.`);
  const cls = compact ? "grid h-9 w-9 place-items-center rounded-full" : "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold";
  return (
    <div className="flex shrink-0 gap-2">
      <a href={`tel:+${d}`} className={`${cls} bg-brand-soft text-brand`} aria-label={`Call ${phone}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" /></svg>
        {!compact && "Call"}
      </a>
      <a href={`https://wa.me/${d}?text=${hello}`} target="_blank" rel="noopener noreferrer" className={`${cls} bg-[#e3f6ea] text-[#137a3a]`} aria-label={`WhatsApp ${phone}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.13c-.25.69-1.44 1.33-1.98 1.38-.51.05-.99.24-3.33-.69-2.82-1.11-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.87 0-1.37.72-2.04.97-2.32.25-.28.55-.35.74-.35l.53.01c.17.01.4-.06.62.48.25.6.83 2.07.9 2.22.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.69-.18 1.38Z" /></svg>
        {!compact && "WhatsApp"}
      </a>
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-0.5 text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">
      <p>{children}</p>
      {href && cta && <Link href={href} className="btn mt-4">{cta}</Link>}
    </div>
  );
}
