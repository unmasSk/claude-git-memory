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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
  beforeEach(() => {
    // Reset store to clean state first
    useWsStore.getState().disconnect();

    vi.useFakeTimers();

    // Stub global WebSocket with a constructable class
    vi.stubGlobal('WebSocket', FakeWebSocket);

    // Default: fetch resolves with a token
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token' }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    await vi.runAllTimersAsync();
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

    await vi.runAllTimersAsync();
    // roomId is null → reconnect guard skips, remains disconnected
    expect(useWsStore.getState().status).toBe('disconnected');
    expect(useWsStore.getState().roomId).toBeNull();
  });

  it('second connect() call with same roomId is a no-op while connecting', async () => {
    useWsStore.getState().connect('default');
    // connectingRoomId is set — second call is silently ignored
    useWsStore.getState().connect('default');
    // Only one fetch should have been issued
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('auth fetch failure sets status back to disconnected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));
    useWsStore.getState().connect('default');
    await flushPromises();
    expect(useWsStore.getState().status).toBe('disconnected');
  });
});
