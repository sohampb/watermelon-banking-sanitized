import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromRequest } from "@/lib/banking-auth";
import { createTransferOtp } from "@/lib/banking";

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
    const recipientEmail = String(body?.recipientEmail ?? "").trim();
    const destinationUsername = String(body?.destinationUsername ?? "").trim();
    const amount = body?.amount;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Enter an email address to receive the OTP." },
        { status: 400 }
      );
    }

    const result = await createTransferOtp({
      username: session.username,
      recipientEmail,
      destinationUsername,
      amount
    });

    return NextResponse.json({
      message:
        result.mode === "smtp"
          ? `OTP sent for transaction ${result.transactionId}.`
          : "SMTP is unavailable, so the OTP delivery fell back to console logging.",
      delivered: result.delivered,
      transactionId: result.transactionId
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to send OTP."
      },
      { status: 400 }
    );
  }
}
