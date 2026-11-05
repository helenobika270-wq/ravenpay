# Persistent demo backend

Existing screens now use `/api/demo`. The server owns balances, plans, activity, pending transfers and command receipts. Browser storage is a presentation cache and a retry outbox. A new session imports existing browser demo data once; subsequent requests cannot replace its ledger. Existing data is not reset.

## Local setup

Use Node.js 24 and `pnpm dev`. Local SQLite WAL storage is `.data/ravenpay.sqlite`, excluded from Git. Keep this file across server restarts. An HTTP-only cookie links this browser to its isolated demo account for 30 days. Clearing cookies loses access to that anonymous account; login, recovery and cross-device identity are not implemented.

For private configuration, copy `.env.example` to `.env.local` in your editor, then run `node --env-file=.env.local node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174`. Never put secrets in `VITE_` variables or chat.

## Vercel setup required

The owner created the dedicated `ravenpay-demo` Turso/libSQL database and configured its token privately. Schema creation, write/rollback, three isolated concurrent remote sessions, complete simulated flows and persistence across a new Node process have passed. Set server-only `DEMO_DATABASE_URL` and `DEMO_DATABASE_AUTH_TOKEN` in Vercel, and select Node.js 24. Vercel deliberately refuses local disk storage. No Vercel deployment has yet been performed or verified. See the [Turso reference](https://docs.turso.tech/sdk/ts/reference).

Before public deployment, add deployment access protection and request/session-creation rate limits. Capability sessions isolate anonymous demo accounts; they are not authenticated banking identities. No provider operations are exposed by this endpoint.

## Ledger rules

- Integer minor units: two decimals for fiat and six for USDC/USDT. Positive amounts, supported assets, safe-integer bounds and available funds are validated server-side.
- Atomic writes include balance changes, activity, per-asset balanced journal postings and idempotency receipts. Account/request uniqueness plus a payload digest rejects mismatched retries.
- Server configuration determines savings terms, fees and quotes. Client snapshots, rates and provider-success flags cannot credit provider balances.
- Outgoing funds reserve once; completion does not debit twice; failure/reversal returns funds once. Pending work recovers on the next request after refresh/restart. There is no background scheduler.
- Savings transfers recheck funds and update wallet and plan atomically. Flexible withdrawals return principal atomically; locked withdrawals are rejected. Earnings remain illustrative sample entries.
- Demo data and provider balances/events/wallets occupy separate tables. No demo command writes provider data.
- Cookies are HTTP-only, SameSite Strict and Secure on HTTPS, with hashed tokens in storage. Cross-origin requests are rejected. Clients cannot select someone else's account ID. Responses are uncached and sanitized.

## Roqqu boundary

Roqqu has confirmed the Test URL, staging header and Test Private Key mapping; the operator-only balance probe can run after private configuration. Stablecoin/network routes and webhook authenticity requirements still need confirmation. Webhook ingestion, provider settlement, reconciliation and actual interest accrual are not implemented. Wallet creation remains an explicit approval-gated server script. Never substitute live keys. Follow `roqqu-test-setup.md` for the latest authentication status and setup.

## Verification

Run `node scripts/check-database.mjs`, `node scripts/check-savings.mjs`, `node scripts/check-outgoing.mjs`, `node scripts/check-accounts.mjs`, `node scripts/check-roqqu.mjs`, and `pnpm build`.

The database suite uses actual files and a second Node process for restart persistence. It checks concurrent duplicates, isolation, CSRF, payload conflicts, insufficient funds, failed transfers/refunds, balanced postings, canonical rates/fees, partial/full flexible withdrawals and provider-credit rejection. Test databases remain under ignored `.data/`.
