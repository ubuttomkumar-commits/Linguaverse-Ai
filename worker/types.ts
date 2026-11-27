/**
 * Isolated Cloudflare Workers Runtime Types (Zero dependency conflicts with Vite browser build)
 */

export type WorkerAdminRole =
  | 'learner'
  | 'moderator'
  | 'content_manager'
  | 'ai_ops'
  | 'admin'
  | 'super_admin';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<{ success: boolean; results?: T[]; meta?: unknown }>;
  all<T = Record<string, unknown>>(): Promise<{ success: boolean; results: T[]; meta?: unknown }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
}

export interface R2ObjectBody {
  key: string;
  size: number;
  httpMetadata?: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
  body: ReadableStream<Uint8Array>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ): Promise<{ key: string; size: number }>;
  delete(keys: string | string[]): Promise<void>;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface WorkerEnv {
  DB: D1Database;
  AUDIO_BUCKET?: R2Bucket;
  MEDIA_BUCKET?: R2Bucket;
  LINGUAVERSE_KV?: KVNamespace;
  SESSION_KV?: KVNamespace;
  RATE_LIMIT_KV?: KVNamespace;
  APP_ENV?: string;
  GEMINI_API_KEY?: string;
  GEMINI_PRIMARY_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string;
  GEMINI_TRANSCRIBE_MODEL?: string;
  GEMINI_TTS_MODEL?: string;
  SPEAKING_PROMPT_VERSION?: string;
  TRANSFER_PROMPT_VERSION?: string;
  RESEND_API_KEY?: string;
  EMAIL_PROVIDER_API_KEY?: string;
  EMAIL_FROM?: string;
  JWT_SIGNING_SECRET?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  AUDIO_RETENTION_DAYS?: string;
  CORS_ALLOWED_ORIGIN?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SSLCOMMERZ_STORE_PASSWD?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  DEEPGRAM_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  AZURE_SPEECH_KEY?: string;
  AZURE_SPEECH_REGION?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  ADMIN_BOOTSTRAP_SECRET?: string;
}

export interface SessionJwtPayload {
  sub: string;
  sid: string;
  email: string;
  role: WorkerAdminRole;
  exp: number;
  iat: number;
}

export interface WorkerAuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: WorkerAdminRole;
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended';
  createdAt: string;
  sessionId: string;
}
