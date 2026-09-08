# Watermelon Banking API Docs

This folder contains the banking API specification in both OpenAPI 3.1 and 3.0 formats:

- OpenAPI 3.1
- [`openapi.yaml`](./openapi.yaml)
- [`openapi.json`](./openapi.json)
- OpenAPI 3.0
- [`openapi-3.0.yaml`](./openapi-3.0.yaml)
- [`openapi-3.0.json`](./openapi-3.0.json)
- this Markdown guide

## Base URLs

- Production: `https://your-watermelon-banking-host.example.com`
- Local: `http://localhost:3000`

## Authentication Model

The banking app uses a signed session created by the login API.

- On successful login, the backend sets the `watermelon_banking_session` HTTP-only cookie.
- The same token is also returned in the `x-banking-session` response header and in the JSON body as `sessionToken`.
- Protected APIs accept the session from either:
  - the cookie, or
  - the `x-banking-session` header

## Main Banking Flow

1. `POST /api/banking/login`
2. `GET /api/banking/dashboard`
3. `POST /api/banking/transfer/send-otp`
4. `POST /api/banking/transfer`
5. `POST /api/banking/statement`
6. `POST /api/banking/logout`

## Endpoint Summary

### `POST /api/banking/login`

Signs in one of the seeded demo users and validates the simple math captcha unless `disableCaptcha=true`.

Demo users:

- `bankinguser1 / password`
- `bankinguser2 / password`

Example request:

```json
{
  "username": "bankinguser1",
  "password": "password",
  "captchaLeft": 6,
  "captchaRight": 5,
  "captchaAnswer": 11
}
```

Example success response:

```json
{
  "success": true,
  "redirectTo": "/banking/dashboard",
  "sessionToken": "..."
}
```

### `POST /api/banking/logout`

Clears the banking session and returns a redirect hint.

### `GET /api/banking/dashboard`

Returns the signed-in user summary, transfer destinations, and recent transactions.

Notes:

- The destination list includes four demo beneficiaries first.
- Those demo beneficiaries are intentionally not enabled for transfers.

### `POST /api/banking/transfer/send-otp`

Creates an OTP for a transfer and emails it to the provided email address.

Example request:

```json
{
  "recipientEmail": "customer@example.com",
  "destinationUsername": "bankinguser2",
  "amount": 50
}
```

Example success response:

```json
{
  "message": "OTP sent for transaction TXN17751916142913055.",
  "delivered": true,
  "transactionId": "TXN17751916142913055"
}
```

Important business rules:

- transfer to self is blocked
- demo beneficiaries are blocked with `This demo beneficiary is not yet enabled.`
- amount must be greater than zero

### `GET /api/banking/transfer/otp`

Returns the active OTP for a transfer transaction.

Auth options:

- valid banking session, or
- `x-api-key` header matching `BANKING_OTP_LOOKUP_API_KEY`

Example:

```text
GET /api/banking/transfer/otp?transactionId=TXN17751916142913055
```

Example success response:

```json
{
  "transactionId": "TXN17751916142913055",
  "otp": "123456",
  "recipientEmail": "customer@example.com",
  "expiresAt": "2026-06-12T10:15:00.000Z"
}
```

### `POST /api/banking/transfer`

Completes a transfer when the OTP, amount, destination, and source balance all validate.

Example request:

```json
{
  "recipientEmail": "customer@example.com",
  "destinationUsername": "bankinguser2",
  "amount": 50,
  "otp": "123456"
}
```

Example success response:

```json
{
  "message": "Transfer completed successfully.",
  "transactionId": "TXN17751916142913055",
  "dashboard": {
    "user": {},
    "transferDestinations": [],
    "recentTransactions": []
  }
}
```

Common transfer errors:

- `OTP is invalid or expired.`
- `Insufficient balance in the savings account.`
- `This demo beneficiary is not yet enabled.`
- `Choose a different destination account.`

### `POST /api/banking/statement`

Generates an XLSX statement for the last `x` transactions and optionally emails it.

Example request:

```json
{
  "transactionCount": 5,
  "email": "customer@example.com"
}
```

Example success response:

```json
{
  "rows": [],
  "fileName": "watermelon-banking-statement-bankinguser1-1775300000000.xlsx",
  "downloadBase64": "<base64-xlsx>",
  "emailed": true
}
```

Notes:

- `transactionCount` must be between `1` and `50`
- `downloadBase64` contains the workbook data
- if `email` is omitted, the statement is generated without email delivery

### `GET /api/banking/transactions/{transactionId}`

Looks up a banking transaction by transaction ID.

This endpoint is useful for:

- debugging
- automation validation
- transaction tracing

### `GET /api/banking/admin/accounts`

Returns the seeded demo accounts with balances for the admin page.

### `POST /api/banking/admin/fund`

Adds funds to a selected demo account.

Example request:

```json
{
  "username": "bankinguser1",
  "amount": 100
}
```

Example success response:

```json
{
  "message": "Funds added successfully.",
  "accounts": []
}
```

## Error Shape

Most non-success responses use this format:

```json
{
  "error": "Human-readable error message"
}
```

## Source of Truth

These docs were derived from the live banking route handlers and banking service layer:

- [`app/api/banking/login/route.ts`](../../app/api/banking/login/route.ts)
- [`app/api/banking/logout/route.ts`](../../app/api/banking/logout/route.ts)
- [`app/api/banking/dashboard/route.ts`](../../app/api/banking/dashboard/route.ts)
- [`app/api/banking/transfer/send-otp/route.ts`](../../app/api/banking/transfer/send-otp/route.ts)
- [`app/api/banking/transfer/route.ts`](../../app/api/banking/transfer/route.ts)
- [`app/api/banking/transfer/otp/route.ts`](../../app/api/banking/transfer/otp/route.ts)
- [`app/api/banking/statement/route.ts`](../../app/api/banking/statement/route.ts)
- [`app/api/banking/transactions/[transactionId]/route.ts`](../../app/api/banking/transactions/[transactionId]/route.ts)
- [`app/api/banking/admin/accounts/route.ts`](../../app/api/banking/admin/accounts/route.ts)
- [`app/api/banking/admin/fund/route.ts`](../../app/api/banking/admin/fund/route.ts)
- [`lib/banking.ts`](../../lib/banking.ts)
- [`lib/banking-auth.ts`](../../lib/banking-auth.ts)
