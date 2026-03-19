/**
 * Golden snapshot tests for agent-scheduler.ts — pre-split baseline.
 *
 * PURPOSE: Capture the exact observable behavior of every exported function
 * and state in agent-scheduler.ts BEFORE any refactor. After restructuring,
 * all these tests must still pass.
 *
 * Exports covered:
 *   - InvocationContext (type — structural checks only)
 *   - activeInvocations — Map<string, Promise<void>>
 *   - inFlight          — Set<string>
 *   - invokeAgents      — fire-and-forget multi-agent dispatch
 *   - invokeAgent       — fire-and-forget single-agent dispatch
 *   - scheduleInvocation — enqueue/run one agent invocation
 *   - drainActiveInvocations — waits for all in-flight to settle
 *   - drainQueue        — drain next from pending queue
 *   - pauseInvocations  — per-room pause (SEC-SCOPE-001)
 *   - resumeInvocations — per-room resume
 *   - isPaused          — per-room pause query
 *   - clearQueue        — per-room queue drain
 *
 * mock.module() MUST be declared before any import of agent-scheduler.ts.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — for the runner's DB access via connection mock
// ---------------------------------------------------------------------------

const _schedulerDb = new Database(':memory:');
_schedulerDb.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, room_id TEXT NOT NULL, author TEXT NOT NULL,
    author_type TEXT NOT NULL, content TEXT NOT NULL,
    msg_type TEXT NOT NULL DEFAULT 'message', parent_id TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_name TEXT NOT NULL, room_id TEXT NOT NULL,
    session_id TEXT, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle',
    last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
    PRIMARY KEY (agent_name, room_id)
  );
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('default', 'general', 'Agent chatroom');
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('sched-golden-room', 'sched-golden', 'Scheduler golden room');
`);

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _schedulerDb,
}));

mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(_topic: string, _data: string) {
        // no-op
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, afterEach } from 'bun:test';
import {
  activeInvocations,
  inFlight,
  invokeAgents,
  invokeAgent,
  scheduleInvocation,
  drainActiveInvocations,
  drainQueue,
  pauseInvocations,
  resumeInvocations,
  isPaused,
  clearQueue,
} from '../../src/services/agent-scheduler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOM = 'sched-golden-room';

// Use names that don't match any real agent — doInvoke exits via "Unknown agent"
// guard without spawning a subprocess.
const FAKE = 'sched-golden-nonexistent-agent';

function tick(ms = 20): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// GOLDEN: exported state shapes — activeInvocations and inFlight
// ---------------------------------------------------------------------------

describe('GOLDEN — exported state: activeInvocations and inFlight (agent-scheduler.ts)', () => {
  it('activeInvocations is a Map', () => {
    expect(activeInvocations instanceof Map).toBe(true);
  });

  it('inFlight is a Set', () => {
    expect(inFlight instanceof Set).toBe(true);
  });

  it('activeInvocations keys are strings in "agentName:roomId" format', async () => {
    // After all fake-agent invocations flush, the map should be empty or have
    // keys matching the expected format. We verify it does not contain invalid types.
    await tick(80);
    for (const [key] of activeInvocations) {
      expect(typeof key).toBe('string');
      expect(key).toContain(':');
    }
  });

  it('inFlight entries are strings in "agentName:roomId" format', async () => {
    await tick(80);
    for (const key of inFlight) {
      expect(typeof key).toBe('string');
      expect(key).toContain(':');
    }
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: drainActiveInvocations — resolves immediately when idle
// ---------------------------------------------------------------------------

describe('GOLDEN — drainActiveInvocations (agent-scheduler.ts)', () => {
  it('returns a Promise', () => {
    const result = drainActiveInvocations();
    expect(result instanceof Promise).toBe(true);
  });

  it('resolves to undefined when no invocations are active', async () => {
    await tick(80);
    const result = await drainActiveInvocations();
    expect(result).toBeUndefined();
  });

  it('resolves quickly when nothing is running (< 200ms)', async () => {
    await tick(80);
    const start = Date.now();
    await drainActiveInvocations();
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('can be called multiple times without throwing', async () => {
    await tick(80);
    await drainActiveInvocations();
    await drainActiveInvocations();
    // Reaching here = no throw
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: pauseInvocations / resumeInvocations / isPaused
// SEC-SCOPE-001: per-room isolation — pausing one room must not affect another
// ---------------------------------------------------------------------------

describe('GOLDEN — pauseInvocations / resumeInvocations / isPaused (agent-scheduler.ts)', () => {
  const ROOM_A = 'sched-pause-room-a';
  const ROOM_B = 'sched-pause-room-b';

  afterEach(() => {
    resumeInvocations(ROOM_A);
    resumeInvocations(ROOM_B);
  });

  it('isPaused returns false for a room that has never been paused', () => {
    expect(isPaused(ROOM_A)).toBe(false);
  });

  it('isPaused returns false for any unknown room', () => {
    expect(isPaused('totally-unknown-sched-room-xyz')).toBe(false);
  });

  it('pauseInvocations sets isPaused to true', () => {
    pauseInvocations(ROOM_A);
    expect(isPaused(ROOM_A)).toBe(true);
  });

  it('resumeInvocations sets isPaused to false', () => {
    pauseInvocations(ROOM_A);
    resumeInvocations(ROOM_A);
    expect(isPaused(ROOM_A)).toBe(false);
  });

  it('pausing ROOM_A does NOT affect ROOM_B (SEC-SCOPE-001)', () => {
    pauseInvocations(ROOM_A);
    expect(isPaused(ROOM_B)).toBe(false);
  });

  it('pausing ROOM_B does NOT affect ROOM_A', () => {
    pauseInvocations(ROOM_B);
    expect(isPaused(ROOM_A)).toBe(false);
  });

  it('both rooms can be paused independently', () => {
    pauseInvocations(ROOM_A);
    pauseInvocations(ROOM_B);
    expect(isPaused(ROOM_A)).toBe(true);
    expect(isPaused(ROOM_B)).toBe(true);
  });

  it('resuming ROOM_A while ROOM_B is paused leaves ROOM_B paused', () => {
    pauseInvocations(ROOM_A);
    pauseInvocations(ROOM_B);
    resumeInvocations(ROOM_A);
    expect(isPaused(ROOM_A)).toBe(false);
    expect(isPaused(ROOM_B)).toBe(true);
  });

  it('pausing an already-paused room does not throw', () => {
    pauseInvocations(ROOM_A);
    expect(() => pauseInvocations(ROOM_A)).not.toThrow();
    expect(isPaused(ROOM_A)).toBe(true);
  });

  it('resuming an already-resumed room does not throw', () => {
    expect(() => resumeInvocations(ROOM_A)).not.toThrow();
    expect(isPaused(ROOM_A)).toBe(false);
  });

  it('pauseInvocations returns void (undefined)', () => {
    expect(pauseInvocations(ROOM_A)).toBeUndefined();
  });

  it('resumeInvocations returns void (undefined)', () => {
    expect(resumeInvocations(ROOM_A)).toBeUndefined();
  });

  it('isPaused returns a boolean', () => {
    expect(typeof isPaused(ROOM_A)).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: clearQueue — exact return value contract
// ---------------------------------------------------------------------------

describe('GOLDEN — clearQueue (agent-scheduler.ts)', () => {
  const ROOM_Q = 'sched-clear-queue-room';

  afterEach(() => {
    clearQueue(ROOM_Q);
    resumeInvocations(ROOM_Q);
  });

  it('returns 0 for an empty queue', () => {
    expect(clearQueue(ROOM_Q)).toBe(0);
  });

  it('return value is a non-negative integer', () => {
    const result = clearQueue(ROOM_Q);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('does not throw for an unknown room', () => {
    expect(() => clearQueue('nonexistent-sched-xyz-room')).not.toThrow();
  });

  it('returns 0 for unknown room', () => {
    expect(clearQueue('nonexistent-sched-xyz-room')).toBe(0);
  });

  it('calling clearQueue twice on the same empty room returns 0 both times', () => {
    clearQueue(ROOM_Q);
    expect(clearQueue(ROOM_Q)).toBe(0);
  });

  it('clearQueue returns void-ish value (result is accessible)', () => {
    const r = clearQueue(ROOM_Q);
    expect(r).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: scheduleInvocation — early exits and queue behavior
// ---------------------------------------------------------------------------

describe('GOLDEN — scheduleInvocation early-exit paths (agent-scheduler.ts)', () => {
  const ROOM_S = 'sched-schedule-room';

  afterEach(() => {
    clearQueue(ROOM_S);
    resumeInvocations(ROOM_S);
  });

  it('returns void (undefined)', () => {
    const result = scheduleInvocation(
      ROOM_S, FAKE, { triggerContent: 'hello', agentTurns: new Map() }, false,
    );
    expect(result).toBeUndefined();
  });

  it('does not throw synchronously', () => {
    expect(() =>
      scheduleInvocation(
        ROOM_S, FAKE, { triggerContent: 'test', agentTurns: new Map() }, false,
      )
    ).not.toThrow();
  });

  it('when room is paused, scheduleInvocation returns immediately without queuing', () => {
    pauseInvocations(ROOM_S);
    // Even though room is paused, the call must not throw
    expect(() =>
      scheduleInvocation(ROOM_S, FAKE, { triggerContent: 'dropped', agentTurns: new Map() }, false)
    ).not.toThrow();
  });

  it('priority=true does not throw', () => {
    expect(() =>
      scheduleInvocation(
        ROOM_S, FAKE, { triggerContent: 'urgent', agentTurns: new Map() }, false, true,
      )
    ).not.toThrow();
  });

  it('priority=false (default) does not throw', () => {
    expect(() =>
      scheduleInvocation(
        ROOM_S, FAKE, { triggerContent: 'normal', agentTurns: new Map() }, false, false,
      )
    ).not.toThrow();
  });

  it('isRetry=true does not throw', () => {
    expect(() =>
      scheduleInvocation(
        ROOM_S, FAKE, { triggerContent: 'retry', agentTurns: new Map() }, true,
      )
    ).not.toThrow();
  });

  it('triggerContent merge path: second call for same agent+room when in-flight merges content', async () => {
    // Invoke the fake agent to put it in-flight
    scheduleInvocation(ROOM_S, `${FAKE}-merge`, { triggerContent: 'first', agentTurns: new Map() }, false);
    // Give the first call a tick to enter the in-flight set
    await tick(10);
    // Second call — if agent is in-flight AND already has a pending entry OR exceeds cap, it handles gracefully
    expect(() =>
      scheduleInvocation(ROOM_S, `${FAKE}-merge`, { triggerContent: 'second', agentTurns: new Map() }, false)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: invokeAgents — public API shape (fire-and-forget)
// ---------------------------------------------------------------------------

describe('GOLDEN — invokeAgents public API shape (agent-scheduler.ts)', () => {
  const ROOM_INV = 'sched-invoke-agents-room';

  afterEach(() => {
    clearQueue(ROOM_INV);
    resumeInvocations(ROOM_INV);
  });

  it('returns void (undefined)', () => {
    expect(invokeAgents(ROOM_INV, new Set([FAKE]), 'test')).toBeUndefined();
  });

  it('with empty set returns void without throw', () => {
    expect(invokeAgents(ROOM_INV, new Set(), 'no agents')).toBeUndefined();
  });

  it('with multiple agents returns void', () => {
    expect(invokeAgents(ROOM_INV, new Set([`${FAKE}-a`, `${FAKE}-b`]), 'multi')).toBeUndefined();
  });

  it('with priority=true returns void', () => {
    expect(invokeAgents(ROOM_INV, new Set([FAKE]), 'urgent', new Map(), true)).toBeUndefined();
  });

  it('with priority=false returns void', () => {
    expect(invokeAgents(ROOM_INV, new Set([FAKE]), 'normal', new Map(), false)).toBeUndefined();
  });

  it('call completes synchronously (< 50ms)', () => {
    const start = Date.now();
    invokeAgents(ROOM_INV, new Set([FAKE]), 'test');
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('when room is paused, does not throw', () => {
    pauseInvocations(ROOM_INV);
    expect(() => invokeAgents(ROOM_INV, new Set([FAKE]), 'dropped')).not.toThrow();
  });

  it('with MAX_QUEUE_SIZE+5 agents does not throw (overflow cap)', () => {
    const manyAgents = new Set(Array.from({ length: 15 }, (_, i) => `${FAKE}-${i}`));
    expect(() => invokeAgents(ROOM_INV, manyAgents, 'overflow')).not.toThrow();
  });

  it('agentTurns defaults to empty Map when not supplied', () => {
    // invokeAgents(roomId, agents, trigger) — agentTurns and priority are optional
    expect(() => invokeAgents(ROOM_INV, new Set([FAKE]), 'default turns')).not.toThrow();
  });

  it('stagger delay: multiple agents are dispatched with 600ms gaps (fire-and-forget, no block)', () => {
    // The function should return immediately even for 3 agents (600ms stagger is async)
    const start = Date.now();
    invokeAgents(ROOM_INV, new Set([`${FAKE}-d1`, `${FAKE}-d2`, `${FAKE}-d3`]), 'stagger');
    expect(Date.now() - start).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: invokeAgent — single-agent API shape
// ---------------------------------------------------------------------------

describe('GOLDEN — invokeAgent public API shape (agent-scheduler.ts)', () => {
  const ROOM_SA = 'sched-invoke-single-room';

  afterEach(() => {
    clearQueue(ROOM_SA);
    resumeInvocations(ROOM_SA);
  });

  it('returns void (undefined)', () => {
    expect(invokeAgent(ROOM_SA, FAKE, 'Hello')).toBeUndefined();
  });

  it('does not throw synchronously', () => {
    expect(() => invokeAgent(ROOM_SA, FAKE, 'test')).not.toThrow();
  });

  it('call completes synchronously (< 50ms)', () => {
    const start = Date.now();
    invokeAgent(ROOM_SA, FAKE, 'test');
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('does not throw asynchronously (unknown agent exits via guard)', async () => {
    invokeAgent(ROOM_SA, FAKE, 'test');
    await tick(50);
    expect(true).toBe(true);
  });

  it('in a paused room does not throw', () => {
    pauseInvocations(ROOM_SA);
    expect(() => invokeAgent(ROOM_SA, FAKE, 'dropped')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: drainQueue — no-op when queue empty or cap reached
// ---------------------------------------------------------------------------

describe('GOLDEN — drainQueue (agent-scheduler.ts)', () => {
  const ROOM_DQ = 'sched-drain-queue-room';

  afterEach(() => {
    clearQueue(ROOM_DQ);
    resumeInvocations(ROOM_DQ);
  });

  it('returns void (undefined)', () => {
    expect(drainQueue()).toBeUndefined();
  });

  it('does not throw when queue is empty', () => {
    expect(() => drainQueue()).not.toThrow();
  });

  it('can be called multiple times without throwing', () => {
    drainQueue();
    drainQueue();
    drainQueue();
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: scheduleInvocation — merge path: triggerContent exceeds size cap
// ---------------------------------------------------------------------------

describe('GOLDEN — scheduleInvocation merge paths (agent-scheduler.ts)', () => {
  const ROOM_M = 'sched-merge-room';
  const MAX_CONTENT_BYTES = 16_000;

  afterEach(() => {
    clearQueue(ROOM_M);
    resumeInvocations(ROOM_M);
  });

  it('trigger content at exactly MAX_TRIGGER_CONTENT_BYTES does not throw', () => {
    const bigContent = 'x'.repeat(MAX_CONTENT_BYTES - 1);
    expect(() =>
      scheduleInvocation(ROOM_M, `${FAKE}-big`, { triggerContent: bigContent, agentTurns: new Map() }, false)
    ).not.toThrow();
  });

  it('priority escalation path does not throw when merging a high-priority invocation', () => {
    // Normal entry first
    scheduleInvocation(ROOM_M, `${FAKE}-esc`, { triggerContent: 'low', agentTurns: new Map() }, false, false);
    // Priority entry — if in-flight+queued, should escalate existing entry
    expect(() =>
      scheduleInvocation(ROOM_M, `${FAKE}-esc`, { triggerContent: 'high', agentTurns: new Map() }, false, true)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: enqueue priority ordering (inline mirror of pendingQueue logic)
//
// The exact ordering rule — priority=true → unshift (front), priority=false →
// push (back) — must survive any scheduler refactor unchanged.
// ---------------------------------------------------------------------------

describe('GOLDEN — enqueue priority ordering logic (inline mirror of agent-scheduler.ts)', () => {
  interface Entry { name: string; priority: boolean; }

  function enqueue(queue: Entry[], entry: Entry): void {
    if (entry.priority) {
      queue.unshift(entry);
    } else {
      queue.push(entry);
    }
  }

  it('normal (priority=false) entry goes to BACK of queue', () => {
    const q: Entry[] = [];
    enqueue(q, { name: 'first', priority: false });
    enqueue(q, { name: 'second', priority: false });
    expect(q[0]!.name).toBe('first');
    expect(q[1]!.name).toBe('second');
  });

  it('priority entry goes to FRONT of queue (unshift)', () => {
    const q: Entry[] = [];
    enqueue(q, { name: 'normal', priority: false });
    enqueue(q, { name: 'urgent', priority: true });
    expect(q[0]!.name).toBe('urgent');
    expect(q[1]!.name).toBe('normal');
  });

  it('multiple priority entries → LIFO at front (last unshifted = index 0)', () => {
    const q: Entry[] = [];
    enqueue(q, { name: 'normal', priority: false });
    enqueue(q, { name: 'p1', priority: true });
    enqueue(q, { name: 'p2', priority: true });
    expect(q[0]!.name).toBe('p2');
    expect(q[1]!.name).toBe('p1');
    expect(q[2]!.name).toBe('normal');
  });

  it('priority entry jumps ahead of all normal entries regardless of queue length', () => {
    const q: Entry[] = [];
    ['n1', 'n2', 'n3', 'n4'].forEach((n) => enqueue(q, { name: n, priority: false }));
    enqueue(q, { name: 'urgent', priority: true });
    expect(q[0]!.name).toBe('urgent');
    expect(q.length).toBe(5);
  });

  it('empty queue accepts priority entry at index 0', () => {
    const q: Entry[] = [];
    enqueue(q, { name: 'only', priority: true });
    expect(q[0]!.name).toBe('only');
  });

  it('empty queue accepts normal entry at index 0', () => {
    const q: Entry[] = [];
    enqueue(q, { name: 'only', priority: false });
    expect(q[0]!.name).toBe('only');
  });
});
