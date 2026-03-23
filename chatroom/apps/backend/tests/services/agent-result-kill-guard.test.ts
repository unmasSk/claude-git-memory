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
// Spy surfaces — captured calls for assertion
// ---------------------------------------------------------------------------

let statusCalls: Array<[string, string, string, string | undefined]> = [];
let sysMsgCalls: Array<[string, string]> = [];
let broadcastCalls: Array<[string, unknown]> = [];

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports of agent-result.ts
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _killDb,
}));

mock.module('../../src/index.js', () => ({
  app: { server: { publish(_topic: string, _data: string) {} } },
}));

mock.module('../../src/services/agent-runner.js', () => ({
  updateStatusAndBroadcast: async (
    agentName: string,
    roomId: string,
    status: string,
    msg?: string,
  ) => {
    statusCalls.push([agentName, roomId, status, msg]);
  },
  postSystemMessage: async (roomId: string, content: string) => {
    sysMsgCalls.push([roomId, content]);
  },
}));

mock.module('../../src/services/message-bus.js', () => ({
  broadcast: async (roomId: string, payload: unknown) => {
    broadcastCalls.push([roomId, payload]);
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'bun:test';
import { handleEmptyResult, handleFailedResult, persistAndBroadcast } from '../../src/services/agent-result.js';
import { markAgentKilled, isAgentKilled, clearKilledAgent } from '../../src/services/agent-queue.js';
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
// Reset spy captures before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  statusCalls = [];
  sysMsgCalls = [];
  broadcastCalls = [];
  // Ensure kill flag is clear before each test
  clearKilledAgent(AGENT, ROOM);
});

// ---------------------------------------------------------------------------
// REGRESSION: handleEmptyResult — killed agent
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: handleEmptyResult (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast when agent is marked killed', async () => {
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(statusCalls.length).toBe(0);
  });

  it('does not post "returned no response" system message when agent is killed', async () => {
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    const noResponseMsg = sysMsgCalls.find(([, msg]) => msg.includes('returned no response'));
    expect(noResponseMsg).toBeUndefined();
  });

  it('clears the kill flag after handling the killed empty result', async () => {
    markAgentKilled(AGENT, ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    expect(isAgentKilled(AGENT, ROOM)).toBe(false);
  });

  it('still posts "returned no response" when agent is NOT killed', async () => {
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    const noResponseMsg = sysMsgCalls.find(([, msg]) => msg.includes('returned no response'));
    expect(noResponseMsg).toBeDefined();
  });

  it('still calls updateStatusAndBroadcast(Done) when agent is NOT killed', async () => {
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    const doneCall = statusCalls.find(([, , status]) => status === 'done');
    expect(doneCall).toBeDefined();
  });

  it('kill flag isolation: killing agent-A does not suppress agent-B empty result', async () => {
    markAgentKilled('argus', ROOM);
    await handleEmptyResult(makeSr({ hasResult: false, resultText: '', stderrOutput: '' }), ROOM, AGENT, makeContext());
    // AGENT (ultron) should still post the message and call Done
    const noResponseMsg = sysMsgCalls.find(([, msg]) => msg.includes('returned no response'));
    expect(noResponseMsg).toBeDefined();
    clearKilledAgent('argus', ROOM);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: handleFailedResult — killed agent
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: handleFailedResult (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast(Error) when agent is killed', async () => {
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    const errorCall = statusCalls.find(([, , status]) => status === 'error');
    expect(errorCall).toBeUndefined();
  });

  it('does not post error system message when agent is killed', async () => {
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    const errMsg = sysMsgCalls.find(([, msg]) => msg.includes('failed'));
    expect(errMsg).toBeUndefined();
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
    const errMsg = sysMsgCalls.find(([, msg]) => msg.includes('failed'));
    expect(errMsg).toBeDefined();
  });

  it('still calls updateStatusAndBroadcast(Error) when agent is NOT killed', async () => {
    const sr = makeSr({ resultSuccess: false, resultText: 'some error', hasResult: true });
    await handleFailedResult(sr, ROOM, AGENT, makeContext());
    const errorCall = statusCalls.find(([, , status]) => status === 'error');
    expect(errorCall).toBeDefined();
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
    const errMsg = sysMsgCalls.find(([, msg]) => msg.includes('failed'));
    expect(errMsg).toBeDefined();
    clearKilledAgent('house', ROOM);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: persistAndBroadcast — killed agent (race: finished just before SIGTERM)
// ---------------------------------------------------------------------------

describe('REGRESSION — kill guard: persistAndBroadcast (agent-result.ts)', () => {
  it('does not call updateStatusAndBroadcast(Done) when agent is killed', async () => {
    _killDb.exec(`
      INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, model, status)
      VALUES ('${AGENT}', '${ROOM}', '${MODEL}', 'running');
    `);
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'finished work', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    const doneCall = statusCalls.find(([, , status]) => status === 'done');
    expect(doneCall).toBeUndefined();
  });

  it('still persists the message to DB when agent is killed (result was produced)', async () => {
    _killDb.exec(`
      INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, model, status)
      VALUES ('${AGENT}', '${ROOM}', '${MODEL}', 'running');
    `);
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'work that completed before SIGTERM', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    const rows = _killDb.query<{ count: number }, []>('SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND author = ?')
      .get(ROOM, AGENT);
    expect(rows?.count).toBeGreaterThan(0);
  });

  it('still broadcasts the message when agent is killed', async () => {
    _killDb.exec(`
      INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, model, status)
      VALUES ('${AGENT}', '${ROOM}', '${MODEL}', 'running');
    `);
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'work before SIGTERM', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    expect(broadcastCalls.length).toBeGreaterThan(0);
  });

  it('clears the kill flag after persistAndBroadcast', async () => {
    _killDb.exec(`
      INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, model, status)
      VALUES ('${AGENT}', '${ROOM}', '${MODEL}', 'running');
    `);
    markAgentKilled(AGENT, ROOM);
    const sr = makeSr({ resultText: 'completed', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    expect(isAgentKilled(AGENT, ROOM)).toBe(false);
  });

  it('still calls updateStatusAndBroadcast(Done) when agent is NOT killed', async () => {
    _killDb.exec(`
      INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, model, status)
      VALUES ('${AGENT}', '${ROOM}', '${MODEL}', 'running');
    `);
    const sr = makeSr({ resultText: 'completed normally', resultSuccess: true });
    await persistAndBroadcast(sr, ROOM, AGENT, MODEL, makeContext());
    const doneCall = statusCalls.find(([, , status]) => status === 'done');
    expect(doneCall).toBeDefined();
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
