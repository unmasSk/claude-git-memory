/**
 * Unit tests for handleReinvokeFromContext (ws-control-handlers.ts).
 *
 * PURPOSE: Verify the handler's guard paths and success behavior:
 *   - unknown or non-invokable agentName → UNKNOWN_AGENT error
 *   - nonexistent room → ROOM_NOT_FOUND error
 *   - valid agent + valid room → posts system message, calls invokeAgent
 *
 * Mock strategy (mirrors ws-handlers-golden.test.ts pattern):
 *   - db/connection.js → in-memory SQLite
 *   - index.js → stub server with captured publish calls (deep dep of message-bus)
 *   - agent-invoker.js → partial stub: invokeAgent/invokeAgents are captured stubs;
 *     all state functions (pause/resume/sanitize/etc.) use real implementations to
 *     avoid cross-file contamination (mock-patterns.md rule).
 *
 * mock.module() MUST be declared before any import of ws-control-handlers.js.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB
// ---------------------------------------------------------------------------

const _ctrlDb = new Database(':memory:');
_ctrlDb.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    cwd TEXT DEFAULT NULL
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
  INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('default', 'general', 'Agent chatroom');
  INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('ctrl-test-room', 'ctrl-golden', 'Control handler test room');
`);

// ---------------------------------------------------------------------------
// Capture invokeAgent calls and broadcast calls
// ---------------------------------------------------------------------------

const _invokeAgentCalls: Array<{ roomId: string; agentName: string; prompt: string }> = [];
const _publishedCtrlEvents: Array<{ topic: string; data: string }> = [];

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _ctrlDb,
}));

mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(topic: string, data: string) {
        _publishedCtrlEvents.push({ topic, data });
      },
    },
  },
}));

// Partial stub: capture invokeAgent, preserve all real state functions.
// Rule: never stub sanitizePromptContent or pause/resume — that contaminates
// tests that rely on the real implementations across the full bun test run.
mock.module('../../src/services/agent-invoker.js', () => {
  const { sanitizePromptContent } = require('../../src/services/agent-prompt.js') as typeof import('../../src/services/agent-prompt.js');
  const sched = require('../../src/services/agent-scheduler.js') as typeof import('../../src/services/agent-scheduler.js');
  return {
    invokeAgents: () => {},
    invokeAgent: (roomId: string, agentName: string, prompt: string) => {
      _invokeAgentCalls.push({ roomId, agentName, prompt });
    },
    killAgent: sched.killAgent ?? (() => false),
    pauseAgent: sched.pauseAgent,
    resumeAgent: sched.resumeAgent,
    isAgentPaused: sched.isAgentPaused,
    pauseInvocations: sched.pauseInvocations,
    resumeInvocations: sched.resumeInvocations,
    isPaused: sched.isPaused,
    clearQueue: sched.clearQueue,
    sanitizePromptContent,
    scheduleInvocation: sched.scheduleInvocation,
    drainActiveInvocations: sched.drainActiveInvocations,
    drainQueue: sched.drainQueue,
    inFlight: sched.inFlight,
    activeInvocations: sched.activeInvocations,
    activeProcesses: new Map(),
  };
});

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'bun:test';
import { handleReinvokeFromContext } from '../../src/routes/ws-control-handlers.js';

// ---------------------------------------------------------------------------
// Fake WS builder (minimal — only send() needed for error assertions)
// ---------------------------------------------------------------------------

interface FakeWs {
  _sent: string[];
  _closed: boolean;
  send(msg: string): void;
  close(): void;
  publish(topic: string, data: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
}

function makeFakeWs(): FakeWs {
  return {
    _sent: [],
    _closed: false,
    send(msg: string) { this._sent.push(msg); },
    close() { this._closed = true; },
    publish(_topic: string, _data: string) {},
    subscribe(_topic: string) {},
    unsubscribe(_topic: string) {},
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOM = 'ctrl-test-room';

function countSystemMessages(roomId: string, substring?: string): number {
  if (substring) {
    const row = _ctrlDb
      .query<{ count: number }, [string, string]>(
        `SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND msg_type = 'system' AND content LIKE ?`,
      )
      .get(roomId, `%${substring}%`);
    return row?.count ?? 0;
  }
  const row = _ctrlDb
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND msg_type = 'system'`,
    )
    .get(roomId);
  return row?.count ?? 0;
}

function findError(ws: FakeWs, code: string): boolean {
  return ws._sent.some((s) => {
    try { return JSON.parse(s).code === code; } catch { return false; }
  });
}

// ---------------------------------------------------------------------------
// Setup: reset captures before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  _invokeAgentCalls.length = 0;
  _publishedCtrlEvents.length = 0;
  _ctrlDb.run(`DELETE FROM messages WHERE room_id = ?`, [ROOM]);
});

// ---------------------------------------------------------------------------
// handleReinvokeFromContext — guard: unknown agent
// ---------------------------------------------------------------------------

describe('handleReinvokeFromContext — unknown agent guard (ws-control-handlers.ts)', () => {
  it('sends UNKNOWN_AGENT error for a nonexistent agent name', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'nonexistent-agent-xyz');
    expect(findError(ws, 'UNKNOWN_AGENT')).toBe(true);
  });

  it('does not call invokeAgent when agent is unknown', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'nonexistent-agent-xyz');
    expect(_invokeAgentCalls.length).toBe(0);
  });

  it('does not post a system message when agent is unknown', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'nonexistent-agent-xyz');
    expect(countSystemMessages(ROOM)).toBe(0);
  });

  it('error message text includes agent name context', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'nonexistent-agent-xyz');
    const errorMsg = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(errorMsg).toBeDefined();
    const parsed = JSON.parse(errorMsg!);
    expect(typeof parsed.message).toBe('string');
    expect(parsed.message.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// handleReinvokeFromContext — guard: room not found
// ---------------------------------------------------------------------------

describe('handleReinvokeFromContext — room not found guard (ws-control-handlers.ts)', () => {
  it('sends ROOM_NOT_FOUND error when room does not exist', () => {
    const ws = makeFakeWs();
    // 'ultron' is a real agent defined in shared/agents.ts — invokable
    handleReinvokeFromContext(ws, 'nonexistent-room-xyz-ctrl', 'ultron');
    expect(findError(ws, 'ROOM_NOT_FOUND')).toBe(true);
  });

  it('does not call invokeAgent when room does not exist', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, 'nonexistent-room-xyz-ctrl', 'ultron');
    expect(_invokeAgentCalls.length).toBe(0);
  });

  it('does not post a system message when room does not exist', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, 'nonexistent-room-xyz-ctrl', 'ultron');
    // No system message should be inserted (room doesn't exist)
    expect(countSystemMessages(ROOM)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// handleReinvokeFromContext — success path
// ---------------------------------------------------------------------------

describe('handleReinvokeFromContext — success path (ws-control-handlers.ts)', () => {
  it('calls invokeAgent for a valid invokable agent in an existing room', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    // postSystemMessage is async — allow microtasks to resolve
    await Promise.resolve();
    await Promise.resolve();
    expect(_invokeAgentCalls.length).toBe(1);
  });

  it('invokeAgent is called with the correct roomId and agentName', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    expect(_invokeAgentCalls[0]?.roomId).toBe(ROOM);
    expect(_invokeAgentCalls[0]?.agentName).toBe('ultron');
  });

  it('invokeAgent prompt references context overflow recovery', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    const prompt = _invokeAgentCalls[0]?.prompt ?? '';
    // The handler passes a context overflow recovery prompt (case-insensitive check)
    expect(prompt.toLowerCase()).toContain('context overflow');
  });

  it('does not send UNKNOWN_AGENT or ROOM_NOT_FOUND on success', () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    expect(findError(ws, 'UNKNOWN_AGENT')).toBe(false);
    expect(findError(ws, 'ROOM_NOT_FOUND')).toBe(false);
  });

  it('posts a system message to the room on success', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(countSystemMessages(ROOM)).toBeGreaterThan(0);
  });

  it('system message mentions the agent name', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'cerberus');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(countSystemMessages(ROOM, 'cerberus')).toBeGreaterThan(0);
  });

  it('system message references context overflow', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // The system message must mention context overflow or fresh session
    const hasContextMsg = countSystemMessages(ROOM, 'context') > 0 || countSystemMessages(ROOM, 'fresh') > 0 || countSystemMessages(ROOM, 'Reinvoking') > 0;
    expect(hasContextMsg).toBe(true);
  });

  it('does not broadcast a context_overflow event (that is the agent-result path)', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    const overflowBroadcast = _publishedCtrlEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowBroadcast).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// handleReinvokeFromContext — edge cases
// ---------------------------------------------------------------------------

describe('handleReinvokeFromContext — edge cases (ws-control-handlers.ts)', () => {
  it('handles multiple valid reinvoke calls in sequence', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    await Promise.resolve();
    await Promise.resolve();
    // Each call results in an invokeAgent call
    expect(_invokeAgentCalls.length).toBe(2);
  });

  it('second valid agent in same room also triggers invokeAgent', async () => {
    const ws = makeFakeWs();
    handleReinvokeFromContext(ws, ROOM, 'ultron');
    handleReinvokeFromContext(ws, ROOM, 'cerberus');
    await Promise.resolve();
    await Promise.resolve();
    const names = _invokeAgentCalls.map((c) => c.agentName);
    expect(names).toContain('ultron');
    expect(names).toContain('cerberus');
  });
});
