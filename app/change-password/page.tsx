import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <h1 className="text-xl font-bold">{user.must_change_password ? "Set your own password" : "Change password"}</h1>
          <p className="mb-5 text-sm text-muted">
            {user.must_change_password
              ? `Hi ${user.name.split(" ")[0]}, you signed in with a temporary password. Choose a new one to continue.`
              : "Choose a new password for your account."}
          </p>
          <ChangePasswordForm />
        </div>
        <form action={logout} className="mt-4 text-center">
          <button className="text-sm font-semibold text-muted underline underline-offset-4">Sign out</button>
        </form>
      </div>
    </main>
  );
}
