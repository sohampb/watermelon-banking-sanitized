import { NextRequest, NextResponse } from "next/server";
import {
  applyBankingAppAccess,
  ensureBankingAppAccessSeedData,
  validateBankingAppAccessCredentials
} from "@/lib/banking-app-access-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Enter username and password." },
        { status: 400 }
      );
    }

    await ensureBankingAppAccessSeedData();

    const user = await validateBankingAppAccessCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, username: user.username });
    applyBankingAppAccess(response, user.username);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to unlock banking access."
      },
      { status: 500 }
    );
  }
}
