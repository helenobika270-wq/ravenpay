# Roqqu Test documentation review

**Historical audit:** the owner subsequently relayed Roqqu's official confirmation of `https://service.roqqu.com/v1`, `x-staging-api-key`, and the supplied Test Private Key. Those endpoint/key-mapping blockers are resolved. See `roqqu-test-setup.md` for current configuration; remaining wallet/network and funding approvals are separate.

Reviewed 5 November 2026 against the public [48-page documentation index](https://roqqu-api-services.gitbook.io/ras/llms.txt). All indexed Markdown pages were accessible. This review made documentation GET requests only: no requests to the API service, credentials, wallet creation or financial operations.

## Verified contracts and unresolved environment boundary

| Item | Documentation finding | RavenPay decision |
| --- | --- | --- |
| Base URL | Introduction says all requests use `https://service.roqqu.com/v1`. Examples throughout use this same origin. | This is the documented general URL, not an independently established Test-only URL. Do not call it under the user's prohibition on production endpoints without explicit Test-routing confirmation. |
| Test authentication | Authentication specifies `x-staging-api-key: YOUR_API_KEY`. | Existing adapter uses this header only. |
| Credentials | Authentication describes a server-held secret Test API key. No indexed page explicitly maps the hackathon's separate Test Public / Test Private labels. | Do not try either key, combine them, or infer a signature scheme. Confirm which supplied key is the secret header value and whether the other has a role. |
| Environment change | Authentication says to update requests to live endpoints when going live, while the introduction lists only one base URL. | Ask whether both modes share that URL with header-based isolation, or obtain the exact separate Test URL. Keep the reviewed endpoint allowlist null. |
| Read-only probe | `POST /balances`, form-encoded optional `token` and `email`; success contains `data.balance`. | Probe implementation exists, but remains blocked. General authentication gives the staging header; the balance page's example only shows the live header. Confirm Test support for this route. |
| Wallet creation | `POST /wallets/generate-wallet`, JSON `network` and `customer` (object or JSON string with email/first_name/last_name), staging header supported. | Approval-gated server implementation exists. No wallet created. |
| Stablecoin route | General introduction lists USDC/Base and USDT/BEP20 or TRC20. | These are general routes, not proof of Test-mode funding, testnet chain IDs or enabled hackathon routes. |
| Deposit verification | `GET /transaction/token-deposit`; `GET /transaction/deposit/:tx_hash`; `GET /transaction/status/:tx_hash`. Deposit list documents status 1 as credited. | Suitable future reconciliation contracts after Test routing/authentication and ownership mapping are verified. Not implemented as balance-credit endpoints. |
| Webhooks | Coin events include token_received, token_sent and token_refunded. Decryption guide specifies AES-256-CTR and refers to a Live API key. | Test webhook key derivation, integrity/authentication and replay handling still need clarification. Decryption alone must not authorize a balance credit. |

## Current implementation

- `server/roqqu/test-endpoint.mjs`: `verifiedTestEndpoint = null` deliberately blocks all authenticated calls.
- `server/roqqu/client.mjs`: Test-only readiness check, one read-only balance probe with no retries/redirects, sanitized responses. No original credentials have been tested.
- `server/roqqu/wallet.mjs` and operator script: route and explicit approval gates; uncertain wallet outcomes require reconciliation instead of blind retries.
- `api/roqqu.mjs`: configuration-status endpoint only; does not contact Roqqu. Existing Receive interface preserves sample-fund behavior and does not infer balances from addresses.
- Demo ledger and provider tables remain separate. Provider wallet ownership persistence, authenticated transaction reconciliation, verified provider-credit processing and webhook ingestion are not completed. No authenticated connectivity is claimed.
- Frontend, persistent demo functionality and environment files were not changed by this documentation review.

## Exact non-secret confirmation to request

> Please confirm the full HTTPS base URL for RAS Test mode. Is `https://service.roqqu.com/v1` safe for Test-only requests with `x-staging-api-key`, with isolated non-real balances, or is a different base URL required? Which of the supplied Test Public Key and Test Private Key is the value of `x-staging-api-key`, and is the other key needed for RAS? Is `POST /balances` enabled with that Test key? For a receiving demo, which stablecoin/network is enabled, how are test funds supplied, and what are the Test webhook authentication/key requirements? No secret values are needed in your reply.

## Secure configuration after confirmation

Use the existing ignored `.env.local` file, edited privately. Set `ROQQU_MODE=test`, the confirmed `ROQQU_TEST_BASE_URL`, and `ROQQU_TEST_API_KEY` to the specifically confirmed secret Test key. Keep the public key unused unless its documented role is supplied. Do not put either key in frontend code, VITE_ variables, Git, chat or logs. No new credential files were created during this review.

Before running the probe, update the reviewed server endpoint policy with the exact confirmed URL and supporting source. Then run `node --env-file=.env.local scripts/check-roqqu-auth.mjs` once. It must report sanitized HTTP/application status, not raw credentials or merchant balances. A failed test must not trigger a switch to live mode.

After successful authentication, obtain approval for one verified Test wallet route, persist wallet-to-account ownership, and reconcile authenticated provider deposit records into the separate provider ledger using unique references and atomic updates. Keep sample balances separate. Testnet funding and provider operations require explicit confirmation/approval; the existing simulated backend continues unchanged meanwhile.

## Primary references

- [Introduction / base URL](https://roqqu-api-services.gitbook.io/ras/introduction)
- [Authentication](https://roqqu-api-services.gitbook.io/ras/authentication)
- [Balances](https://roqqu-api-services.gitbook.io/ras/balances/get-crypto-balances)
- [Generate wallet](https://roqqu-api-services.gitbook.io/ras/wallets/generate-wallet)
- [Token deposits](https://roqqu-api-services.gitbook.io/ras/transaction/token-deposits)
- [Transaction status](https://roqqu-api-services.gitbook.io/ras/transaction/get-transaction-status-by-transaction-hash)
- [Coin webhook events](https://roqqu-api-services.gitbook.io/ras/webhooks/coin-webhook-events)
- [Webhook decryption](https://roqqu-api-services.gitbook.io/ras/webhooks/decrypt-webhook-body)
