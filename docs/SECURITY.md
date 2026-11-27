# LINGUAVERSE AI — Security & Privacy Architecture

## 1. Authentication & Session Protection

- **Password Storage:** Per-user random 16-byte salts with `crypto.scrypt` (Express) and PBKDF2-SHA256 (Cloudflare Workers), verified via constant-time comparisons. Passwords are never stored or logged in plaintext.
- **Session Transport:** Sessions use `HttpOnly` cookies (`SameSite=Lax` in local dev; `SameSite=None; Secure; Partitioned` in staging/production) paired with an ephemeral in-memory Bearer token (`src/services/sessionTokenMemory.ts`). Legacy `localStorage` JWT keys are automatically purged on load.
- **Fail-Closed Secret Handling:** Worker JWT signing rejects missing or weak (`< 32` chars) `JWT_SIGNING_SECRET` in staging/production with `500 AUTH_CONFIG_ERROR`.
- **Email Verification & Password Recovery:** 6-digit OTPs and single-use password reset tokens are stored exclusively as SHA-256 hashes with strict expiry (10 min OTP / 15 min reset), attempt caps (5 attempts), resend cooldowns (60s), anti-enumeration responses, and full revocation of all active sessions on password reset.

---

## 2. Separate Admin Application & RBAC Governance

- **No Public Admin Registration & No Hardcoded Production Credentials:** Public registration always assigns `role: 'learner'`, `plan: 'free'`, and `emailVerified: false`.
- **One-Time Initial Super Admin Provisioning (`POST /api/v1/admin/auth/bootstrap`):**
  - Permitted **only** when zero `admin` or `super_admin` accounts exist in the database.
  - Fails closed in production (`503`) if `ADMIN_BOOTSTRAP_SECRET` is unset or `< 16` characters, and rejects invalid secrets (`403`) via constant-time comparison.
  - Permanently locks (`409 ADMIN_ALREADY_PROVISIONED`) the instant the initial Super Admin is created.
- **Server-Verified RBAC:** All `/api/v1/admin/*` endpoints verify the server session and role (`super_admin`, `admin`, `content_manager`, `ai_ops`, `moderator`) from backend storage — never trusting client headers or UI state. Standard learners attempting admin login or admin APIs receive `403`.
- **Immutable Audit Ledger:** Administrative actions (`admin.bootstrap.claimed`, `admin.auth.login`, user suspensions/role updates/deletions, feature flag changes, provider key rotations, broadcasts, and CMS publishes) are recorded with timestamps, actor roles, and correlation IDs.

---

## 3. Request, Upload, Webhook & AI Safety Controls

- **CSRF & Origin Protection:** State-changing Express routes validate the double-submit CSRF token (`X-CSRF-Token`) using constant-time comparison and enforce trusted `Origin`/`Referer` verification. Production Worker CORS strictly allows configured origins only (never reflecting arbitrary origins or `*` with credentials).
- **Rate Limiting:** Sliding-window rate limiters protect login, registration, OTP resend, password recovery, AI endpoints, R2 audio uploads, and billing intent routes, returning `429` with `Retry-After`.
- **Media & Audio Validation:**
  - CMS image uploads reject SVG/HTML and validate PNG/JPEG/WebP magic bytes with path-confinement checks and sandboxed `Content-Security-Policy: default-src 'none'; sandbox` response headers.
  - R2 audio uploads verify server-side D1 `store_mic_recordings` consent (`403` when disabled), enforce audio MIME allowlists (`415`), enforce a 10 MB size ceiling, and scope keys strictly by `userId`.
- **Signed Payment Webhooks (`POST /api/v1/billing/webhooks/:provider`):** Verifies WebCrypto HMAC-SHA256 signatures with a 5-minute replay window, fails closed (`503`) when webhook secrets are unconfigured, and deduplicates events idempotently by `eventId`.
- **AI Prompt-Injection Isolation:** Untrusted learner speech, questions, and history are sanitized and isolated inside explicit XML delimiters (`<learner_utterance>`, `<learner_question>`, `<learner_message>`) with server-authoritative curriculum context lookup.
- **Zero Client-Side Secret Leakage:** All provider keys (`GEMINI_API_KEY`, `RESEND_API_KEY`, `ADMIN_BOOTSTRAP_SECRET`, webhook secrets) stay strictly server-side; automated scans verify zero leaked keys in `dist/` and `dist-admin/`.
