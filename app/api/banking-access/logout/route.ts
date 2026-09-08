import { NextResponse } from "next/server";
import { clearBankingAppAccess } from "@/lib/banking-app-access-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearBankingAppAccess(response);

  return response;
}
