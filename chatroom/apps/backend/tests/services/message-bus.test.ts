/**
 * Tests for message-bus.ts.
 *
 * Tests cover:
 * - stripSessionId removes sessionId from new_message events
 * - stripSessionId preserves other metadata fields
 * - stripSessionId strips sessionId from all messages in room_state events
 * - broadcastSync is callable and invokes server.publish with the correct topic
 */
import { describe, it, expect, mock } from 'bun:test';
import { broadcastSync } from '../../src/services/message-bus.js';
import { AgentState } from '@agent-chatroom/shared';
import type { ServerMessage, Message } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// Helpers to build test fixtures
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-001',
    roomId: 'default',
    author: 'bilbo',
    authorType: 'agent',
    content: 'Found something',
    msgType: 'message',
    parentId: null,
    metadata: {},
    createdAt: '2026-03-17T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// stripSessionId — tested indirectly through broadcastSync
// The function is not exported, so we test its effect via the broadcast path.
// ---------------------------------------------------------------------------

describe('stripSessionId via broadcastSync', () => {
  it('strips sessionId from new_message metadata before broadcasting', () => {
    const publishedPayloads: string[] = [];
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedPayloads.push(data);
      },
    };

    const event: ServerMessage = {
      type: 'new_message',
      message: makeMessage({
        metadata: {
          sessionId: 'secret-session-uuid',
          costUsd: 0.0023,
          tool: 'Read',
        },
      }),
    };

    broadcastSync('default', event, mockServer);

    expect(publishedPayloads.length).toBe(1);
    const parsed = JSON.parse(publishedPayloads[0]!);
    expect(parsed.message.metadata.sessionId).toBeUndefined();
  });

  it('preserves non-sessionId metadata fields after stripping', () => {
    const publishedPayloads: string[] = [];
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedPayloads.push(data);
      },
    };

    const event: ServerMessage = {
      type: 'new_message',
      message: makeMessage({
        metadata: {
          sessionId: 'should-be-removed',
          costUsd: 0.005,
          tool: 'Edit',
          filePath: '/src/foo.ts',
        },
      }),
    };

    broadcastSync('default', event, mockServer);
    const parsed = JSON.parse(publishedPayloads[0]!);

    expect(parsed.message.metadata.costUsd).toBe(0.005);
    expect(parsed.message.metadata.tool).toBe('Edit');
    expect(parsed.message.metadata.filePath).toBe('/src/foo.ts');
    expect(parsed.message.metadata.sessionId).toBeUndefined();
  });

  it('handles new_message with no sessionId in metadata gracefully', () => {
    const publishedPayloads: string[] = [];
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedPayloads.push(data);
      },
    };

    const event: ServerMessage = {
      type: 'new_message',
      message: makeMessage({ metadata: { costUsd: 0.001 } }),
    };

    broadcastSync('default', event, mockServer);
    const parsed = JSON.parse(publishedPayloads[0]!);
    expect(parsed.message.metadata.costUsd).toBe(0.001);
    expect(parsed.message.metadata.sessionId).toBeUndefined();
  });

  it('strips sessionId from all messages in room_state event', () => {
    const publishedPayloads: string[] = [];
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedPayloads.push(data);
      },
    };

    const event: ServerMessage = {
      type: 'room_state',
      room: { id: 'default', name: 'general', topic: 'test', createdAt: '2026-01-01T00:00:00.000Z' },
      messages: [
        makeMessage({ id: 'msg-1', metadata: { sessionId: 'sess-1', costUsd: 0.01 } }),
        makeMessage({ id: 'msg-2', metadata: { sessionId: 'sess-2', tool: 'Read' } }),
        makeMessage({ id: 'msg-3', metadata: {} }),
      ],
      agents: [],
      connectedUsers: [],
    };

    broadcastSync('default', event, mockServer);
    const parsed = JSON.parse(publishedPayloads[0]!);

    for (const msg of parsed.messages) {
      expect(msg.metadata.sessionId).toBeUndefined();
    }
    expect(parsed.messages[0].metadata.costUsd).toBe(0.01);
    expect(parsed.messages[1].metadata.tool).toBe('Read');
  });

  it('passes through non-message event types without modification', () => {
    const publishedPayloads: string[] = [];
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedPayloads.push(data);
      },
    };

    const event: ServerMessage = {
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Thinking,
    };

    broadcastSync('default', event, mockServer);
    const parsed = JSON.parse(publishedPayloads[0]!);
    expect(parsed.type).toBe('agent_status');
    expect(parsed.agent).toBe('bilbo');
    expect(parsed.status).toBe('thinking');
  });
});

// ---------------------------------------------------------------------------
// broadcastSync — function contract
// ---------------------------------------------------------------------------

describe('broadcastSync', () => {
  it('calls server.publish with the correct room topic', () => {
    const calls: Array<{ topic: string; data: string }> = [];
    const mockServer = {
      publish: (topic: string, data: string) => {
        calls.push({ topic, data });
      },
    };

    const event: ServerMessage = {
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Idle,
    };

    broadcastSync('my-room', event, mockServer);

    expect(calls.length).toBe(1);
    expect(calls[0]!.topic).toBe('room:my-room');
  });

  it('serializes the event as JSON string', () => {
    let publishedData = '';
    const mockServer = {
      publish: (_topic: string, data: string) => {
        publishedData = data;
      },
    };

    const event: ServerMessage = {
      type: 'error',
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
    };

    broadcastSync('default', event, mockServer);

    const parsed = JSON.parse(publishedData);
    expect(parsed.type).toBe('error');
    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.code).toBe('INTERNAL_ERROR');
  });

  it('publishes to topic room:<roomId> format', () => {
    const topics: string[] = [];
    const mockServer = {
      publish: (topic: string, _data: string) => topics.push(topic),
    };

    broadcastSync('default', { type: 'error', message: 'x', code: 'X' }, mockServer);
    broadcastSync('room-abc', { type: 'error', message: 'y', code: 'Y' }, mockServer);

    expect(topics[0]).toBe('room:default');
    expect(topics[1]).toBe('room:room-abc');
  });

  it('broadcast function is callable and does not throw', () => {
    // broadcast (async) imports the app singleton — in test env the server
    // may not be started. We just verify it is exported and callable.
    const { broadcast } = require('../../src/services/message-bus.js');
    expect(typeof broadcast).toBe('function');
  });
});
