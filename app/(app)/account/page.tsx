import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <PageTitle title="Account" sub={`${user.name} · @${user.username} · ${user.role === "admin" ? "Admin" : "Staff"}`} />
      <ul className="card divide-y divide-line overflow-hidden">
        {user.role === "admin" && (
          <li><Link href="/users" className="flex items-center justify-between px-4 py-4 font-semibold">Staff accounts <span className="text-muted">→</span></Link></li>
        )}
        <li><Link href="/change-password" className="flex items-center justify-between px-4 py-4 font-semibold">Change password <span className="text-muted">→</span></Link></li>
      </ul>
      <div className="card p-4 text-sm text-muted">
        <p className="font-semibold text-ink">Use it like an app</p>
        <p className="mt-1">On your phone, open this site in Chrome, tap ⋮ and choose <strong>Add to Home screen</strong>. On iPhone, use Safari&apos;s Share button → <strong>Add to Home Screen</strong>.</p>
      </div>
      <form action={logout}>
        <button className="btn-ghost w-full py-3 text-rose-700">Sign out</button>
      </form>
    </div>
  );
}
