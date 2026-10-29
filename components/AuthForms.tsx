"use client";

import { useActionState } from "react";
import { changePassword, login } from "@/app/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="label">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" required className="field" defaultValue={state?.username ?? ""} key={state?.username ?? ""} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p>}
      <button disabled={pending} className="btn w-full py-3 disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="current" className="label">Current password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="field" />
      </div>
      <div>
        <label htmlFor="next" className="label">New password (at least 8 characters)</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="field" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">New password again</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="field" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p>}
      <button disabled={pending} className="btn w-full py-3 disabled:opacity-60">{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
