import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import LeadForm from "@/components/LeadForm";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Add lead" };
export const dynamic = "force-dynamic";

export default async function NewLead({ searchParams }: { searchParams: Promise<{ duplicate?: string; phone?: string; name?: string; error?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const [users, leads] = await Promise.all([
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE active ORDER BY name"),
    query<{ id: number; business_name: string }>("SELECT id, business_name FROM leads ORDER BY lower(business_name) LIMIT 1000"),
  ]);
  const dupId = sp.duplicate ? parseInt(sp.duplicate, 10) : null;

  return (
    <div>
      <PageTitle title="Add lead" sub="A business you found or spoke to" />
      {dupId && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
          <p className="font-semibold">This phone number is already saved.</p>
          <p className="mt-1 text-sm">
            <Link href={`/leads/${dupId}`} className="font-bold underline">Open the existing lead</Link>, or press Save again below to add it anyway.
          </p>
        </div>
      )}
      {sp.error === "missing" && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">Business name and phone are required.</p>}
      <LeadForm users={users} leads={leads} isNew allowDuplicate={!!dupId} lead={dupId ? { phone: sp.phone, business_name: sp.name } : {}} />
    </div>
  );
}
