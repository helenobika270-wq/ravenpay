# Turso verification — 5 November 2026

The owner created `ravenpay-demo` in AWS US East (Virginia), using the libSQL-compatible engine, and privately entered its scoped token in ignored `.env.local`. No token value is recorded here.

Passed against the actual remote database:

- Schema setup, write permission and transaction rollback.
- Three isolated concurrent sessions with independent balances and activity.
- Five-asset sample deposits and duplicate-credit protection.
- All eight simulated bank withdrawal routes and both token sends.
- Flexible and Locked savings, upfront/maturity accounting, partial/full flexible withdrawals and refusal of locked withdrawals.
- Concurrent overspend protection, failure/reversal refunds and session resume.
- Exact persisted state restored by a new Node process, with the original deposit request replayed without another credit.

Commands used:

```text
node --env-file=.env.local scripts/check-remote-storage.mjs
node --env-file=.env.local scripts/check-judge-sessions.mjs --remote
node --env-file=.env.local scripts/check-remote-persistence.mjs
```

These commands create isolated simulated test records. They do not touch the owner's existing local SQLite data, move real funds, contact Roqqu, push code or deploy. Session tokens pass to the child process through stdin, not process arguments or logs. Driver errors in the readiness/persistence helpers are sanitized. The actual configured API and database secrets were checked against release files and browser output and were absent.

Vercel configuration and approved deployment remain the next step. The browser preview has not yet been restarted with remote database environment variables; remote tests above exercise the same backend request handlers directly. Deployed API packaging, browser cookies and end-to-end deployed UI still require verification after approval.
