"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hashPassword, requireAdmin, requireUser, tempPassword } from "@/lib/auth";
import { assertLead } from "@/lib/leads";
import { one, pool, query } from "@/lib/db";
import { STATUSES, activityType, status as statusOf } from "@/lib/constants";
import { addDays, addMonths, longDate, todayISO } from "@/lib/format";

// ── helpers ─────────────────────────────────────────────
const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v ? v.slice(0, 2000) : null;
};
const int = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").replace(/[^\d]/g, "");
  return v ? Math.min(parseInt(v, 10), 2_000_000_000) : null;
};
const date = (f: FormData, k: string) => {
  const v = str(f, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
// Only allow redirects back to pages inside this app
const back = (f: FormData, fallback: string) => {
  const v = String(f.get("back") ?? "");
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
};
const validStatus = (s: string | null) => (STATUSES.some((x) => x.id === s) ? s! : null);

async function log(leadId: number, userId: number, type: string, summary: string) {
  await query("INSERT INTO activities (lead_id, user_id, type, summary) VALUES ($1, $2, $3, $4)", [leadId, userId, type, summary]);
}

// Follow-up presets: "+1", "+7", "+30", "+90" (days) or a date
function followUpValue(f: FormData, k = "follow_up") {
  const v = str(f, k);
  if (!v) return { set: false as const };
  if (v === "clear") return { set: true as const, value: null };
  if (/^\+\d+$/.test(v)) return { set: true as const, value: addDays(todayISO(), parseInt(v.slice(1), 10)) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { set: true as const, value: v };
  return { set: false as const };
}

// ── leads ───────────────────────────────────────────────
export async function saveLead(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id");
  const business = str(f, "business_name");
  const phone = str(f, "phone");
  if (!business || !phone) redirect(id ? `/leads/${id}/edit?error=missing` : "/leads/new?error=missing");

  const status = validStatus(str(f, "status")) ?? "new";
  const meeting = str(f, "meeting_at");
  const fields: Record<string, unknown> = {
    business_name: business,
    contact_name: str(f, "contact_name"),
    phone,
    alt_phone: str(f, "alt_phone"),
    business_type: str(f, "business_type"),
    area: str(f, "area"),
    city: str(f, "city"),
    website_status: str(f, "website_status"),
    current_website: str(f, "current_website"),
    source: str(f, "source"),
    referred_by_lead_id: int(f, "referred_by_lead_id"),
    referred_by_name: str(f, "referred_by_name"),
    interest: str(f, "interest"),
    quoted_amount: int(f, "quoted_amount"),
    deal_amount: int(f, "deal_amount"),
    status,
    next_follow_up: date(f, "next_follow_up"),
    meeting_at: meeting ? new Date(`${meeting}:00+05:30`) : null,
    lost_reason: str(f, "lost_reason"),
    notes: str(f, "notes"),
  };
  // The "Assigned to" box only appears when there is more than one user.
  // New leads default to whoever adds them; editing without the box keeps the current owner.
  const assign = f.has("assigned_to") ? { assigned_to: int(f, "assigned_to") } : id ? {} : { assigned_to: user.id };
  Object.assign(fields, assign);

  if (id) {
    const before = await assertLead(user, id);
    if (fields.referred_by_lead_id === id) fields.referred_by_lead_id = null;
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const wonOn = status === "won" && !before.won_on ? todayISO() : before.won_on;
    // Closing a lead (won / lost) clears its follow-up, same as the status buttons
    if (before.status !== status && (status === "won" || status === "lost")) fields.next_follow_up = null;
    await query(`UPDATE leads SET ${sets}, won_on = $${keys.length + 2}, updated_at = now() WHERE id = $1`, [id, ...keys.map((k) => fields[k]), wonOn]);
    if (before.status !== status) await log(id, user.id, "status", `Status: ${statusOf(before.status).en} → ${statusOf(status).en}`);
    revalidatePath("/", "layout");
    redirect(`/leads/${id}`);
  }

  // Warn about duplicates by phone (last 10 digits)
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length === 10 && f.get("allow_duplicate") !== "1") {
    const dup = await one<{ id: number }>("SELECT id FROM leads WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = $1 LIMIT 1", [digits]);
    if (dup) redirect(`/leads/new?duplicate=${dup.id}&phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(business)}`);
  }

  const keys = Object.keys(fields);
  const row = await one<{ id: number }>(
    `INSERT INTO leads (${keys.join(", ")}, created_by, won_on) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}, $${keys.length + 1}, $${keys.length + 2}) RETURNING id`,
    [...keys.map((k) => fields[k]), user.id, status === "won" ? todayISO() : null],
  );
  await log(row!.id, user.id, "note", "Lead added");
  const first = str(f, "first_note");
  if (first) await log(row!.id, user.id, str(f, "first_type") ?? "note", first);
  revalidatePath("/", "layout");
  redirect(`/leads/${row!.id}?added=1`);
}

export async function setStatus(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  const before = await assertLead(user, id);
  const next = validStatus(str(f, "status"));
  if (!next || next === before.status) redirect(`/leads/${id}`);
  const lost = next === "lost" ? str(f, "lost_reason") : null;
  await query(
    `UPDATE leads SET status = $2, lost_reason = COALESCE($3, lost_reason), won_on = CASE WHEN $2 = 'won' AND won_on IS NULL THEN $4::date ELSE won_on END,
       next_follow_up = CASE WHEN $2 IN ('won', 'lost') THEN NULL ELSE next_follow_up END, updated_at = now() WHERE id = $1`,
    [id, next, lost, todayISO()],
  );
  await log(id, user.id, "status", `Status: ${statusOf(before.status).en} → ${statusOf(next).en}${lost ? ` (${lost})` : ""}`);
  revalidatePath("/", "layout");
  redirect(`/leads/${id}`);
}

export async function setFollowUp(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  await assertLead(user, id);
  const fu = followUpValue(f);
  if (fu.set) {
    await query("UPDATE leads SET next_follow_up = $2, updated_at = now() WHERE id = $1", [id, fu.value]);
    await log(id, user.id, "followup", fu.value ? `Next follow-up set for ${longDate(fu.value)}` : "Follow-up cleared");
  }
  revalidatePath("/", "layout");
  redirect(back(f, `/leads/${id}`));
}

export async function logActivity(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  const before = await assertLead(user, id);
  const summary = str(f, "summary");
  const type = activityType(str(f, "type") ?? "note").id;
  if (!summary) redirect(`/leads/${id}?error=summary`);
  await log(id, user.id, type, summary);

  const fu = followUpValue(f);
  const next = validStatus(str(f, "status"));
  const updates: string[] = ["updated_at = now()"];
  const params: unknown[] = [id];
  if (fu.set) {
    params.push(fu.value);
    updates.push(`next_follow_up = $${params.length}`);
  }
  if (next && next !== before.status) {
    params.push(next);
    updates.push(`status = $${params.length}`);
    if (next === "won") {
      params.push(todayISO());
      updates.push(`won_on = COALESCE(won_on, $${params.length}::date)`);
    }
    await log(id, user.id, "status", `Status: ${statusOf(before.status).en} → ${statusOf(next).en}`);
  } else if (before.status === "new" && type !== "note") {
    updates.push("status = 'contacted'");
    await log(id, user.id, "status", "Status: New → Contacted");
  }
  await query(`UPDATE leads SET ${updates.join(", ")} WHERE id = $1`, params);
  revalidatePath("/", "layout");
  redirect(`/leads/${id}`);
}

export async function deleteActivity(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  const act = await one<{ lead_id: number; user_id: number }>("SELECT lead_id, user_id FROM activities WHERE id = $1", [id]);
  if (!act) redirect("/leads");
  await assertLead(user, act.lead_id);
  if (user.role !== "admin" && act.user_id !== user.id) redirect(`/leads/${act.lead_id}`);
  await query("DELETE FROM activities WHERE id = $1", [id]);
  revalidatePath(`/leads/${act.lead_id}`);
  redirect(`/leads/${act.lead_id}`);
}

export async function deleteLead(f: FormData) {
  await requireAdmin();
  const id = int(f, "id")!;
  if (str(f, "confirm") !== "DELETE") redirect(`/leads/${id}/edit?error=confirm`);
  await query("DELETE FROM leads WHERE id = $1", [id]);
  revalidatePath("/", "layout");
  redirect("/leads?deleted=1");
}

// ── money ───────────────────────────────────────────────
export async function addPayment(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  await assertLead(user, id);
  const amount = int(f, "amount");
  if (!amount) redirect(`/leads/${id}?error=amount#money`);
  const paidOn = date(f, "paid_on") ?? todayISO();
  const mode = str(f, "mode");
  const kind = str(f, "kind") === "renewal" ? "renewal" : "project";
  await query("INSERT INTO payments (lead_id, amount, paid_on, mode, note, created_by, kind) VALUES ($1, $2, $3, $4, $5, $6, $7)", [id, amount, paidOn, mode, str(f, "note"), user.id, kind]);
  await log(id, user.id, "payment", `Payment received: ₹${amount.toLocaleString("en-IN")}${mode ? ` by ${mode}` : ""}`);
  revalidatePath("/", "layout");
  redirect(`/leads/${id}#money`);
}

export async function deletePayment(f: FormData) {
  const user = await requireAdmin();
  const pid = int(f, "payment_id")!;
  const p = await one<{ lead_id: number; amount: number }>("SELECT lead_id, amount FROM payments WHERE id = $1", [pid]);
  if (!p) redirect("/leads");
  await query("DELETE FROM payments WHERE id = $1", [pid]);
  await log(p.lead_id, user.id, "payment", `Payment of ₹${p.amount.toLocaleString("en-IN")} removed`);
  revalidatePath("/", "layout");
  redirect(`/leads/${p.lead_id}#money`);
}

export async function saveReferral(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  await assertLead(user, id);
  await query("UPDATE leads SET referral_reward = $2, referral_reward_paid = $3, updated_at = now() WHERE id = $1", [id, int(f, "referral_reward"), f.get("referral_reward_paid") === "on"]);
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}#referral`);
}

// ── renewals ────────────────────────────────────────────
export async function addRenewal(f: FormData) {
  const user = await requireUser();
  const id = int(f, "id")!;
  await assertLead(user, id);
  const item = str(f, "item");
  const due = date(f, "due_date");
  if (!item || !due) redirect(`/leads/${id}?error=renewal#renewals`);
  const cycle = [1, 3, 6, 12, 24].includes(int(f, "cycle_months") ?? 12) ? int(f, "cycle_months") ?? 12 : 12;
  await query("INSERT INTO renewals (lead_id, item, amount, due_date, cycle_months, notes) VALUES ($1, $2, $3, $4, $5, $6)", [id, item, int(f, "amount"), due, cycle, str(f, "notes")]);
  await log(id, user.id, "renewal", `Renewal added: ${item}, due ${longDate(due)}`);
  revalidatePath("/", "layout");
  redirect(`/leads/${id}#renewals`);
}

// Marks a renewal as done: moves the due date forward one cycle and records the payment.
export async function renewNow(f: FormData) {
  const user = await requireUser();
  const rid = int(f, "renewal_id")!;
  const r = await one<{ lead_id: number; item: string; amount: number | null; due_date: string; cycle_months: number }>(
    "SELECT lead_id, item, amount, due_date, cycle_months FROM renewals WHERE id = $1",
    [rid],
  );
  if (!r) redirect("/renewals");
  await assertLead(user, r.lead_id);
  const nextDue = addMonths(r.due_date, r.cycle_months);
  const amount = int(f, "amount") ?? r.amount;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE renewals SET due_date = $2, last_renewed_on = $3, amount = COALESCE($4, amount) WHERE id = $1", [rid, nextDue, todayISO(), amount]);
    if (amount && f.get("record_payment") === "on") {
      await client.query("INSERT INTO payments (lead_id, amount, paid_on, mode, note, created_by, kind) VALUES ($1, $2, $3, $4, $5, $6, 'renewal')", [r.lead_id, amount, todayISO(), str(f, "mode"), `${r.item} renewal`, user.id]);
    }
    await client.query("INSERT INTO activities (lead_id, user_id, type, summary) VALUES ($1, $2, 'renewal', $3)", [r.lead_id, user.id, `${r.item} renewed${amount ? ` for ₹${amount.toLocaleString("en-IN")}` : ""}. Next due ${longDate(nextDue)}`]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
  redirect(back(f, `/leads/${r.lead_id}#renewals`));
}

export async function stopRenewal(f: FormData) {
  const user = await requireUser();
  const rid = int(f, "renewal_id")!;
  const r = await one<{ lead_id: number; item: string }>("SELECT lead_id, item FROM renewals WHERE id = $1", [rid]);
  if (!r) redirect("/renewals");
  await assertLead(user, r.lead_id);
  await query("UPDATE renewals SET active = FALSE WHERE id = $1", [rid]);
  await log(r.lead_id, user.id, "renewal", `${r.item} renewal stopped`);
  revalidatePath("/", "layout");
  redirect(`/leads/${r.lead_id}#renewals`);
}

// ── staff (admin only) ──────────────────────────────────
// A temporary password is shown once via a short-lived, httpOnly cookie (never in the URL).
async function flash(data: Record<string, string>) {
  (await cookies()).set("crm_flash", JSON.stringify(data), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/users", maxAge: 120 });
}

export async function addUser(f: FormData) {
  await requireAdmin();
  const name = str(f, "name");
  const username = str(f, "username")?.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!name || !username) redirect("/users?error=missing");
  if (await one("SELECT 1 FROM users WHERE lower(username) = $1", [username])) redirect("/users?error=taken");
  const pw = tempPassword();
  const role = str(f, "role") === "admin" ? "admin" : "staff";
  await query("INSERT INTO users (name, username, phone, role, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, TRUE)", [name, username, str(f, "phone"), role, await hashPassword(pw)]);
  await flash({ kind: "created", username: username!, name: name!, pw });
  redirect("/users");
}

export async function resetPassword(f: FormData) {
  const admin = await requireAdmin();
  const uid = int(f, "user_id")!;
  if (uid === admin.id) redirect("/account");
  const u = await one<{ username: string }>("SELECT username FROM users WHERE id = $1", [uid]);
  if (!u) redirect("/users");
  const pw = tempPassword();
  await query("UPDATE users SET password_hash = $2, must_change_password = TRUE, failed_logins = 0, locked_until = NULL WHERE id = $1", [uid, await hashPassword(pw)]);
  await query("DELETE FROM sessions WHERE user_id = $1", [uid]);
  await flash({ kind: "reset", username: u.username, pw });
  redirect("/users");
}

export async function toggleUser(f: FormData) {
  const admin = await requireAdmin();
  const uid = int(f, "user_id")!;
  if (uid === admin.id) redirect("/users?error=self");
  await query("UPDATE users SET active = NOT active WHERE id = $1", [uid]);
  await query("DELETE FROM sessions WHERE user_id = $1 AND NOT (SELECT active FROM users WHERE id = $1)", [uid]);
  revalidatePath("/users");
  redirect("/users");
}
