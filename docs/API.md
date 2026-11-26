# LINGUAVERSE AI — Authoritative API Reference (Express + Cloudflare Worker Parity)

All endpoints below are implemented in **both** the local/Node Express runtime (`server.ts` + `server/prd61Routes.ts`) and the Cloudflare Workers edge runtime (`worker/index.ts` + `worker/routes/*`).

---

## 1. Security Headers, Authentication & CSRF

- **Security Headers** (all responses):
  - `X-Request-Id` / `X-Correlation-Id`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), geolocation=(), payment=()`
  - `X-Frame-Options: DENY` (Cloudflare Worker JSON API)
- **Session Architecture**:
  - Server-verified HttpOnly session cookies (`lv_session` on Express; signed JWT cookie + Bearer token support on Worker).
  - Suspended accounts and password resets immediately revoke all active sessions server-side.
- **CSRF & Origin Protection**:
  - `GET /api/v1/auth/csrf` issues double-submit CSRF cookie (`lv_csrf_token`) and JSON `{ csrfToken }`.
  - Sensitive state-changing routes verify `Origin` allowlist and matching `X-CSRF-Token`.
- **RBAC Enforcement**:
  - Roles: `learner`, `moderator`, `content_manager`, `ai_ops`, `admin`, `super_admin`.
  - Spoofable client headers (`X-Admin-Role`, `X-Admin-Email`) are **ignored**; all admin routes verify the authenticated user's persisted database role.

---

## 2. Public & System Status Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Server liveness & AI model status |
| `GET` | `/api/v1/system/status` | Public | Non-secret platform status: `maintenanceMode`, bilingual banners, `allowNewRegistrations`, and active `featureFlags` |
| `GET` | `/api/v1/auth/csrf` | Public | Issues CSRF cookie + token |
| `GET` | `/api/v1/auth/providers` | Public | Reports real server-side OAuth & email provider configuration status (never simulates unconfigured providers) |
| `GET` | `/api/v1/cms/public` | Public | Published marketing CMS content, navigation, pricing plans, testimonials, FAQs, and SEO metadata |
| `GET` | `/api/v1/speaking/health` | Public | Speaking AI provider health & configured models |
| `GET` | `/api/v1/transfer/health` | Public | Transfer Lab AI provider health |
| `GET` | `/api/v1/replay/health` | Public | Communication Replay health & cloud sync status |
| `GET` | `/api/v1/mistakes/health` | Public | Mistake Coach AI health |
| `GET` | `/api/v1/dna/health` | Public | Communication DNA synthesis health |
| `GET` | `/api/v1/academy/health` | Public | Academy AI tutor health |

---

## 3. Authentication, Email OTP & Password Recovery

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public + CSRF | Registers user (`scrypt` / `PBKDF2` salted hash), sets HttpOnly session cookie, sends 6-digit OTP email (dev preview OTP only when no mail provider is configured in non-production) |
| `POST` | `/api/v1/auth/login` | Public + CSRF | Verifies credentials, rejects suspended accounts (`403`), issues session |
| `POST` | `/api/v1/auth/logout` | Session + CSRF | Revokes active session server-side & clears cookie |
| `GET` | `/api/v1/auth/me` | Session | Returns authenticated user profile, role, verification status & subscription |
| `POST` | `/api/v1/auth/verify-email` | Session + CSRF | Verifies 6-digit SHA-256 hashed OTP (max 5 attempts, 10-min expiry) |
| `POST` | `/api/v1/auth/resend-otp` | Session + CSRF | Re-issues OTP with 60-second cooldown |
| `POST` | `/api/v1/auth/forgot-password` | Public + CSRF | Anti-enumeration password reset request (single-use 15-min token) |
| `GET` | `/api/v1/auth/reset-password/validate` | Public | Validates reset token expiry & unused status |
| `POST` | `/api/v1/auth/reset-password` | Public + CSRF | Updates password hash & revokes **all** existing sessions |

---

## 4. Core Learner Workspace & Adaptive Learning

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` / `PUT` | `/api/v1/learner/profile` | Session | Learner onboarding goals, native language, CEFR focus, and consent flags |
| `GET` / `POST` | `/api/v1/learner/diagnostics` | Session | Baseline & reassessment diagnostic attempts |
| `GET` / `POST` | `/api/v1/learner/lessons/attempts` | Session | 7-stage Academy lesson attempts & mastery updates |
| `GET` / `PUT` | `/api/v1/learner/academy/state` | Session | Persisted Academy progress, bookmarks, and notes |
| `POST` | `/api/v1/academy/explain` | Session + CSRF | Live Gemini bilingual grammar & Bangla-interference tutor |
| `GET` / `POST` | `/api/v1/speaking/sessions` | Session | Speaking Studio sessions & Mistake Memory sync |
| `POST` | `/api/v1/speaking/evaluate` | Session + CSRF | Live Gemini speaking evaluation (honest text-transcript scope when no acoustic provider is configured) |
| `POST` | `/api/v1/speaking/transcribe` | Session + CSRF | Consent-gated audio transcription (MIME allowlist + magic bytes + size cap) |
| `POST` | `/api/v1/speaking/tts` | Session + CSRF | Server-side WAV TTS synthesis |
| `GET` / `PUT` | `/api/v1/speaking/preferences` | Session | Speaking voice speed, recording consent, and persona settings |
| `GET` / `POST` | `/api/v1/mistakes` | Session | Mistake Memory Engine records & drill logs |
| `POST` | `/api/v1/mistakes/:id/flag` | Session + CSRF | Flag suspected false AI correction for admin review |
| `POST` | `/api/v1/mistakes/coach` | Session + CSRF | Live Gemini personalized error repair coach |
| `GET` / `POST` | `/api/v1/dna/synthesize` | Session + CSRF | Evidence-based Communication DNA synthesis |
| `GET` / `POST` | `/api/v1/transfer/attempts` | Session | Real-World Transfer Lab & Pressure Ladder attempts |
| `POST` | `/api/v1/transfer/turn` | Session + CSRF | Multi-turn scenario roleplay partner turn |
| `POST` | `/api/v1/transfer/evaluate` | Session + CSRF | Transfer rubric evaluation separating task completion from grammar |
| `GET` / `POST` / `DELETE` | `/api/v1/replay/sessions` | Session | Communication Replay reviews, immutable original snapshots & owner-scoped R2 audio cleanup |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/v1/vocabulary` | Session | Vocabulary SRS items, delayed recall review scheduling & deck stats |

---

## 5. PRD v6.1 Modules: Examinations, Writing Intelligence, Shadowing, Human Bridge & Notifications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/examinations/catalog` | Session | Original IELTS-style practice tasks (Speaking Parts 1–3, Writing Task 1/2 & GT Letter, Reading, Listening) + mandatory Exam Truth Policy disclaimer |
| `GET` | `/api/v1/examinations/attempts` | Session | Persisted learner examination practice history |
| `POST` | `/api/v1/examinations/evaluate` | Session + CSRF | Deterministic grading for Reading/Listening; Gemini non-official rubric feedback for Speaking/Writing (fails honestly with `503` when `GEMINI_API_KEY` is unconfigured) |
| `GET` | `/api/v1/writing/catalog` | Session | 8 writing modes + Japanese-inspired Shadowing & Chunk library |
| `GET` | `/api/v1/writing/entries` | Session | Persisted learner Writing & Language Diary entries |
| `POST` | `/api/v1/writing/evaluate` | Session + CSRF | Saves original text verbatim and generates Gemini bilingual writing intelligence feedback |
| `PATCH` | `/api/v1/writing/entries/:entryId/rewrite` | Session + CSRF | Persists learner's revised rewrite alongside preserved original text |
| `GET` / `POST` / `DELETE` | `/api/v1/human-bridge/logs` | Session | Real-world human conversation reflection logs strictly tagged `evidenceType: 'user_reported'` |
| `GET` | `/api/v1/notifications` | Session | Persisted learner notification preferences + user & platform broadcast notifications |
| `PUT` | `/api/v1/notifications/preferences` | Session + CSRF | Saves daily reminder time, quiet hours, and notification channels |
| `POST` | `/api/v1/notifications/:notificationId/read` | Session + CSRF | Marks notification as read |

