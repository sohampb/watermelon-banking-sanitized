import { NextResponse } from "next/server";
import { clearBankingSession } from "@/lib/banking-auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    redirectTo: "/banking"
  });

  clearBankingSession(response);
  return response;
}
