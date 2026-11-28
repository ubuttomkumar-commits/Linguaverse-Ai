import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EventDeduplicator,
  RealtimeStreamState,
  computeReconnectDelayMs,
  parseRealtimeEnvelope,
} from './realtimeSyncEngine';

test('computeReconnectDelayMs applies exponential backoff with bounded jitter and cap', () => {
  // randomFn = 0.5 -> zero jitter offset
  assert.equal(
    computeReconnectDelayMs(0, { baseDelayMs: 1_000, maxDelayMs: 16_000, randomFn: () => 0.5 }),
    1_000
  );
  assert.equal(
    computeReconnectDelayMs(1, { baseDelayMs: 1_000, maxDelayMs: 16_000, randomFn: () => 0.5 }),
    2_000
  );
  assert.equal(
    computeReconnectDelayMs(2, { baseDelayMs: 1_000, maxDelayMs: 16_000, randomFn: () => 0.5 }),
    4_000
  );
  assert.equal(
    computeReconnectDelayMs(10, { baseDelayMs: 1_000, maxDelayMs: 16_000, randomFn: () => 0.5 }),
    16_000
  );

  // Jitter stays within [0.75x, 1.25x] when jitterRatio = 0.25
  const low = computeReconnectDelayMs(1, {
    baseDelayMs: 1_000,
    maxDelayMs: 16_000,
    jitterRatio: 0.25,
    randomFn: () => 0,
  });
  const high = computeReconnectDelayMs(1, {
    baseDelayMs: 1_000,
    maxDelayMs: 16_000,
    jitterRatio: 0.25,
    randomFn: () => 1,
  });
  assert.equal(low, 1_500);
  assert.equal(high, 2_500);
});

test('EventDeduplicator deduplicates seen IDs and evicts oldest IDs beyond capacity', () => {
  const deduper = new EventDeduplicator(16);
  for (let i = 0; i < 16; i += 1) {
    assert.equal(deduper.markIfNew(`evt_${i}`), true);
  }
  assert.equal(deduper.markIfNew('evt_0'), false);
  assert.equal(deduper.size(), 16);

  // Adding 17th evicts evt_0
  assert.equal(deduper.markIfNew('evt_16'), true);
  assert.equal(deduper.size(), 16);
  assert.equal(deduper.has('evt_0'), false);
  assert.equal(deduper.has('evt_16'), true);
});

test('RealtimeStreamState enforces deduplication, monotonic sequence order, and heartbeat watchdog', () => {
  const stream = new RealtimeStreamState(32);

  assert.equal(
    stream.accept(
      {
        id: 'e1',
        seq: 1,
        type: 'connected',
        emittedAt: '2026-11-27T00:00:00Z',
        payload: {},
      },
      10_000
    ),
    true
  );

  // Duplicate ID rejected
  assert.equal(
    stream.accept(
      {
        id: 'e1',
        seq: 2,
        type: 'notification.created',
        emittedAt: '2026-11-27T00:00:01Z',
        payload: {},
      },
      11_000
    ),
    false
  );

  // Higher seq accepted
  assert.equal(
    stream.accept(
      {
        id: 'e2',
        seq: 5,
        type: 'notification.created',
        emittedAt: '2026-11-27T00:00:02Z',
        payload: { titleEn: 'Broadcast' },
      },
      12_000
    ),
    true
  );

  // Out-of-order lower seq dropped
  assert.equal(
    stream.accept(
      {
        id: 'e3',
        seq: 3,
        type: 'notification.created',
        emittedAt: '2026-11-27T00:00:03Z',
        payload: {},
      },
      13_000
    ),
    false
  );

  assert.equal(stream.isHeartbeatStale(50_000, 60_000), false);
  assert.equal(stream.isHeartbeatStale(80_000, 60_000), true);
});

test('parseRealtimeEnvelope parses valid frames and rejects invalid or unknown event types', () => {
  const valid = parseRealtimeEnvelope(
    JSON.stringify({
      id: 'evt_42',
      seq: 2,
      type: 'system.status_updated',
      emittedAt: '2026-11-27T00:00:00Z',
      payload: { maintenanceMode: true },
    })
  );
  assert.equal(valid?.id, 'evt_42');
  assert.equal(valid?.type, 'system.status_updated');
  assert.equal(parseRealtimeEnvelope('not json'), null);
  assert.equal(parseRealtimeEnvelope(JSON.stringify({ id: 'x', type: 'unknown.type' })), null);
});
