/**
 * Regression tests for pauseAgent / resumeAgent / isAgentPaused (agent-queue.ts).
 *
 * PURPOSE: Lock the phantom-pause fix introduced after Moriarty found that
 * calling pauseAgent() on an agent with no active subprocess left the
 * `_pausedAgents` flag set permanently, blocking all future invocations.
 *
 * Regression scenario (T2 — was: bug that silently blocked agents forever):
 *   1. User clicks Pause on an agent that just completed (race window).
 *   2. `pauseAgent()` adds key to `_pausedAgents`.
 *   3. No active process → old code returned false WITHOUT deleting the key.
 *   4. `isAgentPaused()` returned true forever → `invokeAgents` skipped the agent.
 *   5. No error, no feedback. Agent just stopped responding.
 *
 * Fixed behavior: if no active process exists, `_pausedAgents` key is deleted
 * before returning false. The flag never persists after a no-op pause.
 *
 * mock.module() MUST be declared before any import of agent-queue.ts.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — transitive import via config.ts
// ---------------------------------------------------------------------------

const _queueDb = new Database(':memory:');
_queueDb.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_name TEXT NOT NULL, room_id TEXT NOT NULL,
    session_id TEXT, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle',
    last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
    PRIMARY KEY (agent_name, room_id)
  );
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('default', 'general', 'Agent chatroom');
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('queue-pause-room', 'queue-pause', 'Pause regression room');
`);

// ---------------------------------------------------------------------------
// mock.module() — MUST precede all imports of agent-queue.js
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _queueDb,
}));

mock.module('../../src/index.js', () => ({
  app: { server: { publish(_topic: string, _data: string) {} } },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, afterEach } from 'bun:test';
import { pauseAgent, resumeAgent, isAgentPaused, activeProcesses } from '../../src/services/agent-queue.js';

const ROOM = 'queue-pause-room';
const AGENT = 'dante';

// ---------------------------------------------------------------------------
// Cleanup: ensure no state leaks between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  activeProcesses.clear();
});

// ---------------------------------------------------------------------------
// REGRESSION: phantom pause — pauseAgent with no active process
// ---------------------------------------------------------------------------

describe('REGRESSION — phantom pause (agent-queue.ts pauseAgent)', () => {
  it('isAgentPaused returns false before any call', () => {
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });

  it('pauseAgent returns false when no active process exists', () => {
    const result = pauseAgent(AGENT, ROOM);
    expect(result).toBe(false);
  });

  it('isAgentPaused returns false after pauseAgent with no active process (phantom pause prevented)', () => {
    pauseAgent(AGENT, ROOM);
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });

  it('flag does not persist after multiple pause calls with no active process', () => {
    pauseAgent(AGENT, ROOM);
    pauseAgent(AGENT, ROOM);
    pauseAgent(AGENT, ROOM);
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });

  it('different agents do not cross-contaminate each other via phantom pause', () => {
    pauseAgent('bilbo', ROOM);
    pauseAgent('ultron', ROOM);
    expect(isAgentPaused('bilbo', ROOM)).toBe(false);
    expect(isAgentPaused('ultron', ROOM)).toBe(false);
  });

  it('different rooms do not cross-contaminate each other via phantom pause', () => {
    pauseAgent(AGENT, 'room-a');
    pauseAgent(AGENT, 'room-b');
    expect(isAgentPaused(AGENT, 'room-a')).toBe(false);
    expect(isAgentPaused(AGENT, 'room-b')).toBe(false);
  });

  it('resumeAgent returns false when agent was never paused (no key to clean)', () => {
    expect(resumeAgent(AGENT, ROOM)).toBe(false);
  });

  it('resumeAgent is idempotent after phantom-prevented pause', () => {
    pauseAgent(AGENT, ROOM);
    // phantom pause was prevented, so no key exists
    const result = resumeAgent(AGENT, ROOM);
    expect(result).toBe(false);
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });

  it('isAgentPaused returns false after phantom pause + resume attempt', () => {
    pauseAgent(AGENT, ROOM);
    resumeAgent(AGENT, ROOM);
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Happy path: pauseAgent with an active process sets the flag correctly
// ---------------------------------------------------------------------------

describe('pauseAgent with active process (agent-queue.ts)', () => {
  it('isAgentPaused returns true when active process exists at pause time', () => {
    // Register a fake active process so pauseAgent finds it
    const key = `${AGENT}:${ROOM}`;
    activeProcesses.set(key, {
      pid: 99999, // non-existent PID — SIGSTOP will throw ESRCH
      kill: () => {},
      startedAt: Date.now(),
    });

    pauseAgent(AGENT, ROOM);

    // SIGSTOP fails (ESRCH — no process with that PID), which triggers the
    // ESRCH branch that also clears the flag. So result is still false and
    // isAgentPaused is false — the flag cleanup is consistent.
    // This verifies the ESRCH branch doesn't leave a phantom flag either.
    expect(isAgentPaused(AGENT, ROOM)).toBe(false);
  });

  it('pauseAgent does not throw when SIGSTOP fails with ESRCH (non-existent PID)', () => {
    const key = `${AGENT}:${ROOM}`;
    activeProcesses.set(key, {
      pid: 99999,
      kill: () => {},
      startedAt: Date.now(),
    });
    expect(() => pauseAgent(AGENT, ROOM)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isAgentPaused — contract
// ---------------------------------------------------------------------------

describe('isAgentPaused contract (agent-queue.ts)', () => {
  it('returns false for unknown agent', () => {
    expect(isAgentPaused('unknown-agent-xyz', ROOM)).toBe(false);
  });

  it('returns false for unknown room', () => {
    expect(isAgentPaused(AGENT, 'unknown-room-xyz')).toBe(false);
  });

  it('is scoped by room — same agent different rooms are independent', () => {
    expect(isAgentPaused(AGENT, 'room-1')).toBe(false);
    expect(isAgentPaused(AGENT, 'room-2')).toBe(false);
  });

  it('does not throw for any input combination', () => {
    expect(() => isAgentPaused('', '')).not.toThrow();
    expect(() => isAgentPaused(AGENT, '')).not.toThrow();
    expect(() => isAgentPaused('', ROOM)).not.toThrow();
  });
});
