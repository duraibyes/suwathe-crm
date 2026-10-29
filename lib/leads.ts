import "server-only";
import { redirect } from "next/navigation";
import type { User } from "./auth";
import { one } from "./db";

// Staff see leads assigned to them, created by them, or unassigned. Admin sees everything.
export function scopeSql(user: User, alias = "l", param = "$1") {
  // Admin sees all; the parameter is still referenced so queries keep the same parameter list.
  return user.role === "admin" ? `(${param}::int IS NOT NULL)` : `(${alias}.assigned_to IS NULL OR ${alias}.assigned_to = ${param} OR ${alias}.created_by = ${param})`;
}

export async function assertLead(user: User, id: number) {
  const lead = await one<{ id: number; status: string; assigned_to: number | null; created_by: number | null; won_on: string | null }>(
    "SELECT id, status, assigned_to, created_by, won_on FROM leads WHERE id = $1",
    [id],
  );
  if (!lead) redirect("/leads");
  if (user.role !== "admin" && lead.assigned_to && lead.assigned_to !== user.id && lead.created_by !== user.id) redirect("/leads");
  return lead;
}
