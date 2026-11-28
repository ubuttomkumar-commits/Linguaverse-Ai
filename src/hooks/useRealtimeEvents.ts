import { useEffect, useRef } from 'react';
import {
  RealtimeStreamState,
  computeReconnectDelayMs,
  parseRealtimeEnvelope,
  type RealtimeEventEnvelope,
} from '../domain/realtimeSyncEngine';
import { attachAuthBearerHeader, getApiCredentialsMode, resolveApiUrl } from '../services/apiBase';

interface UseRealtimeEventsOptions {
  enabled: boolean;
  onEvent: (event: RealtimeEventEnvelope) => void;
}

/**
 * Authenticated Server-Sent Events (SSE) stream hook.
 * Uses streaming fetch so both HttpOnly cookies and Bearer headers work across
 * Cloudflare Pages -> Workers origins. Enforces deduplication, sequence order,
 * heartbeat staleness detection, exponential backoff with jitter, and clean
 * abort on unmount, logout, or browser offline transitions.
 */
export function useRealtimeEvents({ enabled, onEvent }: UseRealtimeEventsOptions): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let activeController: AbortController | null = null;
    const streamState = new RealtimeStreamState(256);

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const abortActiveStream = () => {
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      clearReconnectTimer();
      const delayMs = computeReconnectDelayMs(attempt, {
        baseDelayMs: 2_000,
        maxDelayMs: 30_000,
        jitterRatio: 0.25,
      });
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        if (!cancelled) {
          void connect();
        }
      }, delayMs);
    };

    const connect = async () => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      abortActiveStream();
      clearReconnectTimer();
      streamState.resetSequenceForNewConnection();

      const controller = new AbortController();
      activeController = controller;

      try {
        const headers = attachAuthBearerHeader({
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        });

        const response = await fetch(resolveApiUrl('/api/v1/realtime/events'), {
          method: 'GET',
          credentials: getApiCredentialsMode(),
          headers,
          signal: controller.signal,
        });

        // Do not aggressively retry on authentication/authorization failure
        if (response.status === 401 || response.status === 403) {
          return;
        }
        if (!response.ok || !response.body) {
          scheduleReconnect();
          return;
        }

        // Connection succeeded -> reset backoff
        attempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled && !controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const dataLines = frame
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim());
            if (dataLines.length === 0) continue;

            const envelope = parseRealtimeEnvelope(dataLines.join('\n'));
            if (!envelope) continue;
            if (streamState.accept(envelope, Date.now())) {
              onEventRef.current(envelope);
            }
          }
        }

        if (!cancelled && !controller.signal.aborted) {
          scheduleReconnect();
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          scheduleReconnect();
        }
      }
    };

    const handleOnline = () => {
      if (!cancelled) {
        attempt = 0;
        void connect();
      }
    };

    const handleOffline = () => {
      clearReconnectTimer();
      abortActiveStream();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearReconnectTimer();
        abortActiveStream();
      } else if (!cancelled) {
        attempt = 0;
        void connect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    void connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      abortActiveStream();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}
