import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const BANKING_APP_ACCESS_COOKIE = "watermelon_banking_app_access";

type CookieGetter = {
  get(name: string): { value: string } | undefined;
};

export type BankingAppAccessSession = {
  username: string;
};

function getSessionSecret() {
  return (
    process.env.BANKING_APP_ACCESS_SECRET ??
    process.env.BANKING_SESSION_SECRET ??
    process.env.SMTP_PASS ??
    "watermelon-banking-app-access-local"
  );
}

function buildSignature(username: string, issuedAt: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${username}:${issuedAt}`)
    .digest("hex");
}

export function createBankingAppAccessValue(username: string) {
  const issuedAt = Date.now().toString();
  const signature = buildSignature(username, issuedAt);

  return `${username}.${issuedAt}.${signature}`;
}

export function readBankingAppAccessValue(
  value: string | undefined
): BankingAppAccessSession | null {
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

export function getBankingAppAccessFromCookies(cookieStore: CookieGetter) {
  return readBankingAppAccessValue(cookieStore.get(BANKING_APP_ACCESS_COOKIE)?.value);
}

export function getBankingAppAccessFromRequest(request: NextRequest) {
  return readBankingAppAccessValue(
    request.cookies.get(BANKING_APP_ACCESS_COOKIE)?.value
  );
}

export function applyBankingAppAccess(response: NextResponse, username: string) {
  const sessionValue = createBankingAppAccessValue(username);

  response.cookies.set(BANKING_APP_ACCESS_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return sessionValue;
}

export function clearBankingAppAccess(response: NextResponse) {
  response.cookies.set(BANKING_APP_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

async function ensureBankingAppAccessTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "banking_app_access_table" (
      "id" TEXT NOT NULL,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "banking_app_access_table_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "banking_app_access_table_username_key"
    ON "banking_app_access_table"("username")
  `);
}

export async function ensureBankingAppAccessSeedData() {
  await ensureBankingAppAccessTable();

  await prisma.bankingAppAccess.deleteMany({
    where: {
      username: {
        in: ["hminds", "qk"]
      }
    }
  });

  for (const credential of [
    { username: "soham", password: "password" },
    { username: "mas", password: "password" },
    { username: "mark", password: "password" }
  ]) {
    await prisma.bankingAppAccess.upsert({
      where: { username: credential.username },
      update: { password: credential.password },
      create: credential
    });
  }
}

export async function validateBankingAppAccessCredentials(
  username: string,
  password: string
) {
  const user = await prisma.bankingAppAccess.findUnique({
    where: {
      username: username.trim()
    }
  });

  if (!user || user.password !== password) {
    return null;
  }

  return {
    username: user.username
  };
}
