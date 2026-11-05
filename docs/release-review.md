# Backend release review

No push or deployment has been performed. Existing frontend layouts, styles and navigation are retained; screen changes only await backend writes before displaying success.

## Review groups

1. `shared/`, `server/demo/`, `api/demo.mjs`: extracted existing calculation rules, database schema/adapter, validated commands, atomic posting journal, capability sessions and idempotency.
2. `src/savingsStore.ts`, affected flow handlers and `vite.config.ts`: transport, retry outbox, migration of existing demo data and local API middleware.
3. `server/roqqu/`, `api/roqqu.mjs`, Roqqu scripts and setup guide: confirmed Test endpoint/header/key role, guarded read-only probe, no wallet or financial operations.
4. `.gitignore`, blank `.env.example`, dependency lockfile, test runner and documentation.

## Verification completed locally

- Existing USD deposit, partial post-deposit allocation, bank withdrawal and flexible withdrawal completed through browser screens.
- USDC 1.000001 and USDT 2.000001 sample deposits credited separate wallets; activity and balances survived browser refresh. Seven-decimal input was rejected. Clipboard permission was unavailable in the verification browser; the existing copy fallback message appeared without crediting funds.
- Database tests cover real disk persistence and a new Node process, pending transfer recovery without another debit, parallel duplicates, conflicting IDs, session isolation, CSRF, insufficient funds, failures/refunds, server-authoritative fees/rates and provider-credit rejection.
- Shared model checks cover all bank routes, token sends, savings types and payouts, partial/full flexible withdrawals, rounding, cancellation semantics and account isolation.
- Roqqu checks are offline fixtures only. No real API connectivity is claimed.

## Before approved push / deployment

1. Review the changes and approve a GitHub commit/push. A push to the linked main branch may automatically trigger Vercel; confirm deployment intent before that push.
2. Provision a dedicated Turso/libSQL database. Enter its URL and scoped token privately as server-only Vercel variables. Use Node.js 24. Never upload local SQLite files, `.env.local`, `.vercel/`, credentials or browser data.
3. Configure deployment access protection and request/session-creation rate limits before exposing this anonymous demo publicly. Account recovery, production user authentication, operational backups and remote database testing remain outside this local verification.
4. Run `pnpm test` and `pnpm build`. Test `/api/demo` and session cookies on an approved protected Vercel preview after database setup. Remote persistence and deployed function packaging are not yet verified.
5. Roqqu's Test endpoint/header/key role are confirmed. Privately configure the Test Private Key for one read-only authentication probe. Receiving routes and test funding remain to be confirmed. Do not enter live keys. Wallet creation still requires separate explicit approval. Provider webhooks, reconciliation and settlement are not implemented.

The local database is intentionally not part of the GitHub release. Existing cached demo data can migrate into an isolated account on first use of that browser origin. Anonymous sessions do not provide cross-device identity.
