import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSession();
  if (!auth) redirect("/login");

  return <>{children}</>;
}
