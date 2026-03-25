import { create } from 'zustand';
import type { ServerMessage, ClientMessage, Message } from '@agent-chatroom/shared';
import { ServerMessageSchema } from '@agent-chatroom/shared';
import { useChatStore } from './chat-store';
import { useAgentStore } from './agent-store';
import logger from '../lib/logger';

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'offline';

export interface GitStatusState {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  repo: string;
}

interface WsState {
  status: WsStatus;
  roomId: string | null;
  gitStatus: GitStatusState | null;

  connect: (roomId: string) => void;
  disconnect: () => void;
  retryOffline: () => void;
  send: (msg: ClientMessage) => void;
}

// User display name — configurable via VITE_USER_NAME env var
const USER_NAME: string = import.meta.env.VITE_USER_NAME ?? 'Bex';

// Module-level state (not in Zustand) — raw WS handle and reconnect bookkeeping
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
// FIX StrictMode-async: guard set BEFORE the async auth fetch so concurrent
// synchronous connect() calls (React StrictMode double-mount) don't both slip
// through and spawn two WebSockets.
let connectingRoomId: string | null = null;
// FIX StrictMode-fetch: AbortController for the in-flight auth fetch.
// disconnect() aborts it so a completed fetch from a stale mount can't open a WS.
let authAbortController: AbortController | null = null;
// Circuit breaker: counts consecutive auth fetch failures.
// Resets ONLY on a successful room_state message (proof the backend is alive).
// Phantom onopen events from the Vite proxy do NOT reset this counter.
let consecutiveAuthFailures = 0;
const MAX_CONSECUTIVE_AUTH_FAILURES = 3;

// Health check interval ID — started when entering offline mode, cleared on recovery.
// Runs outside React; does not trigger re-renders.
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
// Last known room before entering offline mode — used by retryOffline().
let lastKnownRoomId: string | null = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function clearHealthCheck() {
  if (healthCheckInterval !== null) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

function startHealthCheck() {
  clearHealthCheck();
  healthCheckInterval = setInterval(() => {
    fetch('/health', { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        if (res.ok) {
          clearHealthCheck();
          useWsStore.getState().retryOffline();
        }
      })
      .catch(() => {
        // Backend still unreachable — wait for next tick
      });
  }, 10_000);
}

// FIX 17: message buffer for batched flush
const messageBuffer: Message[] = [];
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // Use setTimeout(100) as requestAnimationFrame equivalent for non-visual batching
  setTimeout(() => {
    flushScheduled = false;
    const msgs = messageBuffer.splice(0, messageBuffer.length);
    if (msgs.length > 0) {
      useChatStore.getState().appendMessages(msgs);
    }
  }, 100);
}

function getReconnectDelay(): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, reconnectAttempts), MAX_DELAY_MS);
  return delay;
}

