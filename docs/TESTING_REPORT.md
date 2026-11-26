# Testing Report (2026-11-26)

| Command | Result |
|---------|--------|
| `npm install` (before fix) | exit 1, ERESOLVE (esbuild peer) |
| `npm install` (after esbuild ^0.28.0) | exit 0, 480 packages |
| `npm run lint` (`tsc --noEmit`) | exit 0, 0 errors |
| `npx tsx --experimental-test-coverage --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts` | exit 0; 178 tests, 13 suites, 178 pass, 0 fail, 0 skipped (baseline before my changes: 173) |
| `npm run build` | exit 0. Single ~3.4 MB JS chunk (Vite size warning); PWA precache 21 entries |
| `npm audit --omit=dev` | 0 vulnerabilities |

Measured coverage (Node test runner, only files loaded by the tests): lines 86.67%, branches 63.23%, functions 82.08%.
`src/components` and `src/pages` have no unit tests, so this figure does not describe the UI.

Live HTTP probes against the Express server are listed in `SECURITY_AUDIT.md`.

NOT run:
- Browser end-to-end journey (register, verify, onboarding, assessment, lesson, speaking, mistakes, transfer, progress).
  The repo has no Playwright suite and I did not build one in this session.
- Any AI-dependent path. `/api/v1/health` reports `aiConfigured:false`, so no Gemini call was made.
- The Cloudflare Worker over live HTTP (`wrangler dev`).
