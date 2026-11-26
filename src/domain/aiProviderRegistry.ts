/**
 * Modular AI & External Provider Registry, Feature Flags & Maintenance Policy (PRD v6.1 §§10, 16, 17, 20, 21)
 *
 * Security invariants:
 * - Never returns raw API keys, tokens, or secrets in any response.
 * - Exposes only configured status, source ('env' | 'runtime_override' | 'unconfigured'),
 *   masked fingerprint (e.g. "****abcd"), lastRotatedAt, and health status.
 * - Enforces strict allowlists for supported Gemini models, timeout/retry bounds,
 *   and permanent PRD safety locks (e.g. communityDirectMessagingEnabled === false).
 */

export type ProviderCategory =
  | 'llm'
  | 'stt'
  | 'tts'
  | 'pronunciation'
  | 'email'
  | 'oauth'
  | 'payment'
  | 'security';

export type ProviderId =
  | 'gemini'
  | 'deepgram_stt'
  | 'openai_whisper'
  | 'elevenlabs_tts'
  | 'azure_pronunciation'
  | 'resend_email'
  | 'brevo_email'
  | 'google_oauth'
  | 'stripe'
  | 'sslcommerz'
  | 'paddle'
  | 'cloudflare_turnstile';

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  category: ProviderCategory;
  envVarNames: string[];
  supportedFeatures: string[];
  productionSecretCommand: string;
  notes: string;
}

export const SUPPORTED_GEMINI_TEXT_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

export const SUPPORTED_GEMINI_TRANSCRIBE_MODELS = [
  'gemini-3.5-transcribe',
  'gemini-2.5-flash',
] as const;

export const SUPPORTED_GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
] as const;

