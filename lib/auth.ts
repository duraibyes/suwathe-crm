import "server-only";
import { createHash, randomBytes, randomInt } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { one, query } from "./db";

export type User = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  role: "admin" | "staff";
  must_change_password: boolean;
};

const COOKIE = "crm_session";
const DAYS = 30;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

// Readable temporary password for new staff / resets, e.g. "Suwathe@k7Pm2x"
export function tempPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "Suwathe@";
  for (let i = 0; i < 6; i++) p += a[randomInt(a.length)];
  return p;
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 864e5);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [hashToken(token), userId, expires]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE id = $1", [hashToken(token)]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return one<User>(
    `SELECT u.id, u.name, u.username, u.phone, u.role, u.must_change_password
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now() AND u.active`,
    [hashToken(token)],
  );
}

// Use in every page and server action that needs a logged-in user.
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.must_change_password && !opts.allowPasswordChange) redirect("/change-password");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

// Returns an error message, or null on success.
export async function checkLogin(username: string, password: string): Promise<{ error: string } | { userId: number }> {
  const u = await one<{ id: number; password_hash: string; active: boolean; failed_logins: number; locked_until: Date | null }>(
    "SELECT id, password_hash, active, failed_logins, locked_until FROM users WHERE lower(username) = lower($1)",
    [username.trim()],
  );
  const generic = { error: "Wrong username or password." };
  if (!u || !u.active) {
    await bcrypt.compare(password, "$2b$10$RocoSon7wYlO3KDE1FJu7.ARxLAX4YaufFC1F/tzMVeL4M3tbtz0u"); // even out timing so unknown usernames aren't detectable
    return generic;
  }
  if (u.locked_until && u.locked_until > new Date()) {
    return { error: "Too many wrong attempts. Try again in 15 minutes." };
  }
  if (!(await bcrypt.compare(password, u.password_hash))) {
    const fails = u.failed_logins + 1;
    await query("UPDATE users SET failed_logins = $2, locked_until = $3 WHERE id = $1", [
      u.id,
      fails >= 5 ? 0 : fails,
      fails >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
    ]);
    return fails >= 5 ? { error: "Too many wrong attempts. Try again in 15 minutes." } : generic;
  }
  await query("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [u.id]);
  return { userId: u.id };
}

export async function verifyPassword(userId: number, password: string) {
  const u = await one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  return !!u && bcrypt.compare(password, u.password_hash);
}
