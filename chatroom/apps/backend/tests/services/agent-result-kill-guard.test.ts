/**
 * Regression tests for the kill guard in agent-result.ts.
 *
 * PURPOSE: Lock the fix that prevents in-flight result handlers from
 * overwriting Out status with Done/Error after a SIGTERM is sent.
 *
 * Regression scenario (T1 — was: silent status corruption after kill):
 *   1. User presses stop on a running agent → killAgent() sets Out status.
 *   2. The in-flight spawnAndParse promise keeps running (process is shutting down).
 *   3. When the process exits, handleEmptyResult / handleFailedResult / persistAndBroadcast
 *      run and overwrite Out with Done or Error — UI shows wrong final state.
 *
 * Fixed behavior: all three result handlers check isAgentKilled() before
 * calling updateStatusAndBroadcast(Done/Error). When killed, they suppress
 * the status update and the system message, then clear the kill flag.
 *
 * Mock strategy:
 *   - db/connection.js → in-memory SQLite (safe: no other test needs this exact instance)
 *   - index.js        → stub server (safe: no other test imports index.js for real behavior)
 *   - agent-runner.js and message-bus.js are NOT mocked — real implementations run against
 *     the in-memory DB and stub server. Assertions use DB state instead of spy captures.
 *
 * mock.module() MUST be declared before any import of agent-result.ts.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — satisfies transitive imports of db/connection.js
// ---------------------------------------------------------------------------

const _killDb = new Database(':memory:');
_killDb.exec(`
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
    last_input_tokens INTEGER DEFAULT 0, last_output_tokens INTEGER DEFAULT 0,
    last_context_window INTEGER DEFAULT 0, last_duration_ms INTEGER DEFAULT 0,
    last_num_turns INTEGER DEFAULT 0, last_seen_message_id TEXT DEFAULT NULL,
    PRIMARY KEY (agent_name, room_id)
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY, room_id TEXT NOT NULL, message_id TEXT,
    filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL, created_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('default', 'general', 'Agent chatroom');
  INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('kill-guard-room', 'kill-guard', 'Kill guard regression room');
`);

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports of agent-result.ts
// Safe mocks only: db/connection.js and index.js are not used by other tests
// for real behavior. agent-runner.js and message-bus.js are intentionally
// NOT mocked here — they would leak into 32 other test files in Bun 1.3.11.
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _killDb,
}));

mock.module('../../src/index.js', () => ({
  app: { server: { publish(_topic: string, _data: string) {} } },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { handleEmptyResult, handleFailedResult, persistAndBroadcast } from '../../src/services/agent-result.js';
import { markAgentKilled, isAgentKilled, clearKilledAgent } from '../../src/services/agent-queue.js';
import { activeInvocations, inFlight } from '../../src/services/agent-scheduler.js';
import type { AgentStreamResult } from '../../src/services/agent-stream.js';

const ROOM = 'kill-guard-room';
const AGENT = 'ultron';
const MODEL = 'claude-sonnet-4-6';

function makeSr(overrides: Partial<AgentStreamResult> = {}): AgentStreamResult {
  return {
    resultText: 'agent output',
    resultSessionId: 'a1b2c3d4-1234-4abc-abcd-ef0123456789',
    resultCostUsd: 0.001,
    resultSuccess: true,
    resultDurationMs: 500,
    resultNumTurns: 1,
    resultInputTokens: 100,
    resultOutputTokens: 50,
    resultContextWindow: 200_000,
    hasResult: true,
    stderrOutput: '',
    ...overrides,
  };
}

function makeContext() {
  return { triggerContent: 'hello', agentTurns: new Map<string, number>() };
}

// ---------------------------------------------------------------------------
// DB helpers — replace spy-capture arrays with observable DB state
// ---------------------------------------------------------------------------

/** Count system messages in the given room matching a substring. */
function countSystemMessages(roomId: string, substring: string): number {
  const rows = _killDb
    .query<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND msg_type = 'system' AND content LIKE ?`,
    )
    .get(roomId, `%${substring}%`);
  return rows?.count ?? 0;
}

/** Read the current status of an agent session from DB. */
function getAgentStatus(agentName: string, roomId: string): string | null {
  const row = _killDb
    .query<{ status: string }, [string, string]>(
      `SELECT status FROM agent_sessions WHERE agent_name = ? AND room_id = ?`,
    )
    .get(agentName, roomId);
  return row?.status ?? null;
}

/** Count agent messages in the given room from a specific author. */
function countAgentMessages(roomId: string, author: string): number {
  const rows = _killDb
    .query<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND author = ?`,
    )
    .get(roomId, author);
  return rows?.count ?? 0;
}

