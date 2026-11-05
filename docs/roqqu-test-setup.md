# Roqqu Test integration setup

The project owner has relayed Roqqu's official confirmation: Test requests use `https://service.roqqu.com/v1`, header `x-staging-api-key`, and the organizers' **Test Private Key**. The reviewed server allowlist now records this confirmation. The [earlier documentation audit](roqqu-documentation-review.md) is historical; its endpoint/key-mapping blockers are resolved by this confirmation.

## Current state

### Actual read-only authentication result — 5 November 2026

The owner privately configured the organizers' Test Private Key in ignored `.env.local`. The actual-key browser-bundle check passed. One operator-invoked `POST https://service.roqqu.com/v1/balances` used `x-staging-api-key`, form body `token=usdc`, no redirects and no retries. Roqqu returned **HTTP 401**. The adapter reported sanitized `AUTHENTICATION_REJECTED`; authentication has not succeeded. No raw response, credential or merchant balance was logged. No wallet was created and no financial transaction was initiated. No automatic retry, alternate credential, live header, GitHub push or deployment was performed.

Next, ask Roqqu to confirm the supplied Test Private Key is activated and authorized for RAS staging `/balances`, including merchant/API-product access, revocation/expiry and any IP allowlist requirements. HTTP 401 alone does not identify which condition caused rejection. Do not share the credential in chat or an issue. Re-test only after a correction or explicit troubleshooting decision.

The Vercel-compatible `api/roqqu.mjs` function exposes **GET /api/roqqu** for configuration status only. Vite serves the same handler locally. The existing USDC/USDT Receive sheet has a **Roqqu Test connection** action with loading, blocked and error states. Configured is not authenticated; no configuration response is presented as a successful Roqqu API connection.

The operator-only read-only probe is enabled once the confirmed Test settings and private credential are configured. No public route runs it. Missing credentials, another base URL or another mode are blocked. Receiving routes remain empty and wallet creation remains approval-gated.

The single actual authentication test above was rejected. Wallet creation, financial transactions and webhook processing have not occurred. Live credentials have not been read or used.

## Enter original test credentials privately

1. Open the prepared `.env.local` privately in your editor. If setting up another checkout, copy `.env.example` only when `.env.local` does not already exist. It is ignored by Git. Do not paste secrets into chat, commands, screenshots or issues.
2. Keep `ROQQU_MODE=test` and `ROQQU_TEST_BASE_URL=https://service.roqqu.com/v1`. Paste the organizers' **Test Private Key** between the quotes in `ROQQU_TEST_API_KEY=""`, and save. Never use either Live key. The Test Public Key is not used by this adapter.
3. Do not add `VITE_` to any secret variable. Do not put credentials in `vercel.json`, source files, browser storage or frontend forms. The initial local file contains a blank credential; the owner enters it privately.
4. Run the local app with `node --env-file=.env.local node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174`. Stop the previous dev server first if it holds that port. The usual `pnpm dev` still serves the app, but does not load server-only configuration into process.env. No environment values are logged by our code.
5. Check `git check-ignore .env.local .vercel/.env.development.local` and `git status --short` before any future commit. Do not stage secret files with `git add -f`.

## Read-only authentication probe

The endpoint policy now holds the confirmed base URL, header, credential role and confirmation source. No financial or wallet route is authorized by this policy change.

Then explicitly run **once**:

```
node --env-file=.env.local scripts/check-roqqu-auth.mjs
```

The script sends exactly one `POST /balances`, form encoded with `token=usdc`, using **only** `x-staging-api-key`. This is documented as balance retrieval, not a transfer. There are no retries or redirect following. The public status function never runs the probe, and no public authentication-probe endpoint is exposed.

Missing credentials, wrong mode or a mismatched URL exit blocked before fetch. A blocked result has `attempted:false` and `upstreamHttpStatus:null`; that is not Unauthorized and is not a connectivity success. Do not automatically repeat a failed probe.

After building, run `node --env-file=.env.local scripts/check-roqqu-bundle.mjs`. It reports only booleans and an asset count, checking the actual configured key and server-auth identifiers are absent from browser output without printing any credential.

The probe emits a sanitized status/code and HTTP status only—never raw provider bodies, headers or balance/customer data. 401/403 suggests checking the original Test key, key role, activation, endpoint and IP restrictions with Roqqu; 429 is an upstream rate error, and transport errors are reported without raw exception content. An HTTP 200 alone is not success: the documented JSON balance structure is required. Do not automatically substitute live headers/keys or fall back to production.

