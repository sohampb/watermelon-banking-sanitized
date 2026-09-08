# Watermelon Banking

A sample banking simulator for balances, transfers, OTP authorization, account statements, and an admin funding console.

This repository contains only the Watermelon banking application and banking mobile app. It does not include the life insurance app or the training platform.

## Runtime Stack

- Next.js App Router
- Prisma
- PostgreSQL, tested with Supabase Postgres
- Vercel for hosting
- Expo/React Native mobile app under `mobile/banking-mobile`

## Secrets

No production secrets are committed. Create your own `.env` from `.env.example`.

Required database variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

Optional email variables for OTP and statement delivery:

```env
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
FROM_EMAIL="noreply@example.com"
NEXT_PUBLIC_APP_URL="https://your-deployed-banking-app.example.com"
```

## Database

The authoritative database schema is `prisma/schema.prisma`.

Models:

- `BankingAppAccess`: simple demo access credentials for the protected banking entry page.
- `BankUser`: demo banking customer users.
- `BankAccount`: one account per demo user with balance.
- `BankTransaction`: debit, credit, transfer, and admin funding transaction records.
- `BankOtp`: transfer OTP records.

To create tables in a new Supabase or PostgreSQL database:

```bash
npm install
npm run prisma:generate
npm run prisma:push
```

## Main Code Areas

- Banking login and dashboard: `app/banking/page.tsx`, `app/banking/dashboard/page.tsx`
- Banking admin console: `app/banking/admin/page.tsx`, `components/banking/admin-panel.tsx`
- Banking APIs: `app/api/banking/`
- Banking app-access APIs: `app/api/banking-access/`
- Banking service logic: `lib/banking.ts`
- Banking session helpers: `lib/banking-auth.ts`
- Prisma client: `lib/prisma.ts`
- Database schema: `prisma/schema.prisma`
- API documentation: `docs/banking-api/`

## Mobile App

The React Native banking app is in `mobile/banking-mobile`.

After deploying your own backend, update `API_BASE_URL` in `mobile/banking-mobile/App.js`.

## Local Run

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Open `http://localhost:3000/banking`.