export const PROVIDER_CATALOG: readonly ProviderDescriptor[] = [
  {
    id: 'gemini',
    name: 'Google Gemini AI (Primary LLM / STT / TTS)',
    category: 'llm',
    envVarNames: ['GEMINI_API_KEY'],
    supportedFeatures: [
      'speaking_evaluation',
      'transfer_lab',
      'mistake_coach',
      'dna_synthesis',
      'communication_replay',
      'academy_tutor',
      'ielts_rubric_feedback',
      'writing_diary_feedback',
      'audio_transcription',
      'wav_tts',
    ],
    productionSecretCommand: 'npx wrangler secret put GEMINI_API_KEY',
    notes: 'Primary server-side AI engine with automatic fallback and structured JSON validation.',
  },
  {
    id: 'deepgram_stt',
    name: 'Deepgram Nova (Optional External STT)',
    category: 'stt',
    envVarNames: ['DEEPGRAM_API_KEY'],
    supportedFeatures: ['batch_transcription'],
    productionSecretCommand: 'npx wrangler secret put DEEPGRAM_API_KEY',
    notes: 'Optional external speech-to-text adapter. Awaits credentials unless DEEPGRAM_API_KEY is configured.',
  },
  {
    id: 'openai_whisper',
    name: 'OpenAI Whisper (Optional External STT)',
    category: 'stt',
    envVarNames: ['OPENAI_API_KEY'],
    supportedFeatures: ['batch_transcription'],
    productionSecretCommand: 'npx wrangler secret put OPENAI_API_KEY',
    notes: 'Optional external speech-to-text adapter. Awaits credentials unless OPENAI_API_KEY is configured.',
  },
  {
    id: 'elevenlabs_tts',
    name: 'ElevenLabs (Optional External TTS)',
    category: 'tts',
    envVarNames: ['ELEVENLABS_API_KEY'],
    supportedFeatures: ['natural_tts'],
    productionSecretCommand: 'npx wrangler secret put ELEVENLABS_API_KEY',
    notes: 'Optional external text-to-speech adapter. Awaits credentials unless ELEVENLABS_API_KEY is configured.',
  },
  {
    id: 'azure_pronunciation',
    name: 'Azure Speech Pronunciation Assessment (Acoustic Phoneme)',
    category: 'pronunciation',
    envVarNames: ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'],
    supportedFeatures: ['phoneme_assessment', 'forced_alignment', 'prosody_indicators'],
    productionSecretCommand: 'npx wrangler secret put AZURE_SPEECH_KEY && npx wrangler secret put AZURE_SPEECH_REGION',
    notes: 'Required for genuine acoustic phoneme-level scoring. Without credentials, pronunciation remains honestly text-transcript only.',
  },
  {
    id: 'resend_email',
    name: 'Resend (Transactional OTP & Reset Email)',
    category: 'email',
    envVarNames: ['RESEND_API_KEY'],
    supportedFeatures: ['otp_verification', 'password_reset', 'security_notices'],
    productionSecretCommand: 'npx wrangler secret put RESEND_API_KEY',
    notes: 'Sends real 6-digit OTP and password recovery emails. Local dev preview mode activates only when unconfigured.',
  },
  {
    id: 'brevo_email',
    name: 'Brevo (Fallback Transactional Email)',
    category: 'email',
    envVarNames: ['EMAIL_PROVIDER_API_KEY'],
    supportedFeatures: ['otp_verification', 'password_reset'],
    productionSecretCommand: 'npx wrangler secret put EMAIL_PROVIDER_API_KEY',
    notes: 'Alternative transactional email provider when RESEND_API_KEY is not used.',
  },
  {
    id: 'google_oauth',
    name: 'Google OAuth 2.0',
    category: 'oauth',
    envVarNames: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    supportedFeatures: ['google_sign_in'],
    productionSecretCommand: 'npx wrangler secret put GOOGLE_CLIENT_ID && npx wrangler secret put GOOGLE_CLIENT_SECRET',
    notes: 'Optional Google social login. Disabled gracefully until client credentials are configured.',
  },
  {
    id: 'stripe',
    name: 'Stripe Billing & Signed Webhooks',
    category: 'payment',
    envVarNames: ['STRIPE_WEBHOOK_SECRET'],
    supportedFeatures: ['signed_webhooks', 'subscription_lifecycle', 'refund_sync'],
    productionSecretCommand: 'npx wrangler secret put STRIPE_WEBHOOK_SECRET',
    notes: 'Webhook route fails closed (HTTP 503) until STRIPE_WEBHOOK_SECRET is configured.',
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz (Bangladesh Market Billing)',
    category: 'payment',
    envVarNames: ['SSLCOMMERZ_STORE_PASSWD'],
    supportedFeatures: ['signed_webhooks', 'bdt_billing'],
    productionSecretCommand: 'npx wrangler secret put SSLCOMMERZ_STORE_PASSWD',
    notes: 'Bangladesh local payment gateway adapter. Fails closed (HTTP 503) until configured.',
  },
  {
    id: 'paddle',
    name: 'Paddle Merchant-of-Record Billing',
    category: 'payment',
    envVarNames: ['PADDLE_WEBHOOK_SECRET'],
    supportedFeatures: ['signed_webhooks', 'global_tax_mor'],
    productionSecretCommand: 'npx wrangler secret put PADDLE_WEBHOOK_SECRET',
    notes: 'Global Merchant-of-Record webhook adapter. Fails closed (HTTP 503) until configured.',
  },
  {
    id: 'cloudflare_turnstile',
    name: 'Cloudflare Turnstile (Bot Protection)',
    category: 'security',
    envVarNames: ['TURNSTILE_SECRET_KEY'],
    supportedFeatures: ['registration_bot_protection', 'public_form_shield'],
    productionSecretCommand: 'npx wrangler secret put TURNSTILE_SECRET_KEY',
    notes: 'Protects public registration and password recovery forms in production.',
  },
] as const;

