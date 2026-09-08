import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromRequest } from "@/lib/banking-auth";
import { getTransferOtpByTransactionId } from "@/lib/banking";

function getOtpLookupApiKey() {
  return process.env.BANKING_OTP_LOOKUP_API_KEY ?? "watermelon-banking-test-key";
}

function hasValidApiKey(request: NextRequest) {
  const providedKey = request.headers.get("x-api-key") ?? "";
  return providedKey === getOtpLookupApiKey();
}

export async function GET(request: NextRequest) {
  try {
    const session = getBankingSessionFromRequest(request);
    const isApiKeyAuthorized = hasValidApiKey(request);
    const appAccessSession = getBankingAppAccessFromRequest(request);

    if (!isApiKeyAuthorized && !appAccessSession) {
      return NextResponse.json(
        { error: "Unlock the banking test app first." },
        { status: 401 }
      );
    }

    if (!session && !isApiKeyAuthorized) {
      return NextResponse.json(
        { error: "Please sign in or provide a valid API key." },
        { status: 401 }
      );
    }

    const transactionId = request.nextUrl.searchParams.get("transactionId") ?? "";
    const otp = await getTransferOtpByTransactionId({
      username: session?.username,
      transactionId
    });

    if (!otp) {
      return NextResponse.json(
        { error: "No active OTP found for this transaction." },
        { status: 404 }
      );
    }

    return NextResponse.json(otp);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to retrieve OTP."
      },
      { status: 400 }
    );
  }
}
