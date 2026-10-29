"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  today: <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />,
  leads: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />,
  add: <path d="M12 5v14M5 12h14" />,
  renewals: <path d="M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4" />,
  more: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
};
const Icon = ({ k, className = "h-6 w-6" }: { k: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[k]}</svg>
);

export default function Nav({ name, admin }: { name: string; admin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", k: "today", label: "Today" },
    { href: "/leads", k: "leads", label: "Leads" },
    { href: "/leads/new", k: "add", label: "Add lead" },
    { href: "/renewals", k: "renewals", label: "Renewals" },
    { href: "/account", k: "more", label: admin ? "Account & staff" : "Account" },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : href === "/leads" ? path === "/leads" || (path.startsWith("/leads/") && path !== "/leads/new") : path.startsWith(href) || (href === "/account" && path.startsWith("/users")));

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-brand-dark text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-lg bg-white p-1" />
            <span className="leading-none">
              <span className="block text-[0.95rem] font-extrabold tracking-wide">SUWATHE</span>
              <span className="block text-[0.6rem] font-semibold tracking-[0.25em] text-accent">CRM</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map((i) => (
              <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${i.k === "add" ? "bg-accent text-brand-dark" : active(i.href) ? "bg-white/15" : "text-white/75 hover:text-white"}`}>
                {i.k === "add" ? "+ Add lead" : i.label}
              </Link>
            ))}
          </nav>
          <span className="truncate text-sm text-white/70 md:hidden">{name}</span>
        </div>
      </header>

      {/* Bottom bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        <ul className="grid grid-cols-5">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[0.68rem] font-semibold ${active(i.href) ? "text-brand" : "text-muted"}`}>
                {i.k === "add" ? (
                  <span className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30"><Icon k="add" /></span>
                ) : (
                  <Icon k={i.k} />
                )}
                <span className={i.k === "add" ? "mt-0.5" : ""}>{i.k === "more" ? "Account" : i.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
