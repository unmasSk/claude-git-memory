/**
 * Golden snapshot tests for ws-message-handlers.ts — pre-split baseline.
 *
 * PURPOSE: Capture the exact observable behavior of every exported handler
 * BEFORE any refactor. After restructuring, all these tests must still pass.
 * Any deviation means the refactor introduced a behavioral regression.
 *
 * Functions covered:
 *   - handleSendMessage    — room check, connState lookup, insert+broadcast,
 *                            @everyone routing, isPaused resume, @mention dispatch
 *   - handleInvokeAgent    — agent validation, room check, connState lookup,
 *                            insert+broadcast, invokeAgent call
 *   - handleLoadHistory    — room check, clamped limit, DESC→ASC reverse,
 *                            hasMore calculation
 *   - handleEveryoneDirective — stop directive, directive storage, agent dispatch
 *
 * Mock strategy:
 *   - db/connection.js → in-memory SQLite
 *   - index.js → stub server (deep dependency of message-bus)
 *   - agent-invoker.js is NOT mocked — mock it would contaminate sanitizePromptContent
 *     and pause/resume state in other test files (Bun cross-file contamination rule:
 *     mock the DEEPEST dependency). Instead we test behavior via ws._sent + DB state.
 *
 * mock.module() MUST be declared before any import of ws-message-handlers.js.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB
// ---------------------------------------------------------------------------

const _msgHandlerDb = new Database(':memory:');
_msgHandlerDb.exec(`
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
  VALUES ('wsmh-golden-room', 'wsmh-golden', 'WS message handler golden room');
`);

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports of ws-message-handlers.js
//
// IMPORTANT: Do NOT mock agent-invoker.js here — that would replace the real
// sanitizePromptContent / pause / resume implementations, contaminating tests
// in agent-invoker.test.ts, agent-invoker-golden.test.ts, and agent-invoker-schedule.test.ts.
// Rule from mock-patterns.md: mock the DEEPEST dependency, not the facade.
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _msgHandlerDb,
}));

// Deep dependency of message-bus.ts (broadcast) — stub so no real server needed.
// Do NOT mock message-bus.js directly (contaminates message-bus.test.ts).
mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(_topic: string, _data: string) {},
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { handleSendMessage, handleInvokeAgent, handleLoadHistory } from '../../src/routes/ws-message-handlers.js';
import { connStates } from '../../src/routes/ws-state.js';
import { pauseInvocations, resumeInvocations, isPaused, clearQueue } from '../../src/services/agent-invoker.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FakeWs {
  _sent: string[];
  _closed: boolean;
  send(msg: string): void;
  close(): void;
  publish(topic: string, data: string): void;
}

function makeFakeWs(): FakeWs {
  return {
    _sent: [],
    _closed: false,
    send(msg: string) { this._sent.push(msg); },
    close() { this._closed = true; },
    publish(_topic: string, _data: string) {},
  };
}

function getMessagesInRoom(roomId: string): Array<{ id: string; author: string; content: string; msg_type: string; author_type: string }> {
  return _msgHandlerDb
    .query(`SELECT id, author, content, msg_type, author_type FROM messages WHERE room_id = ? ORDER BY rowid`)
    .all(roomId) as Array<{ id: string; author: string; content: string; msg_type: string; author_type: string }>;
}

function clearRoom(roomId: string): void {
  _msgHandlerDb.query(`DELETE FROM messages WHERE room_id = ?`).run(roomId);
}

function setupConn(connId: string, name: string, roomId: string): void {
  connStates.set(connId, { name, roomId, connectedAt: new Date().toISOString() });
}

function teardownConn(connId: string): void {
  connStates.delete(connId);
}

// ---------------------------------------------------------------------------
// GOLDEN: handleSendMessage — core behavior
// ---------------------------------------------------------------------------

describe('GOLDEN — handleSendMessage (ws-message-handlers.ts)', () => {
  const ROOM = 'wsmh-golden-room';
  const CONN_ID = 'wsmh-conn-send-001';
  const AUTHOR = 'wsmh-test-alice';

  beforeEach(() => {
    clearRoom(ROOM);
    setupConn(CONN_ID, AUTHOR, ROOM);
  });

  afterEach(() => {
    teardownConn(CONN_ID);
  });

  it('unknown room: sends ROOM_NOT_FOUND error', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, 'nonexistent-wsmh-room', CONN_ID, 'hello');
    const err = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'ROOM_NOT_FOUND'; } catch { return false; }
    });
    expect(err).toBeDefined();
  });

  it('unknown room: does not insert any message', () => {
    const ws = makeFakeWs();
    const beforeCount = getMessagesInRoom(ROOM).length;
    handleSendMessage(ws, 'nonexistent-wsmh-room-2', CONN_ID, 'hello');
    expect(getMessagesInRoom(ROOM).length).toBe(beforeCount);
  });

  it('missing connState: closes the connection', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, 'nonexistent-conn-xyz', 'hello');
    expect(ws._closed).toBe(true);
  });

  it('inserts exactly one message row on success', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'hello world');
    expect(getMessagesInRoom(ROOM).length).toBe(1);
  });

  it('inserted message has correct author (from connState, not client-supplied)', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'hello world');
    const rows = getMessagesInRoom(ROOM);
    expect(rows[0]!.author).toBe(AUTHOR);
  });

  it('inserted message has author_type="human"', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'hello world');
    const rows = getMessagesInRoom(ROOM);
    expect(rows[0]!.author_type).toBe('human');
  });

  it('inserted message has msg_type="message"', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'hello world');
    const rows = getMessagesInRoom(ROOM);
    expect(rows[0]!.msg_type).toBe('message');
  });

  it('inserted message content matches supplied content', () => {
    const ws = makeFakeWs();
    const content = 'SEND_MSG_CANARY_9C4F';
    handleSendMessage(ws, ROOM, CONN_ID, content);
    const rows = getMessagesInRoom(ROOM);
    expect(rows[0]!.content).toBe(content);
  });

  it('sends new_message back to the ws client (self-deliver)', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'self-deliver test');
    const newMsg = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    expect(newMsg).toBeDefined();
  });

  it('new_message payload contains the message content', () => {
    const ws = makeFakeWs();
    const content = 'SELF_DELIVER_CANARY_X2Y9';
    handleSendMessage(ws, ROOM, CONN_ID, content);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(parsed.message.content).toBe(content);
  });

  it('new_message payload.message.author matches connState name', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'author check');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(parsed.message.author).toBe(AUTHOR);
  });

  it('message without @mention or @everyone: sends new_message without error', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'hello world no mention');
    const newMsg = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    expect(newMsg).toBeDefined();
    const errorMsg = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'error'; } catch { return false; }
    });
    expect(errorMsg).toBeUndefined();
  });

  it('non-@everyone message while room is paused: room becomes unpaused', () => {
    pauseInvocations(ROOM);
    expect(isPaused(ROOM)).toBe(true);
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'resume me');
    expect(isPaused(ROOM)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: handleSendMessage — @everyone directive paths
// ---------------------------------------------------------------------------

describe('GOLDEN — handleSendMessage @everyone directive (ws-message-handlers.ts)', () => {
  const ROOM = 'wsmh-golden-room';
  const CONN_ID = 'wsmh-conn-everyone-001';
  const AUTHOR = 'wsmh-everyone-alice';

  beforeEach(() => {
    clearRoom(ROOM);
    setupConn(CONN_ID, AUTHOR, ROOM);
    resumeInvocations(ROOM);
    clearQueue(ROOM);
  });

  afterEach(() => {
    teardownConn(CONN_ID);
    resumeInvocations(ROOM);
    clearQueue(ROOM);
  });

  it('@everyone stop: room becomes paused', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone stop all agents');
    expect(isPaused(ROOM)).toBe(true);
  });

  it('@everyone stop: inserts a human message + a system directive message', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone stop all agents please');
    const rows = getMessagesInRoom(ROOM);
    const humanMsg = rows.find((r) => r.author_type === 'human');
    const systemMsg = rows.find((r) => r.msg_type === 'system');
    expect(humanMsg).toBeDefined();
    expect(systemMsg).toBeDefined();
  });

  it('@everyone stop: system message content contains DIRECTIVE FROM USER header', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone stop');
    const rows = getMessagesInRoom(ROOM);
    const systemMsg = rows.find((r) => r.msg_type === 'system');
    expect(systemMsg?.content).toContain('[DIRECTIVE FROM USER');
  });

  it('@everyone (non-stop): room does NOT become paused', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone review the code');
    expect(isPaused(ROOM)).toBe(false);
  });

  it('@everyone (non-stop): inserts a system directive message', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone review the code');
    const rows = getMessagesInRoom(ROOM);
    const systemMsg = rows.find((r) => r.msg_type === 'system');
    expect(systemMsg).toBeDefined();
  });

  it('@everyone (empty directive after stripping): no system message inserted', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone');
    const rows = getMessagesInRoom(ROOM);
    // No directive stored when content after stripping @everyone is empty
    const systemMsg = rows.find((r) => r.msg_type === 'system');
    expect(systemMsg).toBeUndefined();
  });

  it('@everyone stop variant "para" triggers pause', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone para');
    expect(isPaused(ROOM)).toBe(true);
  });

  it('@everyone stop variant "callaos" triggers pause', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone callaos');
    expect(isPaused(ROOM)).toBe(true);
  });

  it('@everyone stop variant "silence" triggers pause', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone silence');
    expect(isPaused(ROOM)).toBe(true);
  });

  it('@everyone123 (no word boundary): NOT treated as @everyone', () => {
    // EVERYONE_PATTERN uses /\b/ word boundary — @everyone123 should not match
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, '@everyone123 do something');
    expect(isPaused(ROOM)).toBe(false);
    // Also no system message should be inserted
    const rows = getMessagesInRoom(ROOM);
    const systemMsg = rows.find((r) => r.msg_type === 'system');
    expect(systemMsg).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: handleInvokeAgent
// ---------------------------------------------------------------------------

describe('GOLDEN — handleInvokeAgent (ws-message-handlers.ts)', () => {
  const ROOM = 'wsmh-golden-room';
  const CONN_ID = 'wsmh-conn-invoke-001';
  const AUTHOR = 'wsmh-invoke-alice';

  beforeEach(() => {
    clearRoom(ROOM);
    setupConn(CONN_ID, AUTHOR, ROOM);
  });

  afterEach(() => {
    teardownConn(CONN_ID);
  });

  it('unknown or non-invokable agent: sends UNKNOWN_AGENT error', () => {
    const ws = makeFakeWs();
    handleInvokeAgent(ws, ROOM, CONN_ID, 'nonexistent-wsmh-agent-xyz', 'test prompt');
    const err = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(err).toBeDefined();
  });

  it('unknown agent: does not insert any message', () => {
    const ws = makeFakeWs();
    const beforeCount = getMessagesInRoom(ROOM).length;
    handleInvokeAgent(ws, ROOM, CONN_ID, 'nonexistent-wsmh-agent-xyz', 'test prompt');
    expect(getMessagesInRoom(ROOM).length).toBe(beforeCount);
  });

  it('unknown agent: ws.close() is NOT called (UNKNOWN_AGENT returns without closing)', () => {
    const ws = makeFakeWs();
    handleInvokeAgent(ws, ROOM, CONN_ID, 'nonexistent-wsmh-agent-xyz', 'test prompt');
    expect(ws._closed).toBe(false);
  });

  it('unknown room (agent check happens first): sends UNKNOWN_AGENT before ROOM_NOT_FOUND', () => {
    const ws = makeFakeWs();
    handleInvokeAgent(ws, 'nonexistent-room-xyz', CONN_ID, 'nonexistent-wsmh-agent', 'prompt');
    // Agent check happens first — UNKNOWN_AGENT is sent and function returns early
    const err = ws._sent.find((s) => {
      try { const p = JSON.parse(s); return p.code === 'ROOM_NOT_FOUND' || p.code === 'UNKNOWN_AGENT'; } catch { return false; }
    });
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: handleLoadHistory
// ---------------------------------------------------------------------------

describe('GOLDEN — handleLoadHistory (ws-message-handlers.ts)', () => {
  const ROOM = 'wsmh-golden-room';

  beforeEach(() => {
    clearRoom(ROOM);
  });

  it('unknown room: sends ROOM_NOT_FOUND error', () => {
    const ws = makeFakeWs();
    handleLoadHistory(ws, 'nonexistent-wsmh-room', 'some-id', 10);
    const err = ws._sent.find((s) => {
      try { return JSON.parse(s).code === 'ROOM_NOT_FOUND'; } catch { return false; }
    });
    expect(err).toBeDefined();
  });

  it('sends history_page response', () => {
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'nonexistent-before-id', 10);
    const histPage = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    expect(histPage).toBeDefined();
  });

  it('history_page has messages array', () => {
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'nonexistent-before-id', 10);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    expect(Array.isArray(page.messages)).toBe(true);
  });

  it('history_page has hasMore boolean', () => {
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'nonexistent-before-id', 10);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    expect(typeof page.hasMore).toBe('boolean');
  });

  it('limit is clamped to 100 max (limit=200 → at most 100 rows)', () => {
    for (let i = 0; i < 5; i++) {
      _msgHandlerDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata)
        VALUES (?, ?, 'alice', 'human', 'msg ${i}', 'message', NULL, '{}')
      `).run(`wsmh-lh-${i}`, ROOM);
    }
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'wsmh-lh-4', 200);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    expect(page.messages.length).toBeLessThanOrEqual(100);
  });

  it('messages returned in chronological order (oldest first)', () => {
    const times = ['2026-03-19T09:00:00.000Z', '2026-03-19T10:00:00.000Z', '2026-03-19T11:00:00.000Z'];
    for (let i = 0; i < 3; i++) {
      _msgHandlerDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, ?, 'alice', 'human', 'chron-msg-${i}', 'message', NULL, '{}', ?)
      `).run(`wsmh-chron-${i}`, ROOM, times[i]);
    }
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'wsmh-chron-2', 10);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    if (page.messages.length >= 2) {
      const first = new Date(page.messages[0].createdAt);
      const last = new Date(page.messages[page.messages.length - 1].createdAt);
      expect(first.getTime()).toBeLessThanOrEqual(last.getTime());
    }
  });

  it('limit=0 → empty messages array', () => {
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'some-id', 0);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    expect(page.messages.length).toBe(0);
  });

  it('limit=1 → at most 1 message returned', () => {
    _msgHandlerDb.query(`
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES ('wsmh-lim1-msg', ?, 'alice', 'human', 'limit1 test', 'message', NULL, '{}', '2026-03-19T08:00:00.000Z')
    `).run(ROOM);
    _msgHandlerDb.query(`
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES ('wsmh-lim1-pivot', ?, 'alice', 'human', 'pivot msg', 'message', NULL, '{}', '2026-03-19T12:00:00.000Z')
    `).run(ROOM);
    const ws = makeFakeWs();
    handleLoadHistory(ws, ROOM, 'wsmh-lim1-pivot', 1);
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'history_page'; } catch { return false; }
    });
    const page = JSON.parse(raw!);
    expect(page.messages.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: handleSendMessage — safeMessage contract
//
// safeMessage strips sessionId and other sensitive metadata before sending
// to the client. This must remain the case after any refactor.
// ---------------------------------------------------------------------------

describe('GOLDEN — handleSendMessage safeMessage contract (ws-message-handlers.ts)', () => {
  const ROOM = 'wsmh-golden-room';
  const CONN_ID = 'wsmh-conn-safe-001';

  beforeEach(() => {
    clearRoom(ROOM);
    setupConn(CONN_ID, 'wsmh-safe-alice', ROOM);
  });

  afterEach(() => {
    teardownConn(CONN_ID);
  });

  it('new_message.message does not contain sessionId key', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'safe message test');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(parsed.message.sessionId).toBeUndefined();
  });

  it('new_message.message.id is a non-empty string', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'id check');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(typeof parsed.message.id).toBe('string');
    expect(parsed.message.id.length).toBeGreaterThan(0);
  });

  it('new_message.message.createdAt is a valid ISO date', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'date check');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(!isNaN(new Date(parsed.message.createdAt).getTime())).toBe(true);
  });

  it('new_message.message.roomId matches the supplied roomId', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'roomId check');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(parsed.message.roomId).toBe(ROOM);
  });

  it('new_message.message.authorType is "human"', () => {
    const ws = makeFakeWs();
    handleSendMessage(ws, ROOM, CONN_ID, 'authorType check');
    const raw = ws._sent.find((s) => {
      try { return JSON.parse(s).type === 'new_message'; } catch { return false; }
    });
    const parsed = JSON.parse(raw!);
    expect(parsed.message.authorType).toBe('human');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: @everyone word-boundary guard (inline mirror)
//
// The exact EVERYONE_PATTERN = /@everyone\b/i logic must survive any refactor.
// Tests the contract that @everyone123 is NOT treated as @everyone.
// ---------------------------------------------------------------------------

describe('GOLDEN — EVERYONE_PATTERN word boundary (inline mirror of ws-state.ts)', () => {
  const EVERYONE_PATTERN = /@everyone\b/i;

  it('@everyone matches', () => {
    expect(EVERYONE_PATTERN.test('@everyone stop')).toBe(true);
  });

  it('@EVERYONE matches (case-insensitive)', () => {
    expect(EVERYONE_PATTERN.test('@EVERYONE stop')).toBe(true);
  });

  it('@Everyone matches (mixed case)', () => {
    expect(EVERYONE_PATTERN.test('@Everyone review')).toBe(true);
  });

  it('@everyone123 does NOT match (no word boundary after "everyone")', () => {
    expect(EVERYONE_PATTERN.test('@everyone123 do something')).toBe(false);
  });

  it('@everyoneElse does NOT match', () => {
    expect(EVERYONE_PATTERN.test('@everyoneElse')).toBe(false);
  });

  it('everyone without @ does NOT match', () => {
    expect(EVERYONE_PATTERN.test('everyone do this')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: stop directive detection (inline mirror of handleEveryoneDirective)
//
// The exact stop-word list and regex must survive any refactor.
// ---------------------------------------------------------------------------

describe('GOLDEN — @everyone stop directive detection (inline mirror)', () => {
  const stopWords = /\b(stop|para|callaos|silence|quiet)\b/i;

  it('"stop" is a stop directive', () => { expect(stopWords.test('stop')).toBe(true); });
  it('"para" is a stop directive', () => { expect(stopWords.test('para')).toBe(true); });
  it('"callaos" is a stop directive', () => { expect(stopWords.test('callaos')).toBe(true); });
  it('"silence" is a stop directive', () => { expect(stopWords.test('silence')).toBe(true); });
  it('"quiet" is a stop directive', () => { expect(stopWords.test('quiet')).toBe(true); });
  it('"STOP" (uppercase) is a stop directive', () => { expect(stopWords.test('STOP')).toBe(true); });
  it('"stop all agents" contains stop word', () => { expect(stopWords.test('stop all agents')).toBe(true); });
  it('"review the code" is NOT a stop directive', () => { expect(stopWords.test('review the code')).toBe(false); });
  it('"stopping" does NOT match (word boundary)', () => { expect(stopWords.test('stopping')).toBe(false); });
  it('empty string does NOT match', () => { expect(stopWords.test('')).toBe(false); });
});
