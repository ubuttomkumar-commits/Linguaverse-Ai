# Implementation Status (session of 2026-11-26)

Done: repository audit, baseline verification, live security probing of the Express server, three fixes with tests.

Not done: a requirement-by-requirement re-audit against the PRD, and any new feature work. I cannot honestly give a
PRD-coverage or production-verification percentage. The measured numbers are in `TESTING_REPORT.md`.

## Changes
- `package.json`: `esbuild` `^0.25.0` to `^0.28.0`. `package-lock.json` added.
- `src/domain/securityPolicy.ts`: added `resolveClientIp` and `shouldExposeDevPreviewOtp`.
- `src/domain/securityPolicy.test.ts`: 5 new tests.
- `server.ts`: uses both helpers (rate-limit IP key; dev OTP echo).
- `.env.example`: `TRUST_PROXY`.
- `docs/`: SECURITY_AUDIT, TESTING_REPORT, KNOWN_LIMITATIONS, DEPLOYMENT_REPORT, IMPLEMENTATION_STATUS.
- No database migrations. No new routes.

## Next unfinished items, in priority order
1. Run the Gemini paths with a real key; confirm or replace the model IDs.
2. Decide the persistence default (D1 repository vs localStorage) and test the Worker over live HTTP with `wrangler dev`.
3. Add a Playwright test for the learner journey.
4. Add Turnstile verification on register/login. Decide whether Queues, Cron or Durable Objects are needed, and build them only then.
5. Code-split the bundle.
