// Dates are handled in Indian time, whatever timezone the server runs in.
const TZ = "Asia/Kolkata";

// "YYYY-MM-DD" for today in India
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

// pg returns DATE columns as JS Date at local midnight; normalise to "YYYY-MM-DD"
export function iso(d: Date | string | null | undefined) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysFromToday(d: Date | string | null) {
  const v = iso(d);
  if (!v) return null;
  return Math.round((Date.parse(`${v}T00:00:00Z`) - Date.parse(`${todayISO()}T00:00:00Z`)) / 864e5);
}

export function niceDate(d: Date | string | null) {
  const v = iso(d);
  if (!v) return "—";
  const n = daysFromToday(v)!;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  const date = new Date(`${v}T00:00:00Z`);
  const sameYear = v.slice(0, 4) === todayISO().slice(0, 4);
  return date.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function relative(d: Date | string | null) {
  const n = daysFromToday(d);
  if (n === null) return "";
  if (n === 0) return "today";
  if (n > 0) return n === 1 ? "tomorrow" : `in ${n} days`;
  return n === -1 ? "1 day overdue" : `${-n} days overdue`;
}

export function dateTime(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// value for <input type="datetime-local"> in Indian time
export function dateTimeInput(d: Date | string | null) {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(d));
  const g = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export const inr = (n: number | null | undefined) => (n || n === 0 ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

// Indian mobile → wa.me / tel friendly digits
export function phoneDigits(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  return d;
}

// "30 Oct 2026" for messages saved in the history
export function longDate(isoDate: string | null) {
  if (!isoDate) return "";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}
