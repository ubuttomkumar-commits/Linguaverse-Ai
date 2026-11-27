# LINGUAVERSE AI — Security Hardening & Audit Report

**Audit Date:** 2026-11-27  
**Verification Basis:** Automated security & parity tests (`185 / 185 PASS`), `worker/workerSecurity.test.ts` (S6/S7/S10/S11), `src/domain/pwaCompliance.test.ts`, `bun audit` (`0` vulnerabilities / 273 packages), bundle secret scan (`0` hits), and live Express HTTP PoCs.

---

## 1. Security Controls Summary

| Domain | Control Implemented | Enforcement Locations | Verification |
| --- | --- | --- | --- |
| **Password Storage** | Salted PBKDF2-SHA256 (Worker WebCrypto) & `crypto.scrypt` (Express) with constant-time comparison | `worker/index.ts`, `server/authStore.ts` | Automated auth & reset tests |
| **Session Security** | `HttpOnly` + `SameSite` session cookies (`Secure` in production) + ephemeral in-memory Bearer token (`sessionTokenMemory.ts`); zero JWT persistence in `localStorage` | `src/services/sessionTokenMemory.ts`, `server/authStore.ts`, `worker/index.ts` | Auth tests + logout revocation tests |
| **Fail-Closed Production Secrets** | `500 AUTH_CONFIG_ERROR` if `JWT_SIGNING_SECRET` unset in prod; `503 BOOTSTRAP_SECRET_REQUIRED` if `ADMIN_BOOTSTRAP_SECRET` unset in prod; `503` on unconfigured billing webhooks | `worker/index.ts`, `worker/routes/prd61Routes.ts`, `server/prd61Routes.ts` | `workerSecurity.test.ts` S6 + `adminBootstrapEngine.test.ts` |
| **Separate Admin Isolation** | Independent `admin.html` -> `dist-admin/` build with `<meta name="robots" content="noindex, nofollow">`, dedicated `/api/v1/admin/auth/*` endpoints, one-time bootstrap permanently locked (`409`), strict `403` learner block, server-verified RBAC (`super_admin`, `admin`, `content_manager`, `ai_ops`, `moderator`) | `admin.html`, `vite.admin.config.ts`, `server/prd61Routes.ts`, `worker/routes/prd61Routes.ts` | Worker Parity Test #149 + live HTTP + Chromium E2E |
| **CSRF & Strict CORS** | Double-submit CSRF cookie/header with constant-time validation; strict allowlist `CORS_ALLOWED_ORIGIN` (no wildcard reflection for credentialed routes) | `src/domain/securityPolicy.ts`, `server.ts`, `worker/index.ts` | `workerSecurity.test.ts` S7 + live Express `403 INVALID_CSRF` |
| **IDOR & Ownership Enforcement** | User-scoped queries and owner checks on audio recordings, replay sessions, community deletes, subscription cancel/refunds, vocabulary, writing entries, and human-bridge logs | `worker/index.ts`, `worker/routes/*.ts`, `server/*Routes.ts` | Cross-user `403`/`404` assertions in `workerParity.test.ts` |
| **SQL Injection Prevention** | 100% parameterized D1 prepared statements (`.prepare(...).bind(...)`) across all routes and Cron maintenance | `worker/index.ts`, `worker/routes/*.ts` | Full static & runtime D1 test suite |
| **File Upload & SVG XSS Defense** | Strict PNG/JPEG/WebP magic-byte verification (`verifyImageMagicBytes`), SVG/HTML upload rejection (`400`), strict filename regex (`^med_[a-f0-9]{12}\.(png\|jpg\|webp)$`), served with `Content-Security-Policy: default-src 'none'; sandbox` & `X-Content-Type-Options: nosniff` | `src/domain/securityPolicy.ts`, `server/cmsStore.ts`, `worker/index.ts` | Worker Parity Test #152 + CMS unit tests |
| **Private Audio Consent & Limits** | Server-side D1 `store_mic_recordings = 1` check (`403` without consent), `audio/*` MIME allowlist (`415`), `10 MB` cap, scheduled R2 expiry retention purge | `worker/index.ts`, `src/utils/audioBlobStore.ts` | `workerSecurity.test.ts` S10 + Worker Parity Test #152 |
| **AI Prompt-Injection Isolation** | Untrusted learner input delimiter-isolated in XML tags (`<learner_sentence>`, `<learner_utterance>`, `<learner_question>`, `<learner_message>`) with tag-escaping and anti-cheat guardrails | `server/gemini*.ts`, `worker/index.ts`, `worker/routes/parts06To12Routes.ts` | Unit + Worker parity tests |
| **Signed Payment Webhooks** | WebCrypto HMAC-SHA256 signature verification, 5-minute replay window, constant-time compare, idempotent `eventId` deduplication | `src/domain/paymentWebhookEngine.ts`, `server/p3Routes.ts`, `worker/routes/p3CommunityVocabBillingRoutes.ts` | `paymentWebhookEngine.test.ts` + Worker Parity Test #147 |
| **PWA Cache Isolation** | Service Worker v2 (`linguaverse-shell-v2`) bypasses `/api/*`, `/admin*`, `Authorization`, and non-GET requests; refuses to cache `Set-Cookie`, `Cache-Control: no-store`, or `private`; purges caches via `CLEAR_USER_CACHES` on logout | `public/sw.js`, `src/utils/pwaRuntime.ts`, `src/context/AuthContext.tsx`, `src/AdminApp.tsx` | `pwaCompliance.test.ts` (3/3) |
| **HTTP Security Headers** | `X-Request-Id`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` on Express & Worker | `server.ts`, `worker/index.ts` | `verify:smoke` + Worker parity tests |
| **Dependency & Bundle Hygiene** | `0` known vulnerabilities across 273 packages (`bun audit`); `0` secrets matched in `dist/` or `dist-admin/` | `package.json`, `.gitignore`, `.github/workflows/ci-cd.yml` | Verified via `bun audit` + `grep` scan |

---

## 2. Production Operational Recommendations

1. **Cloudflare WAF & Access:** Enable Cloudflare WAF managed rulesets on your API zone and place **Cloudflare Access (Zero Trust)** in front of the `linguaverse-admin` Pages custom domain.
2. **Secret Rotation:** Rotate `ADMIN_BOOTSTRAP_SECRET` or remove it from Worker secrets after initial Super Admin provisioning completes (the database lock also permanently blocks repeat bootstrap).
3. **Key Masking Policy:** Admin AI Provider Registry stores only masked key fingerprints and never returns raw keys in API responses or audit logs; actual provider keys are injected strictly via `wrangler secret put`.
