/**
 * Unit tests for all Zod schemas in the shared package.
 *
 * Covers:
 * - ClientSendMessageSchema, ClientInvokeAgentSchema, ClientLoadHistorySchema
 * - ClientMessageSchema (discriminated union)
 * - ServerRoomStateSchema, ServerNewMessageSchema, ServerAgentStatusSchema
 * - ServerToolEventSchema, ServerHistoryPageSchema, ServerErrorSchema
 * - ServerMessageSchema (discriminated union)
 * - RoomSchema, MessageSchema, AgentStatusSchema, MessageMetadataSchema
 */
import { describe, it, expect } from 'bun:test';
import {
  ClientSendMessageSchema,
  ClientInvokeAgentSchema,
  ClientLoadHistorySchema,
  ClientMessageSchema,
  ServerRoomStateSchema,
  ServerNewMessageSchema,
  ServerAgentStatusSchema,
  ServerToolEventSchema,
  ServerHistoryPageSchema,
  ServerErrorSchema,
  ServerMessageSchema,
  RoomSchema,
  MessageSchema,
  AgentStatusSchema,
  MessageMetadataSchema,
  ConnectedUserSchema,
} from './schemas.js';
import { AgentState } from './constants.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoom() {
  return { id: 'default', name: 'general', topic: 'Agent chatroom', createdAt: '2026-03-17T10:00:00.000Z' };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-001',
    roomId: 'default',
    author: 'user',
    authorType: 'human',
    content: 'hello',
    msgType: 'message',
    parentId: null,
    metadata: {},
    createdAt: '2026-03-17T10:00:00.000Z',
    ...overrides,
  };
}