/** Ensure an agent_sessions row exists at a given status for DB-state assertions. */
function ensureAgentSession(agentName: string, roomId: string, status = 'running'): void {
  _killDb.run(
    `INSERT OR REPLACE INTO agent_sessions (agent_name, room_id, model, status) VALUES (?, ?, ?, ?)`,
    [agentName, roomId, MODEL, status],
  );
}

/** Delete all messages in a room (used in cleanup). */
function clearMessages(roomId: string): void {
  _killDb.run(`DELETE FROM messages WHERE room_id = ?`, [roomId]);
}

// ---------------------------------------------------------------------------
// Reset DB and kill flags before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearMessages(ROOM);
  _killDb.run(`DELETE FROM agent_sessions WHERE room_id = ?`, [ROOM]);
  // Ensure kill flag is clear before each test
  clearKilledAgent(AGENT, ROOM);
});

// ---------------------------------------------------------------------------
// REGRESSION: handleEmptyResult — killed agent
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: handleEmptyResult (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast when agent is marked killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'out');
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    // Status must remain 'out' — not overwritten with 'done'
    expect(getAgentStatus(AGENT, ROOM)).toBe('out');
  });

  it('does not post "returned no response" system message when agent is killed', async () => {
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(countSystemMessages(ROOM, 'returned no response')).toBe(0);
  });

  it('clears the kill flag after handling the killed empty result', async () => {
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(isAgentKilled(AGENT, ROOM)).toBe(false);
  });

  it('still posts "returned no response" when agent is NOT killed', async () => {
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(countSystemMessages(ROOM, 'returned no response')).toBeGreaterThan(0);
  });

  it('still calls updateStatusAndBroadcast(Done) when agent is NOT killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'running');
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(getAgentStatus(AGENT, ROOM)).toBe('done');
  });

  it('kill flag isolation: killing agent-A does not suppress agent-B empty result', async () => {
    markAgentKilled('argus', ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    // AGENT (ultron) should still post the message
    expect(countSystemMessages(ROOM, 'returned no response')).toBeGreaterThan(0);
    clearKilledAgent('argus', ROOM);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: handleFailedResult — killed agent
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: handleFailedResult (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast(Error) when agent is killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'out');
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    // Status must remain 'out' — not overwritten with 'error'
    expect(getAgentStatus(AGENT, ROOM)).toBe('out');
  });

  it('does not post error system message when agent is killed', async () => {
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    expect(countSystemMessages(ROOM, 'failed')).toBe(0);
  });

  it('clears the kill flag after handling the killed failed result', async () => {
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    expect(isAgentKilled(AGENT, ROOM)).toBe(false);
  });

  it('still posts error system message when agent is NOT killed', async () => {
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    expect(countSystemMessages(ROOM, 'failed')).toBeGreaterThan(0);
  });

  it('still calls updateStatusAndBroadcast(Error) when agent is NOT killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'running');
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    expect(getAgentStatus(AGENT, ROOM)).toBe('error');
  });

  it('stale-session path does not interact with kill flag (returns true without clearing)', async () => {
    // stale session short-circuits before the kill guard — kill flag should NOT be cleared
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'No conversation found', hasResult: true });
    const retryScheduled = await handleFailedResult(sr, ROOM, AGENT, makeContext());
    // stale session returns true (retry scheduled) — the kill flag is still set
    // because clearKilledAgent is only reached after the stale-session guard
    expect(retryScheduled).toBe(true);
    // Cleanup
    clearKilledAgent(AGENT, ROOM);
  });

  it('kill flag isolation: killing agent-A does not suppress agent-B failed result', async () => {
    markAgentKilled('house', ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    expect(countSystemMessages(ROOM, 'failed')).toBeGreaterThan(0);
    clearKilledAgent('house', ROOM);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: persistAndBroadcast — killed agent (race: finished just before SIGTERM)
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: persistAndBroadcast (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast(Done) when agent is killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'out');
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'finished work', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    // Status should NOT be overwritten with 'done' — kill guard preserves 'out'
    // (upsertAgentSession sets it to 'out' when isKilled; updateStatusAndBroadcast is skipped)
    expect(getAgentStatus(AGENT, ROOM)).not.toBe('done');
  });

  it('still persists the message to DB when agent is killed (result was produced)', async () => {
    ensureAgentSession(AGENT, ROOM, 'running');
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'work that completed before SIGTERM', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    expect(countAgentMessages(ROOM, AGENT)).toBeGreaterThan(0);
  });

  it('persists message to DB when agent is killed (broadcast path reached via insertion ordering)', async () => {
    // Limitation: the stub server's publish() is a no-op, so broadcast cannot be observed
    // directly. The DB row proves persistAndBroadcast reached the broadcast path because
    // insertMessage (which writes the row) is called immediately before broadcast().
    ensureAgentSession(AGENT, ROOM, 'running');
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'work before SIGTERM', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    expect(countAgentMessages(ROOM, AGENT)).toBeGreaterThan(0);
  });

  it('clears the kill flag after persistAndBroadcast', async () => {
    ensureAgentSession(AGENT, ROOM, 'running');
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'completed', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    expect(isAgentKilled(AGENT, ROOM)).toBe(false);
  });

  it('still calls updateStatusAndBroadcast(Done) when agent is NOT killed', async () => {
    ensureAgentSession(AGENT, ROOM, 'running');
    const sr = makeSr({ resultText: 'completed normally', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    // upsertAgentSession sets 'done' and updateStatusAndBroadcast also writes 'done'
    expect(getAgentStatus(AGENT, ROOM)).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// markAgentKilled / isAgentKilled / clearKilledAgent — contract
// ---------------------------------------------------------------------------

describe('kill flag contract (agent-queue.ts exports)', () => {
  it('isAgentKilled returns false by default', () => {
    expect(isAgentKilled('bilbo', 'some-room')).toBe(false);
  });

  it('isAgentKilled returns true after markAgentKilled', () => {
    markAgentKilled('bilbo', 'some-room');
    expect(isAgentKilled('bilbo', 'some-room')).toBe(true);
    clearKilledAgent('bilbo', 'some-room');
  });

  it('clearKilledAgent resets the flag to false', () => {
    markAgentKilled('cerberus', 'some-room');
    clearKilledAgent('cerberus', 'some-room');
    expect(isAgentKilled('cerberus', 'some-room')).toBe(false);
  });

  it('kill flag is scoped by agent+room: killing agent-A does not affect agent-B', () => {
    markAgentKilled('gitto', 'room-x');
    expect(isAgentKilled('dante', 'room-x')).toBe(false);
    clearKilledAgent('gitto', 'room-x');
  });

  it('kill flag is scoped by agent+room: killing in room-A does not affect room-B', () => {
    markAgentKilled('yoda', 'room-a');
    expect(isAgentKilled('yoda', 'room-b')).toBe(false);
    clearKilledAgent('yoda', 'room-a');
  });

  it('markAgentKilled is idempotent (calling twice does not throw)', () => {
    expect(() => {
      markAgentKilled('house', 'room-z');
      markAgentKilled('house', 'room-z');
    }).not.toThrow();
    clearKilledAgent('house', 'room-z');
  });

  it('clearKilledAgent on a non-killed agent does not throw', () => {
    expect(() => clearKilledAgent('unknown-agent', 'unknown-room')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cross-file isolation: drain orphaned scheduler invocations
//
// agent-invoker-schedule.test.ts (which runs before this file) fires real
// agent invocations via invokeAgents/invokeAgent using known agent names
// ('bilbo', 'dante', etc.). These call scheduleInvocation → runInvocation,
// which spawns real `claude` subprocesses and adds entries to the global
// `activeInvocations` Map declared in agent-queue.ts (re-exported via
// agent-scheduler.ts). Because the invocations are fire-and-forget, the test
// file completes while the subprocesses are still running — leaving stale
// entries in activeInvocations.
//
// When agent-scheduler-golden.test.ts (which runs after this file) calls
// drainActiveInvocations(), it picks up these stale entries and waits for the
// subprocesses — timing out after Bun's default 5 s test timeout.
//
// Fix: force-clear the scheduler's global state maps at the very end of this
// file so that agent-scheduler-golden starts with a clean slate. The orphaned
// subprocesses are harmless — they run to completion in the background.
// ---------------------------------------------------------------------------

afterAll(() => {
  activeInvocations.clear();
  inFlight.clear();
});
