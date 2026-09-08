import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { getBankingSessionFromRequest } from "@/lib/banking-auth";
import { getBankingDashboardData } from "@/lib/banking";

export async function GET(request: NextRequest) {
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

    const dashboard = await getBankingDashboardData(session.username);
    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load dashboard."
      },
      { status: 500 }
    );
  }
}
