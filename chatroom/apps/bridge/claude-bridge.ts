/**
 * claude-bridge.ts
 *
 * Bridges Claude CLI <-> Agent Chatroom.
 * Connects to the chatroom WS as "claude" and exposes a local HTTP API.
 *
 * Architecture:
 *   Claude CLI  <->  HTTP localhost:3002  <->  WS localhost:3001
 *                    (this process)            (chatroom backend)
 *
 * Usage:
 *   bun run claude-bridge.ts
 *
 * Env vars:
 *   BRIDGE_PORT   HTTP port (default 3002)
 *   BRIDGE_TOKEN  Auth token (auto-generated if not set, printed to stdout)
 */

import { timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types (inline — no dependency on @agent-chatroom/shared to keep single-file)
// ---------------------------------------------------------------------------

interface MessageMetadata {
  tool?: string;
  filePath?: string;
  sessionId?: string;
  costUsd?: number;
  error?: string;
}

interface Message {
  id: string;
  roomId: string;
  author: string;
  authorType: 'agent' | 'human' | 'system';
  content: string;
  msgType: 'message' | 'tool_use' | 'system';
  parentId: string | null;
  metadata: MessageMetadata;
  createdAt: string;
}

interface ConnectedUser {
  name: string;
  connectedAt: string;
}

interface AgentStatusRecord {
  agentName: string;
  status: string;
  detail?: string;
}

// Server message payloads (subset we care about)
interface ServerRoomState {
  type: 'room_state';
  messages: Message[];
  connectedUsers: ConnectedUser[];
}

interface ServerNewMessage {
  type: 'new_message';
  message: Message;
}

interface ServerAgentStatus {
  type: 'agent_status';
  agent: string;
  status: string;
  detail?: string;
}

interface ServerToolEvent {
  type: 'tool_event';
  agent: string;
  tool: string;
  description: string;
}

interface ServerUserListUpdate {
  type: 'user_list_update';
  connectedUsers: ConnectedUser[];
}

interface ServerError {
  type: 'error';
  message: string;
  code: string;
}

type ServerMessage =
  | ServerRoomState
  | ServerNewMessage
  | ServerAgentStatus
  | ServerToolEvent
  | ServerUserListUpdate
  | ServerError;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BRIDGE_PORT = Number(process.env['BRIDGE_PORT'] ?? 3002);
const WS_URL = 'ws://127.0.0.1:3001/ws/default?name=claude';
const HTTP_URL = `http://127.0.0.1:${BRIDGE_PORT}`;

const RING_BUFFER_SIZE = 200;
const DEFAULT_MESSAGES_LIMIT = 20;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_CAP_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 20;

// ---------------------------------------------------------------------------
// Auth token
// ---------------------------------------------------------------------------

let BRIDGE_TOKEN: string = process.env['BRIDGE_TOKEN'] ?? '';
if (!BRIDGE_TOKEN) {
  // Generate a random 32-byte hex token
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  BRIDGE_TOKEN = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Print to stderr — stdout is reserved for structured output; callers read stderr for this line
  console.error(`BRIDGE_TOKEN=${BRIDGE_TOKEN}`);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type WsStatus = 'connected' | 'disconnected' | 'connecting';

const ringBuffer: Message[] = [];
const agentStatuses = new Map<string, AgentStatusRecord>();
let connectedUsers: ConnectedUser[] = [];
let wsStatus: WsStatus = 'disconnected';
let wsSocket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const startedAt = Date.now();

// ---------------------------------------------------------------------------
// Singleton check — exit if another bridge is already running
// ---------------------------------------------------------------------------

async function checkSingleton(): Promise<void> {
  try {
    // DECEPTION-002/SEC-MED-003: pass the token so the probe gets 200 (not 401)
    // from an existing authenticated bridge. Without auth, every probe returned
    // 401 and the check always concluded "no bridge running".
    const resp = await fetch(`${HTTP_URL}/health`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
      signal: AbortSignal.timeout(1000),
    });
    if (resp.status === 200) {
      console.error(`ERROR: Another claude-bridge is already running on port ${BRIDGE_PORT}. Exiting.`);
      process.exit(1);
    }
  } catch {
    // No existing bridge — safe to start
  }
}

// ---------------------------------------------------------------------------
// Ring buffer helpers
// ---------------------------------------------------------------------------

function pushToBuffer(msg: Message): void {
  ringBuffer.push(msg);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.shift();
  }
}

