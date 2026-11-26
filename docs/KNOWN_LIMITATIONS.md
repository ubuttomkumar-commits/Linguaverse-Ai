# Known Limitations (checked against source, 2026-11-26)

1. **Stack differs from the PRD.** The PRD specifies React + Cloudflare Workers/Hono. The repo's primary runtime is an Express
   server (`server.ts`) with JSON-file stores (`.data/*.json`); a Hono Worker (`worker/`) with D1 exists in parallel. Two backends
   must be kept in parity. The parity test suite covers part of that.
2. **Default learner persistence is browser-local.** `src/services/storage/index.ts` uses `LocalPersistenceRepository`
   (localStorage) unless `VITE_API_BASE_URL` is set.
3. **Cloudflare services declared vs used.** `wrangler.toml` binds D1, R2 and three KV namespaces with placeholder IDs.
   No Queues, Durable Objects or Cron Triggers are declared or implemented. Turnstile appears only as an env type and a
   provider-registry entry; there is no verification code on registration or login. The platform hosted deploy also rejects
   `kv_namespaces`.
4. **Gemini model IDs are unverified.** Code and `wrangler.toml` reference `gemini-4-hydrogen`, `gemini-3.1-flash-lite`,
   `gemini-3.5-transcribe` and `gemini-3.8-flash-lite-tts`. I could not confirm these exist and made no AI call. Treat AI
   evaluation, transcription and TTS as unverified until run with a real key and valid model names.
5. **Pronunciation is not acoustic.** No phoneme-level provider is integrated.
6. **No browser E2E suite** and no coverage threshold in CI. `src/components` and `src/pages` are untested.
7. **Lockfiles.** `bun.lock` was not regenerated after the esbuild bump; `package-lock.json` was added so `npm ci` works.
8. **Bundle** ships as one ~3.4 MB chunk (no code splitting).
9. **PRD text.** The PRD pasted into this task is labelled v5.0 and ends mid-section (Database Architecture). It is not v6.1 and
   does not contain 46 sections. `audit/PRD-COMPLIANCE-MATRIX.md` from earlier work refers to a different 3,319-line v6.1 text
   that is not in this repository. I did not re-derive its "LOCALLY VERIFIED" labels beyond the checks in `TESTING_REPORT.md`.
10. **Stale statements.** `audit/RESUME-RECOVERY-REPORT.md`, `audit/REMAINING-TASKS.md` and older STATE.md entries say `.git` is
    absent and GitHub push is blocked. The repo has history and a working remote.
