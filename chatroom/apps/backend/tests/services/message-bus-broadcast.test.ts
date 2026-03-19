/**
 * Coverage tests for message-bus.ts async broadcast() function.
 *
 * broadcast() calls getApp() which dynamically imports '../index.js'.
 * We mock '../index.js' BEFORE importing broadcast so the module
 * resolves our mock app instead of starting a real server.
 */
import { mock } from 'bun:test';

// ---------------------------------------------------------------------------
// Mock the app singleton BEFORE importing message-bus.js
// ---------------------------------------------------------------------------

const _publishCalls: Array<{ topic: string; data: string }> = [];
const _mockApp = {
  server: {
    publish(topic: string, data: string) {
      _publishCalls.push({ topic, data });
    },
  },
};

mock.module('../../src/index.js', () => ({
  app: _mockApp,
}));

// ---------------------------------------------------------------------------
// Now import the real broadcast function
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'bun:test';
import { broadcast } from '../../src/services/message-bus.js';
import { AgentState } from '@agent-chatroom/shared';
import type { ServerMessage } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// broadcast() tests
// ---------------------------------------------------------------------------

describe('broadcast (async)', () => {
  beforeEach(() => {
    _publishCalls.length = 0;
  });

  it('calls server.publish with the correct room topic', async () => {
    const event: ServerMessage = {
      type: 'agent_status',
      agent: 'bilbo',
      status: AgentState.Thinking,
    };

    await broadcast('default', event);

    expect(_publishCalls.length).toBe(1);
    expect(_publishCalls[0]!.topic).toBe('room:default');
  });

  it('serializes the event as JSON', async () => {
    const event: ServerMessage = {
      type: 'error',
      message: 'Something failed',
      code: 'INTERNAL_ERROR',
    };

    await broadcast('my-room', event);

    const parsed = JSON.parse(_publishCalls[0]!.data);
    expect(parsed.type).toBe('error');
    expect(parsed.message).toBe('Something failed');
    expect(parsed.code).toBe('INTERNAL_ERROR');
  });

  it('strips sessionId from new_message event metadata', async () => {
    const event: ServerMessage = {
      type: 'new_message',
      message: {
        id: 'msg-b01',
        roomId: 'default',
        author: 'bilbo',
        authorType: 'agent',
        content: 'Done.',
        msgType: 'message',
        parentId: null,
        metadata: { sessionId: 'secret-uuid', costUsd: 0.003 },
        createdAt: '2026-03-17T10:00:00.000Z',
      },
    };

    await broadcast('default', event);

    const parsed = JSON.parse(_publishCalls[0]!.data);
    expect(parsed.message.metadata.sessionId).toBeUndefined();
    expect(parsed.message.metadata.costUsd).toBe(0.003);
  });

  it('handles server-not-ready case gracefully (server is null)', async () => {
    // Temporarily remove server from the mock app
    const originalServer = _mockApp.server;
    (_mockApp as unknown as { server: null }).server = null;

    // Should not throw — drops the event with a console.warn
    const event: ServerMessage = {
      type: 'agent_status',
      agent: 'argus',
      status: AgentState.Idle,
    };

    await broadcast('default', event);

    // No publish calls were made
    expect(_publishCalls.length).toBe(0);

    // Restore
    (_mockApp as unknown as { server: typeof originalServer }).server = originalServer;
  });
});