function toolEventToMessage(event: ServerToolEvent): Message {
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    roomId: 'default',
    author: event.agent,
    authorType: 'agent',
    content: event.description,
    msgType: 'tool_use',
    parentId: null,
    metadata: { tool: event.tool },
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// WebSocket connection with exponential backoff
// ---------------------------------------------------------------------------

function scheduleReconnect(): void {
  if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
    console.error(`WS: max reconnect attempts (${RECONNECT_MAX_ATTEMPTS}) reached. Giving up.`);
    return;
  }

  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts),
    RECONNECT_CAP_MS,
  );
  reconnectAttempts++;

  console.error(`WS: reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWs();
  }, delay);
}

function connectWs(): void {
  if (wsSocket) {
    // Clean up previous socket without triggering reconnect logic
    wsSocket.onclose = null;
    wsSocket.onerror = null;
    try { wsSocket.close(); } catch { /* ignore */ }
    wsSocket = null;
  }

  wsStatus = 'connecting';

  let socket: WebSocket;
  try {
    socket = new WebSocket(WS_URL);
  } catch (err) {
    console.error('WS: failed to create WebSocket:', err);
    scheduleReconnect();
    return;
  }

  wsSocket = socket;

  socket.onopen = () => {
    console.error('WS: connected to chatroom');
    wsStatus = 'connected';
    reconnectAttempts = 0; // reset on successful connection
  };

  socket.onmessage = (event: MessageEvent) => {
    let parsed: ServerMessage;
    try {
      parsed = JSON.parse(event.data as string) as ServerMessage;
    } catch {
      console.error('WS: failed to parse message:', event.data);
      return;
    }

    handleServerMessage(parsed);
  };

  socket.onerror = (event: Event) => {
    console.error('WS: error', event);
  };

  socket.onclose = () => {
    wsStatus = 'disconnected';
    wsSocket = null;
    console.error('WS: connection closed');
    scheduleReconnect();
  };
}

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'room_state': {
      // Seed ring buffer with recent messages from server
      ringBuffer.length = 0;
      const seed = msg.messages.slice(-RING_BUFFER_SIZE);
      for (const m of seed) {
        ringBuffer.push(m);
      }
      connectedUsers = msg.connectedUsers;
      break;
    }

    case 'new_message': {
      pushToBuffer(msg.message);
      break;
    }

    case 'agent_status': {
      agentStatuses.set(msg.agent, {
        agentName: msg.agent,
        status: msg.status,
        detail: msg.detail,
      });
      break;
    }

    case 'tool_event': {
      // Represent tool events as messages in the buffer (same as ws-store.ts)
      pushToBuffer(toolEventToMessage(msg));
      break;
    }

    case 'user_list_update': {
      connectedUsers = msg.connectedUsers;
      break;
    }

    case 'error': {
      console.error(`WS: server error [${msg.code}]: ${msg.message}`);
      break;
    }

    default: {
      // Unknown message type — ignore
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function checkAuth(req: Request): Response | null {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${BRIDGE_TOKEN}`;
  // SEC-HIGH-001: timing-safe comparison prevents token length/prefix oracle attacks
  const valid =
    !!authHeader &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Auth check (except /health which we also protect)
  const authError = checkAuth(req);
  if (authError) return authError;

  // GET /health
  if (req.method === 'GET' && url.pathname === '/health') {
    return jsonResponse({
      status: wsStatus === 'connected' ? 'ok' : 'disconnected',
      wsStatus,
      connectedUsers: connectedUsers.length,
      agentCount: agentStatuses.size,
      messageCount: ringBuffer.length,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    });
  }

  // GET /messages?since=<messageId>
  if (req.method === 'GET' && url.pathname === '/messages') {
    const since = url.searchParams.get('since');

    let messages: Message[];
    if (since) {
      const idx = ringBuffer.findIndex((m) => m.id === since);
      if (idx === -1) {
        // ID not found — return last 20 as fallback
        messages = ringBuffer.slice(-DEFAULT_MESSAGES_LIMIT);
      } else {
        messages = ringBuffer.slice(idx + 1);
      }
    } else {
      messages = ringBuffer.slice(-DEFAULT_MESSAGES_LIMIT);
    }

    return jsonResponse({ messages, wsStatus });
  }

  // POST /send
  if (req.method === 'POST' && url.pathname === '/send') {
    if (wsStatus !== 'connected' || !wsSocket) {
      return jsonResponse(
        { ok: false, error: 'WebSocket not connected' },
        503,
      );
    }

    // SEC-LOW-001: Reject payloads over 64 KiB before reading the body
    const cl = Number(req.headers.get('content-length') ?? 0);
    if (cl > 65536) {
      return jsonResponse({ ok: false, error: 'Payload too large' }, 413);
    }

    let body: { content?: unknown };
    try {
      body = await req.json() as { content?: unknown };
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
    }

    if (typeof body.content !== 'string' || !body.content.trim()) {
      return jsonResponse({ ok: false, error: 'content must be a non-empty string' }, 400);
    }

    try {
      wsSocket.send(JSON.stringify({ type: 'send_message', content: body.content }));
      return jsonResponse({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse({ ok: false, error: message }, 500);
    }
  }

  return new Response('Not Found', { status: 404 });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  console.error(`\nReceived ${signal}. Shutting down...`);

  // Cancel pending reconnect
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Close WS without triggering reconnect
  if (wsSocket) {
    wsSocket.onclose = null;
    wsSocket.onerror = null;
    try { wsSocket.close(); } catch { /* ignore */ }
    wsSocket = null;
  }

  // Stop HTTP server
  server.stop();

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Singleton check before binding the port
await checkSingleton();

// Start WebSocket connection
connectWs();

// Start HTTP server
const server = Bun.serve({
  port: BRIDGE_PORT,
  hostname: '127.0.0.1',
  fetch: handleRequest,
});

console.error(`claude-bridge listening on http://127.0.0.1:${BRIDGE_PORT}`);
console.error(`WS target: ${WS_URL}`);

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