export interface AiRuntimeConfig {
  geminiEnabled: boolean;
  primaryModel: string;
  fallbackModel: string;
  transcribeModel: string;
  ttsModel: string;
  activeSttProvider: 'gemini' | 'deepgram_stt' | 'openai_whisper';
  activeTtsProvider: 'gemini' | 'elevenlabs_tts';
  activePronunciationProvider: 'none' | 'azure_pronunciation';
  requestTimeoutMs: number;
  maxRetries: number;
  dailyCostCeilingUsd: number;
  maxRequestsPerMinute: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_AI_RUNTIME_CONFIG: AiRuntimeConfig = {
  geminiEnabled: true,
  primaryModel: 'gemini-4-hydrogen',
  fallbackModel: 'gemini-3.1-flash-lite',
  transcribeModel: 'gemini-3.5-transcribe',
  ttsModel: 'gemini-3.8-flash-lite-tts',
  activeSttProvider: 'gemini',
  activeTtsProvider: 'gemini',
  activePronunciationProvider: 'none',
  requestTimeoutMs: 25_000,
  maxRetries: 1,
  dailyCostCeilingUsd: 25,
  maxRequestsPerMinute: 30,
};

export interface PlatformFeatureFlags {
  maintenanceMode: boolean;
  ieltsExamPrepEnabled: boolean;
  writingDiaryStudioEnabled: boolean;
  shadowingLabEnabled: boolean;
  humanBridgeEnabled: boolean;
  communityEnabled: boolean;
  leaderboardEnabled: boolean;
  voiceRecordingEnabled: boolean;
  aiSpeakingEnabled: boolean;
  requireEmailVerification: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_FEATURE_FLAGS: PlatformFeatureFlags = {
  maintenanceMode: false,
  ieltsExamPrepEnabled: true,
  writingDiaryStudioEnabled: true,
  shadowingLabEnabled: true,
  humanBridgeEnabled: true,
  communityEnabled: true,
  leaderboardEnabled: true,
  voiceRecordingEnabled: true,
  aiSpeakingEnabled: true,
  requireEmailVerification: true,
};

export interface ProviderStatusView {
  id: ProviderId;
  name: string;
  category: ProviderCategory;
  configured: boolean;
  source: 'env' | 'runtime_override' | 'unconfigured';
  maskedKey: string | null;
  lastRotatedAt: string | null;
  lastHealthCheckAt: string | null;
  lastHealthStatus: 'healthy' | 'degraded' | 'unconfigured' | 'unchecked';
  lastHealthLatencyMs: number | null;
  lastHealthMessage: string | null;
  envVarNames: string[];
  supportedFeatures: string[];
  productionSecretCommand: string;
  notes: string;
}

export function maskSecretFingerprint(raw: string | undefined | null): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.length <= 6) return '****';
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-4)}`;
}

export function isSupportedProviderId(value: string): value is ProviderId {
  return PROVIDER_CATALOG.some((p) => p.id === value);
}

export function validateAiRuntimeConfigPatch(
  input: unknown
): { ok: true; patch: Partial<AiRuntimeConfig> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'AI provider configuration must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const allowed = new Set<string>([
    'geminiEnabled',
    'primaryModel',
    'fallbackModel',
    'transcribeModel',
    'ttsModel',
    'activeSttProvider',
    'activeTtsProvider',
    'activePronunciationProvider',
    'requestTimeoutMs',
    'maxRetries',
    'dailyCostCeilingUsd',
    'maxRequestsPerMinute',
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        error: `Field "${key}" cannot be updated here. Use the dedicated secret rotation endpoint for credentials.`,
      };
    }
  }

  const patch: Partial<AiRuntimeConfig> = {};
  if (raw.geminiEnabled !== undefined) {
    if (typeof raw.geminiEnabled !== 'boolean') {
      return { ok: false, error: 'geminiEnabled must be a boolean.' };
    }
    patch.geminiEnabled = raw.geminiEnabled;
  }
  if (raw.primaryModel !== undefined) {
    if (
      typeof raw.primaryModel !== 'string' ||
      !(SUPPORTED_GEMINI_TEXT_MODELS as readonly string[]).includes(raw.primaryModel)
    ) {
      return {
        ok: false,
        error: `Unsupported primaryModel. Allowed: ${SUPPORTED_GEMINI_TEXT_MODELS.join(', ')}.`,
      };
    }
    patch.primaryModel = raw.primaryModel;
  }
  if (raw.fallbackModel !== undefined) {
    if (
      typeof raw.fallbackModel !== 'string' ||
      !(SUPPORTED_GEMINI_TEXT_MODELS as readonly string[]).includes(raw.fallbackModel)
    ) {
      return {
        ok: false,
        error: `Unsupported fallbackModel. Allowed: ${SUPPORTED_GEMINI_TEXT_MODELS.join(', ')}.`,
      };
    }
    patch.fallbackModel = raw.fallbackModel;
  }
  if (raw.transcribeModel !== undefined) {
    if (
      typeof raw.transcribeModel !== 'string' ||
      !(SUPPORTED_GEMINI_TRANSCRIBE_MODELS as readonly string[]).includes(raw.transcribeModel)
    ) {
      return {
        ok: false,
        error: `Unsupported transcribeModel. Allowed: ${SUPPORTED_GEMINI_TRANSCRIBE_MODELS.join(', ')}.`,
      };
    }
    patch.transcribeModel = raw.transcribeModel;
  }
  if (raw.ttsModel !== undefined) {
    if (
      typeof raw.ttsModel !== 'string' ||
      !(SUPPORTED_GEMINI_TTS_MODELS as readonly string[]).includes(raw.ttsModel)
    ) {
      return {
        ok: false,
        error: `Unsupported ttsModel. Allowed: ${SUPPORTED_GEMINI_TTS_MODELS.join(', ')}.`,
      };
    }
    patch.ttsModel = raw.ttsModel;
  }
  if (raw.activeSttProvider !== undefined) {
    if (
      raw.activeSttProvider !== 'gemini' &&
      raw.activeSttProvider !== 'deepgram_stt' &&
      raw.activeSttProvider !== 'openai_whisper'
    ) {
      return { ok: false, error: 'Unsupported activeSttProvider.' };
    }
    patch.activeSttProvider = raw.activeSttProvider;
  }
  if (raw.activeTtsProvider !== undefined) {
    if (raw.activeTtsProvider !== 'gemini' && raw.activeTtsProvider !== 'elevenlabs_tts') {
      return { ok: false, error: 'Unsupported activeTtsProvider.' };
    }
    patch.activeTtsProvider = raw.activeTtsProvider;
  }
  if (raw.activePronunciationProvider !== undefined) {
    if (
      raw.activePronunciationProvider !== 'none' &&
      raw.activePronunciationProvider !== 'azure_pronunciation'
    ) {
      return { ok: false, error: 'Unsupported activePronunciationProvider.' };
    }
    patch.activePronunciationProvider = raw.activePronunciationProvider;
  }
  if (raw.requestTimeoutMs !== undefined) {
    const n = Number(raw.requestTimeoutMs);
    if (!Number.isInteger(n) || n < 5_000 || n > 45_000) {
      return { ok: false, error: 'requestTimeoutMs must be an integer between 5000 and 45000.' };
    }
    patch.requestTimeoutMs = n;
  }
  if (raw.maxRetries !== undefined) {
    const n = Number(raw.maxRetries);
    if (!Number.isInteger(n) || n < 0 || n > 3) {
      return { ok: false, error: 'maxRetries must be an integer between 0 and 3.' };
    }
    patch.maxRetries = n;
  }
  if (raw.dailyCostCeilingUsd !== undefined) {
    const n = Number(raw.dailyCostCeilingUsd);
    if (!Number.isFinite(n) || n < 1 || n > 10_000) {
      return { ok: false, error: 'dailyCostCeilingUsd must be between 1 and 10000.' };
    }
    patch.dailyCostCeilingUsd = Math.round(n * 100) / 100;
  }
  if (raw.maxRequestsPerMinute !== undefined) {
    const n = Number(raw.maxRequestsPerMinute);
    if (!Number.isInteger(n) || n < 5 || n > 120) {
      return { ok: false, error: 'maxRequestsPerMinute must be an integer between 5 and 120.' };
    }
    patch.maxRequestsPerMinute = n;
  }

  return { ok: true, patch };
}

export function validateFeatureFlagsPatch(
  input: unknown
): { ok: true; patch: Partial<PlatformFeatureFlags> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Feature flags payload must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const allowed = new Set<keyof PlatformFeatureFlags>([
    'maintenanceMode',
    'ieltsExamPrepEnabled',
    'writingDiaryStudioEnabled',
    'shadowingLabEnabled',
    'humanBridgeEnabled',
    'communityEnabled',
    'leaderboardEnabled',
    'voiceRecordingEnabled',
    'aiSpeakingEnabled',
    'requireEmailVerification',
  ]);
  const patch: Partial<PlatformFeatureFlags> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k as keyof PlatformFeatureFlags)) {
      return { ok: false, error: `Unknown feature flag "${k}".` };
    }
    if (typeof v !== 'boolean') {
      return { ok: false, error: `Feature flag "${k}" must be a boolean.` };
    }
    (patch as Record<string, boolean>)[k] = v;
  }
  return { ok: true, patch };
}

export function validateProviderKeyRotationInput(
  input: unknown
): { ok: true; secretValue: string | null; note: string } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Rotation payload must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const clear = raw.clearOverride === true || raw.clear === true;
  const note =
    typeof raw.note === 'string' ? raw.note.trim().slice(0, 180) : '';
  if (clear) {
    return { ok: true, secretValue: null, note };
  }
  const keyInput = typeof raw.apiKey === 'string' ? raw.apiKey : raw.secretValue;
  if (typeof keyInput !== 'string') {
    return { ok: false, error: 'Provide a non-empty apiKey or set clearOverride: true.' };
  }
  const cleaned = keyInput.trim();
  if (cleaned.length < 12 || cleaned.length > 512) {
    return { ok: false, error: 'Provider key must be between 12 and 512 characters.' };
  }
  if (/\s/.test(cleaned)) {
    return { ok: false, error: 'Provider key must not contain whitespace.' };
  }
  return { ok: true, secretValue: cleaned, note };
}
