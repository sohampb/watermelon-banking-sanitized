import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const BANKING_SESSION_COOKIE = "watermelon_banking_session";

type CookieGetter = {
  get(name: string): { value: string } | undefined;
};

export type BankingSession = {
  username: string;
};

function getSessionSecret() {
  return process.env.BANKING_SESSION_SECRET ?? process.env.SMTP_PASS ?? "watermelon-banking-local";
}

function buildSignature(username: string, issuedAt: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${username}:${issuedAt}`)
    .digest("hex");
}

export function createBankingSessionValue(username: string) {
  const issuedAt = Date.now().toString();
  const signature = buildSignature(username, issuedAt);
  return `${username}.${issuedAt}.${signature}`;
}

export function readBankingSessionValue(value: string | undefined): BankingSession | null {
  if (!value) {
    return null;
  }

  const [username, issuedAt, signature] = value.split(".");

  if (!username || !issuedAt || !signature) {
    return null;
  }

  const expectedSignature = buildSignature(username, issuedAt);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  return { username };
}

export function getBankingSessionFromCookies(cookieStore: CookieGetter) {
  return readBankingSessionValue(cookieStore.get(BANKING_SESSION_COOKIE)?.value);
}

export function getBankingSessionFromRequest(request: NextRequest) {
  const cookieSession = getBankingSessionFromCookies(request.cookies);

  if (cookieSession) {
    return cookieSession;
  }

  const headerToken =
    request.headers.get("x-banking-session") ??
    request.headers.get("X-Banking-Session") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return readBankingSessionValue(headerToken ?? undefined);
}

export function applyBankingSession(response: NextResponse, username: string) {
  const sessionValue = createBankingSessionValue(username);

  response.cookies.set(BANKING_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return sessionValue;
}

export function clearBankingSession(response: NextResponse) {
  response.cookies.set(BANKING_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
