RavenPay — Earn Globally. Save for What Matters.

RavenPay is a stablecoin-powered financial platform designed for Nigerians who earn internationally.

It brings global payments, everyday money management, and goal-based savings into one connected experience, helping freelancers, remote workers, and crypto earners manage their money and plan for the future.

What We’ve Built

An interactive MVP prototype featuring:

* Wallet dashboard and balances
* Simulated deposits and withdrawals
* Transfers and transaction history
* Goal-based savings experiences
* Persistent backend ledger for demo transactions

Live Demo: https://ravenpay-rho.vercel.app/

Current Status

RavenPay is a deployed interactive prototype. Financial transactions currently use simulated balances and flows rather than real money.

Planned Integrations

* Roqqu: Supported cryptocurrency payment infrastructure
* Nuvion: Fiat payment and withdrawal infrastructure, subject to verification
* DeFindex / Blend: Potential stablecoin savings and yield infrastructure, subject to technical, security, and regulatory evaluation

These integrations are planned or under evaluation and are not yet operational.

# RavenPay prototype

For screen recording, open `/showcase` on the local Vite server. The titanium phone frame embeds the same running app at 390 × 844, scales uniformly to fit the browser, and keeps all interactions inside the screen. The original `/` view is unchanged.

Mobile-first React + TypeScript home screen recreated from Figma node `39:4851`, using Tailwind CSS and Motion for React.

## Persistent backend

The server ledger now stores demo balances, savings, deposits and withdrawals in SQLite locally and requires Turso/libSQL on Vercel. Existing browser state imports once, without resetting balances. Browser storage is now a cache. See [backend setup and security boundaries](docs/backend-ledger.md). The older interaction notes below describe UI behavior; their browser-only persistence descriptions are superseded by the server ledger.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the address printed by Vite (normally http://localhost:5173).

```sh
pnpm build
```

USD is selected initially; selecting an exposed GBP, EUR, or USD header brings it forward with a spring transition. More opens the More screen, and the avatar opens Raven's Profile. Both return to Home without resetting the selected currency or promotional banner.

The four promotional banners support touch swiping, mouse dragging, clickable pagination dots, and left/right arrow keys when the carousel is focused. There is no autoplay. Deposit opens a simulated amount → review → processing → success flow. Done updates only the selected account with an animated balance count-up. Balances persist during the current page session and reset on reload. Closing before success cancels the demo deposit. Withdraw, quick actions, Wallet, Pay, and the rows on More/Profile remain visual placeholders. Mock data stays in the browser. Reduced-motion preferences are respected.

Original Figma artwork and icons are stored in `public/assets`; new Lucide icons and their license are in `public/assets/lucide`. Geist fonts are bundled locally. On wider displays the screen stays at its 390px design width for recording, while smaller screens adapt to the available width.

## Savings alpha demo

Open the existing local preview. Confirm a fiat Deposit, then choose **Split my money**, or open **Save → Simulate deposit** for any supported asset (USD, GBP, EUR, USDC, USDT). Save also supports starting later from an existing spending wallet. Confirmed deposits are credited before the optional allocation prompt. Merely selecting a split, skipping, or leaving does not transfer funds.

Demo data is persisted separately in browser localStorage under `raven-demo-savings-v1`. Monetary values use integer minor units (2 decimal places for fiat, 6 for USDC). Savings transfers are internal activity, not income. Each deposit and transfer has an idempotency key. Pending transfers persist and can be resolved through **Check transfer status**; a refresh does not automatically repeat a deposit prompt or retry a transfer.

Illustrative terms: Flexible 2% annual variable rate, daily simple accrual and monthly payout terms. Locked durations are 30/90/180 days at 3%/4%/5% annual demo rates. Calculations use actual days/365 without compounding. Locked interest can be credited upfront to spending or shown as due at maturity. Principal and earnings remain separate. Flexible savings supports simulated partial/full withdrawals and refilling the same plan. There is no automatic accrual or maturity settlement; live withdrawals and their timing require provider integrations. No real financial services are connected.

Review includes expandable **Demo test controls** for success, failure, pending outcomes, and insufficient funds. The insufficient-balance control intentionally changes the demo wallet balance for testing. Pending outcomes can be checked from the Savings overview. Supported assets are never converted or added together.

Checks: `node scripts/check-savings.mjs`, `node scripts/check-accounts.mjs`, `node node_modules/typescript/bin/tsc -b`, and `node node_modules/vite/bin/vite.js build`.

USDT migration preserves existing data and adds a zero token wallet. The demo-only Load sample plan action creates a matching 1,000 USDT simulated deposit and internal funding transfer for a 90-day, 12% annual simple-interest plan. It is idempotent and never replaces existing plans. Activity and wallet cards round display to two decimals, with <0.01 for tiny nonzero amounts; transaction details and the ledger retain full precision.

USDC/USDT Receive is a frontend-only simulation. Local SVG QR assets encode the exact invalid `DEMO-{TOKEN}-ADDRESS-NOT-FOR-PAYMENTS` placeholders. No chain/network/address provider is connected. Only explicit Confirm demo deposit writes to `raven-demo-savings-v1`; credit and activity are committed atomically under a stable per-attempt ID before the presentation delay. Refresh never auto-credits or reopens the receipt. The existing Savings overview retains manual deposit allocation entry points. Six-decimal token inputs are parsed directly to safe integer units, and balance overflow is rejected. Copy and cancellation have no ledger effects.

Spending-wallet withdrawals and token sends are simulated in the existing demo ledger (`raven-demo-savings-v1`, `outgoing` records). Existing persisted state migrates by adding an empty outgoing list. Each submission reserves principal plus the centrally configured source-asset fee by reducing the available spending balance once. Completed transfers keep that debit; failed/reversed transfers return all principal and fees once. Submitting/pending records persist, and the demo processor resumes when the app opens. A forced pending outcome stays pending until explicitly completed or failed in receipt test controls. Recent Activity and View All reopen the same record.

Domestic USD/GBP/EUR and all five NGN payout routes use illustrative rates/fees in `outgoingModel.ts`; token rates are configured separately. Crypto uses a separate `Simulated network` setting and token fee; no broadcast, transaction hash, or explorer exists. Bank validation covers domestic field formats and EUR IBAN checksum/length. It does not establish ownership/existence. Use demo beneficiary/recipient fixtures to avoid entering personal data. Provider integration must supply supported routes/networks, verified beneficiary/address rules, authoritative quotes and delivery terms, server-side reservations/idempotency and reconciled payment status. No provider or signing integration is included.

Verification: `node scripts/check-outgoing.mjs`, `node scripts/check-savings.mjs`, `node scripts/check-accounts.mjs`, TypeScript build and Vite production build. Browser checks cover USD completion, NGN selector/search and cancellation, USDC send Max/fees, forced pending/refresh/reopen/completion/reversal, and 320px receipt overflow.

## Roqqu Test preparation

Server-only Roqqu Test configuration, the Receive connection-status check, an offline safety suite, and an approval-gated wallet-generation client are prepared. Roqqu has confirmed the Test base URL, staging header and Test Private Key mapping. The operator-only read-only balance probe requires private local credential configuration; wallet/network routes remain separately gated. Follow [the secure setup guide](docs/roqqu-test-setup.md); do not paste credentials into chat or run wallet creation before approval. No Roqqu-backed balances are currently credited.