function handleServerMessage(event: MessageEvent) {
  let parsed: ServerMessage;
  try {
    const raw = JSON.parse(event.data as string);
    const result = ServerMessageSchema.safeParse(raw);
    if (!result.success) {
      logger.warn('[ws-store] Invalid server message:', result.error.issues);
      return;
    }
    parsed = result.data;
  } catch {
    logger.warn('[ws-store] Failed to parse message:', event.data);
    return;
  }

  const chatStore = useChatStore.getState();
  const agentStore = useAgentStore.getState();

  switch (parsed.type) {
    case 'room_state':
      // FIX 8: handle on EVERY connection — replace stale state
      agentStore.setRoom(parsed.room);
      chatStore.clearMessages();
      // Use appendMessages to bypass batching for initial state load
      chatStore.appendMessages(parsed.messages);
      agentStore.setAgents(parsed.agents);
      agentStore.setConnectedUsers(parsed.connectedUsers ?? []);
      // Clear stale context-overflow badges on reconnect — server does not re-emit them
      agentStore.clearAllOutOfContext();
      // Circuit breaker reset: room_state is proof the backend is alive.
      // Only reset here, NOT in onopen (phantom Vite proxy opens don't count).
      reconnectAttempts = 0;
      consecutiveAuthFailures = 0;
      break;

    case 'new_message':
      // Buffer for batched flush (FIX 17)
      messageBuffer.push(parsed.message);
      scheduleFlush();
      break;

    case 'agent_status': {
      // Filter undefined fields — only pass metrics that actually arrived in this event.
      // Passing an object with all-undefined fields was the root cause of metrics being
      // cleared on each 'thinking' update (the ternary in agent-store was always truthy).
      const m: { durationMs?: number; numTurns?: number; inputTokens?: number; outputTokens?: number; contextWindow?: number } = {};
      if (parsed.durationMs !== undefined) m.durationMs = parsed.durationMs;
      if (parsed.numTurns !== undefined) m.numTurns = parsed.numTurns;
      if (parsed.inputTokens !== undefined) m.inputTokens = parsed.inputTokens;
      if (parsed.outputTokens !== undefined) m.outputTokens = parsed.outputTokens;
      if (parsed.contextWindow !== undefined) m.contextWindow = parsed.contextWindow;
      agentStore.updateStatus(parsed.agent, parsed.status, parsed.detail, Object.keys(m).length > 0 ? m : undefined);
      break;
    }

    case 'tool_event': {
      // Tool events become tool_use messages in the chat
      // They arrive as separate WS events — buffer them for batching
      const toolMsg: Message = {
        id: `tool-${parsed.id}`,
        roomId: agentStore.room?.id ?? '',
        author: parsed.agent,
        authorType: 'agent',
        content: parsed.description,
        msgType: 'tool_use',
        parentId: null,
        metadata: { tool: parsed.tool },
        createdAt: new Date().toISOString(),
      };
      messageBuffer.push(toolMsg);
      scheduleFlush();
      break;
    }

    case 'history_page':
      chatStore.prependHistory(parsed.messages, parsed.hasMore);
      break;

    case 'user_list_update':
      agentStore.setConnectedUsers(parsed.connectedUsers);
      break;

    case 'git_status':
      useWsStore.setState({ gitStatus: { branch: parsed.branch, ahead: parsed.ahead, behind: parsed.behind, dirty: parsed.dirty, repo: parsed.repo } });
      break;

    case 'room_cwd_changed':
      useAgentStore.getState().updateRoomCwd(parsed.roomId, parsed.cwd);
      break;

    case 'context_overflow':
      agentStore.addOutOfContext(parsed.agentName);
      break;

    case 'error':
      logger.error('[ws-store] Server error:', parsed.code, parsed.message);
      break;
  }
}

