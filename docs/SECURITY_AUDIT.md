# Security Audit (practical review, not a penetration test)

Date: 2026-11-26 · Base commit: 0c3a8c3 · Target: Express server (`server.ts`) run locally on port 3000.
The Cloudflare Worker was exercised only through the existing automated parity tests, not over live HTTP.
No professional penetration test or certification has been performed.

| ID | Finding | Severity | Evidence | Status |
|----|---------|----------|----------|--------|
| F1 | Rate limits keyed on client-controlled `X-Forwarded-For`. Rotating the header gave unlimited login guesses and bypassed lockout. | High | Before: 12 wrong logins locked the account, then the correct password from a new spoofed IP returned 200. 40 `/api/landing/analyze` calls with rotating XFF all returned 200. | Fixed (`resolveClientIp`, `TRUST_PROXY`). Retest on the patched running server: 13th rotating-IP login returned 429, correct password after lockout returned 429, landing analyze returned 429 after 15. |
| F2 | `devPreviewOtp` was returned by register / resend-otp whenever mail delivery failed, with no production guard in the Express server. Anyone could then verify an email they do not own. | High (in production without a mail key) | Code read at `server.ts` (register and resend-otp handlers). The Worker already guarded this with `APP_ENV`. | Fixed (`shouldExposeDevPreviewOtp`). Unit-tested. Not re-probed over HTTP in a production-mode run. |
| F3 | `npm install` failed (ERESOLVE): `esbuild@^0.25` conflicted with vite 8's peer range, so `npm ci` in CI was unusable. | Medium (availability) | `npm install` exit 1 | Fixed (`esbuild ^0.28.0`). Clean install, lint, tests and build pass. |

## Probes that passed (Express, local)
- Unauthenticated access to admin, vocabulary and AI endpoints: 401. Spoofed `X-User-Role` and forged Bearer token: 401.
- Learner session on 7 admin GET routes and on admin PUT feature-flags: 403.
- Mutation without CSRF token: 403. Cross-origin `Origin` header: 403.
- Mass-assignment on register (`role: "admin"`, `plan: "premium"`): ignored; account created as `learner` / `free`.
- Login error message is identical for known and unknown emails.
- IDOR on vocabulary: learner B listing, reviewing and deleting learner A's card got an empty list and 404s; A's card remained.
- Unsigned billing webhook: fails closed with 503 when no secret is configured.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Not tested
Timing-based enumeration, session fixation and rotation, R2 audio access over HTTP, webhook replay with a real secret,
prompt injection against a live model, XSS in community content in a browser, the Worker over live HTTP, IDOR on
endpoints other than vocabulary.

## Open observations
- `/api/landing/analyze` is intentionally public (15 requests per 5 minutes per IP). With a key configured it spends Gemini quota.
- The Express rate limiter is in-process memory: it resets on restart and is not shared across instances.
