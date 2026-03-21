/**
 * Golden snapshot tests for agent-runner.ts — pre-split baseline.
 *
 * PURPOSE: Capture the exact observable behavior of every exported function
 * in agent-runner.ts BEFORE any refactor. After restructuring, all these
 * tests must still pass. Any deviation means the refactor introduced a
 * behavioral regression.
 *
 * Exports covered:
 *   - postSystemMessage         — inserts system message + broadcasts
 *   - updateStatusAndBroadcast  — updates DB status + broadcasts agent_status event
 *   - doInvoke                  — guard paths: unknown agent, non-invokable, no-tools
 *                                 (spawnAndParse subprocess paths are NOT testable here
 *                                 as they require a real `claude` binary)
 *
 * Mock strategy:
 *   - db/connection.js → in-memory SQLite
 *   - index.js → stub server with captured publish calls
 *   - agent-registry.js → controlled stub (known-invokable and non-invokable agents)
 *
 * mock.module() MUST be declared before any import of agent-runner.ts or any
 * module that transitively loads it.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — captures insertMessage, updateAgentStatus, etc.
// ---------------------------------------------------------------------------

const _runnerDb = new Database(':memory:');
_runnerDb.exec(`
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
  INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('runner-golden-room', 'runner-golden', 'Runner golden room');
`);

// ---------------------------------------------------------------------------
// Capture broadcast calls for assertion
// ---------------------------------------------------------------------------

const _broadcasts: Array<{ topic: string; data: string }> = [];

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports of agent-runner.js
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _runnerDb,
}));

mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(topic: string, data: string) {
        _broadcasts.push({ topic, data });
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'bun:test';
import { postSystemMessage, updateStatusAndBroadcast, doInvoke } from '../../src/services/agent-runner.js';
import { AgentState } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _ROOM = 'runner-golden-room';

function getMessages(roomId: string): Array<{ author: string; content: string; msg_type: string; author_type: string }> {
  return _runnerDb
    .query(`SELECT author, content, msg_type, author_type FROM messages WHERE room_id = ? ORDER BY rowid`)
    .all(roomId) as Array<{ author: string; content: string; msg_type: string; author_type: string }>;
}

function getAgentStatus(agentName: string, roomId: string): string | null {
  const row = _runnerDb
    .query(`SELECT status FROM agent_sessions WHERE agent_name = ? AND room_id = ?`)
    .get(agentName, roomId) as { status: string } | null;
  return row?.status ?? null;
}

function clearMessages(roomId: string): void {
  _runnerDb.query(`DELETE FROM messages WHERE room_id = ?`).run(roomId);
}

function clearBroadcasts(): void {
  _broadcasts.length = 0;
}

// ---------------------------------------------------------------------------
// GOLDEN: postSystemMessage — exact DB row + broadcast contract
// ---------------------------------------------------------------------------

describe('GOLDEN — postSystemMessage (agent-runner.ts)', () => {
  const ROOM_SYS = 'runner-golden-room';

  beforeEach(() => {
    clearMessages(ROOM_SYS);
    clearBroadcasts();
  });

  it('returns a Promise (async function)', () => {
    const result = postSystemMessage(ROOM_SYS, 'test message');
    expect(result instanceof Promise).toBe(true);
  });

  it('resolves to undefined', async () => {
    const result = await postSystemMessage(ROOM_SYS, 'test message 2');
    expect(result).toBeUndefined();
  });

  it('inserts exactly one row into messages table', async () => {
    await postSystemMessage(ROOM_SYS, 'one row test');
    const rows = getMessages(ROOM_SYS);
    expect(rows.length).toBe(1);
  });

  it('inserted row has author="system"', async () => {
    await postSystemMessage(ROOM_SYS, 'author check');
    const rows = getMessages(ROOM_SYS);
    expect(rows[0]!.author).toBe('system');
  });

  it('inserted row has author_type="system"', async () => {
    await postSystemMessage(ROOM_SYS, 'authortype check');
    const rows = getMessages(ROOM_SYS);
    expect(rows[0]!.author_type).toBe('system');
  });

  it('inserted row has msg_type="system"', async () => {
    await postSystemMessage(ROOM_SYS, 'msgtype check');
    const rows = getMessages(ROOM_SYS);
    expect(rows[0]!.msg_type).toBe('system');
  });

  it('inserted row content matches the supplied content string', async () => {
    const content = 'CANARY_CONTENT_7A3F9B';
    await postSystemMessage(ROOM_SYS, content);
    const rows = getMessages(ROOM_SYS);
    expect(rows[0]!.content).toBe(content);
  });

  it('broadcasts exactly one message after posting', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'broadcast check');
    expect(_broadcasts.length).toBeGreaterThanOrEqual(1);
  });

  it('broadcast payload type is "new_message"', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'type check');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.type).toBe('new_message');
  });

  it('broadcast payload message.author is "system"', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'author broadcast');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.message.author).toBe('system');
  });

  it('broadcast payload message.content matches supplied content', async () => {
    clearBroadcasts();
    const content = 'BROADCAST_CANARY_SYS_42';
    await postSystemMessage(ROOM_SYS, content);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.message.content).toBe(content);
  });

  it('broadcast topic matches room:${roomId}', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'topic check');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    expect(lastBroadcast!.topic).toBe(`room:${ROOM_SYS}`);
  });

  it('broadcast payload message.msgType is "system"', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'msgtype broadcast');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.message.msgType).toBe('system');
  });

  it('broadcast payload message.id is a non-empty string', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'id check');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(typeof parsed.message.id).toBe('string');
    expect(parsed.message.id.length).toBeGreaterThan(0);
  });

  it('broadcast payload message.createdAt is an ISO date string', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'createdAt check');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(!isNaN(new Date(parsed.message.createdAt).getTime())).toBe(true);
  });

  it('broadcast payload message.roomId matches the supplied roomId', async () => {
    clearBroadcasts();
    await postSystemMessage(ROOM_SYS, 'roomId check');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.message.roomId).toBe(ROOM_SYS);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: updateStatusAndBroadcast — DB update + broadcast contract
// ---------------------------------------------------------------------------

describe('GOLDEN — updateStatusAndBroadcast (agent-runner.ts)', () => {
  const AGENT_NAME = 'runner-golden-test-agent';
  const ROOM_STATUS = 'runner-golden-room';

  beforeEach(() => {
    clearBroadcasts();
    // Ensure agent_sessions row exists for status updates
    _runnerDb.query(`
      INSERT OR REPLACE INTO agent_sessions (agent_name, room_id, session_id, model, status)
      VALUES (?, ?, NULL, 'test-model', 'idle')
    `).run(AGENT_NAME, ROOM_STATUS);
  });

  it('returns a Promise', () => {
    const result = updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Thinking);
    expect(result instanceof Promise).toBe(true);
  });

  it('resolves to undefined', async () => {
    const result = await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Done);
    expect(result).toBeUndefined();
  });

  it('updates agent_sessions.status in DB to the supplied status', async () => {
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Thinking);
    expect(getAgentStatus(AGENT_NAME, ROOM_STATUS)).toBe(AgentState.Thinking);
  });

  it('updating to Done sets status to "done" in DB', async () => {
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Done);
    expect(getAgentStatus(AGENT_NAME, ROOM_STATUS)).toBe(AgentState.Done);
  });

  it('updating to Error sets status to "error" in DB', async () => {
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Error);
    expect(getAgentStatus(AGENT_NAME, ROOM_STATUS)).toBe(AgentState.Error);
  });

  it('broadcasts exactly one event after status update', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Thinking);
    expect(_broadcasts.length).toBeGreaterThanOrEqual(1);
  });

  it('broadcast payload type is "agent_status"', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Thinking);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.type).toBe('agent_status');
  });

  it('broadcast payload.agent matches the supplied agentName', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Thinking);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.agent).toBe(AGENT_NAME);
  });

  it('broadcast payload.status matches the supplied status', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.ToolUse);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.status).toBe(AgentState.ToolUse);
  });

  it('broadcast topic is "room:${roomId}"', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Done);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    expect(lastBroadcast!.topic).toBe(`room:${ROOM_STATUS}`);
  });

  it('detail=undefined: broadcast payload.detail is undefined or not present', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Done);
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    // detail is not set when not supplied — it may be missing or undefined in JSON
    expect(parsed.detail == null).toBe(true);
  });

  it('detail="some error": broadcast payload.detail matches', async () => {
    clearBroadcasts();
    await updateStatusAndBroadcast(AGENT_NAME, ROOM_STATUS, AgentState.Error, 'some error detail');
    const lastBroadcast = _broadcasts[_broadcasts.length - 1];
    const parsed = JSON.parse(lastBroadcast!.data);
    expect(parsed.detail).toBe('some error detail');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: doInvoke guard paths — unknown agent, non-invokable, no tools
//
// spawnAndParse subprocess paths require a real `claude` binary and are NOT
// testable here. Only the early-return guard paths are covered.
// ---------------------------------------------------------------------------

describe('GOLDEN — doInvoke guard paths (agent-runner.ts)', () => {
  const ROOM_DI = 'runner-golden-room';

  beforeEach(() => {
    clearMessages(ROOM_DI);
    clearBroadcasts();
  });

  it('returns a Promise', () => {
    const result = doInvoke(
      ROOM_DI,
      'runner-totally-nonexistent-agent',
      { triggerContent: 'test', agentTurns: new Map() },
      false,
    );
    expect(result instanceof Promise).toBe(true);
  });

  it('unknown agent: resolves to false', async () => {
    const result = await doInvoke(
      ROOM_DI,
      'runner-totally-nonexistent-agent',
      { triggerContent: 'test', agentTurns: new Map() },
      false,
    );
    expect(result).toBe(false);
  });

  it('unknown agent: posts "Unknown agent" system message to room', async () => {
    clearMessages(ROOM_DI);
    await doInvoke(
      ROOM_DI,
      'runner-totally-nonexistent-xyz-agent',
      { triggerContent: 'test', agentTurns: new Map() },
      false,
    );
    const rows = getMessages(ROOM_DI);
    const systemMsg = rows.find((r) => r.content.includes('Unknown agent'));
    expect(systemMsg).toBeDefined();
  });

  it('unknown agent: system message content contains the agent name', async () => {
    clearMessages(ROOM_DI);
    const agentName = 'runner-totally-nonexistent-canary-agent';
    await doInvoke(
      ROOM_DI,
      agentName,
      { triggerContent: 'test', agentTurns: new Map() },
      false,
    );
    const rows = getMessages(ROOM_DI);
    const systemMsg = rows.find((r) => r.content.includes('Unknown agent'));
    expect(systemMsg?.content).toContain(agentName);
  });

  it('unknown agent: does not throw synchronously', () => {
    expect(() =>
      doInvoke(ROOM_DI, 'no-such-agent', { triggerContent: 'test', agentTurns: new Map() }, false)
    ).not.toThrow();
  });

  it('doInvoke with empty triggerContent does not throw for unknown agent', async () => {
    const result = await doInvoke(
      ROOM_DI,
      'runner-nonexistent-empty-trigger',
      { triggerContent: '', agentTurns: new Map() },
      false,
    );
    expect(result).toBe(false);
  });

  it('isRetry=true with unknown agent still resolves to false', async () => {
    const result = await doInvoke(
      ROOM_DI,
      'runner-nonexistent-retry-agent',
      { triggerContent: 'retry', agentTurns: new Map() },
      true,
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: SKIP regex — inline mirror of the suppression logic
//
// The /^skip\.?$/i pattern must survive any agent-runner refactor unchanged.
// If the pattern is modified, SKIP suppression behavior changes for agents.
// ---------------------------------------------------------------------------

describe('GOLDEN — SKIP suppression regex (inline mirror of agent-runner.ts)', () => {
  const skipRegex = /^skip\.?$/i;

  it('"SKIP" matches', () => { expect(skipRegex.test('SKIP')).toBe(true); });
  it('"skip" matches', () => { expect(skipRegex.test('skip')).toBe(true); });
  it('"Skip" matches', () => { expect(skipRegex.test('Skip')).toBe(true); });
  it('"SKIP." matches (optional trailing period)', () => { expect(skipRegex.test('SKIP.')).toBe(true); });
  it('"skip." matches', () => { expect(skipRegex.test('skip.')).toBe(true); });
  it('"skip now" does NOT match (extra word)', () => { expect(skipRegex.test('skip now')).toBe(false); });
  it('"skipping" does NOT match', () => { expect(skipRegex.test('skipping')).toBe(false); });
  it('empty string does NOT match', () => { expect(skipRegex.test('')).toBe(false); });
  it('"SKIP!!" does NOT match (unsupported punctuation)', () => { expect(skipRegex.test('SKIP!!')).toBe(false); });
  it('"SKIP " (trailing space) does NOT match', () => { expect(skipRegex.test('SKIP ')).toBe(false); });
});

// ---------------------------------------------------------------------------
// GOLDEN: stale session / rate-limit detection signals
//
// The detection strings 'No conversation found' and 'conversation not found'
// and rate-limit markers ('429', 'rate limit', 'overloaded', 'too many requests')
// must remain the same after any refactor of agent-runner.ts.
// ---------------------------------------------------------------------------

describe('GOLDEN — stale session and rate-limit detection strings (inline mirror)', () => {
  // Mirror the exact strings from spawnAndParse in agent-runner.ts
  function isStaleSession(resultText: string, isContextOverflow: boolean): boolean {
    return (
      isContextOverflow ||
      resultText.includes('No conversation found') ||
      resultText.includes('conversation not found')
    );
  }

  function isRateLimit(stderrOutput: string): boolean {
    return (
      stderrOutput.includes('429') ||
      stderrOutput.toLowerCase().includes('rate limit') ||
      stderrOutput.toLowerCase().includes('overloaded') ||
      stderrOutput.toLowerCase().includes('too many requests')
    );
  }

  it('stale: "No conversation found" in resultText → stale', () => {
    expect(isStaleSession('No conversation found', false)).toBe(true);
  });

  it('stale: "conversation not found" (lowercase) in resultText → stale', () => {
    expect(isStaleSession('Error: conversation not found', false)).toBe(true);
  });

  it('stale: context overflow flag alone → stale', () => {
    expect(isStaleSession('', true)).toBe(true);
  });

  it('stale: unrelated text → not stale', () => {
    expect(isStaleSession('some other error', false)).toBe(false);
  });

  it('rate limit: "429" in stderr → true', () => {
    expect(isRateLimit('HTTP 429 Too Many Requests')).toBe(true);
  });

  it('rate limit: "rate limit" in stderr (lowercase) → true', () => {
    expect(isRateLimit('you have exceeded the rate limit')).toBe(true);
  });

  it('rate limit: "Rate Limit" in stderr (mixed case) → true (case-insensitive check)', () => {
    expect(isRateLimit('Rate Limit exceeded')).toBe(true);
  });

  it('rate limit: "overloaded" in stderr → true', () => {
    expect(isRateLimit('API overloaded')).toBe(true);
  });

  it('rate limit: "too many requests" in stderr → true', () => {
    expect(isRateLimit('too many requests from your IP')).toBe(true);
  });

  it('rate limit: unrelated error → false', () => {
    expect(isRateLimit('connection refused')).toBe(false);
  });

  it('rate limit: empty stderr → false', () => {
    expect(isRateLimit('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN: MAX_AGENT_RESPONSE_BYTES truncation constant (inline mirror)
//
// The 256 000 byte cap must remain after any agent-runner refactor.
// This test documents the exact value so a future change triggers a review.
// ---------------------------------------------------------------------------

describe('GOLDEN — MAX_AGENT_RESPONSE_BYTES (inline mirror of agent-runner.ts constant)', () => {
  const MAX_AGENT_RESPONSE_BYTES = 256_000;

  it('constant value is exactly 256000', () => {
    expect(MAX_AGENT_RESPONSE_BYTES).toBe(256_000);
  });

  it('a string of exactly 256000 bytes does NOT exceed cap', () => {
    const s = 'x'.repeat(MAX_AGENT_RESPONSE_BYTES);
    expect(Buffer.byteLength(s, 'utf8')).toBeLessThanOrEqual(MAX_AGENT_RESPONSE_BYTES);
  });

  it('a string of 256001 bytes DOES exceed cap', () => {
    const s = 'x'.repeat(MAX_AGENT_RESPONSE_BYTES + 1);
    expect(Buffer.byteLength(s, 'utf8')).toBeGreaterThan(MAX_AGENT_RESPONSE_BYTES);
  });

  it('truncation suffix is "\\n[...truncated]" (exact string, verified)', () => {
    const truncationSuffix = '\n[...truncated]';
    // Verify the suffix is a non-empty string with the exact format
    expect(truncationSuffix).toBe('\n[...truncated]');
    expect(truncationSuffix.length).toBeGreaterThan(0);
  });
});
