import { create } from 'zustand';
import type { ServerMessage, ClientMessage, Message } from '@agent-chatroom/shared';
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

// Module-level state (not in Zustand) — raw WS handle and reconnect bookkeeping
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
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
    parsed = JSON.parse(event.data as string) as ServerMessage;
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
      agentStore.updateStatus(parsed.agent, parsed.status, parsed.detail);
      break;

    case 'tool_event': {
      // Tool events become tool_use messages in the chat
      // They arrive as separate WS events — buffer them for batching
      const toolMsg: Message = {
        id: `tool-${Date.now()}-${Math.random()}`,
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

    // If already connecting/connected to the same room, reuse the socket.
    // StrictMode double-invocation would otherwise kill a CONNECTING socket before
    // the handshake completes, producing "WebSocket closed before connection established".
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      const currentRoom = get().roomId;
      if (currentRoom === roomId) {
        return; // Already connecting/connected to this room — don't recreate
      }
    }

    // Close existing socket only if it's for a different room or in a bad state
    if (socket) {
      socket.onclose = null; // prevent reconnect loop from old socket
      socket.close();
      socket = null;
    }

    set({ status: 'connecting', roomId });

    // Pass the user's name in the query param so the server can identify the sender.
    // Default is 'user'; Claude orchestrator connects with ?name=Claude.
    const userName = encodeURIComponent('user');
    const wsUrl = `/ws/${roomId}?name=${userName}`;
    const ws = new WebSocket(wsUrl);
    socket = ws;

    ws.onopen = () => {
      reconnectAttempts = 0;
      set({ status: 'connected' });
    };

    ws.onmessage = handleServerMessage;

    ws.onerror = (err) => {
      console.error('[ws-store] WebSocket error:', err);
    };

    ws.onclose = () => {
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
  },

  disconnect: () => {
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
