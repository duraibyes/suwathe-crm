import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addUser, resetPassword, toggleUser } from "@/app/actions";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireAdmin();
  const { error } = await searchParams;
  const flashRaw = (await cookies()).get("crm_flash")?.value;
  let flash: { kind: string; username: string; name?: string; pw: string } | null = null;
  try { flash = flashRaw ? JSON.parse(flashRaw) : null; } catch {}

  const users = await query<{ id: number; name: string; username: string; phone: string | null; role: string; active: boolean; must_change_password: boolean; leads: number }>(
    `SELECT u.id, u.name, u.username, u.phone, u.role, u.active, u.must_change_password,
            (SELECT count(*)::int FROM leads l WHERE l.assigned_to = u.id AND l.status NOT IN ('won', 'lost')) AS leads
       FROM users u ORDER BY u.active DESC, u.role, u.name`,
  );

  return (
    <div className="space-y-5">
      <PageTitle title="Staff" sub="Who can sign in to the CRM" />

      {flash && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
          <p className="font-bold">{flash.kind === "created" ? `Account created for ${flash.name}` : `Password reset for ${flash.username}`}</p>
          <p className="mt-1 text-sm">Share these with them. The password is shown only now, and they must change it at first sign-in.</p>
          <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-1 rounded-xl bg-white p-3 font-mono text-sm">
            <dt className="text-muted">Username</dt><dd className="font-bold">{flash.username}</dd>
            <dt className="text-muted">Password</dt><dd className="font-bold">{flash.pw}</dd>
          </dl>
        </div>
      )}
      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">
          {error === "taken" ? "That username is already used." : error === "self" ? "You can't deactivate your own account." : "Name and username are required."}
        </p>
      )}

      <ul className="card divide-y divide-line overflow-hidden">
        {users.map((u) => (
          <li key={u.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.active ? "" : "opacity-55"}`}>
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <p className="font-bold">{u.name} {u.id === me.id && <span className="text-sm font-medium text-muted">(you)</span>}</p>
              <p className="text-sm text-muted">
                @{u.username} · {u.role === "admin" ? "Admin" : "Staff"} · {u.leads} open leads
                {u.must_change_password && " · hasn't set password yet"}{!u.active && " · deactivated"}
              </p>
            </div>
            {u.id !== me.id && (
              <div className="flex gap-2">
                <form action={resetPassword}><input type="hidden" name="user_id" value={u.id} /><button className="btn-ghost py-1.5 text-sm">Reset password</button></form>
                <form action={toggleUser}><input type="hidden" name="user_id" value={u.id} /><button className="btn-ghost py-1.5 text-sm">{u.active ? "Deactivate" : "Activate"}</button></form>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form action={addUser} className="card space-y-4 p-4 sm:p-5">
        <h2 className="font-bold">Add staff member</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Full name</span><input name="name" required className="field" /></label>
          <label className="block"><span className="label">Username (for sign-in)</span><input name="username" required autoCapitalize="none" pattern="[A-Za-z0-9._-]+" className="field" placeholder="e.g. priya" /></label>
          <label className="block"><span className="label">Phone</span><input name="phone" inputMode="tel" className="field" /></label>
          <label className="block"><span className="label">Role</span>
            <select name="role" className="field" defaultValue="staff">
              <option value="staff">Staff: sees their own and unassigned leads</option>
              <option value="admin">Admin: sees everything, manages staff</option>
            </select>
          </label>
        </div>
        <button className="btn">Create account</button>
        <p className="text-sm text-muted">A temporary password is created and shown once on this page.</p>
      </form>
    </div>
  );
}