function makeAgentStatus(overrides: Record<string, unknown> = {}) {
  return {
    agentName: 'bilbo',
    roomId: 'default',
    sessionId: null,
    model: 'claude-sonnet-4-6',
    status: AgentState.Idle,
    lastActive: null,
    totalCost: 0.0,
    turnCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ConnectedUserSchema
// ---------------------------------------------------------------------------

describe('ConnectedUserSchema', () => {
  it('validates a correct ConnectedUser object', () => {
    const result = ConnectedUserSchema.safeParse({ name: 'test', connectedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('test');
      expect(result.data.connectedAt).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('rejects missing name field', () => {
    const result = ConnectedUserSchema.safeParse({ connectedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });

  it('rejects missing connectedAt field', () => {
    const result = ConnectedUserSchema.safeParse({ name: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects non-string name', () => {
    const result = ConnectedUserSchema.safeParse({ name: 42, connectedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });

  it('rejects non-string connectedAt', () => {
    const result = ConnectedUserSchema.safeParse({ name: 'test', connectedAt: 1234567890 });
    expect(result.success).toBe(false);
  });

  it('accepts any string as connectedAt (no ISO format enforcement at schema level)', () => {
    // ConnectedUserSchema only requires a string, not a validated ISO date
    const result = ConnectedUserSchema.safeParse({ name: 'alice', connectedAt: 'not-a-date' });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RoomSchema
// ---------------------------------------------------------------------------

describe('RoomSchema', () => {
  it('parses a valid room object', () => {
    const result = RoomSchema.safeParse(makeRoom());
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const { id: _omit, ...room } = makeRoom();
    const result = RoomSchema.safeParse(room);
    expect(result.success).toBe(false);
  });

  it('rejects missing createdAt', () => {
    const { createdAt: _omit, ...room } = makeRoom();
    const result = RoomSchema.safeParse(room);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MessageMetadataSchema
// ---------------------------------------------------------------------------

describe('MessageMetadataSchema', () => {
  it('parses empty object', () => {
    expect(MessageMetadataSchema.safeParse({}).success).toBe(true);
  });

  it('parses all optional fields together', () => {
    const result = MessageMetadataSchema.safeParse({
      tool: 'Read',
      filePath: '/foo/bar.ts',
      sessionId: 'abc-123',
      costUsd: 0.005,
      error: 'something failed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric costUsd', () => {
    const result = MessageMetadataSchema.safeParse({ costUsd: 'not-a-number' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MessageSchema
// ---------------------------------------------------------------------------

describe('MessageSchema', () => {
  it('parses a valid message', () => {
    const result = MessageSchema.safeParse(makeMessage());
    expect(result.success).toBe(true);
  });

  it('accepts all valid authorType values', () => {
    for (const authorType of ['agent', 'human', 'system']) {
      const result = MessageSchema.safeParse(makeMessage({ authorType }));
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid authorType', () => {
    const result = MessageSchema.safeParse(makeMessage({ authorType: 'bot' }));
    expect(result.success).toBe(false);
  });

  it('accepts all valid msgType values', () => {
    for (const msgType of ['message', 'tool_use', 'system']) {
      const result = MessageSchema.safeParse(makeMessage({ msgType }));
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid msgType', () => {
    const result = MessageSchema.safeParse(makeMessage({ msgType: 'unknown' }));
    expect(result.success).toBe(false);
  });

  it('accepts parentId as null', () => {
    const result = MessageSchema.safeParse(makeMessage({ parentId: null }));
    expect(result.success).toBe(true);
  });

  it('accepts parentId as a string', () => {
    const result = MessageSchema.safeParse(makeMessage({ parentId: 'parent-001' }));
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const { id: _omit, ...msg } = makeMessage();
    const result = MessageSchema.safeParse(msg);
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const { content: _omit, ...msg } = makeMessage();
    const result = MessageSchema.safeParse(msg);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AgentStatusSchema
// ---------------------------------------------------------------------------

describe('AgentStatusSchema', () => {
  it('parses a valid agent status', () => {
    const result = AgentStatusSchema.safeParse(makeAgentStatus());
    expect(result.success).toBe(true);
  });

  it('accepts all valid AgentState values', () => {
    const states = [AgentState.Idle, AgentState.Thinking, AgentState.ToolUse, AgentState.Done, AgentState.Out, AgentState.Error];
    for (const status of states) {
      const result = AgentStatusSchema.safeParse(makeAgentStatus({ status }));
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = AgentStatusSchema.safeParse(makeAgentStatus({ status: 'running' }));
    expect(result.success).toBe(false);
  });

  it('accepts null sessionId', () => {
    const result = AgentStatusSchema.safeParse(makeAgentStatus({ sessionId: null }));
    expect(result.success).toBe(true);
  });

  it('accepts null lastActive', () => {
    const result = AgentStatusSchema.safeParse(makeAgentStatus({ lastActive: null }));
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ClientSendMessageSchema
// ---------------------------------------------------------------------------

describe('ClientSendMessageSchema', () => {
  it('validates a correct send_message', () => {
    const result = ClientSendMessageSchema.safeParse({ type: 'send_message', content: 'hello' });
    expect(result.success).toBe(true);
  });

  it('rejects missing content', () => {
    const result = ClientSendMessageSchema.safeParse({ type: 'send_message' });
    expect(result.success).toBe(false);
  });

  it('rejects empty content (min 1 char)', () => {
    const result = ClientSendMessageSchema.safeParse({ type: 'send_message', content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 10000 chars', () => {
    const result = ClientSendMessageSchema.safeParse({
      type: 'send_message',
      content: 'x'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly max length (10000)', () => {
    const result = ClientSendMessageSchema.safeParse({
      type: 'send_message',
      content: 'x'.repeat(10000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong type discriminant', () => {
    const result = ClientSendMessageSchema.safeParse({ type: 'invoke_agent', content: 'hi' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ClientInvokeAgentSchema
// ---------------------------------------------------------------------------

describe('ClientInvokeAgentSchema', () => {
  it('validates correct invoke_agent message', () => {
    const result = ClientInvokeAgentSchema.safeParse({
      type: 'invoke_agent',
      agent: 'bilbo',
      prompt: 'explore this directory',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing agent field', () => {
    const result = ClientInvokeAgentSchema.safeParse({
      type: 'invoke_agent',
      prompt: 'explore',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty agent string (min 1)', () => {
    const result = ClientInvokeAgentSchema.safeParse({
      type: 'invoke_agent',
      agent: '',
      prompt: 'explore',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty prompt string (min 1)', () => {
    const result = ClientInvokeAgentSchema.safeParse({
      type: 'invoke_agent',
      agent: 'bilbo',
      prompt: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects prompt exceeding 10000 chars', () => {
    const result = ClientInvokeAgentSchema.safeParse({
      type: 'invoke_agent',
      agent: 'bilbo',
      prompt: 'x'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ClientLoadHistorySchema
// ---------------------------------------------------------------------------

describe('ClientLoadHistorySchema', () => {
  it('validates correct load_history message', () => {
    const result = ClientLoadHistorySchema.safeParse({
      type: 'load_history',
      before: 'msg-050',
      limit: 20,
    });
    expect(result.success).toBe(true);
  });

  it('rejects limit of 0 (min 1)', () => {
    const result = ClientLoadHistorySchema.safeParse({ type: 'load_history', before: 'msg-050', limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = ClientLoadHistorySchema.safeParse({ type: 'load_history', before: 'msg-050', limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts limit at exactly 100', () => {
    const result = ClientLoadHistorySchema.safeParse({ type: 'load_history', before: 'msg-050', limit: 100 });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer limit', () => {
    const result = ClientLoadHistorySchema.safeParse({ type: 'load_history', before: 'msg-050', limit: 10.5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ClientMessageSchema (discriminated union)
// ---------------------------------------------------------------------------

describe('ClientMessageSchema', () => {
  it('routes send_message correctly', () => {
    const result = ClientMessageSchema.safeParse({ type: 'send_message', content: 'hi' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('send_message');
  });

  it('routes invoke_agent correctly', () => {
    const result = ClientMessageSchema.safeParse({ type: 'invoke_agent', agent: 'bilbo', prompt: 'explore' });
    expect(result.success).toBe(true);
  });

  it('routes load_history correctly', () => {
    const result = ClientMessageSchema.safeParse({ type: 'load_history', before: 'msg-x', limit: 10 });
    expect(result.success).toBe(true);
  });

  it('rejects unknown type', () => {
    const result = ClientMessageSchema.safeParse({ type: 'unknown_type', content: 'hi' });
    expect(result.success).toBe(false);
  });

  it('rejects message with no type', () => {
    const result = ClientMessageSchema.safeParse({ content: 'hello' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Server → Client message schemas
// ---------------------------------------------------------------------------

describe('ServerNewMessageSchema', () => {
  it('validates a correct new_message event', () => {
    const result = ServerNewMessageSchema.safeParse({
      type: 'new_message',
      message: makeMessage(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing message field', () => {
    const result = ServerNewMessageSchema.safeParse({ type: 'new_message' });
    expect(result.success).toBe(false);
  });

  it('rejects message with invalid authorType', () => {
    const result = ServerNewMessageSchema.safeParse({
      type: 'new_message',
      message: makeMessage({ authorType: 'bot' }),
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerRoomStateSchema', () => {
  it('validates a correct room_state event', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [makeMessage()],
      agents: [makeAgentStatus()],
      connectedUsers: [],
    });
    expect(result.success).toBe(true);
  });

  it('validates room_state with empty arrays', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [],
      agents: [],
      connectedUsers: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing room field', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      messages: [],
      agents: [],
    });
    expect(result.success).toBe(false);
  });

  it('room_state with connectedUsers array parses correctly', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [],
      agents: [],
      connectedUsers: [
        { name: 'alice', connectedAt: '2026-01-01T10:00:00.000Z' },
        { name: 'Claude', connectedAt: '2026-01-01T10:01:00.000Z' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connectedUsers).toHaveLength(2);
      expect(result.data.connectedUsers[0].name).toBe('alice');
      expect(result.data.connectedUsers[1].name).toBe('Claude');
    }
  });

  it('rejects room_state with invalid connectedUsers entry (missing name)', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [],
      agents: [],
      connectedUsers: [{ connectedAt: '2026-01-01T10:00:00.000Z' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects room_state missing connectedUsers field', () => {
    const result = ServerRoomStateSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [],
      agents: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerAgentStatusSchema', () => {
  it('validates a correct agent_status event', () => {
    const result = ServerAgentStatusSchema.safeParse({
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Thinking,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional detail field', () => {
    const result = ServerAgentStatusSchema.safeParse({
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Error,
      detail: 'Subprocess exited with code 1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = ServerAgentStatusSchema.safeParse({
      type: 'agent_status',
      agent: 'bilbo',
      status: 'running',
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerToolEventSchema', () => {
  it('validates a correct tool_event', () => {
    const result = ServerToolEventSchema.safeParse({
      type: 'tool_event',
      agent: 'bilbo',
      tool: 'Read',
      description: 'Reading /src/index.ts',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing tool field', () => {
    const result = ServerToolEventSchema.safeParse({
      type: 'tool_event',
      agent: 'bilbo',
      description: 'Reading file',
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerHistoryPageSchema', () => {
  it('validates correct history_page with messages', () => {
    const result = ServerHistoryPageSchema.safeParse({
      type: 'history_page',
      messages: [makeMessage()],
      hasMore: true,
    });
    expect(result.success).toBe(true);
  });

  it('validates history_page with empty messages', () => {
    const result = ServerHistoryPageSchema.safeParse({
      type: 'history_page',
      messages: [],
      hasMore: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing hasMore field', () => {
    const result = ServerHistoryPageSchema.safeParse({
      type: 'history_page',
      messages: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerErrorSchema', () => {
  it('validates a correct error event', () => {
    const result = ServerErrorSchema.safeParse({
      type: 'error',
      message: 'Room not found',
      code: 'NOT_FOUND',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing code field', () => {
    const result = ServerErrorSchema.safeParse({
      type: 'error',
      message: 'Something broke',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing message field', () => {
    const result = ServerErrorSchema.safeParse({
      type: 'error',
      code: 'BROKEN',
    });
    expect(result.success).toBe(false);
  });
});

describe('ServerMessageSchema (discriminated union)', () => {
  it('routes room_state correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'room_state',
      room: makeRoom(),
      messages: [],
      agents: [],
      connectedUsers: [],
    });
    expect(result.success).toBe(true);
  });

  it('routes new_message correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'new_message',
      message: makeMessage(),
    });
    expect(result.success).toBe(true);
  });

  it('routes agent_status correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Done,
    });
    expect(result.success).toBe(true);
  });

  it('routes tool_event correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'tool_event',
      agent: 'bilbo',
      tool: 'Grep',
      description: 'Searching for pattern',
    });
    expect(result.success).toBe(true);
  });

  it('routes history_page correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'history_page',
      messages: [],
      hasMore: false,
    });
    expect(result.success).toBe(true);
  });

  it('routes error correctly', () => {
    const result = ServerMessageSchema.safeParse({
      type: 'error',
      message: 'bad input',
      code: 'VALIDATION_ERROR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects completely unknown type', () => {
    const result = ServerMessageSchema.safeParse({ type: 'unknown_server_event' });
    expect(result.success).toBe(false);
  });
});
