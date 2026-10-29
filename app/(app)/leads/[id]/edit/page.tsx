import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { assertLead } from "@/lib/leads";
import { deleteLead } from "@/app/actions";
import LeadForm, { type LeadFormData } from "@/components/LeadForm";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Edit lead" };
export const dynamic = "force-dynamic";

export default async function EditLead({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const id = parseInt((await params).id, 10);
  if (!id) notFound();
  await assertLead(user, id);
  const { error } = await searchParams;
  const [lead, users, leads] = await Promise.all([
    one<LeadFormData>("SELECT * FROM leads WHERE id = $1", [id]),
    query<{ id: number; name: string }>("SELECT id, name FROM users WHERE active ORDER BY name"),
    query<{ id: number; business_name: string }>("SELECT id, business_name FROM leads ORDER BY lower(business_name) LIMIT 1000"),
  ]);
  if (!lead) notFound();

  return (
    <div>
      <PageTitle title="Edit lead" sub={lead.business_name} action={<Link href={`/leads/${id}`} className="btn-ghost">Cancel</Link>} />
      {error === "missing" && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700">Business name and phone are required.</p>}
      <LeadForm lead={lead} users={users} leads={leads} />

      {user.role === "admin" && (
        <form action={deleteLead} className="card mt-10 space-y-3 border-rose-200 p-4 sm:p-5">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-bold text-rose-700">Delete this lead</h2>
          <p className="text-sm text-muted">Removes the lead with all its conversations, payments and renewals. This can't be undone. Type DELETE to confirm.</p>
          {error === "confirm" && <p className="text-sm font-semibold text-rose-700">Type DELETE in capitals to confirm.</p>}
          <div className="flex gap-2">
            <input name="confirm" className="field" placeholder="DELETE" autoComplete="off" aria-label="Type DELETE to confirm" />
            <button className="shrink-0 rounded-full bg-rose-600 px-4 font-bold text-white">Delete</button>
          </div>
        </form>
      )}
    </div>
  );
}
