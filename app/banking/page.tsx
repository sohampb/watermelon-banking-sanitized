import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BankingAppAccessLoginForm } from "@/components/banking/app-access-login-form";
import { LoginForm } from "@/components/banking/login-form";
import { getBankingAppAccessFromCookies } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromCookies } from "@/lib/banking-auth";

export default async function BankingLoginPage() {
  const cookieStore = await cookies();
  const appAccessSession = getBankingAppAccessFromCookies(cookieStore);

  if (!appAccessSession) {
    return <BankingAppAccessLoginForm />;
  }

  const session = getBankingSessionFromCookies(cookieStore);

  if (session) {
    redirect("/banking/dashboard");
  }

  return <LoginForm />;
}
