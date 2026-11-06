import Link from "next/link";

// Small shared bits for the Website admin pages.

export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">{error}</p>;
  if (saved) return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">✓ {saved}</p>;
  return null;
}

export function WebsiteTabs({ active }: { active: "home" | "packages" | "offers" | "blog" }) {
  const tabs = [
    { id: "home", href: "/website", label: "Overview" },
    { id: "packages", href: "/website/packages", label: "Packages" },
    { id: "offers", href: "/website/offers", label: "Offers" },
    { id: "blog", href: "/website/blog", label: "Blog" },
  ];
  return (
    <nav aria-label="Website sections" className="-mx-4 mb-5 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {tabs.map((t) => (
          <li key={t.id}>
            <Link href={t.href} aria-current={active === t.id ? "page" : undefined}
              className={`inline-block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${active === t.id ? "bg-brand text-white" : "bg-white text-ink ring-1 ring-line"}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