---

## 6. Community, Gamification, Billing & Signed Payment Webhooks

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` / `POST` | `/api/v1/community/posts` | Session | Moderated learner discussion posts (DM permanently disabled) |
| `POST` | `/api/v1/community/posts/:postId/comments` | Session + CSRF | Discussion comments |
| `POST` | `/api/v1/community/reports` | Session + CSRF | Report content for moderator review |
| `POST` | `/api/v1/community/blocks` | Session + CSRF | Block another user |
| `POST` | `/api/v1/community/appeals` | Session + CSRF | Submit restriction appeal |
| `GET` / `PUT` | `/api/v1/gamification/preferences` | Session | Opt-in leaderboard alias & server-computed verified XP (ignores forged client XP) |
| `POST` | `/api/v1/subscriptions/checkout-request` | Session + CSRF | Creates subscription intent (`pending_provider` when payment provider credentials are unconfigured; never counts as revenue) |
| `POST` | `/api/v1/support/tickets` | Session + CSRF | Submits billing/product support ticket |
| `POST` | `/api/v1/billing/webhooks/:provider` | HMAC-SHA256 | Verifies `X-LV-Webhook-Timestamp` + `X-LV-Webhook-Signature` for `stripe`, `sslcommerz`, or `paddle`; fails closed (`503`) if unconfigured, `401` on invalid signature, idempotent on duplicate `eventId` |

---

## 7. Admin Control Center Endpoints (Server-Verified RBAC)

| Method | Path | Required Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/overview` | `admin`, `super_admin`, `content_manager`, `ai_ops` | Real database counts (users, sessions, mistakes, revenue) |
| `GET` | `/api/v1/admin/users` | `admin`, `super_admin` | Search & list registered accounts |
| `PATCH` | `/api/v1/admin/users/:userId` | `admin`, `super_admin` | Update role, plan, or `accountStatus` (`suspended` revokes all active sessions) |
| `DELETE` | `/api/v1/admin/users/:userId` | `admin`, `super_admin` | Permanently delete target user account (cannot delete self) |
| `GET` / `PUT` | `/api/v1/admin/feature-flags` | Read: `admin`, `super_admin`, `ai_ops`; Write: `admin`, `super_admin` | Toggle `maintenanceMode` and module feature flags |
| `GET` / `PUT` | `/api/v1/admin/ai-providers` | `admin`, `super_admin`, `ai_ops` | Read masked status of all 12 providers; update Gemini models, timeout, retries, RPM & daily cost ceiling |
| `POST` | `/api/v1/admin/ai-providers/:providerId/health-check` | `admin`, `super_admin`, `ai_ops` | Runs live server-side provider health probe (never exposes raw secrets) |
| `POST` | `/api/v1/admin/ai-providers/:providerId/rotate-key` | `admin`, `super_admin` | Write-only local Express key rotation (returns `501 WRANGLER_SECRET_REQUIRED` on Cloudflare Workers with exact `wrangler secret put` command) |
| `GET` | `/api/v1/admin/system-health` | `admin`, `super_admin`, `ai_ops` | Runtime engine, D1/local DB health, migration list (`0001`–`0004`), provider summary & recent security events |
| `POST` | `/api/v1/admin/notifications/broadcast` | `admin`, `super_admin` | Broadcast bilingual in-app announcement to all learners |
| `GET` / `PUT` | `/api/v1/admin/system-settings` | `admin`, `super_admin` | Non-secret platform configuration (rejects secret keys and DM enablement with `400`) |
| `GET` / `POST` | `/api/v1/admin/moderation/reports` | `moderator`, `admin`, `super_admin` | Review & resolve community moderation queue and appeals |
| `GET` | `/api/v1/admin/subscriptions` | `admin`, `super_admin` | Verified billing metrics (zero fabricated revenue) & support ticket queue |
| `GET` / `PUT` / `POST` | `/api/v1/admin/cms/*` | `content_manager`, `admin`, `super_admin` | Full website CMS pages, navigation, pricing, FAQs, testimonials, media upload (magic-byte validated, SVG blocked) & immutable audit log |
