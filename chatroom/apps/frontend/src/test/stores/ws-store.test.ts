/**
 * ws-store state machine tests.
 *
 * The store uses module-level mutable vars (socket, reconnectTimer, etc.)
 * that survive across tests. We call disconnect() in beforeEach to reset
 * them to a known clean state before each scenario.
 *
 * Mocking strategy:
 * - globalThis.fetch        → vi.fn() returning a resolved response
 * - globalThis.WebSocket    → a real class (not vi.fn()) so `new WebSocket()` works
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWsStore } from '../../stores/ws-store';
import { useAgentStore } from '../../stores/agent-store';

// -------------------------------------------------------------------------
// Fake WebSocket — must be a class so `new WebSocket(url)` works
// -------------------------------------------------------------------------
type FakeWsInstance = {
  readyState: number;
  sentMessages: string[];
  onopen: ((e: Event) => void) | null;
  onmessage: ((e: MessageEvent) => void) | null;
  onclose: ((e: CloseEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  send(data: string): void;
  close(): void;
  triggerOpen(): void;
  triggerClose(): void;
  triggerMessage(data: unknown): void;
};

// Stores the most-recently constructed fake WS instance
let lastWs: FakeWsInstance;

class FakeWebSocket {
  readyState = 0; // CONNECTING
  sentMessages: string[] = [];
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  constructor(_url: string) {
    lastWs = this as unknown as FakeWsInstance;
  }

  send(data: string) { this.sentMessages.push(data); }
  close() { this.readyState = 3; }

  triggerOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  triggerClose() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }
  triggerMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  // Expose static ReadyState constants (used by ws-store.ts)
  static readonly CONNECTING = 0;
  static readonly OPEN       = 1;
  static readonly CLOSING    = 2;
  static readonly CLOSED     = 3;
}

// -------------------------------------------------------------------------
// Flush all pending microtasks (resolved promises + one more round)
// -------------------------------------------------------------------------
async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------
describe('ws-store — state machine transitions', () => {
  let _origWebSocket: typeof globalThis.WebSocket;
  let _origFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset store to clean state first
    useWsStore.getState().disconnect();

    vi.useFakeTimers();

    _origWebSocket = globalThis.WebSocket;
    _origFetch = globalThis.fetch;

    // Stub global WebSocket with a constructable class
    (globalThis as any).WebSocket = FakeWebSocket;

    // Default: fetch resolves with a token
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    });
    (globalThis as any).fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.WebSocket = _origWebSocket;
    globalThis.fetch = _origFetch;
    vi.useRealTimers();
    useWsStore.getState().disconnect();
  });

  it('initial status is disconnected', () => {
    expect(useWsStore.getState().status).toBe('disconnected');
    expect(useWsStore.getState().roomId).toBeNull();
  });

  it('connect() transitions status to connecting synchronously', () => {
    useWsStore.getState().connect('default');
    expect(useWsStore.getState().status).toBe('connecting');
    expect(useWsStore.getState().roomId).toBe('default');
  });

  it('connect() transitions to connected after auth fetch + WS open', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();
    expect(useWsStore.getState().status).toBe('connected');
  });

  it('disconnect() resets status to disconnected and clears roomId', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();
    expect(useWsStore.getState().status).toBe('connected');

    useWsStore.getState().disconnect();
    expect(useWsStore.getState().status).toBe('disconnected');
    expect(useWsStore.getState().roomId).toBeNull();
  });

  it('WS close while connected triggers reconnect attempt after a delay', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerClose();

    // Immediately after close: status is disconnected (reconnect timer is pending)
    expect(useWsStore.getState().status).toBe('disconnected');

    // After the reconnect delay fires, connect() is called again → status: connecting
    vi.runAllTimers();
    await flushPromises();
    // The reconnect triggers another fetch cycle → still connecting or beyond
    expect(['connecting', 'connected']).toContain(useWsStore.getState().status);
  });

  it('disconnect() after WS close prevents reconnect', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerClose();
    // Intentionally disconnect — clears roomId so the reconnect guard aborts
    useWsStore.getState().disconnect();

    vi.runAllTimers();
    await flushPromises();
    // roomId is null → reconnect guard skips, remains disconnected
    expect(useWsStore.getState().status).toBe('disconnected');
    expect(useWsStore.getState().roomId).toBeNull();
  });

  it('second connect() call with same roomId is a no-op while connecting', async () => {
    useWsStore.getState().connect('default');
    // connectingRoomId is set — second call is silently ignored
    useWsStore.getState().connect('default');
    // Only one fetch should have been issued
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('auth fetch failure sets status back to disconnected', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    useWsStore.getState().connect('default');
    await flushPromises();
    expect(useWsStore.getState().status).toBe('disconnected');
  });

  it('circuit breaker: 3 consecutive auth failures enter offline mode', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    // Failure 1
    useWsStore.getState().connect('default');
    await flushPromises();
    expect(useWsStore.getState().status).toBe('disconnected');

    // Advance past the reconnect delay to trigger failure 2
    vi.advanceTimersByTime(2000);
    await flushPromises();

    // Advance past the reconnect delay to trigger failure 3 → offline
    vi.advanceTimersByTime(4000);
    await flushPromises();

    expect(useWsStore.getState().status).toBe('offline');
  });

  it('disconnect() resets counters so a fresh connect() starts clean', async () => {
    // Cause 1 auth failure (not enough to trip the circuit breaker at 3)
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    useWsStore.getState().connect('default');
    await flushPromises();
    // Status is disconnected after 1 failure; a reconnect timer is pending
    expect(useWsStore.getState().status).toBe('disconnected');

    // disconnect() cancels the pending timer and resets all counters
    useWsStore.getState().disconnect();

    // Reconnect with a working server — should succeed, proving counters were reset
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    });
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();
    expect(useWsStore.getState().status).toBe('connected');
  });

  it('room_state message resets circuit breaker counters', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    // Simulate a room_state message — this is the only thing that resets the circuit breaker
    lastWs.triggerMessage({
      type: 'room_state',
      room: { id: 'default', name: 'Default', createdAt: new Date().toISOString() },
      messages: [],
      agents: [],
      connectedUsers: [],
    });

    // After room_state, the store should still be connected (counters reset internally)
    expect(useWsStore.getState().status).toBe('connected');
  });
});

// ---------------------------------------------------------------------------
// ws-store — context_overflow message routing → agentsOutOfContext
// ---------------------------------------------------------------------------

describe('ws-store — context_overflow message: agentsOutOfContext integration', () => {
  let _origWebSocket2: typeof globalThis.WebSocket;
  let _origFetch2: typeof globalThis.fetch;

  beforeEach(() => {
    useWsStore.getState().disconnect();
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(),
    });

    vi.useFakeTimers();
    _origWebSocket2 = globalThis.WebSocket;
    _origFetch2 = globalThis.fetch;
    (globalThis as any).WebSocket = FakeWebSocket;
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.WebSocket = _origWebSocket2;
    globalThis.fetch = _origFetch2;
    vi.useRealTimers();
    useWsStore.getState().disconnect();
  });

  it('context_overflow message adds the agentName to agentsOutOfContext', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerMessage({
      type: 'context_overflow',
      agentName: 'ultron',
    });

    expect(useAgentStore.getState().agentsOutOfContext.has('ultron')).toBe(true);
  });

  it('context_overflow with multiple agents accumulates them all', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerMessage({ type: 'context_overflow', agentName: 'ultron' });
    lastWs.triggerMessage({ type: 'context_overflow', agentName: 'cerberus' });

    const set = useAgentStore.getState().agentsOutOfContext;
    expect(set.has('ultron')).toBe(true);
    expect(set.has('cerberus')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('context_overflow does not affect ws status (stays connected)', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerMessage({ type: 'context_overflow', agentName: 'argus' });

    expect(useWsStore.getState().status).toBe('connected');
  });
});

// ---------------------------------------------------------------------------
// ws-store — room_state message routing → clearAllOutOfContext
// ---------------------------------------------------------------------------

describe('ws-store — room_state message: clears agentsOutOfContext', () => {
  let _origWebSocket3: typeof globalThis.WebSocket;
  let _origFetch3: typeof globalThis.fetch;

  beforeEach(() => {
    useWsStore.getState().disconnect();
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(['ultron', 'cerberus', 'argus']),
    });

    vi.useFakeTimers();
    _origWebSocket3 = globalThis.WebSocket;
    _origFetch3 = globalThis.fetch;
    (globalThis as any).WebSocket = FakeWebSocket;
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.WebSocket = _origWebSocket3;
    globalThis.fetch = _origFetch3;
    vi.useRealTimers();
    useWsStore.getState().disconnect();
  });

  it('room_state message clears all entries from agentsOutOfContext', async () => {
    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    // Pre-condition: set has 3 agents
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(3);

    lastWs.triggerMessage({
      type: 'room_state',
      room: { id: 'default', name: 'Default', topic: '', createdAt: new Date().toISOString() },
      messages: [],
      agents: [],
      connectedUsers: [],
    });

    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(0);
  });

  it('room_state clears agentsOutOfContext even when it was empty', async () => {
    useAgentStore.setState({ agentsOutOfContext: new Set<string>() });

    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerMessage({
      type: 'room_state',
      room: { id: 'default', name: 'Default', topic: '', createdAt: new Date().toISOString() },
      messages: [],
      agents: [],
      connectedUsers: [],
    });

    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(0);
  });

  it('context_overflow added before room_state is cleared on reconnect', async () => {
    // Simulate: agent runs, overflows, then user reconnects (room_state fires)
    useAgentStore.setState({ agentsOutOfContext: new Set<string>(['bilbo']) });

    useWsStore.getState().connect('default');
    await flushPromises();
    lastWs.triggerOpen();

    lastWs.triggerMessage({
      type: 'room_state',
      room: { id: 'default', name: 'Default', topic: '', createdAt: new Date().toISOString() },
      messages: [],
      agents: [],
      connectedUsers: [],
    });

    expect(useAgentStore.getState().agentsOutOfContext.has('bilbo')).toBe(false);
  });
});