export const useWsStore = create<WsState>((set, get) => ({
  status: 'disconnected',
  roomId: null,
  gitStatus: null,

  connect: (roomId) => {
    if (!roomId) return;

    // Circuit breaker: if too many consecutive auth failures, the server is down.
    // Enter 'offline' mode — stop reconnecting until a page visibility change or
    // explicit user action resets the state.
    if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
      logger.error('[ws-store] Circuit breaker open: too many consecutive auth failures, entering offline mode');
      lastKnownRoomId = roomId;
      set({ status: 'offline', roomId: null });
      return;
    }

    // Cancel any pending reconnect
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // FIX StrictMode-async: check connectingRoomId BEFORE the async fetch.
    // The old guard checked `socket` which is only set after the fetch resolves —
    // StrictMode's two synchronous calls both saw socket===null and both launched
    // an auth fetch, creating two WebSockets. This guard fires synchronously.
    if (connectingRoomId === roomId) return;

    // If already connected to the same room, reuse the socket.
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      const currentRoom = get().roomId;
      if (currentRoom === roomId) {
        return;
      }
    }

    // Close existing socket only if it's for a different room or in a bad state
    if (socket) {
      socket.onclose = null; // prevent reconnect loop from old socket
      socket.onmessage = null; // prevent buffered messages from old room bleeding into new room
      socket.onerror = null;
      socket.close();
      socket = null;
      messageBuffer.splice(0, messageBuffer.length); // drain any buffered messages from old room
    }

    connectingRoomId = roomId;
    set({ status: 'connecting', roomId });

    // Cancel any previous in-flight auth fetch before starting a new one
    authAbortController?.abort();
    authAbortController = new AbortController();
    const { signal } = authAbortController;

    // SEC-AUTH-001: Obtain a short-lived token before opening the WS connection.
    void (async () => {
      let token: string;
      try {
        // AbortSignal.any combines the disconnect abort with a 5s timeout.
        // This prevents fetch from hanging when the backend is unreachable
        // without a TCP RST (e.g. Vite proxy accepting the connection but backend is down).
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: USER_NAME }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        });
        if (!res.ok) throw new Error(`Auth token request failed: ${res.status}`);
        const data = (await res.json()) as { token: string };
        token = data.token;
      } catch (err) {
        // AbortError from disconnect(): return early.
        // TimeoutError from internal 5s timeout: fall through and count as a failure.
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          // Only skip reconnect if the abort came from disconnect() (signal aborted),
          // not from our internal 5s timeout.
          if (signal.aborted) return;
        }
        consecutiveAuthFailures++;
        logger.error(
          `[ws-store] Failed to obtain auth token (consecutive failures: ${consecutiveAuthFailures}):`,
          err,
        );
        connectingRoomId = null;

        // Circuit breaker: after MAX_CONSECUTIVE_AUTH_FAILURES, give up.
        if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
          logger.error('[ws-store] Circuit breaker open: server appears to be down, entering offline mode');
          lastKnownRoomId = roomId;
          set({ status: 'offline', roomId: null });
          startHealthCheck();
          return;
        }

        set({ status: 'disconnected' });

        const currentRoomId = get().roomId;
        if (currentRoomId && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay();
          reconnectAttempts++;
          logger.info(`[ws-store] Reconnecting after token failure in ${delay}ms (attempt ${reconnectAttempts})`);
          reconnectTimer = setTimeout(() => {
            get().connect(currentRoomId);
          }, delay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error('[ws-store] Max reconnect attempts reached after token failure');
        }
        return;
      }

      // Guard: if disconnect() was called while fetch was in flight, abort
      if (connectingRoomId !== roomId) return;
      authAbortController = null;

      const wsUrl = `/ws/${roomId}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      socket = ws;

      ws.onopen = () => {
        // Do NOT reset reconnectAttempts or consecutiveAuthFailures here.
        // The Vite proxy can fire phantom onopen events (accepts WS upgrade before
        // backend connects), so onopen alone is not proof the backend is alive.
        // We wait for the first room_state message to confirm real connectivity.
        connectingRoomId = null;
        set({ status: 'connected' });
      };

      ws.onmessage = handleServerMessage;

      ws.onerror = (err) => {
        logger.error('[ws-store] WebSocket error:', err);
      };

      ws.onclose = () => {
        connectingRoomId = null;
        socket = null;
        set({ status: 'disconnected' });

        const currentRoomId = get().roomId;
        if (!currentRoomId) return; // intentional disconnect

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error('[ws-store] Max reconnect attempts reached');
          return;
        }

        const delay = getReconnectDelay();
        reconnectAttempts++;
        logger.info(`[ws-store] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

        reconnectTimer = setTimeout(() => {
          get().connect(currentRoomId);
        }, delay);
      };
    })();
  },

  retryOffline: () => {
    if (get().status !== 'offline') return;
    if (!lastKnownRoomId) return;
    const roomId = lastKnownRoomId;
    consecutiveAuthFailures = 0;
    reconnectAttempts = 0;
    clearHealthCheck();
    get().connect(roomId);
  },

  disconnect: () => {
    connectingRoomId = null;
    // Reset counters so a fresh connect() after disconnect() starts clean
    reconnectAttempts = 0;
    consecutiveAuthFailures = 0;
    clearHealthCheck();
    // Abort any in-flight auth fetch — prevents stale fetch from opening a WS after disconnect
    authAbortController?.abort();
    authAbortController = null;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.close();
      socket = null;
      messageBuffer.splice(0, messageBuffer.length);
    }
    lastKnownRoomId = null;
    set({ status: 'disconnected', roomId: null });
  },

  send: (msg) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      logger.warn('[ws-store] Cannot send — socket not open');
      return;
    }
    socket.send(JSON.stringify(msg));
  },
}));

// Module-level visibility listener — added once, never removed.
// When the tab becomes visible and the store is offline, attempt recovery.
// Guard prevents HMR from registering duplicate listeners across hot reloads.
let visibilityListenerAdded = false;
if (typeof document !== 'undefined' && !visibilityListenerAdded) {
  visibilityListenerAdded = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useWsStore.getState().status === 'offline') {
      useWsStore.getState().retryOffline();
    }
  });
}
