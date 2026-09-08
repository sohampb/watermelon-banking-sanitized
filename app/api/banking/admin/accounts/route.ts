import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { getAdminBankingAccounts } from "@/lib/banking";

export async function GET(request: NextRequest) {
  try {
    const appAccessSession = getBankingAppAccessFromRequest(request);

    if (!appAccessSession) {
      return NextResponse.json(
        { error: "Unlock the banking test app first." },
        { status: 401 }
      );
    }

    const accounts = await getAdminBankingAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch accounts."
      },
      { status: 500 }
    );
  }
}
