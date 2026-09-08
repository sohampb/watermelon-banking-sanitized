import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromRequest } from "@/lib/banking-auth";
import { executeTransfer } from "@/lib/banking";

export async function POST(request: NextRequest) {
  try {
    const appAccessSession = getBankingAppAccessFromRequest(request);

    if (!appAccessSession) {
      return NextResponse.json(
        { error: "Unlock the banking test app first." },
        { status: 401 }
      );
    }

    const session = getBankingSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const body = await request.json();
    const result = await executeTransfer({
      username: session.username,
      destinationUsername: String(body?.destinationUsername ?? "").trim(),
      amount: body?.amount,
      otp: String(body?.otp ?? ""),
      recipientEmail: String(body?.recipientEmail ?? "").trim()
    });

    return NextResponse.json({
      message: "Transfer completed successfully.",
      transactionId: result.transactionId,
      dashboard: result.dashboard
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to complete transfer."
      },
      { status: 400 }
    );
  }
}
