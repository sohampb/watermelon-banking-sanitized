import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/banking/admin-panel";
import { getAdminBankingAccounts } from "@/lib/banking";
import { getBankingAppAccessFromCookies } from "@/lib/banking-app-access-auth";

export const dynamic = "force-dynamic";

export default async function BankingAdminPage() {
  const cookieStore = await cookies();
  const appAccessSession = getBankingAppAccessFromCookies(cookieStore);

  if (!appAccessSession) {
    redirect("/banking");
  }

  const accounts = await getAdminBankingAccounts();

  return <AdminPanel initialAccounts={accounts} />;
}
