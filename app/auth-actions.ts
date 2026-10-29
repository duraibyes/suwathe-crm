"use server";

import { redirect } from "next/navigation";
import { checkLogin, createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export type FormState = { error?: string; ok?: string; username?: string } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password.", username };
  const res = await checkLogin(username, password);
  if ("error" in res) return { error: res.error, username };
  await createSession(res.userId);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowPasswordChange: true });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!(await verifyPassword(user.id, current))) return { error: "Current password is wrong." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  if (next === current) return { error: "Choose a password different from the temporary one." };
  await query("UPDATE users SET password_hash = $2, must_change_password = FALSE WHERE id = $1", [user.id, await hashPassword(next)]);
  // sign out other devices
  await query("DELETE FROM sessions WHERE user_id = $1 AND created_at < now() - interval '1 second'", [user.id]);
  await createSession(user.id);
  redirect("/?welcome=1");
}
