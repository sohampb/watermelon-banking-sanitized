import { NextRequest, NextResponse } from "next/server";
import { getBankingAppAccessFromRequest } from "@/lib/banking-app-access-auth";
import { applyBankingSession } from "@/lib/banking-auth";
import { validateBankingCredentials } from "@/lib/banking";

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
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");
    const disableCaptcha = body?.disableCaptcha === true;
    const captchaAnswer = Number(body?.captchaAnswer ?? NaN);
    const captchaLeft = Number(body?.captchaLeft ?? NaN);
    const captchaRight = Number(body?.captchaRight ?? NaN);

    if (!username || !password) {
      return NextResponse.json(
        { error: "Enter both username and password." },
        { status: 400 }
      );
    }

    const hasValidCaptcha =
      Number.isFinite(captchaAnswer) &&
      Number.isFinite(captchaLeft) &&
      Number.isFinite(captchaRight) &&
      captchaAnswer === captchaLeft + captchaRight;

    if (!disableCaptcha && !hasValidCaptcha) {
      return NextResponse.json({ error: "Captcha answer is incorrect." }, { status: 400 });
    }

    const user = await validateBankingCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid banking username or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      redirectTo: "/banking/dashboard",
      sessionToken: ""
    });

    const sessionToken = applyBankingSession(response, username);
    response.headers.set("Content-Type", "application/json");
    response.headers.set("x-banking-session", sessionToken);
    response.headers.set("Access-Control-Expose-Headers", "x-banking-session");
    response.headers.delete("content-length");

    return NextResponse.json(
      {
        success: true,
        redirectTo: "/banking/dashboard",
        sessionToken
      },
      {
        headers: response.headers
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to sign in."
      },
      { status: 500 }
    );
  }
}
