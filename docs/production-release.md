# RavenPay production release — 5 November 2026

Public app: https://ravenpay-rho.vercel.app/

Showcase: https://ravenpay-rho.vercel.app/showcase

Vercel deployment: `dpl_27fsEQeinY6WBU9i8D6mUPsipabY`, production, READY. Deployed the reviewed local source directly through the authorized Vercel integration. No GitHub push was performed. Existing project/repository names and connected Git settings were retained.

## Interface changes

- Removed the automatic Demo Mode banner/introduction.
- Kept one unobtrusive, keyboard-operable “Simulated experience” disclosure, with the full statement: “Transactions are simulated. No real funds are transferred.”
- Applied existing display formatting to the receipt network fallback, removing another repeated simulation label.
- Preserved layouts, account cards, transaction flows, original balances, ledger logic and functionality. Live checks used new isolated sample accounts.

## Deployment configuration

- Existing `ravenpay` project, Node.js 24, functions in `iad1`, Vite production build.
- Turso URL and database token saved as production-only Vercel Secrets through the dashboard without displaying their values in chat or logs.
- `ROQQU_MODE=test`; no Roqqu credential uploaded. No additional Roqqu provider requests were made.
- Source upload allowlisted only the runtime source/configuration and public assets. Environment files, databases, logs, screenshots and private operator files were excluded.

## Verification completed

- All six automated suites, TypeScript and Vite production build passed before release.
- Release security scan passed for the actual configured API/database secrets and browser output.
- Anonymous public requests: `/` and `/showcase` returned HTTP 200, `/api/demo` returned expected JSON HTTP 401 without a session.
- Live API: HTTPS HTTP-only session cookies, isolated accounts, USDC/USDT deposits, idempotency, flexible savings and withdrawal, completed token send, persisted reads and unmodified second-session balances passed.
- Live browser: $1 sample deposit completed once and survived refresh with its activity entry. Mobile 390px check found no horizontal overflow, zero automatic banners and one disclosure. Keyboard activation revealed the full simulation explanation. Browser error log was empty.

Roqqu remains paused after the earlier HTTP 401; no real funds, blockchain broadcasts, bank settlements or provider earnings are represented by this simulated release. Deployed source includes the prepared adapter and separate demo ledger. Private `.env.local` remains ignored/untracked; all existing local project changes remain available for a later approved Git commit/push.
