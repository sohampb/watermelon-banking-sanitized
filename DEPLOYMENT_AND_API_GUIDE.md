# Watermelon Banking Deployment And API Guide

This repo is a standalone Next.js banking simulator with customer login, dashboard, transfer OTP, account statements, and admin funding flows.

It does not include production secrets. Use your own PostgreSQL database and runtime environment variables.

## 1. Create The Database Backend

Use any hosted PostgreSQL database. Supabase Postgres works well because it provides a managed PostgreSQL database and pooled connection strings.

### Supabase Setup

1. Create a new Supabase project.
2. Save the database password securely.
3. Open the project database connection settings.
4. Copy a pooled PostgreSQL connection string for app runtime use.
5. Copy a direct PostgreSQL connection string for Prisma schema pushes or migrations.
6. Put those values into `DATABASE_URL` and `DIRECT_URL`.

The connection strings should look like this shape:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
```

### Schema

The canonical schema is in `prisma/schema.prisma`.

```prisma
model BankingAppAccess {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("banking_app_access_table")
}

model BankUser {
  id           String            @id @default(cuid())
  username     String            @unique
  password     String
  displayName  String
  email        String
  account      BankAccount?
  initiatedTxs BankTransaction[] @relation("InitiatedTransactions")
  otps         BankOtp[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
}

model BankAccount {
  id                   String            @id @default(cuid())
  accountNumber        String            @unique
  balanceInCents       Int               @default(0)
  userId               String            @unique
  user                 BankUser          @relation(fields: [userId], references: [id], onDelete: Cascade)
  outgoingTransactions BankTransaction[] @relation("SourceTransactions")
  incomingTransactions BankTransaction[] @relation("DestinationTransactions")
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
}

model BankTransaction {
  id                             String       @id @default(cuid())
  transactionId                  String       @unique
  transactionType                String
  amountInCents                  Int
  description                    String
  sourceAccountId                String?
  destinationAccountId           String?
  initiatedByUserId              String?
  sourceBalanceAfterInCents      Int?
  destinationBalanceAfterInCents Int?
  metadataJson                   String?
  createdAt                      DateTime     @default(now())
  sourceAccount                  BankAccount? @relation("SourceTransactions", fields: [sourceAccountId], references: [id], onDelete: SetNull)
  destinationAccount             BankAccount? @relation("DestinationTransactions", fields: [destinationAccountId], references: [id], onDelete: SetNull)
  initiatedByUser                BankUser?    @relation("InitiatedTransactions", fields: [initiatedByUserId], references: [id], onDelete: SetNull)
}

model BankOtp {
  id             String    @id @default(cuid())
  code           String
  purpose        String
  recipientEmail String
  expiresAt      DateTime
  consumedAt     DateTime?
  userId         String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  user           BankUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

To create the tables:

```bash
npm install
npm run prisma:generate
npm run prisma:push
```

`prisma:push` reads `DATABASE_URL` and `DIRECT_URL`; run it only after setting the environment variables.

## 2. Add Secrets And Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Set these variables locally and in your deployment provider's environment variable settings.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection used by Prisma at runtime. |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection used by Prisma schema operations. |
| `BANKING_APP_ACCESS_SECRET` | Strongly recommended | HMAC secret for the banking app-access cookie. Use a long random string. |
| `BANKING_SESSION_SECRET` | Strongly recommended | HMAC secret for customer banking sessions. Use a long random string. |
| `BANKING_OTP_LOOKUP_API_KEY` | Recommended | API key accepted by the OTP lookup endpoint for test automation. |
| `SMTP_HOST` | Optional | SMTP host for transfer OTP and statement email delivery. |
| `SMTP_PORT` | Optional | SMTP port, usually `587` or `465`. |
| `SMTP_USER` | Optional | SMTP username. |
| `SMTP_PASS` | Optional | SMTP password. |
| `FROM_EMAIL` | Optional | Sender address for emails. |
| `NEXT_PUBLIC_APP_URL` | Optional | Public URL of the deployed app, used for internal navigation links. |

If SMTP variables are missing, OTP and statement email delivery falls back to console behavior. This is useful for demos, but not for production-like use.

## 3. Deployment Configuration

This app can be deployed to any platform that supports Next.js and Node.js.

General configuration:

1. Install dependencies with `npm install`.
2. Set all required environment variables in the deployment environment.
3. Run `npm run prisma:generate` during install/build if the platform does not already run it.
4. Run `npm run prisma:push` once against the target database to create/update tables.
5. Build with `npm run build`.
6. Start with `npm run start`, or use the platform's standard Next.js runtime.

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

Useful routes:

- `/` redirects to `/banking`
- `/banking` banking access and customer login
- `/banking/dashboard` customer dashboard
- `/banking/admin` admin funding console

Mobile app:

- `mobile/banking-mobile/App.js`

After deploying the backend, update the `API_BASE_URL` constant to your deployed backend URL.

## 4. API Authentication

The banking API has two session layers:

1. App access session from `POST /api/banking-access/login`.
2. Customer banking session from `POST /api/banking/login`.

Most banking APIs require both. Browser flows use HTTP-only cookies. Mobile/API clients can use the `x-banking-session` response header from login as the `x-banking-session` request header on protected customer APIs.

The OTP lookup endpoint can also be authorized by `x-api-key` using `BANKING_OTP_LOOKUP_API_KEY`.

## 5. API Reference

Sample IDs below are examples. Replace them with values returned by your database.

### POST `/api/banking-access/login`

Unlocks the banking test app and creates the app-access cookie.

Request:

```json
{
  "username": "soham",
  "password": "soham"
}
```

Success response:

```json
{
  "ok": true,
  "username": "soham"
}
```

Errors:

```json
{ "error": "Enter username and password." }
```

```json
{ "error": "Invalid username or password." }
```

### POST `/api/banking-access/logout`

Clears the app-access cookie.

Success response:

```json
{ "ok": true }
```

### POST `/api/banking/login`

Signs in a seeded demo banking user. Requires app-access cookie.

Request:

```json
{
  "username": "bankinguser1",
  "password": "password",
  "captchaLeft": 2,
  "captchaRight": 3,
  "captchaAnswer": 5
}
```

Automation-friendly request:

```json
{
  "username": "bankinguser1",
  "password": "password",
  "disableCaptcha": true
}
```

Success response:

```json
{
  "success": true,
  "redirectTo": "/banking/dashboard",
  "sessionToken": "bankinguser1.1775300000000.signature"
}
```

Response header:

```http
x-banking-session: bankinguser1.1775300000000.signature
```

Errors:

```json
{ "error": "Unlock the banking test app first." }
```

```json
{ "error": "Captcha answer is incorrect." }
```

```json
{ "error": "Invalid banking username or password." }
```

### POST `/api/banking/logout`

Clears the customer banking session cookie.

Success response:

```json
{
  "success": true,
  "redirectTo": "/banking"
}
```

### GET `/api/banking/dashboard`

Returns user balance, transfer destinations, and recent transactions. Requires app-access and banking session.

Success response:

```json
{
  "dashboard": {
    "user": {
      "username": "bankinguser1",
      "displayName": "Banking User 1",
      "email": "bankinguser1@example.com",
      "accountNumber": "1000000001",
      "balanceInCents": 2500000,
      "balanceDisplay": "₹25,000.00"
    },
    "transferDestinations": [
      {
        "username": "bankinguser2",
        "displayName": "Banking User 2",
        "accountNumber": "1000000002"
      }
    ],
    "recentTransactions": [
      {
        "transactionId": "TXN1775300000000",
        "transactionType": "ADMIN_CREDIT",
        "amountInCents": 500000,
        "amountDisplay": "₹5,000.00",
        "description": "Admin funding for Banking User 1",
        "createdAt": "2026-09-08T10:00:00.000Z"
      }
    ]
  }
}
```

### POST `/api/banking/transfer/send-otp`

Creates a transfer OTP. Requires app-access and banking session.

Request:

```json
{
  "recipientEmail": "tester@example.com",
  "destinationUsername": "bankinguser2",
  "amount": 250
}
```

Success response:

```json
{
  "message": "SMTP is unavailable, so the OTP delivery fell back to console logging.",
  "delivered": false,
  "transactionId": "BOTP1775300000000"
}
```

### GET `/api/banking/transfer/otp?transactionId=BOTP1775300000000`

Returns the active OTP for a transaction. This is intended for demos/test automation.

Authorize with either app-access plus banking session, or:

```http
x-api-key: your-banking-otp-lookup-api-key
```

Success response:

```json
{
  "transactionId": "BOTP1775300000000",
  "otp": "123456",
  "recipientEmail": "tester@example.com",
  "expiresAt": "2026-09-08T10:10:00.000Z"
}
```

Errors:

```json
{ "error": "No active OTP found for this transaction." }
```

### POST `/api/banking/transfer`

Verifies OTP and transfers funds. Requires app-access and banking session.

Request:

```json
{
  "destinationUsername": "bankinguser2",
  "amount": 250,
  "otp": "123456",
  "recipientEmail": "tester@example.com"
}
```

Success response:

```json
{
  "message": "Transfer completed successfully.",
  "transactionId": "BOTP1775300000000",
  "dashboard": {
    "user": {
      "username": "bankinguser1",
      "balanceInCents": 2475000,
      "balanceDisplay": "₹24,750.00"
    },
    "transferDestinations": [],
    "recentTransactions": []
  }
}
```

Errors:

```json
{ "error": "OTP is invalid or expired." }
```

```json
{ "error": "Insufficient balance in the savings account." }
```

### POST `/api/banking/statement`

Generates an account statement workbook as base64. Requires app-access and banking session.

Request:

```json
{
  "transactionCount": 10,
  "email": "tester@example.com"
}
```

Success response:

```json
{
  "rows": [
    {
      "transactionId": "TXN1775300000000",
      "transactionType": "ADMIN_CREDIT",
      "amountInCents": 500000,
      "amountDisplay": "₹5,000.00",
      "description": "Admin funding for Banking User 1",
      "createdAt": "2026-09-08T10:00:00.000Z"
    }
  ],
  "fileName": "watermelon-banking-statement-bankinguser1-1775300000000.xlsx",
  "downloadBase64": "UEsDBBQAAAA...",
  "emailed": false
}
```

### GET `/api/banking/transactions/[transactionId]`

Returns transaction details.

Success response:

```json
{
  "transaction": {
    "transactionId": "TXN1775300000000",
    "transactionType": "ADMIN_CREDIT",
    "amountInCents": 500000,
    "amountDisplay": "₹5,000.00",
    "description": "Admin funding for Banking User 1",
    "createdAt": "2026-09-08T10:00:00.000Z",
    "sourceAccount": null,
    "destinationAccount": {
      "accountNumber": "1000000001"
    }
  }
}
```

Not found:

```json
{ "error": "Transaction not found." }
```

### GET `/api/banking/admin/accounts`

Returns all banking accounts for the admin funding console. Requires app-access cookie.

Success response:

```json
{
  "accounts": [
    {
      "username": "bankinguser1",
      "displayName": "Banking User 1",
      "email": "bankinguser1@example.com",
      "accountNumber": "1000000001",
      "balanceInCents": 2500000,
      "balanceDisplay": "₹25,000.00"
    }
  ]
}
```

### POST `/api/banking/admin/fund`

Adds funds to a demo account. Requires app-access cookie.

Request:

```json
{
  "username": "bankinguser1",
  "amount": 5000
}
```

Success response:

```json
{
  "message": "Funds added successfully.",
  "accounts": [
    {
      "username": "bankinguser1",
      "balanceInCents": 3000000,
      "balanceDisplay": "₹30,000.00"
    }
  ]
}
```
