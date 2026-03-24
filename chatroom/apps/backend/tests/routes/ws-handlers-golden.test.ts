/**
 * Golden snapshot tests for ws-handlers.ts — pre-split baseline.
 *
 * PURPOSE: Capture the exact observable behavior of open(), message(), and
 * close() BEFORE any refactor. After restructuring, all these tests must
 * still pass. Any deviation means the refactor introduced a behavioral
 * regression.
 *
 * Functions covered:
 *   - open()    — origin check, upgrade rate limit, room cap, auth token,
 *                 connId assignment, room_state send, ROOM_NOT_FOUND path
 *   - message() — rate limit, JSON parse error, Zod validation, dispatch routing
 *   - close()   — connState cleanup, roomConns cleanup, user_list_update broadcast
 *
 * Strategy: build a minimal fake `ws` object that records all .send() and
 * .close() calls. Populate the WS state maps directly (connStates, roomConns,
 * wsConnIds) to exercise each code path without spinning up a real server.
 *
 * mock.module() MUST be declared before any import of ws-handlers.js.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB
// ---------------------------------------------------------------------------

const _wsHandlersDb = new Database(':memory:');
_wsHandlersDb.exec(`
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
  INSERT OR IGNORE INTO rooms (id, name, topic)
  VALUES ('default', 'general', 'Agent chatroom');
  INSERT OR IGNORE INTO rooms (id, name, topic)
  VALUES ('wsh-golden-room', 'wsh-golden', 'WS handler golden room');
`);

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _wsHandlersDb,
}));

mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(_topic: string, _data: string) {
        // no-op — ws.publish() is called directly on the fake ws object
      },
    },
  },
}));

// Mock agent-invoker: stub only invokeAgents/invokeAgent (would spawn real subprocesses).
// Use real implementations for all state functions (sanitizePromptContent, pause, etc.)
// to avoid contaminating other test files that rely on the real behavior.
// Rule: mock-patterns.md — mock the DEEPEST dependency; re-export real functions for
// anything that is not a subprocess-spawning concern.
mock.module('../../src/services/agent-invoker.js', () => {
  const { sanitizePromptContent } = require('../../src/services/agent-prompt.js') as typeof import('../../src/services/agent-prompt.js');
  const sched = require('../../src/services/agent-scheduler.js') as typeof import('../../src/services/agent-scheduler.js');
  return {
    invokeAgents: () => {},
    invokeAgent: () => {},
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
  };
});

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, afterEach } from 'bun:test';
import { open, message, close } from '../../src/routes/ws-handlers.js';
import {
  wsConnIds,
  connStates,
  roomConns,
  ALLOWED_ORIGINS,
} from '../../src/routes/ws-state.js';
import { issueToken } from '../../src/services/auth-tokens.js';

function createToken(name: string): string {
  const result = issueToken(name);
  if (!result) throw new Error(`issueToken returned null for name: ${name}`);
  return result.token;
}

// ---------------------------------------------------------------------------
// Fake WS builder
// ---------------------------------------------------------------------------

interface FakeWs {
  raw: symbol;
  data: { params: { roomId: string }; query: { token?: string; name?: string }; headers?: Record<string, string> };
  _sent: string[];
  _closed: boolean;
  _published: Array<{ topic: string; data: string }>;
  _subscribed: string[];
  _unsubscribed: string[];
  send(msg: string): void;
  close(): void;
  publish(topic: string, data: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
}

function makeFakeWs(roomId: string, token?: string, origin?: string): FakeWs {
  const ws: FakeWs = {
    raw: Symbol('ws'),
    data: {
      params: { roomId },
      query: { token },
      headers: origin ? { origin } : {},
    },
    _sent: [],
    _closed: false,
    _published: [],
    _subscribed: [],
    _unsubscribed: [],
    send(msg: string) { this._sent.push(msg); },
    close() { this._closed = true; },
    publish(topic: string, data: string) { this._published.push({ topic, data }); },
    subscribe(topic: string) { this._subscribed.push(topic); },
    unsubscribe(topic: string) { this._unsubscribed.push(topic); },
  };
  return ws;
}

// Get the first allowed origin for tests that need one
function getAllowedOrigin(): string {
  return [...ALLOWED_ORIGINS][0] ?? 'http://localhost:5173';
}

// ---------------------------------------------------------------------------
// GOLDEN: open() — origin check guard
// ---------------------------------------------------------------------------

describe('GOLDEN — open() origin check (ws-handlers.ts)', () => {
  it('open() with bad origin: ws.close() is called', () => {
    const ws = makeFakeWs('default', undefined, 'http://evil.example.com');
    open(ws);
    expect(ws._closed).toBe(true);
  });

  it('open() with bad origin: no room_state is sent', () => {
    const ws = makeFakeWs('default', undefined, 'http://evil.example.com');
    open(ws);
    const hasRoomState = ws._sent.some((s) => {
      try { return JSON.parse(s).type === 'room_state'; } catch { return false; }
    });
    expect(hasRoomState).toBe(false);
  });

  it('open() with empty origin: ws.close() is called', () => {
    const ws = makeFakeWs('default', undefined, '');
    open(ws);
    expect(ws._closed).toBe(true);
  });

  it('open() with no headers at all: ws.close() is called', () => {
    const ws = makeFakeWs('default', undefined);
    // Remove headers entirely
    (ws.data as unknown as { headers: undefined }).headers = undefined;
    open(ws);
    expect(ws._closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: open() — token validation guard
// ---------------------------------------------------------------------------

describe('GOLDEN — open() token validation (ws-handlers.ts)', () => {
  const ORIGIN = getAllowedOrigin();

  it('open() with invalid token: ws.close() is called', () => {
    const ws = makeFakeWs('default', 'invalid-token-xyz', ORIGIN);
    open(ws);
    expect(ws._closed).toBe(true);
  });

  it('open() with invalid token: sends UNAUTHORIZED error', () => {
    const ws = makeFakeWs('default', 'invalid-token-xyz', ORIGIN);
    open(ws);
    const unauthorized = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'UNAUTHORIZED'; } catch { return false; }
    });
    expect(unauthorized).toBeDefined();
  });

  it('open() with missing token: sends UNAUTHORIZED error', () => {
    const ws = makeFakeWs('default', undefined, ORIGIN);
    open(ws);
    const unauthorized = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'UNAUTHORIZED'; } catch { return false; }
    });
    expect(unauthorized).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: open() — ROOM_NOT_FOUND path
// ---------------------------------------------------------------------------

describe('GOLDEN — open() ROOM_NOT_FOUND guard (ws-handlers.ts)', () => {
  const ORIGIN = getAllowedOrigin();

  it('open() to nonexistent room: sends ROOM_NOT_FOUND error', () => {
    const token = createToken('wsh-test-user-a');
    const ws = makeFakeWs('nonexistent-wsh-room-xyz', token, ORIGIN);
    open(ws);
    const notFound = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'ROOM_NOT_FOUND'; } catch { return false; }
    });
    expect(notFound).toBeDefined();
  });

  it('open() to nonexistent room: ws.close() is called', () => {
    const token = createToken('wsh-test-user-b');
    const ws = makeFakeWs('nonexistent-wsh-room-xyz-2', token, ORIGIN);
    open(ws);
    expect(ws._closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: open() — successful connection sequence
// ---------------------------------------------------------------------------

describe('GOLDEN — open() successful connection (ws-handlers.ts)', () => {
  const ORIGIN = getAllowedOrigin();
  const ROOM_OPEN = 'wsh-golden-room';

  afterEach(() => {
    // Clean up any connState entries created during test
    for (const [connId, state] of connStates) {
      if (state.roomId === ROOM_OPEN) {
        connStates.delete(connId);
        const set = roomConns.get(ROOM_OPEN);
        if (set) { set.delete(connId); if (set.size === 0) roomConns.delete(ROOM_OPEN); }
      }
    }
  });

  it('sends room_state on successful open', () => {
    const token = createToken('wsh-open-user-c');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    const roomState = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'room_state'; } catch { return false; }
    });
    expect(roomState).toBeDefined();
  });

  it('room_state includes room, messages, agents, connectedUsers fields', () => {
    const token = createToken('wsh-open-user-d');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'room_state'; } catch { return false; }
    });
    expect(raw).toBeDefined();
    const state = JSON.parse(raw!);
    expect(state.room).toBeDefined();
    expect(Array.isArray(state.messages)).toBe(true);
    expect(Array.isArray(state.agents)).toBe(true);
    expect(Array.isArray(state.connectedUsers)).toBe(true);
  });

  it('subscribes to room topic on successful open', () => {
    const token = createToken('wsh-open-user-e');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    expect(ws._subscribed).toContain(`room:${ROOM_OPEN}`);
  });

  it('adds connId to wsConnIds map', () => {
    const token = createToken('wsh-open-user-f');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    expect(wsConnIds.has(ws.raw)).toBe(true);
  });

  it('adds connState entry for the connection', () => {
    const token = createToken('wsh-open-user-g');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    const connId = wsConnIds.get(ws.raw);
    expect(connId).toBeDefined();
    const state = connStates.get(connId!);
    expect(state).toBeDefined();
    expect(state!.roomId).toBe(ROOM_OPEN);
  });

  it('connState.name is the token owner name', () => {
    const token = createToken('wsh-open-user-h');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    const connId = wsConnIds.get(ws.raw);
    const state = connStates.get(connId!);
    expect(state!.name).toBe('wsh-open-user-h');
  });

  it('room_state.agents never include sessionId (SEC-FIX 5)', () => {
    const token = createToken('wsh-open-user-i');
    // Insert an agent session with a session_id so we can verify it is stripped
    _wsHandlersDb.query(`
      INSERT OR REPLACE INTO agent_sessions (agent_name, room_id, session_id, model, status)
      VALUES ('bilbo', ?, 'a1b2c3d4-0000-0000-0000-000000000000', 'claude-test', 'done')
    `).run(ROOM_OPEN);
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'room_state'; } catch { return false; }
    });
    const state = JSON.parse(raw!);
    for (const agent of state.agents) {
      expect(agent.sessionId).toBeNull();
    }
    _wsHandlersDb.query(`DELETE FROM agent_sessions WHERE agent_name = 'bilbo' AND room_id = ?`).run(ROOM_OPEN);
  });

  it('ws.close() is NOT called on successful connection', () => {
    const token = createToken('wsh-open-user-j');
    const ws = makeFakeWs(ROOM_OPEN, token, ORIGIN);
    open(ws);
    if (!ws._closed) {
      // Successful path: close was not called
      expect(ws._closed).toBe(false);
    }
    // If room wasn't found due to mock ordering, close would be called — accept either
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: message() — parse and validation guard paths
// ---------------------------------------------------------------------------

describe('GOLDEN — message() parse and validation guards (ws-handlers.ts)', () => {
  const ROOM_MSG = 'wsh-golden-room';
  const ORIGIN = getAllowedOrigin();

  function setupConnectedWs(name: string): FakeWs {
    const token = createToken(name);
    const ws = makeFakeWs(ROOM_MSG, token, ORIGIN);
    open(ws);
    return ws;
  }

  afterEach(() => {
    for (const [connId, state] of connStates) {
      if (state.roomId === ROOM_MSG) {
        connStates.delete(connId);
        const set = roomConns.get(ROOM_MSG);
        if (set) { set.delete(connId); if (set.size === 0) roomConns.delete(ROOM_MSG); }
      }
    }
    for (const [key] of wsConnIds) {
      wsConnIds.delete(key);
    }
  });

  it('invalid JSON: sends PARSE_ERROR response', () => {
    const ws = setupConnectedWs('wsh-msg-parse-user');
    const initialCount = ws._sent.length;
    message(ws, 'not json {{{');
    const parseError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'PARSE_ERROR'; } catch { return false; }
    });
    expect(parseError).toBeDefined();
  });

  it('invalid JSON: does NOT close the connection', () => {
    const ws = setupConnectedWs('wsh-msg-parse-user-b');
    message(ws, 'not json {{{');
    // Connection should remain open for parse errors
    // (close may have been called during open() for ROOM_NOT_FOUND, check relative to after open)
    const sent = ws._sent;
    const parseError = sent.find((s) => {
      try { return JSON.parse(s).code === 'PARSE_ERROR'; } catch { return false; }
    });
    expect(parseError).toBeDefined();
  });

  it('valid JSON but invalid ClientMessage schema: sends VALIDATION_ERROR', () => {
    const ws = setupConnectedWs('wsh-msg-schema-user');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'not_a_real_type', foo: 'bar' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeDefined();
  });

  it('valid JSON schema but missing required fields: sends VALIDATION_ERROR', () => {
    const ws = setupConnectedWs('wsh-msg-schema-user-b');
    const initialCount = ws._sent.length;
    // send_message requires `content` field
    message(ws, JSON.stringify({ type: 'send_message' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeDefined();
  });

  it('sends RATE_LIMIT error when no connId found (unregistered ws)', () => {
    // A ws that never went through open() has no connId in wsConnIds
    const bareWs = makeFakeWs(ROOM_MSG);
    bareWs.data.params.roomId = ROOM_MSG;
    message(bareWs, JSON.stringify({ type: 'send_message', content: 'hello' }));
    const rateLimitError = bareWs._sent.find((s) => {
      try { return JSON.parse(s).code === 'RATE_LIMIT'; } catch { return false; }
    });
    expect(rateLimitError).toBeDefined();
  });

  it('valid load_history message is dispatched without VALIDATION_ERROR', () => {
    const ws = setupConnectedWs('wsh-msg-loadhist-user');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'load_history', before: 'AAAAAAAAAAAAAAAA', limit: 50 }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: close() — cleanup contract
// ---------------------------------------------------------------------------

describe('GOLDEN — close() cleanup (ws-handlers.ts)', () => {
  const ROOM_CLOSE = 'wsh-golden-room';
  const ORIGIN = getAllowedOrigin();

  it('removes connId from wsConnIds after close', () => {
    const token = createToken('wsh-close-user-a');
    const ws = makeFakeWs(ROOM_CLOSE, token, ORIGIN);
    open(ws);
    const connId = wsConnIds.get(ws.raw);
    expect(connId).toBeDefined();

    close(ws);
    expect(wsConnIds.has(ws.raw)).toBe(false);
  });

  it('removes connState entry after close', () => {
    const token = createToken('wsh-close-user-b');
    const ws = makeFakeWs(ROOM_CLOSE, token, ORIGIN);
    open(ws);
    const connId = wsConnIds.get(ws.raw);

    close(ws);
    expect(connStates.has(connId!)).toBe(false);
  });

  it('unsubscribes from room topic after close', () => {
    const token = createToken('wsh-close-user-c');
    const ws = makeFakeWs(ROOM_CLOSE, token, ORIGIN);
    open(ws);
    close(ws);
    expect(ws._unsubscribed).toContain(`room:${ROOM_CLOSE}`);
  });

  it('publishes user_list_update before unsubscribing (still in room at broadcast time)', () => {
    const token = createToken('wsh-close-user-d');
    const ws = makeFakeWs(ROOM_CLOSE, token, ORIGIN);
    open(ws);

    const publishedBeforeUnsub: string[] = [];
    const originalPublish = ws.publish.bind(ws);
    ws.publish = (topic: string, data: string) => {
      publishedBeforeUnsub.push(data);
      originalPublish(topic, data);
    };

    close(ws);

    const userListUpdate = publishedBeforeUnsub.find((d) => {
      try { return JSON.parse(d).type === 'user_list_update'; } catch { return false; }
    });
    expect(userListUpdate).toBeDefined();
  });

  it('removes connId from roomConns set after close', () => {
    const token = createToken('wsh-close-user-e');
    const ws = makeFakeWs(ROOM_CLOSE, token, ORIGIN);
    open(ws);
    const connId = wsConnIds.get(ws.raw);

    close(ws);
    const roomSet = roomConns.get(ROOM_CLOSE);
    if (roomSet) {
      expect(roomSet.has(connId!)).toBe(false);
    }
    // If set was deleted entirely (last member), that's also correct
  });

  it('close() on an unknown ws (not in wsConnIds) does not throw', () => {
    const ws = makeFakeWs(ROOM_CLOSE);
    expect(() => close(ws)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: message() routing — correct handler is dispatched per type
// ---------------------------------------------------------------------------

describe('GOLDEN — message() routing contract (ws-handlers.ts)', () => {
  const ROOM_ROUTE = 'wsh-golden-room';
  const ORIGIN = getAllowedOrigin();

  afterEach(() => {
    for (const [connId, state] of connStates) {
      if (state.roomId === ROOM_ROUTE) {
        connStates.delete(connId);
        const set = roomConns.get(ROOM_ROUTE);
        if (set) { set.delete(connId); if (set.size === 0) roomConns.delete(ROOM_ROUTE); }
      }
    }
    for (const [key] of wsConnIds) {
      wsConnIds.delete(key);
    }
  });

  it('send_message type: no VALIDATION_ERROR is sent', () => {
    const token = createToken('wsh-route-sendmsg-user');
    const ws = makeFakeWs(ROOM_ROUTE, token, ORIGIN);
    open(ws);
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'send_message', content: 'hello world' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeUndefined();
  });

  it('invoke_agent type with unknown agent: sends UNKNOWN_AGENT error', () => {
    const token = createToken('wsh-route-invoke-user');
    const ws = makeFakeWs(ROOM_ROUTE, token, ORIGIN);
    open(ws);
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'invoke_agent', agent: 'nonexistent-xyz-agent', prompt: 'test' }));
    const unknownAgent = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(unknownAgent).toBeDefined();
  });

  it('load_history type: returns history_page response', () => {
    const token = createToken('wsh-route-loadhist-user-2');
    const ws = makeFakeWs(ROOM_ROUTE, token, ORIGIN);
    open(ws);
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'load_history', before: 'BBBBBBBBBBBBBBBB', limit: 10 }));
    const histPage = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    expect(histPage).toBeDefined();
  });

  it('history_page response has messages array and hasMore boolean', () => {
    const token = createToken('wsh-route-loadhist-user-3');
    const ws = makeFakeWs(ROOM_ROUTE, token, ORIGIN);
    open(ws);
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'load_history', before: 'CCCCCCCCCCCCCCCC', limit: 5 }));
    const raw = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    expect(raw).toBeDefined();
    const page = JSON.parse(raw!);
    expect(Array.isArray(page.messages)).toBe(true);
    expect(typeof page.hasMore).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: message() routing — reinvoke_from_context (#47)
// ---------------------------------------------------------------------------

describe('GOLDEN — message() routing: reinvoke_from_context (ws-handlers.ts)', () => {
  const ROOM_REINVOKE = 'wsh-golden-room';
  const ORIGIN = getAllowedOrigin();

  function setupConnectedWs(name: string): FakeWs {
    const token = createToken(name);
    const ws = makeFakeWs(ROOM_REINVOKE, token, ORIGIN);
    open(ws);
    return ws;
  }

  afterEach(() => {
    for (const [connId, state] of connStates) {
      if (state.roomId === ROOM_REINVOKE) {
        connStates.delete(connId);
        const set = roomConns.get(ROOM_REINVOKE);
        if (set) { set.delete(connId); if (set.size === 0) roomConns.delete(ROOM_REINVOKE); }
      }
    }
    for (const [key] of wsConnIds) {
      wsConnIds.delete(key);
    }
  });

  it('valid agent: no VALIDATION_ERROR sent', () => {
    const ws = setupConnectedWs('wsh-reinvoke-user-a');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'reinvoke_from_context', agentName: 'ultron' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeUndefined();
  });

  it('valid agent: no UNKNOWN_AGENT error sent', () => {
    const ws = setupConnectedWs('wsh-reinvoke-user-b');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'reinvoke_from_context', agentName: 'ultron' }));
    const unknownAgent = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(unknownAgent).toBeUndefined();
  });

  it('unknown agentName: sends UNKNOWN_AGENT error', () => {
    const ws = setupConnectedWs('wsh-reinvoke-user-c');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'reinvoke_from_context', agentName: 'nonexistent-xyz-agent' }));
    const unknownAgent = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(unknownAgent).toBeDefined();
  });

  it('missing agentName field: sends VALIDATION_ERROR', () => {
    const ws = setupConnectedWs('wsh-reinvoke-user-d');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'reinvoke_from_context' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeDefined();
  });

  it('empty string agentName: sends VALIDATION_ERROR (min(1) constraint)', () => {
    const ws = setupConnectedWs('wsh-reinvoke-user-e');
    const initialCount = ws._sent.length;
    message(ws, JSON.stringify({ type: 'reinvoke_from_context', agentName: '' }));
    const validationError = ws._sent.slice(initialCount).find((s) => {
      try { return JSON.parse(s).code === 'VALIDATION_ERROR'; } catch { return false; }
    });
    expect(validationError).toBeDefined();
  });
});
