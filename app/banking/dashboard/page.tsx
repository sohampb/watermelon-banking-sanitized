import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/banking/dashboard-shell";
import { getBankingDashboardData } from "@/lib/banking";
import { getBankingAppAccessFromCookies } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromCookies } from "@/lib/banking-auth";

export default async function BankingDashboardPage() {
  const cookieStore = await cookies();
  const appAccessSession = getBankingAppAccessFromCookies(cookieStore);

  if (!appAccessSession) {
    redirect("/banking");
  }

  const session = getBankingSessionFromCookies(cookieStore);

  if (!session) {
    redirect("/banking");
  }

  const dashboard = await getBankingDashboardData(session.username);

  return <DashboardShell initialData={dashboard} />;
}