## Wallet generation is a separate approval gate

After successful Test authentication, confirm one enabled stablecoin/network with Roqqu (the general mainnet list does not establish test support). The documented operation is `POST /wallets/generate-wallet`, `Content-Type: application/json`, with `network` and `customer` (email, first_name, last_name), using the staging header.

No wallet-generation route or automatic wallet creation is implemented before those prerequisites. Ask for explicit approval before creating even a test wallet. Require access control and durable idempotent wallet-to-user mapping before exposing creation on a public deployment; anonymous Vercel functions must not act as an unrestricted merchant proxy.

Once approved, replace the preview address/QR only with verified test-wallet data. Add a separate server-authoritative test ledger with no migration or copying of the browser sample balances. Existing Add sample funds, savings and withdrawal actions continue to affect only `raven-demo-savings-v1`; no Roqqu data is credited from mock actions. Merchant aggregate balances must never be treated as the user's personal balance. This preparation adds no Roqqu-backed balance until verified provider data is available.

For confirmed receiving later, obtain test funding instructions, webhook authentication/encryption details, test-event support and confirmation semantics. Verify each deposit against authenticated provider transaction details, persist unique provider deposit references, and credit only after confirmation. Never infer testnet support or mainnet safety from an address format.

## Vercel readiness (no deployment performed)

Vercel supports root `api/` functions alongside Vite. The single fetch handler uses standard Request/Response APIs. No framework migration, additional backend dependency or deployment command is needed for this preparation. No project/repository identifiers are changed.

After approval to deploy, configure the server-only values through Vercel Project Settings → Environment Variables for the intended environment. Keep live values out of the project. Use Preview access protection before enabling authenticated provider operations; protect operator-only probes and wallet creation. Configure a durable store before storing wallets or balances. None of this has been provisioned or deployed.

## Checks

- `node scripts/check-roqqu.mjs` — offline fixtures only; no provider traffic.
- `node scripts/check-accounts.mjs`
- `node scripts/check-savings.mjs`
- `node scripts/check-outgoing.mjs`
- `node node_modules/typescript/bin/tsc -b`
- `node node_modules/vite/bin/vite.js build`

Official references:
- https://roqqu-api-services.gitbook.io/ras/authentication
- https://roqqu-api-services.gitbook.io/ras/introduction
- https://roqqu-api-services.gitbook.io/ras/balances/get-crypto-balances
- https://roqqu-api-services.gitbook.io/ras/wallets/generate-wallet
- https://vercel.com/docs/functions/quickstart

## Wallet-generation implementation (prepared, not executed)

`server/roqqu/wallet.mjs` now implements the documented staging-header JSON wallet request. The operator command is:

```
node --env-file=.env.local scripts/create-roqqu-test-wallet.mjs --approve-wallet-creation
```

**Do not run this until explicit wallet-creation approval, a verified Test endpoint/route, and a successful initial read-only authentication check.** No such command has been run. The script requires configured test-customer fields, validates them, performs a fresh read-only authentication check, and makes at most one wallet-generation request. It never tries live mode. A private exclusive attempt marker prevents concurrent/blind repeated requests; retain the marker after ambiguous outcomes and reconcile with Roqqu before any retry. Private result files contain no API key. They are stored only under ignored `.secrets/`.

After Roqqu confirms the test endpoint and route, the reviewed policy needs `baseUrl`, a verification source, and `receivingRoutes: [{token:'USDC',network:'<confirmed-code>'}]` (or the confirmed USDT route). No network in the generic docs is assumed safe for Test mode. Put the designated test-customer fields in `.env.local`, not source. After an approved successful wallet-generation operation, copy its returned address privately to `ROQQU_TEST_RECEIVE_ADDRESS` and restart locally. For Vercel, configure this server-only value only after deployment approval.

The existing Receive check requests `/api/roqqu?token=USDC` (or USDT). A verified-route configured test wallet is returned separately from sample state, with **no balance**. It displays the configured network/address and disables the sample-funding control in that provider-address view. The placeholder QR is deliberately not shown beside a provider address; dynamic provider-address QR generation remains for the verified receiving step. No address implies a confirmed deposit or authenticated API result. No automatic public wallet-generation endpoint is exposed. No funds, wallet, database or live/testnet resources have been created.
