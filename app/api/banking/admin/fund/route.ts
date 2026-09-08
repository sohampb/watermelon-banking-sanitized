import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { addAdminFunds } from "@/lib/banking";

export async function POST(request: NextRequest) {
  try {
    const appAccessSession = getBankingAppAccessFromRequest(request);

    if (!appAccessSession) {
      return NextResponse.json(
        { error: "Unlock the banking test app first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const accounts = await addAdminFunds({
      username: String(body?.username ?? "").trim(),
      amount: body?.amount
    });

    return NextResponse.json({
      message: "Funds added successfully.",
      accounts
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to add funds."
      },
      { status: 400 }
    );
  }
}
