/**
 * Regression tests for handleFailedResult — context overflow path (#47).
 *
 * Verifies that when CONTEXT_OVERFLOW_SIGNAL ('prompt is too long') appears in the
 * agent stream output, the handler:
 *   - Clears the agent session (session_id = NULL in DB)
 *   - Sets agent status to 'out' in DB
 *   - Posts a warning system message to the room
 *   - Returns false (no stale-session auto-retry scheduled)
 *   - Overflow is detected BEFORE the kill guard — cleared session + Out status
 *     take priority over kill flag suppression
 *
 * Mock strategy (matches kill-guard pattern — no agent-runner/message-bus mocks):
 *   - db/connection.js → in-memory SQLite
 *   - index.js → stub server (publish is no-op)
 *   - agent-runner.js and message-bus.js are NOT mocked to avoid global test pollution
 *     in Bun 1.3.11. Assertions use DB state (session_id, status, messages) + return value.
 *
 * mock.module() MUST be declared before any import of agent-result.js.
 */
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — satisfies transitive imports of db/connection.js
// ---------------------------------------------------------------------------

const _overflowDb = new Database(':memory:');
_overflowDb.exec(`
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
    VALUES ('overflow-room', 'overflow', 'Context overflow test room');
`);

// ---------------------------------------------------------------------------
// mock.module() declarations — MUST precede all imports of agent-result.js
// Safe mocks only: db/connection.js and index.js are not used by other tests
// for real behavior. agent-runner.js and message-bus.js are intentionally
// NOT mocked here — they would leak into other test files in Bun 1.3.11.
// ---------------------------------------------------------------------------

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _overflowDb,
}));

// Capture published broadcasts so tests can assert on context_overflow events.
const _publishedEvents: Array<{ topic: string; data: string }> = [];

