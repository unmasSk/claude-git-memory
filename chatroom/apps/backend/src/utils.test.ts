import { describe, it, expect } from 'bun:test';
import { generateId, nowIso, mapMessageRow, mapAgentSessionRow, mapRoomRow, safeMessage } from './utils.js';
import type { MessageRow, AgentSessionRow, RoomRow } from './types.js';
import type { Message, ServerToolEvent } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('produces URL-safe characters only (base62 + hyphen + underscore)', () => {
    // base64url: A-Z a-z 0-9 - _ (no + / =)
    const id = generateId();
    expect(id).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('does not contain base64 padding (=) or unsafe chars (+ /)', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateId();
      expect(id).not.toContain('=');
      expect(id).not.toContain('+');
      expect(id).not.toContain('/');
    }
  });

  it('is approximately 16 characters long (12 bytes → base64url)', () => {
    const id = generateId();
    // 12 bytes → 16 base64 chars (before trimming padding)
    expect(id.length).toBeGreaterThanOrEqual(14);
    expect(id.length).toBeLessThanOrEqual(18);
  });
});

// ---------------------------------------------------------------------------
// nowIso
// ---------------------------------------------------------------------------

describe('nowIso', () => {
  it('returns a valid ISO 8601 string', () => {
    const ts = nowIso();
    expect(typeof ts).toBe('string');
    const parsed = new Date(ts);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('includes the Z UTC suffix', () => {
    const ts = nowIso();
    expect(ts.endsWith('Z')).toBe(true);
  });

  it('returns a timestamp close to now (within 1 second)', () => {
    const before = Date.now();
    const ts = nowIso();
    const after = Date.now();
    const parsed = new Date(ts).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after + 50); // small margin for execution
  });

  it('produces different values when called at different times', async () => {
    const t1 = nowIso();
    await new Promise((r) => setTimeout(r, 5));
    const t2 = nowIso();
    expect(t1).not.toBe(t2);
  });
});

// ---------------------------------------------------------------------------
// mapMessageRow
// ---------------------------------------------------------------------------

describe('mapMessageRow', () => {
  const baseRow: MessageRow = {
    id: 'msg-001',
    room_id: 'default',
    author: 'user',
    author_type: 'human',
    content: 'hello world',
    msg_type: 'message',
    parent_id: null,
    metadata: '{}',
    created_at: '2026-03-17T10:00:00.000Z',
  };

  it('maps snake_case id to camelCase id', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.id).toBe('msg-001');
  });

  it('maps room_id to roomId', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.roomId).toBe('default');
  });

  it('maps author_type to authorType', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.authorType).toBe('human');
  });

  it('maps msg_type to msgType', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.msgType).toBe('message');
  });

  it('maps parent_id to parentId', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.parentId).toBeNull();
  });

  it('maps created_at to createdAt', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.createdAt).toBe('2026-03-17T10:00:00.000Z');
  });

  it('parses metadata JSON string into an object', () => {
    const row: MessageRow = {
      ...baseRow,
      metadata: '{"tool":"Read","filePath":"/src/index.ts"}',
    };
    const msg = mapMessageRow(row);
    expect(msg.metadata).toEqual({ tool: 'Read', filePath: '/src/index.ts' });
  });

  it('parses metadata with costUsd field', () => {
    const row: MessageRow = {
      ...baseRow,
      metadata: '{"costUsd":0.0023}',
    };
    const msg = mapMessageRow(row);
    expect(msg.metadata.costUsd).toBe(0.0023);
  });

  it('returns empty object for empty metadata JSON', () => {
    const msg = mapMessageRow(baseRow);
    expect(msg.metadata).toEqual({});
  });

  it('handles null-like empty metadata string gracefully', () => {
    const row: MessageRow = { ...baseRow, metadata: '' };
    // JSON.parse('') throws — function falls back via || '{}'
    const msg = mapMessageRow(row);
    expect(msg.metadata).toEqual({});
  });

  it('passes through all fields for a tool_use message', () => {
    const row: MessageRow = {
      id: 'tool-001',
      room_id: 'default',
      author: 'bilbo',
      author_type: 'agent',
      content: 'Reading file...',
      msg_type: 'tool_use',
      parent_id: 'msg-001',
      metadata: '{"tool":"Read","filePath":"/foo/bar.ts"}',
      created_at: '2026-03-17T10:01:00.000Z',
    };
    const msg = mapMessageRow(row);
    expect(msg.msgType).toBe('tool_use');
    expect(msg.authorType).toBe('agent');
    expect(msg.parentId).toBe('msg-001');
    expect(msg.metadata.tool).toBe('Read');
  });
});

// ---------------------------------------------------------------------------
// mapAgentSessionRow
// ---------------------------------------------------------------------------

