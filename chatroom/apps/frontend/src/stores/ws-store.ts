import { create } from 'zustand';
import type { ServerMessage, ClientMessage, Message } from '@agent-chatroom/shared';
import { ServerMessageSchema } from '@agent-chatroom/shared';
import { useChatStore } from './chat-store';
import { useAgentStore } from './agent-store';

export type WsStatus = 'disconnected' | 'connecting' | 'connected';

interface WsState {
  status: WsStatus;
  roomId: string | null;

  connect: (roomId: string) => void;
  disconnect: () => void;
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
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

// FIX 17: message buffer for batched flush
let messageBuffer: Message[] = [];
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
      console.warn('[ws-store] Invalid server message:', result.error.issues);
      return;
    }
    parsed = result.data;
  } catch {
    console.warn('[ws-store] Failed to parse message:', event.data);
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
      break;

    case 'new_message':
      // Buffer for batched flush (FIX 17)
      messageBuffer.push(parsed.message);
      scheduleFlush();
      break;

    case 'agent_status':
      agentStore.updateStatus(parsed.agent, parsed.status, parsed.detail, {
        durationMs: parsed.durationMs,
        numTurns: parsed.numTurns,
        inputTokens: parsed.inputTokens,
        outputTokens: parsed.outputTokens,
        contextWindow: parsed.contextWindow,
      });
      break;

    case 'tool_event': {
      // Tool events become tool_use messages in the chat
      // They arrive as separate WS events — buffer them for batching
      const toolMsg: Message = {
        id: `tool-${parsed.id}`,
        roomId: agentStore.room?.id ?? 'default',
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

    case 'error':
      console.error('[ws-store] Server error:', parsed.code, parsed.message);
      break;
  }
}

export const useWsStore = create<WsState>((set, get) => ({
  status: 'disconnected',
  roomId: null,

  connect: (roomId) => {
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
      socket.close();
      socket = null;
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
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: USER_NAME }),
          signal,
        });
        if (!res.ok) throw new Error(`Auth token request failed: ${res.status}`);
        const data = (await res.json()) as { token: string };
        token = data.token;
      } catch (err) {
        // AbortError means disconnect() was called — do not reconnect
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[ws-store] Failed to obtain auth token:', err);
        connectingRoomId = null;
        set({ status: 'disconnected' });

        const currentRoomId = get().roomId;
        if (currentRoomId && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay();
          reconnectAttempts++;
          console.info(`[ws-store] Reconnecting after token failure in ${delay}ms (attempt ${reconnectAttempts})`);
          reconnectTimer = setTimeout(() => {
            get().connect(currentRoomId);
          }, delay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[ws-store] Max reconnect attempts reached after token failure');
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
        connectingRoomId = null;
        reconnectAttempts = 0;
        set({ status: 'connected' });
      };

      ws.onmessage = handleServerMessage;

      ws.onerror = (err) => {
        console.error('[ws-store] WebSocket error:', err);
      };

      ws.onclose = () => {
        connectingRoomId = null;
        socket = null;
        set({ status: 'disconnected' });

        const currentRoomId = get().roomId;
        if (!currentRoomId) return; // intentional disconnect

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[ws-store] Max reconnect attempts reached');
          return;
        }

        const delay = getReconnectDelay();
        reconnectAttempts++;
        console.info(`[ws-store] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

        reconnectTimer = setTimeout(() => {
          get().connect(currentRoomId);
        }, delay);
      };
    })();
  },

  disconnect: () => {
    connectingRoomId = null;
    // Abort any in-flight auth fetch — prevents stale fetch from opening a WS after disconnect
    authAbortController?.abort();
    authAbortController = null;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
    set({ status: 'disconnected', roomId: null });
  },

  send: (msg) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('[ws-store] Cannot send — socket not open');
      return;
    }
    socket.send(JSON.stringify(msg));
  },
}));