mock.module('../../src/index.js', () => ({
  app: {
    server: {
      publish(topic: string, data: string) {
        _publishedEvents.push({ topic, data });
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports AFTER all mock.module() declarations
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'bun:test';
import { handleFailedResult } from '../../src/services/agent-result.js';
import { clearKilledAgent } from '../../src/services/agent-queue.js';
import type { AgentStreamResult } from '../../src/services/agent-stream.js';

// CONTEXT_OVERFLOW_SIGNAL = 'prompt is too long' (agent-prompt.ts:47)
const OVERFLOW_SIGNAL = 'prompt is too long';
const ROOM = 'overflow-room';
const MODEL = 'claude-sonnet-4-6';

function makeSr(overrides: Partial<AgentStreamResult> = {}): AgentStreamResult {
  return {
    resultText: '',
    stderrOutput: '',
    resultSessionId: 'sess-overflow-abc-def',
    resultCostUsd: 0,
    resultSuccess: false,
    resultDurationMs: 100,
    resultNumTurns: 3,
    resultInputTokens: 5000,
    resultOutputTokens: 0,
    resultContextWindow: 200_000,
    hasResult: true,
    ...overrides,
  };
}

function makeContext() {
  return { triggerContent: 'test trigger', agentTurns: new Map<string, number>() };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function seedSession(agentName: string, sessionId: string, status = 'thinking'): void {
  _overflowDb.run(
    `INSERT OR REPLACE INTO agent_sessions (agent_name, room_id, session_id, model, status)
     VALUES (?, ?, ?, ?, ?)`,
    [agentName, ROOM, sessionId, MODEL, status],
  );
}

function getSessionId(agentName: string): string | null {
  const row = _overflowDb
    .query<{ session_id: string | null }, [string, string]>(
      `SELECT session_id FROM agent_sessions WHERE agent_name = ? AND room_id = ?`,
    )
    .get(agentName, ROOM);
  return row?.session_id ?? null;
}

function getAgentStatus(agentName: string): string | null {
  const row = _overflowDb
    .query<{ status: string }, [string, string]>(
      `SELECT status FROM agent_sessions WHERE agent_name = ? AND room_id = ?`,
    )
    .get(agentName, ROOM);
  return row?.status ?? null;
}

function countSystemMessages(substring: string): number {
  const row = _overflowDb
    .query<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND msg_type = 'system' AND content LIKE ?`,
    )
    .get(ROOM, `%${substring}%`);
  return row?.count ?? 0;
}

function getLastSystemMessage(): string | null {
  const row = _overflowDb
    .query<{ content: string }, [string]>(
      `SELECT content FROM messages WHERE room_id = ? AND msg_type = 'system' ORDER BY created_at DESC LIMIT 1`,
    )
    .get(ROOM);
  return row?.content ?? null;
}

// ---------------------------------------------------------------------------
// Reset DB before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  _overflowDb.run(`DELETE FROM agent_sessions WHERE room_id = ?`, [ROOM]);
  _overflowDb.run(`DELETE FROM messages WHERE room_id = ?`, [ROOM]);
  _publishedEvents.length = 0;
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: return value contract
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: return value (agent-result.ts)', () => {
  it('returns false when CONTEXT_OVERFLOW_SIGNAL is in resultText', async () => {
    const result = await handleFailedResult(
      makeSr({ resultText: `Error: ${OVERFLOW_SIGNAL} exceeded` }),
      ROOM, 'ultron', makeContext() as any,
    );
    expect(result).toBe(false);
  });

  it('returns false when CONTEXT_OVERFLOW_SIGNAL is in stderrOutput', async () => {
    const result = await handleFailedResult(
      makeSr({ stderrOutput: OVERFLOW_SIGNAL }),
      ROOM, 'dante', makeContext() as any,
    );
    expect(result).toBe(false);
  });

  it('returns false when signal appears in mixed-case stderrOutput (case-insensitive)', async () => {
    const result = await handleFailedResult(
      makeSr({ stderrOutput: 'PROMPT IS TOO LONG — max context reached' }),
      ROOM, 'cerberus', makeContext() as any,
    );
    expect(result).toBe(false);
  });

  it('does NOT return false from overflow path when signal is absent', async () => {
    // With a plain error (no overflow signal), the function should also return false
    // but via the normal failure path — NOT the overflow path.
    // We verify no overflow-specific side effects occur (no 'context' system message).
    seedSession('argus', 'sess-normal-fail', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: 'some unrelated error', stderrOutput: 'exit code 1' }),
      ROOM, 'argus', makeContext() as any,
    );
    expect(countSystemMessages('context')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: session cleared
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: session cleared (agent-result.ts)', () => {
  it('sets session_id to NULL when overflow detected via resultText', async () => {
    seedSession('bilbo', 'sess-to-be-cleared');
    await handleFailedResult(
      makeSr({ resultText: `Agent failed: ${OVERFLOW_SIGNAL}` }),
      ROOM, 'bilbo', makeContext() as any,
    );
    expect(getSessionId('bilbo')).toBeNull();
  });

  it('sets session_id to NULL when overflow detected via stderrOutput', async () => {
    seedSession('house', 'sess-stderr-overflow');
    await handleFailedResult(
      makeSr({ stderrOutput: OVERFLOW_SIGNAL }),
      ROOM, 'house', makeContext() as any,
    );
    expect(getSessionId('house')).toBeNull();
  });

  it('does NOT clear session when signal is absent', async () => {
    seedSession('moriarty', 'sess-should-stay', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: 'some error unrelated to overflow' }),
      ROOM, 'moriarty', makeContext() as any,
    );
    // The session_id should not have been cleared by the overflow path
    // (normal failure path does not call clearAgentSession)
    expect(getSessionId('moriarty')).not.toBeNull();
    expect(getSessionId('moriarty')).toBe('sess-should-stay');
  });
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: agent status
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: agent status (agent-result.ts)', () => {
  it('sets agent status to out after context overflow', async () => {
    seedSession('yoda', 'sess-status-check', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'yoda', makeContext() as any,
    );
    expect(getAgentStatus('yoda')).toBe('out');
  });

  it('does NOT set status to error from overflow path', async () => {
    seedSession('alexandria', 'sess-no-error-status', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'alexandria', makeContext() as any,
    );
    expect(getAgentStatus('alexandria')).not.toBe('error');
  });
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: system message
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: system message (agent-result.ts)', () => {
  it('posts a warning system message to the room', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'gitto', makeContext() as any,
    );
    expect(countSystemMessages('context')).toBeGreaterThan(0);
  });

  it('system message includes the agent name (capitalized)', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'bilbo', makeContext() as any,
    );
    const msg = getLastSystemMessage();
    expect(msg?.toLowerCase()).toContain('bilbo');
  });

  it('does not post a context overflow warning when signal is absent', async () => {
    seedSession('ultron', 'sess-no-warn', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: 'error: something else went wrong' }),
      ROOM, 'ultron', makeContext() as any,
    );
    expect(countSystemMessages('context')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: interaction with kill guard
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: kill guard priority (agent-result.ts)', () => {
  it('overflow path runs before kill guard — session cleared even when agent is marked killed', async () => {
    // Context overflow is detected before isAgentKilled. Even if the agent was killed
    // during context recovery, the overflow path takes priority.
    seedSession('gitto', 'sess-killed-overflow', 'thinking');
    const { markAgentKilled } = await import('../../src/services/agent-queue.js');
    markAgentKilled('gitto', ROOM);

    try {
      await handleFailedResult(
        makeSr({ resultText: OVERFLOW_SIGNAL }),
        ROOM, 'gitto', makeContext() as any,
      );
      // Overflow was detected before kill guard — session should be cleared
      expect(getSessionId('gitto')).toBeNull();
      // Warning message was posted (not suppressed by kill guard)
      expect(countSystemMessages('context')).toBeGreaterThan(0);
    } finally {
      clearKilledAgent('gitto', ROOM);
    }
  });
});

// ---------------------------------------------------------------------------
// OVERFLOW PATH: context_overflow broadcast event
// ---------------------------------------------------------------------------

describe('handleFailedResult — context overflow: context_overflow broadcast (agent-result.ts)', () => {
  it('broadcasts a context_overflow event when overflow is detected via resultText', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'ultron', makeContext() as any,
    );
    const overflowEvent = _publishedEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowEvent).toBeDefined();
  });

  it('context_overflow event carries the correct agentName', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'cerberus', makeContext() as any,
    );
    const overflowRaw = _publishedEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowRaw).toBeDefined();
    const event = JSON.parse(overflowRaw!.data);
    expect(event.agentName).toBe('cerberus');
  });

  it('context_overflow event is published to the correct room topic', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'argus', makeContext() as any,
    );
    const overflowEvent = _publishedEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowEvent).toBeDefined();
    expect(overflowEvent!.topic).toBe(`room:${ROOM}`);
  });

  it('broadcasts context_overflow when signal is detected via stderrOutput', async () => {
    await handleFailedResult(
      makeSr({ stderrOutput: OVERFLOW_SIGNAL }),
      ROOM, 'dante', makeContext() as any,
    );
    const overflowEvent = _publishedEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowEvent).toBeDefined();
    const event = JSON.parse(overflowEvent!.data);
    expect(event.agentName).toBe('dante');
  });

  it('does NOT broadcast context_overflow when signal is absent', async () => {
    seedSession('moriarty', 'sess-no-broadcast', 'thinking');
    await handleFailedResult(
      makeSr({ resultText: 'unrelated error, not an overflow' }),
      ROOM, 'moriarty', makeContext() as any,
    );
    const overflowEvent = _publishedEvents.find((e) => {
      try { return JSON.parse(e.data).type === 'context_overflow'; } catch { return false; }
    });
    expect(overflowEvent).toBeUndefined();
  });

  it('also broadcasts agent_status Out before the context_overflow event', async () => {
    await handleFailedResult(
      makeSr({ resultText: OVERFLOW_SIGNAL }),
      ROOM, 'house', makeContext() as any,
    );
    const types = _publishedEvents.map((e) => {
      try { return JSON.parse(e.data).type; } catch { return null; }
    });
    expect(types).toContain('agent_status');
    expect(types).toContain('context_overflow');
    // agent_status (Out) must be published before context_overflow
    const statusIdx = types.indexOf('agent_status');
    const overflowIdx = types.indexOf('context_overflow');
    expect(statusIdx).toBeLessThan(overflowIdx);
  });
});
