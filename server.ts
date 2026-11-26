import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateSpeakingTurnWithGemini,
  SPEAKING_GEMINI_MODEL,
  SpeakingApiError,
} from './server/geminiSpeaking.ts';
import { evaluateTransferChallengeWithGemini } from './server/geminiTransfer.ts';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  ALLOWED_TTS_VOICES,
  evaluateTransferSessionWithGemini,
  generateTransferParticipantTurnWithGemini,
  synthesizeTransferSpeechWithGemini,
  transcribeTransferAudioWithGemini,
} from './server/geminiTransferLab.ts';
import { isValidTransferUniverseScenarioId } from './src/domain/transferLabUniverseEngine.ts';
import { registerExpressP3Routes } from './server/p3Routes.ts';
import { registerExpressPrd61Routes } from './server/prd61Routes.ts';
import { analyzeLandingSentenceWithGemini } from './server/geminiSampleAnalyze.ts';
import {
  ACADEMY_ASSIST_MODEL,
  generateAcademyAssistWithGemini,
  VALID_EXPLANATION_LANGUAGES,
  VALID_LESSON_STAGES,
  type AcademyAssistRequest,
} from './server/geminiAcademyAssist.ts';
import {
  generateMistakeCoachReplyWithGemini,
  generatePersonalizedMistakeExerciseWithGemini,
  MISTAKE_COACH_FALLBACK_MODEL,
  MISTAKE_COACH_MODEL,
  MISTAKE_COACH_PROMPT_VERSION,
  VALID_COACH_EXPLANATION_LANGS,
  type MistakeCoachRequest,
  type MistakeCoachTurn,
  type MistakeSummaryContext,
  type PersonalizedMistakeExerciseRequest,
} from './server/geminiMistakeCoach.ts';
import {
  DNA_AI_FALLBACK_MODEL,
  DNA_AI_MODEL,
  DNA_SYNTHESIS_PROMPT_VERSION,
  generateDnaCoachReplyWithGemini,
  generateDnaSynthesisWithGemini,
  VALID_DNA_EXPLANATION_LANGS,
  type DnaCoachRequest,
  type DnaCoachTurn,
  type DnaSkillSummaryPayload,
  type DnaSynthesisRequest,
} from './server/geminiDnaCoach.ts';
import {
  evaluateReplayPracticeAttemptWithGemini,
  generateReplayCorrectionDeepDiveWithGemini,
  generateReplaySessionSummaryWithGemini,
  REPLAY_AI_FALLBACK_MODEL,
  REPLAY_AI_MODEL,
  REPLAY_COACH_PROMPT_VERSION,
  VALID_REPLAY_EXPLANATION_LANGS,
} from './server/geminiReplayCoach.ts';
import { getLessonById } from './src/domain/curriculumData.ts';
import {
  sendOtpEmailFromServer,
  sendPasswordResetEmailFromServer,
} from './server/emailService.ts';
import {
  authLoginLimiter,
  authOtpLimiter,
  authRecoveryLimiter,
  authRegisterLimiter,
  completeServerPasswordReset,
  createPasswordResetRequest,
  ensureServerUserMirror,
  getAuthProviderStatus,
  issueCsrfToken,
  loginServerUser,
  parseCookieHeader,
  registerServerUser,
  resendServerEmailOtp,
  resolveSessionByRawToken,
  revokeSessionByRawToken,
  validateServerResetToken,
  verifyServerEmailOtp,
} from './server/authStore.ts';
import { SlidingWindowRateLimiter } from './src/domain/authSecurityEngine.ts';
import { isTrustedMutationOrigin } from './src/domain/securityPolicy.ts';
import {
  deleteUploadedMedia,
  getAdminCmsState,
  getAnalyticsSummary,
  getPublishedCmsConfig,
  getServerAuditLogs,
  publishCmsDraft,
  recordAnalyticsEvent,
  resetCmsToDefaults,
  resolveUploadedMediaFile,
  saveCmsDraft,
  saveUploadedMedia,
} from './server/cmsStore.ts';
import {
  canAdminRoleEditCms,
  canAdminRoleReadCms,
  type CmsConfig,
} from './src/domain/cmsEngine.ts';
import { analyzeSampleSentence } from './src/domain/sampleAnalyzer.ts';
import type { SpeakingEvaluationRequest } from './src/domain/speakingEvaluation.ts';
import { isValidSpeakingModeId } from './src/domain/speakingScenarios.ts';
import type { TransferEvaluationRequest } from './src/domain/transferLabEngine.ts';
import { normalizePressureLevel } from './src/domain/pressureLadder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliOption(flag: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === flag && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith(`${flag}=`)) {
      return arg.slice(flag.length + 1);
    }
  }
  return undefined;
}

const cliPort = Number(parseCliOption('--port'));
const envPort = Number(process.env.PORT);
const PORT =
  Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : Number.isFinite(envPort) && envPort > 0
      ? envPort
      : 3000;
const HOST = parseCliOption('--host') || process.env.HOST || '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

const CORS_ALLOWED_ORIGIN_RAW = process.env.CORS_ALLOWED_ORIGIN || '';

const landingAnalyzeLimiter = new SlidingWindowRateLimiter(15, 5 * 60 * 1000);
const publicAnalyticsLimiter = new SlidingWindowRateLimiter(60, 60 * 1000);
const subscriptionIntentLimiter = new SlidingWindowRateLimiter(20, 5 * 60 * 1000);
const mirrorLocalLimiter = new SlidingWindowRateLimiter(10, 15 * 60 * 1000);

function timingSafeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Security & request correlation headers (iframe-compatible: no X-Frame-Options: DENY)
  app.use((req, res, next) => {
    const reqId =
      typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()
        ? req.headers['x-request-id'].trim().slice(0, 64)
        : `req_${crypto.randomBytes(8).toString('hex')}`;
    res.setHeader('X-Request-Id', reqId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
    next();
  });

  // Server health & configuration check (never leaks secrets)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'linguaverse-ai-server' });
  });

  app.get('/api/speaking/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    const configured = Boolean(rawKey) && rawKey !== 'MY_GEMINI_API_KEY';
    res.json({
      ok: true,
      configured,
      model: SPEAKING_GEMINI_MODEL,
    });
  });

  app.get('/api/academy/assist/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    const configured = Boolean(rawKey) && rawKey !== 'MY_GEMINI_API_KEY';
    res.json({
      ok: true,
      configured,
      model: ACADEMY_ASSIST_MODEL,
    });
  });

  app.get('/api/transfer/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    const aiConfigured = Boolean(rawKey) && rawKey !== 'MY_GEMINI_API_KEY';
    res.json({
      ok: true,
      aiConfigured,
      transcriptionConfigured: aiConfigured,
      ttsConfigured: aiConfigured,
      model: SPEAKING_GEMINI_MODEL,
    });
  });

  app.get('/api/v1/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    res.json({
      ok: true,
      service: 'linguaverse-ai-server',
      aiConfigured: Boolean(rawKey) && rawKey !== 'MY_GEMINI_API_KEY',
      billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    });
  });

  // ============================================================================
  // Production-Grade Authentication & Password Recovery APIs (/api/v1/auth/*)
  // ============================================================================
  const CSRF_COOKIE = 'lv_csrf_token';
  const SESSION_COOKIE = 'lv_session_token';

  const getClientIp = (req: express.Request): string =>
    String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local')
      .split(',')[0]
      .trim();

  const resolveRequestSession = (req: express.Request) => {
    const cookies = parseCookieHeader(req.headers.cookie);
    const authHeader = String(req.header('Authorization') || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    return resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
  };

  const requireExpressAdmin = (
    req: express.Request,
    res: express.Response,
    roleCheck: (role: string) => boolean,
    forbiddenMessage: string
  ): { id: string; email: string; role: string } | null => {
    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({
        error: 'Authentication required to access administrative endpoints.',
        code: 'UNAUTHORIZED',
      });
      return null;
    }
    const verifiedRole = String(resolved.user.role || 'learner');
    if (!roleCheck(verifiedRole)) {
      res.status(403).json({
        error: forbiddenMessage,
        code: 'FORBIDDEN',
      });
      return null;
    }
    return {
      id: resolved.user.id,
      email: resolved.user.email,
      role: verifiedRole,
    };
  };

  const verifyCsrf = (req: express.Request, res: express.Response): boolean => {
    if (
      !isTrustedMutationOrigin({
        originHeader: req.header('Origin'),
        refererHeader: req.header('Referer'),
        hostHeader: req.header('Host'),
        forwardedHostHeader: req.header('X-Forwarded-Host'),
        allowedOrigins: CORS_ALLOWED_ORIGIN_RAW,
      })
    ) {
      res.status(403).json({
        error: 'Security verification failed (untrusted request origin).',
        code: 'INVALID_ORIGIN',
      });
      return false;
    }

    const cookies = parseCookieHeader(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE] || '';
    const headerToken = String(req.header('X-CSRF-Token') || '').trim();
    if (!cookieToken || !headerToken || !timingSafeTokenEqual(cookieToken, headerToken)) {
      res.status(403).json({
        error: 'Security verification failed (invalid CSRF token). Please refresh and try again.',
        code: 'INVALID_CSRF',
      });
      return false;
    }
    return true;
  };

  const setSessionCookie = (res: express.Response, rawToken: string, rememberMe: boolean) => {
    const maxAgeSec = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const secureFlag = IS_PROD ? '; Secure' : '';
    res.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secureFlag}`
    );
  };

  const clearSessionCookie = (res: express.Response) => {
    const secureFlag = IS_PROD ? '; Secure' : '';
    res.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
    );
  };

  app.get('/api/v1/auth/csrf', (req, res) => {
    const existing = parseCookieHeader(req.headers.cookie)[CSRF_COOKIE];
    const csrfToken = existing && existing.length >= 32 ? existing : issueCsrfToken();
    const secureFlag = IS_PROD ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `${CSRF_COOKIE}=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    res.json({ csrfToken });
  });

  app.get('/api/v1/auth/providers', (_req, res) => {
    res.json(getAuthProviderStatus());
  });

  app.get('/api/v1/auth/me', (req, res) => {
    const cookies = parseCookieHeader(req.headers.cookie);
    const authHeader = String(req.header('Authorization') || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
    if (!resolved) {
      res.status(401).json({ authenticated: false, error: 'Session is invalid or expired.' });
      return;
    }
    res.json({
      authenticated: true,
      user: resolved.user,
      session: {
        id: resolved.session.id,
        rememberMe: resolved.session.rememberMe,
        expiresAt: resolved.session.expiresAt,
      },
    });
  });

  app.post('/api/v1/auth/register', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const limit = authRegisterLimiter.consume(`reg:${ip}`);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many registration attempts. Please try again in ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const body = (req.body || {}) as {
      name?: string;
      email?: string;
      password?: string;
      plan?: 'free' | 'pro';
    };

    const result = await registerServerUser({
      name: String(body.name || ''),
      email: String(body.email || ''),
      password: String(body.password || ''),
      plan: 'free',
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const emailDispatch = await sendOtpEmailFromServer({
      toEmail: result.user.email,
      recipientName: result.user.name,
      otpCode: result.otpCode,
    });

    setSessionCookie(res, result.rawSessionToken, true);
    res.status(201).json({
      user: result.user,
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt,
      },
      otpDelivery: {
        email: result.user.email,
        expiresAt: result.otpExpiresAt,
        resendAvailableAt: result.otpResendAvailableAt,
        deliveryMode: emailDispatch.delivered ? 'email_provider' : 'local_dev_preview',
        devPreviewOtp: emailDispatch.delivered ? undefined : result.otpCode,
      },
    });
  });

  app.post('/api/v1/auth/login', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const body = (req.body || {}) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };
    const emailKey = String(body.email || '').trim().toLowerCase();
    const limit = authLoginLimiter.consume(`login:${ip}:${emailKey}`);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many sign-in attempts. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const result = loginServerUser({
      email: emailKey,
      password: String(body.password || ''),
      rememberMe: Boolean(body.rememberMe),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    setSessionCookie(res, result.rawSessionToken, Boolean(body.rememberMe));
    res.json({
      user: result.user,
      session: {
        id: result.session.id,
        rememberMe: result.session.rememberMe,
        expiresAt: result.session.expiresAt,
      },
    });
  });

  app.post('/api/v1/auth/logout', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const cookies = parseCookieHeader(req.headers.cookie);
    revokeSessionByRawToken(cookies[SESSION_COOKIE]);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/v1/auth/verify-email', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const limit = authOtpLimiter.consume(`otp:${ip}`);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many verification attempts. Please wait ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    const cookies = parseCookieHeader(req.headers.cookie);
    const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE]);
    if (!resolved) {
      res.status(401).json({ error: 'Authentication required to verify email.' });
      return;
    }
    const code = String((req.body as { code?: string })?.code || '');
    const result = await verifyServerEmailOtp(resolved.user.id, code);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ user: result.user });
  });

  app.post('/api/v1/auth/resend-otp', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const limit = authOtpLimiter.consume(`otp_resend:${ip}`);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        error: `Too many OTP resend requests. Please wait ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({
        error: 'Authentication required to resend email verification OTP.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const issued = await resendServerEmailOtp(resolved.user.id);
    if (!issued.ok) {
      if (issued.retryAfterSeconds) {
        res.setHeader('Retry-After', String(issued.retryAfterSeconds));
      }
      res.status(issued.status).json({
        error: issued.error,
        retryAfterSeconds: issued.retryAfterSeconds,
      });
      return;
    }

    const emailDispatch = await sendOtpEmailFromServer({
      toEmail: issued.email,
      recipientName: issued.name,
      otpCode: issued.otpCode,
    });

    res.json({
      email: issued.email,
      expiresAt: issued.otpExpiresAt,
      resendAvailableAt: issued.otpResendAvailableAt,
      deliveryMode: emailDispatch.delivered ? 'email_provider' : 'local_dev_preview',
      devPreviewOtp: emailDispatch.delivered ? undefined : issued.otpCode,
    });
  });

  app.post('/api/v1/auth/forgot-password', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const body = (req.body || {}) as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const limit = authRecoveryLimiter.consume(`forgot:${ip}`);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many password recovery requests. Please wait ${limit.retryAfterSeconds} seconds.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const outcome = await createPasswordResetRequest({ email });
    const origin =
      req.headers.origin || `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`;

    let deliveryMode: 'email_provider' | 'local_dev_preview' = 'local_dev_preview';
    let devPreviewResetUrl: string | undefined;
    let devPreviewToken: string | undefined;

    if (outcome.resetEmailPayload) {
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(outcome.resetEmailPayload.rawToken)}`;
      const sent = await sendPasswordResetEmailFromServer({
        toEmail: outcome.resetEmailPayload.email,
        recipientName: outcome.resetEmailPayload.name,
        resetUrl,
      });
      if (sent.delivered) {
        deliveryMode = 'email_provider';
      } else {
        deliveryMode = 'local_dev_preview';
        devPreviewResetUrl = `/reset-password?token=${encodeURIComponent(outcome.resetEmailPayload.rawToken)}`;
        devPreviewToken = outcome.resetEmailPayload.rawToken;
      }
    }

    // Strictly generic message regardless of whether email exists
    res.json({
      ok: true,
      message: outcome.message,
      cooldownSeconds: outcome.cooldownSeconds,
      deliveryMode,
      devPreviewResetUrl,
      devPreviewToken,
    });
  });

  app.get('/api/v1/auth/reset-password/validate', async (req, res) => {
    const token = String(req.query.token || '').trim();
    const check = await validateServerResetToken(token);
    res.json(check);
  });

  app.post('/api/v1/auth/reset-password', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const limit = authRecoveryLimiter.consume(`reset:${ip}`);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many password reset attempts. Please wait ${limit.retryAfterSeconds} seconds.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    const body = (req.body || {}) as { token?: string; newPassword?: string };
    const result = await completeServerPasswordReset({
      token: String(body.token || ''),
      newPassword: String(body.newPassword || ''),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error, reason: result.reason });
      return;
    }

    clearSessionCookie(res);
    res.json({
      ok: true,
      email: result.email,
      revokedSessionsCount: result.revokedSessionsCount,
      message:
        'Your password has been updated and all previous sessions have been securely signed out.',
    });
  });

  // Sync helper so authenticated local-browser accounts remain recoverable via server password reset.
  // Requires an active server session matching the account email and never trusts client plan/role/emailVerified.
  app.post('/api/v1/auth/mirror-local', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = getClientIp(req);
    const limit = mirrorLocalLimiter.consume(`mirror:${ip}`);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        error: `Too many account sync requests. Please wait ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({
        error: 'Authentication required to synchronize account recovery state.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const body = (req.body || {}) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const requestedEmail = String(body.email || '').trim().toLowerCase();
    if (requestedEmail && requestedEmail !== resolved.user.email.toLowerCase()) {
      res.status(403).json({
        error: 'Forbidden: cannot mirror credentials for another account.',
        code: 'FORBIDDEN',
      });
      return;
    }
    if (body.password && typeof body.password === 'string' && body.password.length >= 8) {
      ensureServerUserMirror({
        id: resolved.user.id,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : resolved.user.name,
        email: resolved.user.email,
        password: body.password,
      });
    }
    res.json({ ok: true });
  });

  // ============================================================================
  // Public CMS, Media, Analytics & Honest Subscription Intent APIs (/api/v1/*)
  // ============================================================================
  app.get('/api/v1/cms/public', (_req, res) => {
    res.json({ config: getPublishedCmsConfig() });
  });

  app.get('/api/v1/media/:filename', (req, res) => {
    const resolved = resolveUploadedMediaFile(req.params.filename);
    if (!resolved) {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }
    res.setHeader('Content-Type', resolved.mimeType);
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(resolved.filePath);
  });

  app.post('/api/v1/analytics/event', (req, res) => {
    const ip = getClientIp(req);
    const limit = publicAnalyticsLimiter.consume(`analytics:${ip}`);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        error: `Analytics rate limit exceeded. Please retry in ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    const body = req.body as {
      eventType?: unknown;
      path?: unknown;
      metadata?: Record<string, string | number | boolean>;
    };
    if (typeof body?.eventType !== 'string' || !body.eventType.trim()) {
      res.status(400).json({ error: 'eventType is required.' });
      return;
    }
    recordAnalyticsEvent({
      eventType: body.eventType,
      path: typeof body.path === 'string' ? body.path : '/',
      metadata:
        body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
    });
    res.status(202).json({ ok: true });
  });

  app.post('/api/v1/subscriptions/intent', (req, res) => {
    const ip = getClientIp(req);
    const limit = subscriptionIntentLimiter.consume(`sub:${ip}`);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        error: `Too many checkout requests. Please retry in ${limit.retryAfterSeconds}s.`,
        code: 'RATE_LIMITED',
      });
      return;
    }

    const body = req.body as { planSlug?: unknown; billingInterval?: unknown };
    const planSlug = typeof body?.planSlug === 'string' ? body.planSlug.trim() : 'premium';
    const billingInterval = body?.billingInterval === 'yearly' ? 'yearly' : 'monthly';

    recordAnalyticsEvent({
      eventType: 'upgrade_modal_open',
      path: '/',
      metadata: { planSlug, billingInterval },
    });

    // Strictly honest: never simulate payment success when no live billing keys are configured
    res.json({
      status: 'payment_provider_not_configured',
      planSlug,
      billingInterval,
      message:
        'Live payment checkout (Stripe / SSLCommerz) is not configured in this environment. No card has been charged—you can create a Free Plan account right now.',
    });
  });

  // ============================================================================
  // Server-Side Session + RBAC Protected Admin CMS Endpoints (/api/v1/admin/*)
  // ============================================================================
  app.get('/api/v1/admin/cms', (req, res) => {
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleReadCms,
      'Forbidden: administrative role required to inspect CMS state.'
    );
    if (!actor) return;
    res.json(getAdminCmsState());
  });

  app.put('/api/v1/admin/cms/draft', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleEditCms,
      'Forbidden: admin or content_manager role required to edit CMS.'
    );
    if (!actor) return;
    const body = req.body as { patch?: Partial<CmsConfig>; summary?: string };
    if (!body?.patch || typeof body.patch !== 'object') {
      res.status(400).json({ error: 'CMS patch object is required.' });
      return;
    }
    const result = saveCmsDraft(body.patch, actor, body.summary);
    res.json(result);
  });

  app.post('/api/v1/admin/cms/publish', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleEditCms,
      'Forbidden: admin or content_manager role required to publish CMS.'
    );
    if (!actor) return;
    const body = (req.body || {}) as { patch?: Partial<CmsConfig> };
    const result = publishCmsDraft(actor, body.patch);
    res.json(result);
  });

  app.post('/api/v1/admin/cms/reset', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const actor = requireExpressAdmin(
      req,
      res,
      (role) => role === 'super_admin' || role === 'admin',
      'Forbidden: admin role required to reset CMS.'
    );
    if (!actor) return;
    const result = resetCmsToDefaults(actor);
    res.json(result);
  });

  app.post('/api/v1/admin/media', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleEditCms,
      'Forbidden: insufficient role to upload media.'
    );
    if (!actor) return;
    const body = req.body as {
      filename?: string;
      mimeType?: string;
      dataBase64?: string;
      altText?: string;
    };
    if (!body?.filename || !body?.mimeType || !body?.dataBase64) {
      res.status(400).json({ error: 'filename, mimeType, and dataBase64 are required.' });
      return;
    }
    const saved = saveUploadedMedia({
      filename: body.filename,
      mimeType: body.mimeType,
      dataBase64: body.dataBase64,
      altText: body.altText,
      actor,
    });
    if (!saved.ok) {
      res.status(400).json({ error: saved.error });
      return;
    }
    res.status(201).json({ asset: saved.asset });
  });

  app.delete('/api/v1/admin/media/:mediaId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleEditCms,
      'Forbidden: insufficient role to delete media.'
    );
    if (!actor) return;
    const deleted = deleteUploadedMedia(req.params.mediaId, actor);
    if (!deleted) {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/v1/admin/analytics', (req, res) => {
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleReadCms,
      'Forbidden: admin access required.'
    );
    if (!actor) return;
    res.json({ analytics: getAnalyticsSummary() });
  });

  app.get('/api/v1/admin/audit-logs', (req, res) => {
    const actor = requireExpressAdmin(
      req,
      res,
      canAdminRoleReadCms,
      'Forbidden: admin access required.'
    );
    if (!actor) return;
    res.json({ auditLogs: getServerAuditLogs() });
  });

  // Strict JSON Gemini evaluation endpoint for AI Speaking Studio (authenticated, rate-limited, allowlisted)
  const speakingEvalWindowMs = 5 * 60 * 1000;
  const speakingEvalMaxPerWindow = 25;
  const speakingEvalHits = new Map<string, number[]>();
  const validSpeakingChannels = new Set(['voice_stt', 'voice_with_manual_edit', 'text_fallback']);
  const validSpeakingLangs = new Set(['bn', 'en', 'both']);
  const validCorrectionStyles = new Set(['gentle', 'detailed', 'conversation_first']);
  const validLearnerLevels = new Set([
    'complete_beginner',
    'Pre-A1',
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2',
    'unsure',
  ]);

  app.post('/api/speaking/evaluate', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      // 1. Server-side session authentication check
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to use the AI Speaking Studio evaluator.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // 2. Bounded per-user sliding-window rate limit
      const now = Date.now();
      const rateKey = `usr:${resolved.user.id}`;
      if (speakingEvalHits.size > 500) {
        for (const [key, stamps] of speakingEvalHits.entries()) {
          const recent = stamps.filter((ts) => now - ts < speakingEvalWindowMs);
          if (recent.length === 0) speakingEvalHits.delete(key);
          else speakingEvalHits.set(key, recent);
        }
      }
      const userHits = (speakingEvalHits.get(rateKey) || []).filter(
        (ts) => now - ts < speakingEvalWindowMs
      );
      if (userHits.length >= speakingEvalMaxPerWindow) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((speakingEvalWindowMs - (now - userHits[0])) / 1000)
        );
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
          error: `Speaking evaluation rate limit reached. Please wait ${retryAfterSec}s before retrying.`,
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryAfterSec,
        });
        return;
      }
      userHits.push(now);
      speakingEvalHits.set(rateKey, userHits);

      // 3. Strict input allowlist validation
      const body = req.body as Partial<SpeakingEvaluationRequest> | undefined;
      if (!body || typeof body.userTranscript !== 'string' || !body.userTranscript.trim()) {
        res.status(400).json({
          error: 'Please speak or type a response before submitting.',
          code: 'EMPTY_TRANSCRIPT',
        });
        return;
      }

      if (body.modeId !== undefined && !isValidSpeakingModeId(body.modeId)) {
        res.status(400).json({
          error: 'Invalid speaking scenario mode.',
          code: 'INVALID_MODE',
        });
        return;
      }

      if (body.inputChannel !== undefined && !validSpeakingChannels.has(String(body.inputChannel))) {
        res.status(400).json({
          error: 'Invalid speaking input channel.',
          code: 'INVALID_CHANNEL',
        });
        return;
      }

      if (
        body.explanationLanguage !== undefined &&
        !validSpeakingLangs.has(String(body.explanationLanguage))
      ) {
        res.status(400).json({
          error: 'Invalid explanation language.',
          code: 'INVALID_LANGUAGE',
        });
        return;
      }

      if (
        body.correctionStyle !== undefined &&
        !validCorrectionStyles.has(String(body.correctionStyle))
      ) {
        res.status(400).json({
          error: 'Invalid correction style preference.',
          code: 'INVALID_CORRECTION_STYLE',
        });
        return;
      }

      const safeHistory = Array.isArray(body.history)
        ? body.history
            .slice(-10)
            .filter(
              (entry): entry is { role: 'ai' | 'user'; text: string } =>
                Boolean(entry) &&
                (entry.role === 'ai' || entry.role === 'user') &&
                typeof entry.text === 'string' &&
                entry.text.trim().length > 0
            )
            .map((entry) => ({
              role: entry.role,
              text: entry.text.trim().slice(0, 800),
            }))
        : [];

      const safeContextSummary =
        typeof body.contextSummary === 'string' && body.contextSummary.trim()
          ? body.contextSummary.trim().slice(0, 800)
          : undefined;

      const safeLevel =
        typeof body.learnerLevel === 'string' && validLearnerLevels.has(body.learnerLevel)
          ? body.learnerLevel
          : 'A2';

      const payload: SpeakingEvaluationRequest = {
        modeId: body.modeId ?? 'daily_conversations',
        pressureLevel: normalizePressureLevel(body.pressureLevel),
        userTranscript: body.userTranscript.trim().slice(0, 2000),
        inputChannel: body.inputChannel ?? 'text_fallback',
        learnerLevel: safeLevel as SpeakingEvaluationRequest['learnerLevel'],
        explanationLanguage: body.explanationLanguage ?? 'both',
        history: safeHistory,
        timedOut: Boolean(body.timedOut),
        correctionStyle: (body.correctionStyle ?? 'gentle') as SpeakingEvaluationRequest['correctionStyle'],
        contextSummary: safeContextSummary,
      };

      const result = await evaluateSpeakingTurnWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }

      const fallbackMessage =
        err instanceof Error ? err.message : 'Unexpected server error during evaluation.';
      res.status(500).json({
        error: fallbackMessage,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // ============================================================================
  // Transfer Lab AI Simulation, 8-Dimension Evaluation & Voice Endpoints (Part 11)
  // ============================================================================
  const transferWindowMs = 5 * 60 * 1000;
  const transferMaxPerWindow = 40;
  const transferRateHits = new Map<string, number[]>();

  const requireAuthenticatedTransferUser = (
    req: express.Request,
    res: express.Response
  ): { userId: string } | null => {
    if (!verifyCsrf(req, res)) return null;
    const cookies = parseCookieHeader(req.headers.cookie);
    const authHeader = String(req.header('Authorization') || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
    if (!resolved) {
      res.status(401).json({
        error: 'Please sign in to access Transfer Lab AI simulations and evaluation.',
        code: 'UNAUTHORIZED',
      });
      return null;
    }

    const userKey = resolved.user.id;
    const now = Date.now();
    const recent = (transferRateHits.get(userKey) ?? []).filter((ts) => now - ts < transferWindowMs);
    if (recent.length >= transferMaxPerWindow) {
      const oldest = recent[0] ?? now;
      const retryAfterSec = Math.max(5, Math.ceil((transferWindowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Transfer Lab rate limit reached. Please wait ${retryAfterSec}s before retrying.`,
        code: 'RATE_LIMITED',
      });
      return null;
    }
    recent.push(now);
    transferRateHits.set(userKey, recent);
    return { userId: userKey };
  };

  const VALID_TRANSFER_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);
  const VALID_TRANSFER_EXPLANATION_LANGS = new Set(['bn', 'en', 'both']);

  // Legacy 4-Rubric Gemini Grading endpoint (now authenticated & rate-limited)
  app.post('/api/transfer/evaluate', async (req, res) => {
    try {
      const actor = requireAuthenticatedTransferUser(req, res);
      if (!actor) return;

      const body = req.body as Partial<TransferEvaluationRequest> | undefined;
      if (!body || typeof body.userResponse !== 'string' || !body.userResponse.trim()) {
        res.status(400).json({
          error: 'Please speak or type your scenario response before submitting.',
          code: 'EMPTY_RESPONSE',
        });
        return;
      }

      const payload: TransferEvaluationRequest = {
        scenarioId: body.scenarioId ?? 'job_interview_followup',
        pressureLevel: normalizePressureLevel(body.pressureLevel),
        stage: body.stage === 'twist_followup' ? 'twist_followup' : 'initial',
        userResponse: body.userResponse.trim().slice(0, 2500),
        twistPromptShown:
          typeof body.twistPromptShown === 'string'
            ? body.twistPromptShown.trim().slice(0, 800)
            : undefined,
        twistResponse:
          typeof body.twistResponse === 'string'
            ? body.twistResponse.trim().slice(0, 2000)
            : undefined,
        targetSkillLabelEn:
          typeof body.targetSkillLabelEn === 'string' && body.targetSkillLabelEn.trim()
            ? body.targetSkillLabelEn.trim().slice(0, 300)
            : 'Accurate Real-World English Transfer',
        linkedMistakePattern:
          typeof body.linkedMistakePattern === 'string'
            ? body.linkedMistakePattern.trim().slice(0, 300)
            : undefined,
        inputChannel: body.inputChannel ?? 'text_fallback',
        learnerLevel:
          typeof body.learnerLevel === 'string' && VALID_TRANSFER_LEVELS.has(body.learnerLevel)
            ? (body.learnerLevel as TransferEvaluationRequest['learnerLevel'])
            : 'A2',
        explanationLanguage:
          typeof body.explanationLanguage === 'string' &&
          VALID_TRANSFER_EXPLANATION_LANGS.has(body.explanationLanguage)
            ? (body.explanationLanguage as TransferEvaluationRequest['explanationLanguage'])
            : 'both',
        timedOut: Boolean(body.timedOut),
      };

      const result = await evaluateTransferChallengeWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }

      const fallbackMessage =
        err instanceof Error ? err.message : 'Unexpected server error during Transfer Lab grading.';
      res.status(500).json({
        error: fallbackMessage,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Part 11: Live Multi-Turn In-Character AI Participant Endpoint
  app.post('/api/transfer/turn', async (req, res) => {
    try {
      const actor = requireAuthenticatedTransferUser(req, res);
      if (!actor) return;

      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.scenarioId !== 'string' || !isValidTransferUniverseScenarioId(body.scenarioId)) {
        res.status(400).json({
          error: 'Invalid or unknown Transfer Lab scenario.',
          code: 'INVALID_SCENARIO',
        });
        return;
      }
      if (typeof body.learnerMessage !== 'string' || !body.learnerMessage.trim()) {
        res.status(400).json({
          error: 'Please enter or speak your message before sending.',
          code: 'EMPTY_MESSAGE',
        });
        return;
      }

      const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(-24) : [];
      const safeTranscript = rawTranscript
        .filter(
          (t): t is Record<string, unknown> =>
            Boolean(t && typeof t === 'object' && typeof (t as Record<string, unknown>).text === 'string')
        )
        .map((t, idx) => ({
          id: typeof t.id === 'string' ? t.id.slice(0, 64) : `turn_${idx}`,
          role: (t.role === 'learner' ? 'learner' : 'ai') as 'learner' | 'ai',
          text: String(t.text).trim().slice(0, 1500),
          timestamp: typeof t.timestamp === 'string' ? t.timestamp.slice(0, 64) : new Date().toISOString(),
        }))
        .filter((t) => t.text.length > 0);

      const rawObjectives = Array.isArray(body.currentObjectives) ? body.currentObjectives.slice(0, 12) : [];
      const safeObjectives = rawObjectives
        .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
        .map((o) => ({
          objectiveId: typeof o.objectiveId === 'string' ? o.objectiveId.slice(0, 40) : '',
          labelEn: typeof o.labelEn === 'string' ? o.labelEn.slice(0, 180) : '',
          labelBn: typeof o.labelBn === 'string' ? o.labelBn.slice(0, 180) : '',
          criteriaEn: typeof o.criteriaEn === 'string' ? o.criteriaEn.slice(0, 240) : '',
          status: (typeof o.status === 'string' ? o.status : 'not_started') as
            | 'not_started'
            | 'in_progress'
            | 'achieved'
            | 'partially_achieved'
            | 'not_achieved'
            | 'not_evaluated',
          evidenceQuote: typeof o.evidenceQuote === 'string' ? o.evidenceQuote.slice(0, 220) : undefined,
          rationaleEn: typeof o.rationaleEn === 'string' ? o.rationaleEn.slice(0, 240) : undefined,
          rationaleBn: typeof o.rationaleBn === 'string' ? o.rationaleBn.slice(0, 240) : undefined,
        }))
        .filter((o) => o.objectiveId.length > 0);

      const safeAdaptationCues = Array.isArray(body.adaptationCues)
        ? body.adaptationCues
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
            .slice(0, 6)
            .map((c) => c.trim().slice(0, 240))
        : undefined;

      const result = await generateTransferParticipantTurnWithGemini({
        scenarioId: body.scenarioId,
        pressureLevel: normalizePressureLevel(
          typeof body.pressureLevel === 'string'
            ? (body.pressureLevel as TransferEvaluationRequest['pressureLevel'])
            : undefined
        ),
        learnerLevel:
          typeof body.learnerLevel === 'string' && VALID_TRANSFER_LEVELS.has(body.learnerLevel)
            ? (body.learnerLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1')
            : 'A2',
        explanationLanguage:
          typeof body.explanationLanguage === 'string' &&
          VALID_TRANSFER_EXPLANATION_LANGS.has(body.explanationLanguage)
            ? (body.explanationLanguage as 'bn' | 'en' | 'both')
            : 'both',
        learnerMessage: body.learnerMessage.trim().slice(0, 1500),
        transcript: safeTranscript,
        currentObjectives: safeObjectives,
        adaptationCues: safeAdaptationCues,
        linkedMistakePattern:
          typeof body.linkedMistakePattern === 'string'
            ? body.linkedMistakePattern.trim().slice(0, 280)
            : undefined,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error during Transfer Lab turn.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Part 11: Full Evidence-Based 8-Dimension Session Evaluation Endpoint
  app.post('/api/transfer/session-evaluate', async (req, res) => {
    try {
      const actor = requireAuthenticatedTransferUser(req, res);
      if (!actor) return;

      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.scenarioId !== 'string' || !isValidTransferUniverseScenarioId(body.scenarioId)) {
        res.status(400).json({
          error: 'Invalid or unknown Transfer Lab scenario.',
          code: 'INVALID_SCENARIO',
        });
        return;
      }

      const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(-30) : [];
      const safeTranscript = rawTranscript
        .filter(
          (t): t is Record<string, unknown> =>
            Boolean(t && typeof t === 'object' && typeof (t as Record<string, unknown>).text === 'string')
        )
        .map((t, idx) => ({
          id: typeof t.id === 'string' ? t.id.slice(0, 64) : `turn_${idx}`,
          role: (t.role === 'learner' ? 'learner' : 'ai') as 'learner' | 'ai',
          text: String(t.text).trim().slice(0, 1500),
          timestamp: typeof t.timestamp === 'string' ? t.timestamp.slice(0, 64) : new Date().toISOString(),
        }))
        .filter((t) => t.text.length > 0);

      if (!safeTranscript.some((t) => t.role === 'learner')) {
        res.status(400).json({
          error: 'Send at least one learner response before requesting an evaluation.',
          code: 'NO_LEARNER_TURNS',
        });
        return;
      }

      const rawObjectives = Array.isArray(body.currentObjectives) ? body.currentObjectives.slice(0, 12) : [];
      const safeObjectives = rawObjectives
        .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
        .map((o) => ({
          objectiveId: typeof o.objectiveId === 'string' ? o.objectiveId.slice(0, 40) : '',
          labelEn: typeof o.labelEn === 'string' ? o.labelEn.slice(0, 180) : '',
          labelBn: typeof o.labelBn === 'string' ? o.labelBn.slice(0, 180) : '',
          criteriaEn: typeof o.criteriaEn === 'string' ? o.criteriaEn.slice(0, 240) : '',
          status: (typeof o.status === 'string' ? o.status : 'not_started') as
            | 'not_started'
            | 'in_progress'
            | 'achieved'
            | 'partially_achieved'
            | 'not_achieved'
            | 'not_evaluated',
          evidenceQuote: typeof o.evidenceQuote === 'string' ? o.evidenceQuote.slice(0, 220) : undefined,
          rationaleEn: typeof o.rationaleEn === 'string' ? o.rationaleEn.slice(0, 240) : undefined,
          rationaleBn: typeof o.rationaleBn === 'string' ? o.rationaleBn.slice(0, 240) : undefined,
        }))
        .filter((o) => o.objectiveId.length > 0);

      const sessionId =
        typeof body.sessionId === 'string' && body.sessionId.trim()
          ? body.sessionId.trim().slice(0, 64)
          : `trf_sess_${Date.now()}`;

      const result = await evaluateTransferSessionWithGemini({
        sessionId,
        scenarioId: body.scenarioId,
        pressureLevel: normalizePressureLevel(
          typeof body.pressureLevel === 'string'
            ? (body.pressureLevel as TransferEvaluationRequest['pressureLevel'])
            : undefined
        ),
        learnerLevel:
          typeof body.learnerLevel === 'string' && VALID_TRANSFER_LEVELS.has(body.learnerLevel)
            ? (body.learnerLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1')
            : 'A2',
        explanationLanguage:
          typeof body.explanationLanguage === 'string' &&
          VALID_TRANSFER_EXPLANATION_LANGS.has(body.explanationLanguage)
            ? (body.explanationLanguage as 'bn' | 'en' | 'both')
            : 'both',
        transcript: safeTranscript,
        currentObjectives: safeObjectives,
        linkedMistakePattern:
          typeof body.linkedMistakePattern === 'string'
            ? body.linkedMistakePattern.trim().slice(0, 280)
            : undefined,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error during Transfer Lab session evaluation.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Part 11: Real Server-Side Speech-to-Text Transcription Endpoint (gemini-3.5-transcribe)
  app.post('/api/transfer/transcribe', async (req, res) => {
    try {
      const actor = requireAuthenticatedTransferUser(req, res);
      if (!actor) return;

      const body = req.body as { audioBase64?: unknown; mimeType?: unknown } | undefined;
      if (!body || typeof body.audioBase64 !== 'string' || typeof body.mimeType !== 'string') {
        res.status(400).json({
          error: 'Audio recording data and MIME type are required for transcription.',
          code: 'INVALID_AUDIO_PAYLOAD',
        });
        return;
      }

      const cleanMime = body.mimeType.split(';')[0].trim().toLowerCase();
      if (!ALLOWED_AUDIO_MIME_TYPES.has(cleanMime)) {
        res.status(400).json({
          error: 'Unsupported audio format for transcription.',
          code: 'INVALID_AUDIO_MIME',
        });
        return;
      }

      if (body.audioBase64.length > 3_500_000) {
        res.status(400).json({
          error: 'Recording exceeds maximum single-turn size limit.',
          code: 'INVALID_AUDIO_SIZE',
        });
        return;
      }

      const result = await transcribeTransferAudioWithGemini({
        audioBase64: body.audioBase64,
        mimeType: cleanMime,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error during audio transcription.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Part 11: Real Server-Side AI Participant Speech Synthesis Endpoint (gemini-3.8-flash-lite-tts)
  app.post('/api/transfer/tts', async (req, res) => {
    try {
      const actor = requireAuthenticatedTransferUser(req, res);
      if (!actor) return;

      const body = req.body as { text?: unknown; voiceName?: unknown; style?: unknown } | undefined;
      if (!body || typeof body.text !== 'string' || !body.text.trim()) {
        res.status(400).json({
          error: 'Text is required for speech playback.',
          code: 'EMPTY_TTS_TEXT',
        });
        return;
      }

      const voiceName =
        typeof body.voiceName === 'string' && ALLOWED_TTS_VOICES.has(body.voiceName)
          ? body.voiceName
          : 'Kore';

      const result = await synthesizeTransferSpeechWithGemini({
        text: body.text.trim().slice(0, 600),
        voiceName,
        style: typeof body.style === 'string' ? body.style.trim().slice(0, 100) : undefined,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error during speech synthesis.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Contextual Academy Lesson AI Tutor endpoint (authenticated, rate-limited, server-authoritative metadata)
  const academyAssistWindowMs = 5 * 60 * 1000;
  const academyAssistMaxPerWindow = 20;
  const academyAssistHits = new Map<string, number[]>();

  app.post('/api/academy/assist', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      // 1. Server-side session authentication check
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to use the contextual Academy AI Tutor.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // 2. Bounded per-user sliding-window rate limiting
      const now = Date.now();
      if (academyAssistHits.size > 500) {
        for (const [key, timestamps] of academyAssistHits.entries()) {
          const activeTs = timestamps.filter((ts) => now - ts < academyAssistWindowMs);
          if (activeTs.length === 0) {
            academyAssistHits.delete(key);
          } else {
            academyAssistHits.set(key, activeTs);
          }
        }
      }
      const rateKey = `usr:${resolved.user.id}`;
      const recent = (academyAssistHits.get(rateKey) ?? []).filter(
        (ts) => now - ts < academyAssistWindowMs
      );
      if (recent.length >= academyAssistMaxPerWindow) {
        const oldestMs = recent[0] ?? now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((academyAssistWindowMs - (now - oldestMs)) / 1000)
        );
        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          error: 'Too many AI Tutor requests right now. Please wait a minute before asking again.',
          code: 'RATE_LIMITED',
          retryAfterSeconds,
        });
        return;
      }
      recent.push(now);
      academyAssistHits.set(rateKey, recent);

      // 3. Strict input validation & server-authoritative lesson context lookup
      const body = (req.body || {}) as Partial<AcademyAssistRequest>;
      const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
      if (!question) {
        res.status(400).json({
          error: 'Please enter a question about this lesson.',
          code: 'EMPTY_QUESTION',
        });
        return;
      }

      const activeStage = body.activeStage ?? 'explanation';
      if (typeof activeStage !== 'string' || !VALID_LESSON_STAGES.has(activeStage as AcademyAssistRequest['activeStage'])) {
        res.status(400).json({
          error: 'Invalid lesson stage specified for AI Tutor request.',
          code: 'INVALID_STAGE',
        });
        return;
      }

      const explanationLanguage = body.explanationLanguage ?? 'both';
      if (
        typeof explanationLanguage !== 'string' ||
        !VALID_EXPLANATION_LANGUAGES.has(
          explanationLanguage as AcademyAssistRequest['explanationLanguage']
        )
      ) {
        res.status(400).json({
          error: 'Invalid explanation language preference.',
          code: 'INVALID_LANGUAGE',
        });
        return;
      }

      const rawLessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : '';
      if (!rawLessonId || !/^[a-zA-Z0-9_-]{3,80}$/.test(rawLessonId)) {
        res.status(400).json({
          error: 'A valid lesson identifier is required for the Academy AI Tutor.',
          code: 'INVALID_LESSON_ID',
        });
        return;
      }

      const authoritativeLesson = getLessonById(rawLessonId);
      if (!authoritativeLesson && !rawLessonId.startsWith('lesson_custom_')) {
        res.status(404).json({
          error: 'The requested Academy lesson could not be verified on the server.',
          code: 'LESSON_NOT_FOUND',
        });
        return;
      }

      const payload: AcademyAssistRequest = authoritativeLesson
        ? {
            lessonId: authoritativeLesson.id,
            lessonTitleEn: authoritativeLesson.titleEn,
            lessonTitleBn: authoritativeLesson.titleBn,
            cefrBand: authoritativeLesson.cefrBand,
            conceptRuleEn: authoritativeLesson.conceptRuleEn,
            banglaInterferenceEn: authoritativeLesson.banglaInterferenceEn,
            activeStage: activeStage as AcademyAssistRequest['activeStage'],
            explanationLanguage: explanationLanguage as AcademyAssistRequest['explanationLanguage'],
            question,
          }
        : {
            lessonId: rawLessonId,
            lessonTitleEn:
              typeof body.lessonTitleEn === 'string'
                ? body.lessonTitleEn.slice(0, 180)
                : 'Custom Academy Lesson',
            lessonTitleBn:
              typeof body.lessonTitleBn === 'string' ? body.lessonTitleBn.slice(0, 180) : '',
            cefrBand: typeof body.cefrBand === 'string' ? body.cefrBand.slice(0, 30) : 'A2',
            conceptRuleEn:
              typeof body.conceptRuleEn === 'string' ? body.conceptRuleEn.slice(0, 600) : '',
            banglaInterferenceEn:
              typeof body.banglaInterferenceEn === 'string'
                ? body.banglaInterferenceEn.slice(0, 600)
                : '',
            activeStage: activeStage as AcademyAssistRequest['activeStage'],
            explanationLanguage: explanationLanguage as AcademyAssistRequest['explanationLanguage'],
            question,
          };

      const result = await generateAcademyAssistWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error in Academy AI Tutor.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Mistake Memory Engine — AI Learning Coach & Personalized Exercise endpoints
  const mistakeCoachWindowMs = 5 * 60 * 1000;
  const mistakeCoachMaxPerWindow = 24;
  const mistakeCoachHits = new Map<string, number[]>();

  function checkMistakeCoachRateLimit(userId: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    if (mistakeCoachHits.size > 500) {
      for (const [key, timestamps] of mistakeCoachHits.entries()) {
        const activeTs = timestamps.filter((ts) => now - ts < mistakeCoachWindowMs);
        if (activeTs.length === 0) mistakeCoachHits.delete(key);
        else mistakeCoachHits.set(key, activeTs);
      }
    }
    const rateKey = `usr:${userId}`;
    const recent = (mistakeCoachHits.get(rateKey) ?? []).filter(
      (ts) => now - ts < mistakeCoachWindowMs
    );
    if (recent.length >= mistakeCoachMaxPerWindow) {
      const oldestMs = recent[0] ?? now;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((mistakeCoachWindowMs - (now - oldestMs)) / 1000)),
      };
    }
    recent.push(now);
    mistakeCoachHits.set(rateKey, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function sanitizeIncomingMistakeSummary(raw: unknown): MistakeSummaryContext | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const patternEn = typeof obj.patternEn === 'string' ? obj.patternEn.trim().slice(0, 200) : '';
    const userExample =
      typeof obj.userExample === 'string' ? obj.userExample.trim().slice(0, 240) : '';
    const correctedExample =
      typeof obj.correctedExample === 'string' ? obj.correctedExample.trim().slice(0, 240) : '';
    if (!patternEn || !userExample || !correctedExample) return null;
    return {
      id: typeof obj.id === 'string' ? obj.id.trim().slice(0, 80) : 'mistake',
      category: typeof obj.category === 'string' ? obj.category.trim().slice(0, 60) : 'Grammar',
      patternEn,
      patternBn: typeof obj.patternBn === 'string' ? obj.patternBn.trim().slice(0, 200) : undefined,
      userExample,
      correctedExample,
      occurrences:
        typeof obj.occurrences === 'number' && Number.isFinite(obj.occurrences)
          ? Math.max(1, Math.min(999, Math.round(obj.occurrences)))
          : 1,
      status: typeof obj.status === 'string' ? obj.status.trim().slice(0, 24) : 'active',
    };
  }

  app.get('/api/mistakes/coach/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const configured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    res.json({
      configured,
      model: MISTAKE_COACH_MODEL,
      fallbackModel: MISTAKE_COACH_FALLBACK_MODEL,
      promptVersion: MISTAKE_COACH_PROMPT_VERSION,
    });
  });

  app.post('/api/mistakes/coach', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to chat with the Mistake Memory AI Learning Coach.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(resolved.user.id);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many AI Coach requests right now. Please wait a minute before asking again.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';
      if (!message) {
        res.status(400).json({
          error: 'Please enter a question for the AI Learning Coach.',
          code: 'EMPTY_MESSAGE',
        });
        return;
      }

      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_COACH_EXPLANATION_LANGS.has(
          body.explanationLanguage as MistakeCoachRequest['explanationLanguage']
        )
          ? (body.explanationLanguage as MistakeCoachRequest['explanationLanguage'])
          : 'both';

      const focusedMistake = sanitizeIncomingMistakeSummary(body.focusedMistake);
      const topMistakes = Array.isArray(body.topMistakes)
        ? body.topMistakes
            .map((m) => sanitizeIncomingMistakeSummary(m))
            .filter((m): m is MistakeSummaryContext => Boolean(m))
            .slice(0, 6)
        : [];

      const history: MistakeCoachTurn[] = Array.isArray(body.history)
        ? body.history
            .filter(
              (h): h is MistakeCoachTurn =>
                Boolean(
                  h &&
                    typeof h === 'object' &&
                    ((h as Record<string, unknown>).role === 'user' ||
                      (h as Record<string, unknown>).role === 'assistant') &&
                    typeof (h as Record<string, unknown>).text === 'string'
                )
            )
            .slice(-6)
            .map((h) => ({
              role: h.role,
              text: h.text.trim().slice(0, 280),
            }))
        : [];

      const payload: MistakeCoachRequest = {
        message,
        explanationLanguage,
        learnerLevel:
          typeof body.learnerLevel === 'string' ? body.learnerLevel.trim().slice(0, 40) : undefined,
        focusedMistake,
        topMistakes,
        history,
      };

      const result = await generateMistakeCoachReplyWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error ? err.message : 'Unexpected server error in Mistake Memory AI Coach.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  app.post('/api/mistakes/generate-exercise', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to generate a personalized AI repair exercise.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(resolved.user.id);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many AI Coach requests right now. Please wait a minute before generating another exercise.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const mistake = sanitizeIncomingMistakeSummary(body.mistake);
      if (!mistake) {
        res.status(400).json({
          error: 'A valid recorded mistake pattern is required to generate an exercise.',
          code: 'INVALID_MISTAKE',
        });
        return;
      }

      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_COACH_EXPLANATION_LANGS.has(
          body.explanationLanguage as PersonalizedMistakeExerciseRequest['explanationLanguage']
        )
          ? (body.explanationLanguage as PersonalizedMistakeExerciseRequest['explanationLanguage'])
          : 'both';

      const result = await generatePersonalizedMistakeExerciseWithGemini({
        mistake,
        explanationLanguage,
        learnerLevel:
          typeof body.learnerLevel === 'string' ? body.learnerLevel.trim().slice(0, 40) : undefined,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error while generating personalized exercise.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // -------------------------------------------------------------------------
  // Part 10: Communication DNA Intelligence — Live AI Synthesis & Coach
  // -------------------------------------------------------------------------
  function sanitizeIncomingDnaSkills(raw: unknown): DnaSkillSummaryPayload[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .slice(0, 10)
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id.slice(0, 36) : 'unknown',
        titleEn: typeof item.titleEn === 'string' ? item.titleEn.slice(0, 60) : 'Skill',
        scorePercent:
          typeof item.scorePercent === 'number' && Number.isFinite(item.scorePercent)
            ? Math.max(0, Math.min(100, Math.round(item.scorePercent)))
            : null,
        sampleSize:
          typeof item.sampleSize === 'number' && Number.isFinite(item.sampleSize)
            ? Math.max(0, Math.min(10000, Math.round(item.sampleSize)))
            : 0,
        coverage: typeof item.coverage === 'string' ? item.coverage.slice(0, 32) : 'insufficient_data',
        visualState: typeof item.visualState === 'string' ? item.visualState.slice(0, 32) : 'insufficient',
        deltaPercent:
          typeof item.deltaPercent === 'number' && Number.isFinite(item.deltaPercent)
            ? Math.max(-100, Math.min(100, Math.round(item.deltaPercent)))
            : null,
      }));
  }

  app.get('/api/dna/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    res.json({
      configured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      model: DNA_AI_MODEL,
      fallbackModel: DNA_AI_FALLBACK_MODEL,
      promptVersion: DNA_SYNTHESIS_PROMPT_VERSION,
    });
  });

  app.post('/api/dna/analyze', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to run AI Communication DNA analysis.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(`dna:${resolved.user.id}`);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many AI Communication DNA requests right now. Please wait a minute and retry.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_DNA_EXPLANATION_LANGS.has(
          body.explanationLanguage as DnaSynthesisRequest['explanationLanguage']
        )
          ? (body.explanationLanguage as DnaSynthesisRequest['explanationLanguage'])
          : 'both';

      const skills = sanitizeIncomingDnaSkills(body.skills);
      const measuredCount =
        typeof body.measuredCount === 'number' && Number.isFinite(body.measuredCount)
          ? Math.max(0, Math.min(10, Math.round(body.measuredCount)))
          : skills.filter((s) => s.scorePercent !== null).length;
      const totalVerifiedSamples =
        typeof body.totalVerifiedSamples === 'number' && Number.isFinite(body.totalVerifiedSamples)
          ? Math.max(0, Math.round(body.totalVerifiedSamples))
          : 0;
      const evidenceCoveragePercent =
        typeof body.evidenceCoveragePercent === 'number' &&
        Number.isFinite(body.evidenceCoveragePercent)
          ? Math.max(0, Math.min(100, Math.round(body.evidenceCoveragePercent)))
          : 0;

      const payload: DnaSynthesisRequest = {
        explanationLanguage,
        timeframe: typeof body.timeframe === 'string' ? body.timeframe.slice(0, 16) : 'all',
        measuredCount,
        totalVerifiedSamples,
        evidenceCoveragePercent,
        selfReportedLevel:
          typeof body.selfReportedLevel === 'string'
            ? body.selfReportedLevel.trim().slice(0, 60)
            : undefined,
        learningGoals: Array.isArray(body.learningGoals)
          ? body.learningGoals
              .filter((g): g is string => typeof g === 'string')
              .slice(0, 5)
          : [],
        skills,
        topWeaknesses: Array.isArray(body.topWeaknesses)
          ? body.topWeaknesses
              .filter((w): w is string => typeof w === 'string')
              .slice(0, 4)
          : [],
      };

      const result = await generateDnaSynthesisWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error in AI Communication DNA analysis.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  app.post('/api/dna/coach', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to chat with the AI Communication Coach.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(`dna:${resolved.user.id}`);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many AI Coach requests right now. Please wait a minute and retry.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';
      if (!message) {
        res.status(400).json({
          error: 'Please enter a question for the AI Communication Coach.',
          code: 'EMPTY_MESSAGE',
        });
        return;
      }

      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_DNA_EXPLANATION_LANGS.has(
          body.explanationLanguage as DnaCoachRequest['explanationLanguage']
        )
          ? (body.explanationLanguage as DnaCoachRequest['explanationLanguage'])
          : 'both';

      const skills = sanitizeIncomingDnaSkills(body.skills);
      const focusedList = body.focusedSkill ? sanitizeIncomingDnaSkills([body.focusedSkill]) : [];

      const history: DnaCoachTurn[] = Array.isArray(body.history)
        ? body.history
            .filter(
              (h): h is DnaCoachTurn =>
                Boolean(
                  h &&
                    typeof h === 'object' &&
                    ((h as Record<string, unknown>).role === 'user' ||
                      (h as Record<string, unknown>).role === 'assistant') &&
                    typeof (h as Record<string, unknown>).text === 'string'
                )
            )
            .slice(-6)
            .map((h) => ({
              role: h.role,
              text: h.text.trim().slice(0, 280),
            }))
        : [];

      const payload: DnaCoachRequest = {
        message,
        explanationLanguage,
        focusedSkill: focusedList[0] ?? null,
        measuredCount:
          typeof body.measuredCount === 'number' && Number.isFinite(body.measuredCount)
            ? Math.max(0, Math.min(10, Math.round(body.measuredCount)))
            : skills.filter((s) => s.scorePercent !== null).length,
        totalVerifiedSamples:
          typeof body.totalVerifiedSamples === 'number' && Number.isFinite(body.totalVerifiedSamples)
            ? Math.max(0, Math.round(body.totalVerifiedSamples))
            : 0,
        selfReportedLevel:
          typeof body.selfReportedLevel === 'string'
            ? body.selfReportedLevel.trim().slice(0, 60)
            : undefined,
        skills,
        topWeaknesses: Array.isArray(body.topWeaknesses)
          ? body.topWeaknesses
              .filter((w): w is string => typeof w === 'string')
              .slice(0, 4)
          : [],
        history,
      };

      const result = await generateDnaCoachReplyWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error in AI Communication Coach.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // -------------------------------------------------------------------------
  // Part 12: Communication Replay — Authenticated AI Assist, Separate Practice & Recording Audit
  // -------------------------------------------------------------------------
  app.get('/api/v1/replay/health', (_req, res) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    res.json({
      ok: true,
      aiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
      model: REPLAY_AI_MODEL,
      fallbackModel: REPLAY_AI_FALLBACK_MODEL,
      promptVersion: REPLAY_COACH_PROMPT_VERSION,
      cloudSyncActive: false,
    });
  });

  app.post('/api/v1/replay/ai-assist', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to use Communication Replay AI assistance.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(`replay:${resolved.user.id}`);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many Replay AI requests right now. Please wait a minute and try again.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const mode = typeof body.mode === 'string' ? body.mode.trim() : '';
      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_REPLAY_EXPLANATION_LANGS.has(body.explanationLanguage as 'en' | 'bn' | 'both')
          ? (body.explanationLanguage as 'en' | 'bn' | 'both')
          : 'both';
      const scenarioTitle =
        typeof body.scenarioTitle === 'string' && body.scenarioTitle.trim()
          ? body.scenarioTitle.trim().slice(0, 140)
          : 'Saved Communication Session';

      if (mode === 'correction_deep_dive') {
        const originalResponse =
          typeof body.originalResponse === 'string' ? body.originalResponse.trim() : '';
        const correctedResponse =
          typeof body.correctedResponse === 'string' ? body.correctedResponse.trim() : '';
        if (!originalResponse || !correctedResponse) {
          res.status(400).json({
            error: 'originalResponse and correctedResponse are required.',
            code: 'INVALID_PAYLOAD',
          });
          return;
        }
        const result = await generateReplayCorrectionDeepDiveWithGemini({
          scenarioTitle,
          originalResponse,
          correctedResponse,
          category: typeof body.category === 'string' ? body.category.slice(0, 80) : undefined,
          explanationLanguage,
        });
        res.json(result);
        return;
      }

      if (mode === 'summarize_session') {
        const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(0, 24) : [];
        const safeTranscript = rawTranscript
          .filter(
            (t): t is Record<string, unknown> =>
              Boolean(t && typeof t === 'object' && typeof (t as Record<string, unknown>).text === 'string')
          )
          .map((t) => ({
            speaker: (t.speaker === 'learner' ? 'learner' : 'ai') as 'learner' | 'ai',
            text: String(t.text).trim().slice(0, 400),
          }))
          .filter((t) => t.text.length > 0);

        if (safeTranscript.length === 0) {
          res.status(400).json({
            error: 'Cannot summarize a session without real saved transcript turns.',
            code: 'MISSING_TRANSCRIPT',
          });
          return;
        }

        const result = await generateReplaySessionSummaryWithGemini({
          scenarioTitle,
          transcript: safeTranscript,
          explanationLanguage,
        });
        res.json(result);
        return;
      }

      res.status(400).json({
        error: 'Unsupported Replay AI mode.',
        code: 'INVALID_MODE',
      });
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error in Communication Replay AI.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  app.post('/api/v1/replay/practice-attempts', async (req, res) => {
    try {
      if (!verifyCsrf(req, res)) return;
      const cookies = parseCookieHeader(req.headers.cookie);
      const authHeader = String(req.header('Authorization') || '');
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
      if (!resolved) {
        res.status(401).json({
          error: 'Please sign in to evaluate your Replay Practice attempt.',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const rateCheck = checkMistakeCoachRateLimit(`replay_prac:${resolved.user.id}`);
      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: 'Too many Replay Practice requests. Please wait a minute and retry.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const originalResponse =
        typeof body.originalResponse === 'string' ? body.originalResponse.trim() : '';
      const learnerRetryText =
        typeof body.learnerRetryText === 'string' ? body.learnerRetryText.trim() : '';
      if (!originalResponse || !learnerRetryText) {
        res.status(400).json({
          error: 'Please enter a practice response before requesting AI feedback.',
          code: 'EMPTY_RETRY',
        });
        return;
      }

      const explanationLanguage =
        typeof body.explanationLanguage === 'string' &&
        VALID_REPLAY_EXPLANATION_LANGS.has(body.explanationLanguage as 'en' | 'bn' | 'both')
          ? (body.explanationLanguage as 'en' | 'bn' | 'both')
          : 'both';

      const result = await evaluateReplayPracticeAttemptWithGemini({
        scenarioTitle:
          typeof body.scenarioTitle === 'string'
            ? body.scenarioTitle.slice(0, 140)
            : 'Communication Replay Practice',
        originalResponse,
        correctedReference:
          typeof body.correctedReference === 'string'
            ? body.correctedReference.slice(0, 800)
            : undefined,
        learnerRetryText,
        explanationLanguage,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected server error evaluating Replay Practice attempt.',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  app.delete('/api/v1/replay/sessions/:sessionId/recording', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const cookies = parseCookieHeader(req.headers.cookie);
    const authHeader = String(req.header('Authorization') || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const resolved = resolveSessionByRawToken(cookies[SESSION_COOKIE] || bearer);
    if (!resolved) {
      res.status(401).json({
        error: 'Authentication required to delete recordings.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const sessionId = String(req.params.sessionId || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,96}$/.test(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID format.', code: 'INVALID_SESSION_ID' });
      return;
    }

    const deletedLocalKeyCount =
      typeof (req.body as { deletedLocalKeyCount?: unknown })?.deletedLocalKeyCount === 'number'
        ? Math.max(0, Math.round((req.body as { deletedLocalKeyCount: number }).deletedLocalKeyCount))
        : 0;

    recordAnalyticsEvent({
      eventType: 'replay_recording_deleted',
      path: `/app/replay`,
      metadata: {
        sessionIdLength: sessionId.length,
        deletedLocalKeyCount,
        storageScope: 'browser_local_indexeddb',
      },
    });

    res.json({
      ok: true,
      sessionId,
      storageScope: 'browser_local_indexeddb',
      cloudStorageDeleted: false,
      note: 'Local browser recording deletion audited. No cloud R2 audio bucket is active in this runtime.',
    });
  });

  // Public landing page sandbox sentence analyzer (zero-signup live preview, rate-limited per IP)
  app.post('/api/landing/analyze', async (req, res) => {
    try {
      const ip = getClientIp(req);
      const limit = landingAnalyzeLimiter.consume(`landing:${ip}`);
      if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfterSeconds));
        res.status(429).json({
          error: `Too many sample analysis requests. Please wait ${limit.retryAfterSeconds}s before trying again.`,
          code: 'RATE_LIMITED',
          retryAfterSeconds: limit.retryAfterSeconds,
        });
        return;
      }

      const body = req.body as { sentence?: unknown } | undefined;
      const sentence = typeof body?.sentence === 'string' ? body.sentence.trim().slice(0, 300) : '';
      if (!sentence) {
        res.status(400).json({ error: 'Please type an English sentence to analyze.' });
        return;
      }

      recordAnalyticsEvent({
        eventType: 'live_demo_analyze',
        path: '/',
      });

      // First check instant deterministic Bangla-to-English interference rules
      const ruleResult = analyzeSampleSentence(sentence);
      if (ruleResult.hasDetectedMistake) {
        res.json({ analysis: ruleResult });
        return;
      }

      // For arbitrary custom sentences, attempt live Gemini bilingual analysis
      const geminiResult = await analyzeLandingSentenceWithGemini(sentence);
      if (geminiResult) {
        res.json({ analysis: geminiResult });
        return;
      }

      // Graceful honest fallback if server key is unavailable
      res.json({ analysis: ruleResult });
    } catch {
      const fallback = analyzeSampleSentence(
        typeof req.body?.sentence === 'string' ? req.body.sentence : ''
      );
      res.json({ analysis: fallback });
    }
  });

  // P3 Full-Stack Routes: Vocabulary Deck, Community & Moderation, Subscriptions, Support, Gamification
  registerExpressP3Routes(app, {
    resolveRequestSession,
    verifyCsrf,
    requireExpressAdmin,
  });

  // PRD v6.1 Full-Stack Routes: Admin AI Providers, Feature Flags, System Health, IELTS, Writing/Labs, Notifications
  registerExpressPrd61Routes(app, {
    resolveRequestSession,
    verifyCsrf,
    requireExpressAdmin,
  });

  let viteServer: {
    middlewares: express.RequestHandler;
    close: () => Promise<void>;
  } | null = null;
  let viteInitPromise: Promise<{
    middlewares: express.RequestHandler;
    close: () => Promise<void>;
  }> | null = null;

  if (!IS_PROD) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    viteInitPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: !disableHmr,
          ws: disableHmr ? false : undefined,
          watch: disableHmr ? null : {},
        },
        appType: 'spa',
      });
      viteServer = vite;
      return vite;
    })();
    viteInitPromise.catch((err) => {
      console.error('Vite dev middleware initialization failed:', err);
    });

    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      if (viteServer) {
        viteServer.middlewares(req, res, next);
        return;
      }
      viteInitPromise!
        .then((vite) => vite.middlewares(req, res, next))
        .catch((err) => next(err));
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`LINGUAVERSE AI server running on http://${HOST}:${PORT}`);
  });

  httpServer.on('error', (err) => {
    console.error('LINGUAVERSE AI HTTP server error:', err);
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    httpServer.close(async () => {
      if (viteServer) {
        await viteServer.close().catch(() => {});
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start LINGUAVERSE AI server:', err);
  process.exit(1);
});