describe('mapAgentSessionRow', () => {
  const baseRow: AgentSessionRow = {
    agent_name: 'bilbo',
    room_id: 'default',
    session_id: null,
    model: 'claude-sonnet-4-6',
    status: 'idle',
    last_active: null,
    total_cost: 0.0,
    turn_count: 0,
  };

  it('maps agent_name to agentName', () => {
    const session = mapAgentSessionRow(baseRow);
    expect(session.agentName).toBe('bilbo');
  });

  it('maps room_id to roomId', () => {
    const session = mapAgentSessionRow(baseRow);
    expect(session.roomId).toBe('default');
  });

  it('maps session_id to sessionId (null case)', () => {
    const session = mapAgentSessionRow(baseRow);
    expect(session.sessionId).toBeNull();
  });

  it('maps session_id to sessionId (string case)', () => {
    const row: AgentSessionRow = {
      ...baseRow,
      session_id: 'abc123-uuid-here',
    };
    const session = mapAgentSessionRow(row);
    expect(session.sessionId).toBe('abc123-uuid-here');
  });

  it('maps model correctly', () => {
    const session = mapAgentSessionRow(baseRow);
    expect(session.model).toBe('claude-sonnet-4-6');
  });

  it('maps status correctly', () => {
    const row: AgentSessionRow = { ...baseRow, status: 'thinking' };
    const session = mapAgentSessionRow(row);
    expect(session.status).toBe('thinking');
  });

  it('maps last_active to lastActive (null case)', () => {
    const session = mapAgentSessionRow(baseRow);
    expect(session.lastActive).toBeNull();
  });

  it('maps last_active to lastActive (string case)', () => {
    const row: AgentSessionRow = {
      ...baseRow,
      last_active: '2026-03-17T10:05:00',
    };
    const session = mapAgentSessionRow(row);
    expect(session.lastActive).toBe('2026-03-17T10:05:00');
  });

  it('maps total_cost to totalCost', () => {
    const row: AgentSessionRow = { ...baseRow, total_cost: 0.0042 };
    const session = mapAgentSessionRow(row);
    expect(session.totalCost).toBe(0.0042);
  });

  it('maps turn_count to turnCount', () => {
    const row: AgentSessionRow = { ...baseRow, turn_count: 7 };
    const session = mapAgentSessionRow(row);
    expect(session.turnCount).toBe(7);
  });

  it('maps a fully-populated session row correctly', () => {
    const row: AgentSessionRow = {
      agent_name: 'ultron',
      room_id: 'default',
      session_id: 'be8a0f12-1234-5678-abcd-ef0123456789',
      model: 'claude-sonnet-4-6',
      status: 'done',
      last_active: '2026-03-17T12:00:00',
      total_cost: 0.1500,
      turn_count: 3,
    };
    const session = mapAgentSessionRow(row);
    expect(session).toEqual({
      agentName: 'ultron',
      roomId: 'default',
      sessionId: 'be8a0f12-1234-5678-abcd-ef0123456789',
      model: 'claude-sonnet-4-6',
      status: 'done',
      lastActive: '2026-03-17T12:00:00',
      totalCost: 0.1500,
      turnCount: 3,
    });
  });
});

// ---------------------------------------------------------------------------
// mapRoomRow
// ---------------------------------------------------------------------------

