/**
 * LINGUAVERSE AI — Pure Realtime Event Lifecycle Engine
 *
 * Implements Discord-grade realtime connection resilience primitives:
 * 1. Exponential backoff with bounded jitter to prevent reconnect thundering herds.
 * 2. Bounded event-ID deduplication ring buffer for at-least-once SSE/WebSocket streams.
 * 3. Monotonic sequence ordering for incoming realtime envelopes.
 * 4. Heartbeat staleness detection.
 */

export type RealtimeEventType =
  | 'connected'
  | 'ping'
  | 'notification.created'
  | 'system.status_updated';

export interface RealtimeEventEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  seq: number;
  type: RealtimeEventType;
  emittedAt: string;
  payload: TPayload;
}

export interface BackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  randomFn?: () => number;
}

/**
 * Computes exponential reconnect delay with bounded symmetrical jitter.
 * Attempt 0 -> ~baseDelayMs, Attempt 1 -> ~2*base, capped at maxDelayMs.
 */
export function computeReconnectDelayMs(attempt: number, options: BackoffOptions = {}): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const base = Math.max(250, options.baseDelayMs ?? 1_500);
  const max = Math.max(base, options.maxDelayMs ?? 30_000);
  const jitterRatio = Math.min(0.5, Math.max(0, options.jitterRatio ?? 0.25));
  const randomFn = options.randomFn ?? Math.random;

  const exponential = Math.min(max, base * Math.pow(2, safeAttempt));
  const jitterOffset = (randomFn() * 2 - 1) * jitterRatio * exponential;
  return Math.max(250, Math.min(max, Math.round(exponential + jitterOffset)));
}

/**
 * Fixed-capacity FIFO deduplication set preventing duplicate processing of
 * replayed SSE/WebSocket events without unbounded memory growth.
 */
export class EventDeduplicator {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 256) {
    this.maxSize = Math.max(16, maxSize);
  }

  /**
   * Returns true if the event ID is new and records it; false if already seen.
   */
  markIfNew(eventId: string): boolean {
    const key = eventId.trim();
    if (!key) return false;
    if (this.seen.has(key)) return false;

    this.seen.add(key);
    this.order.push(key);
    while (this.order.length > this.maxSize) {
      const evicted = this.order.shift();
      if (evicted !== undefined) {
        this.seen.delete(evicted);
      }
    }
    return true;
  }

  has(eventId: string): boolean {
    return this.seen.has(eventId.trim());
  }

  size(): number {
    return this.seen.size;
  }

  clear(): void {
    this.seen.clear();
    this.order.length = 0;
  }
}

/**
 * Validates and orders incoming realtime envelopes, dropping duplicates or
 * out-of-order stale sequence frames when seq > 0.
 */
export class RealtimeStreamState {
  private readonly deduper: EventDeduplicator;
  private lastSeq = 0;
  private lastHeartbeatAtMs = 0;

  constructor(maxDedupeSize = 256) {
    this.deduper = new EventDeduplicator(maxDedupeSize);
  }

  accept(envelope: RealtimeEventEnvelope, receivedAtMs = Date.now()): boolean {
    if (!envelope || typeof envelope.id !== 'string' || !envelope.id.trim()) {
      return false;
    }
    this.lastHeartbeatAtMs = receivedAtMs;

    if (envelope.type === 'ping') {
      return true;
    }

    if (!this.deduper.markIfNew(envelope.id)) {
      return false;
    }

    if (typeof envelope.seq === 'number' && Number.isFinite(envelope.seq) && envelope.seq > 0) {
      if (envelope.seq < this.lastSeq) {
        return false;
      }
      this.lastSeq = envelope.seq;
    }

    return true;
  }

  isHeartbeatStale(nowMs: number, timeoutMs = 65_000): boolean {
    if (this.lastHeartbeatAtMs === 0) return false;
    return nowMs - this.lastHeartbeatAtMs > timeoutMs;
  }

  getLastSeq(): number {
    return this.lastSeq;
  }

  resetSequenceForNewConnection(): void {
    this.lastSeq = 0;
    this.lastHeartbeatAtMs = 0;
  }
}

/**
 * Parses a raw SSE JSON payload safely into a RealtimeEventEnvelope.
 */
export function parseRealtimeEnvelope(rawJson: string): RealtimeEventEnvelope | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<RealtimeEventEnvelope>;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.type !== 'string') {
      return null;
    }
    const allowedTypes = new Set<RealtimeEventType>([
      'connected',
      'ping',
      'notification.created',
      'system.status_updated',
    ]);
    if (!allowedTypes.has(parsed.type as RealtimeEventType)) {
      return null;
    }
    return {
      id: parsed.id,
      seq: typeof parsed.seq === 'number' && Number.isFinite(parsed.seq) ? parsed.seq : 0,
      type: parsed.type as RealtimeEventType,
      emittedAt: typeof parsed.emittedAt === 'string' ? parsed.emittedAt : new Date().toISOString(),
      payload:
        parsed.payload && typeof parsed.payload === 'object'
          ? (parsed.payload as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
}
