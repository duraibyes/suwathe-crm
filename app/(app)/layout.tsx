import Nav from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav name={user.name} admin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-12">{children}</main>
    </>
  );
}