describe('mapRoomRow', () => {
  const baseRow: RoomRow = {
    id: 'default',
    name: 'general',
    topic: 'Agent chatroom',
    created_at: '2026-03-17T10:00:00.000Z',
  };

  it('maps id correctly', () => {
    const room = mapRoomRow(baseRow);
    expect(room.id).toBe('default');
  });

  it('maps name correctly', () => {
    const room = mapRoomRow(baseRow);
    expect(room.name).toBe('general');
  });

  it('maps topic correctly', () => {
    const room = mapRoomRow(baseRow);
    expect(room.topic).toBe('Agent chatroom');
  });

  it('maps created_at to createdAt', () => {
    const room = mapRoomRow(baseRow);
    expect(room.createdAt).toBe('2026-03-17T10:00:00.000Z');
  });

  it('result does not have snake_case created_at key', () => {
    const room = mapRoomRow(baseRow) as unknown as Record<string, unknown>;
    expect('created_at' in room).toBe(false);
  });

  it('maps a different room correctly', () => {
    const row: RoomRow = {
      id: 'room-alpha',
      name: 'Alpha Channel',
      topic: 'Discussion',
      created_at: '2025-01-01T00:00:00.000Z',
    };
    const room = mapRoomRow(row);
    expect(room).toEqual({
      id: 'room-alpha',
      name: 'Alpha Channel',
      topic: 'Discussion',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });
});

// ---------------------------------------------------------------------------
// safeMessage — SEC-FIX 5
// ---------------------------------------------------------------------------

describe('safeMessage', () => {
  const baseMessage: Message = {
    id: 'msg-safe-001',
    roomId: 'default',
    author: 'bilbo',
    authorType: 'agent',
    content: 'Found the file.',
    msgType: 'message',
    parentId: null,
    metadata: {},
    createdAt: '2026-03-17T10:00:00.000Z',
  };

  it('strips sessionId from message metadata', () => {
    const msg: Message = {
      ...baseMessage,
      metadata: { sessionId: 'secret-uuid-123', costUsd: 0.005 },
    };
    const safe = safeMessage(msg);
    expect((safe.metadata as Record<string, unknown>).sessionId).toBeUndefined();
  });

  it('preserves non-sessionId metadata fields', () => {
    const msg: Message = {
      ...baseMessage,
      metadata: { sessionId: 'to-be-removed', costUsd: 0.01, tool: 'Read', filePath: '/src/foo.ts' },
    };
    const safe = safeMessage(msg);
    const meta = safe.metadata as Record<string, unknown>;
    expect(meta.costUsd).toBe(0.01);
    expect(meta.tool).toBe('Read');
    expect(meta.filePath).toBe('/src/foo.ts');
  });

  it('returns message unchanged when metadata has no sessionId', () => {
    const msg: Message = {
      ...baseMessage,
      metadata: { costUsd: 0.002 },
    };
    const safe = safeMessage(msg);
    expect((safe.metadata as Record<string, unknown>).costUsd).toBe(0.002);
    expect((safe.metadata as Record<string, unknown>).sessionId).toBeUndefined();
  });

  it('handles empty metadata object without throwing', () => {
    const msg: Message = { ...baseMessage, metadata: {} };
    const safe = safeMessage(msg);
    expect(safe.metadata).toEqual({});
  });

  it('preserves all non-metadata message fields', () => {
    const msg: Message = {
      ...baseMessage,
      metadata: { sessionId: 'x' },
    };
    const safe = safeMessage(msg);
    expect(safe.id).toBe(baseMessage.id);
    expect(safe.author).toBe(baseMessage.author);
    expect(safe.content).toBe(baseMessage.content);
    expect(safe.createdAt).toBe(baseMessage.createdAt);
  });
});

// ---------------------------------------------------------------------------
// ServerToolEvent.id — dedup regression (tool_event deduplication fix)
// Verifies that the shared type contract requires `id: string` (not optional).
// If `id` were optional (string | undefined), `seenIds` cannot deduplicate
// stable tool events and ToolLines multiply on reconnect (regression bug).
// ---------------------------------------------------------------------------

describe('ServerToolEvent — id field is non-optional string', () => {
  it('constructs a valid ServerToolEvent with a non-empty id', () => {
    const event: ServerToolEvent = {
      type: 'tool_event',
      id: 'test-tool-id-001',
      agent: 'bilbo',
      tool: 'Read',
      description: 'Reading /src/index.ts',
    };
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
  });

  it('id field is accessible directly (not optional, no undefined check needed)', () => {
    const event: ServerToolEvent = {
      type: 'tool_event',
      id: generateId(),
      agent: 'ultron',
      tool: 'Edit',
      description: 'Editing /src/config.ts',
    };
    // If id were optional, TypeScript would require `event.id ?? ''` here
    // The fact that this compiles without nullish coalescing proves non-optional
    const seenIds = new Set<string>();
    seenIds.add(event.id);
    expect(seenIds.has(event.id)).toBe(true);
  });

  it('two events with the same id are deduplicated by a Set', () => {
    const sharedId = generateId();
    const event1: ServerToolEvent = { type: 'tool_event', id: sharedId, agent: 'bilbo', tool: 'Read', description: 'foo' };
    const event2: ServerToolEvent = { type: 'tool_event', id: sharedId, agent: 'bilbo', tool: 'Read', description: 'foo' };

    const seenIds = new Set<string>();
    const deduplicated: ServerToolEvent[] = [];

    for (const ev of [event1, event2]) {
      if (!seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        deduplicated.push(ev);
      }
    }

    // Same stable id → only 1 entry survives dedup (StrictMode regression)
    expect(deduplicated.length).toBe(1);
  });

  it('two events with different ids are both kept (not over-deduplicated)', () => {
    const event1: ServerToolEvent = { type: 'tool_event', id: generateId(), agent: 'bilbo', tool: 'Read', description: 'foo' };
    const event2: ServerToolEvent = { type: 'tool_event', id: generateId(), agent: 'ultron', tool: 'Edit', description: 'bar' };

    const seenIds = new Set<string>();
    const deduplicated: ServerToolEvent[] = [];

    for (const ev of [event1, event2]) {
      if (!seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        deduplicated.push(ev);
      }
    }

    expect(deduplicated.length).toBe(2);
  });

  it('id generated by generateId() is a non-empty URL-safe string (server-side contract)', () => {
    // Regression: server must generate a stable, non-empty id for every tool_event
    // This mirrors agent-invoker.ts:442 — `id: generateId()`
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});
