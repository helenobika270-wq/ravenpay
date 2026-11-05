# RavenPay hackathon deployment checklist

Prepared 5 November 2026. The reviewed source is now deployed and publicly verified at https://ravenpay-rho.vercel.app/; no GitHub push was performed. See [production release evidence](production-release.md) for the completed configuration and live tests. The app remains a simulated financial experience; Roqqu's last actual authentication attempt returned HTTP 401 and no further provider requests were made.

**Database setup now verified:** the owner created `ravenpay-demo` and privately saved its database token. Remote schema/write/rollback checks passed. Three concurrent remote sessions passed the full simulated flow suite; a separate Node process restored the exact saved state and replayed a deposit without duplicating its credit. Twelve local concurrent sessions also pass. The verification created isolated test records only and did not reset the owner's existing demo data. Vercel environment settings, deployment and browser verification of that deployment remain pending.

## Verified locally

| Flow | Evidence / limits |
| --- | --- |
| Access | Automatic anonymous demo session with an HTTP-only capability cookie. There is no password login or cross-device account recovery. Each browser profile/device gets its own account; tabs in one profile share it. |
| Wallets | Five separate asset balances; Wallet navigation now opens the existing All accounts sheet. No layout change. |
| Deposits / receiving | Explicit sample funding only; invalid preview addresses/QR codes never credit funds. USD/GBP/EUR/USDC/USDT are persisted by the backend. Token precision is six decimals. |
| Sends / withdrawals | Both token sends and eight bank routes checked through HTTP request/response handlers. Reserves, status changes, fees, failure and reversal refunds remain atomic and idempotent. Browser USDC send completed with the correct fee and activity entry. |
| Savings | Flexible and Locked, upfront/maturity accounting and per-asset principal. Browser Locked setup required acknowledgement and persisted after refresh. Flexible partial/full withdrawals checked; Locked withdrawals rejected. Illustrative earnings are sample calculations, not actual provider income. |
| History / persistence | Deposit, send, withdrawal and savings records survive refresh. SQLite survives a separate server process; pending recovery does not repeat a debit. |
| Judge isolation | 12 simultaneous HTTP-handler sessions, including the same request IDs in different accounts. Each kept its own balances/history. Concurrent spending from one account could not overspend. |
| Secrets | `.env.local` ignored and untracked. Actual configured secret checked against release candidates, root logs and browser assets; no match. No server credential/auth/database code in browser output. `.vercelignore` additionally excludes private local files from CLI uploads. |

The earlier browser checks also cover fiat deposits, post-deposit allocation, token receiving, bank withdrawal, flexible withdrawal and activity reopening. Automated tests use isolated disposable SQLite databases, not the owner's existing account. This is local verification, not proof that the remote database or Vercel deployment already works.

## Required external setup, in order

1. Create/sign in to a Turso account privately. Create a dedicated **libSQL-compatible** database, such as `ravenpay-demo`, and obtain a database-scoped write token. The adapter uses `@libsql/client/web`; choose libSQL rather than changing database engine/SDK during the release. Do not paste tokens into chat.
2. Add these privately to existing `.env.local`, preserving its other settings:

   ```dotenv
   DEMO_DATABASE_URL="<database URL from Turso>"
   DEMO_DATABASE_AUTH_TOKEN="<database-scoped token>"
   ```

3. Run `node --env-file=.env.local scripts/check-remote-storage.mjs`. This creates the schema, verifies a transaction write and rollback, and prints sanitized readiness only. It creates no customer financial transaction. Then verify the app against that database with separate browser profiles. Existing local SQLite accounts are not uploaded by Git and are not automatically transferred; do not delete the local file.
4. Restore Vercel connector team access if using it to inspect/configure the project. Read-only project inspection currently returns a team-scope authorization error. The existing `ravenpay` project was found; no settings were changed. Manual Project Settings remains an alternative.
5. In Vercel, use the existing repository/project, Vite preset, Node **24.x**, build command `pnpm build`, output `dist`. `vercel.json` includes the backend/shared source for API functions, a 30-second function limit and `/showcase` rewrites that do not intercept `/api/demo` or `/api/roqqu`. The include-files glob was checked against Vercel's public schema.
6. Set `DEMO_DATABASE_URL` and `DEMO_DATABASE_AUTH_TOKEN` as server-only secrets for the intended environment. Set `ROQQU_MODE=test`. **Do not add the Roqqu key to this hackathon deployment** while authentication is unresolved. No live keys, `VITE_` secrets or local SQLite path on Vercel. Use a separate database for destructive preview tests, if needed.
7. Review the code changes and get explicit approval for the commit/push and deployment. A GitHub push can trigger Vercel automatically; agree on that before pushing. Keep `.env.local`, `.data`, `.secrets`, logs and screenshots out of the commit.
8. After approval, deploy a protected preview and verify real API packaging, HTTPS cookies, storage, `/showcase`, simultaneous separate browser profiles, and refresh/reopen. Check that `/api/demo` is JSON rather than the SPA HTML. Run the core sample-funds journey on mobile.
9. Before sharing publicly, configure platform abuse controls/session-creation rate limits appropriate to the judge audience. Ensure judges can actually access the approved URL without needing the owner's Vercel login. Use sample beneficiary fixtures; no real funds or personal banking information are required.
10. Share only the verified public URL. Keep the local database and a rollback deployment available. Monitor sanitized function errors and database availability during judging.

## Commands

```text
pnpm test
pnpm build
node --env-file=.env.local scripts/check-release-security.mjs
node --env-file=.env.local scripts/check-remote-storage.mjs
```

Do not run the Roqqu authentication or wallet-creation scripts as part of this release. The `/api/roqqu` browser check reads configuration only; it never calls Roqqu. React monetary updates await `/api/demo`; browser localStorage is a cache/outbox rather than the authoritative wallet.

## Remaining limits

- Remote database creation/private local configuration and actual remote tests are complete. Vercel still needs its server-side database variables configured.
- Vercel function packaging, production cookies, URL access and remote restart persistence require an approved deployment and must not be claimed as already verified.
- Access is anonymous per-browser; this is not production authentication. Two judges using the same browser profile share the same session. Separate tabs or simultaneous incognito windows in one profile do not provide separate identities.
- No Roqqu-confirmed receiving, wallet ownership reconciliation, blockchain sends, bank settlement, real interest accrual, automatic maturity payout or generic person-to-person transfer flow is claimed. Existing simulated sends and internal savings transfers work.

Primary setup references: [Turso quickstart](https://docs.turso.tech/quickstart), [Turso transactions](https://docs.turso.tech/sdk/ts/reference), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).
