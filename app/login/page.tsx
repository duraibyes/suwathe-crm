import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-dark px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-12 w-12 rounded-2xl bg-white p-1.5" />
          <div className="leading-tight">
            <p className="text-xl font-extrabold tracking-wide">SUWATHE</p>
            <p className="text-xs font-semibold tracking-[0.25em] text-accent">CRM</p>
          </div>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold">Sign in</h1>
          <p className="mb-5 text-sm text-muted">Leads, follow-ups and renewals</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
