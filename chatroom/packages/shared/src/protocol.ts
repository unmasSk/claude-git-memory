import type { AgentState, AuthorType, MsgType } from './constants.js';

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export interface Room {
  id: string;
  name: string;
  topic: string;
  createdAt: string;
}

/**
 * Metadata stored as JSON in the messages.metadata column.
 * FIX 13: documented metadata keys.
 */
export interface MessageMetadata {
  tool?: string; // for tool_use messages — the tool name (Read, Edit, Grep, etc.)
  filePath?: string; // for tool_use messages — file path argument
  sessionId?: string; // for agent messages — the claude session_id for --resume
  costUsd?: number; // for agent messages — total_cost_usd from stream-json result event
  error?: string; // for error system messages — error description
  /** Extended metrics from the result event */
  model?: string;
  durationMs?: number;
  numTurns?: number;
  inputTokens?: number;
  outputTokens?: number;
  contextWindow?: number;
}

/**
 * Message as stored in the DB and sent over the wire.
 * FIX 11: includes msgType so frontend can route to correct component.
 */
export interface Message {
  id: string;
  roomId: string;
  author: string;
  authorType: AuthorType;
  content: string;
  /** FIX 11: message type for frontend routing (MessageLine | ToolLine | SystemMessage) */
  msgType: MsgType;
  parentId: string | null;
  metadata: MessageMetadata;
  createdAt: string;
}

export interface AgentStatus {
  agentName: string;
  roomId: string;
  sessionId: string | null;
  model: string;
  status: AgentState;
  lastActive: string | null;
  totalCost: number;
  turnCount: number;
  /** Last invocation metrics — populated from the result event when agent reaches Done */
  lastDurationMs?: number;
  lastNumTurns?: number;
  lastInputTokens?: number;
  lastOutputTokens?: number;
  lastContextWindow?: number;
}

/**
 * A human user currently connected to the room via WebSocket.
 */
export interface ConnectedUser {
  name: string;
  connectedAt: string;
}

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------

export interface ClientSendMessage {
  type: 'send_message';
  content: string;
}

export interface ClientInvokeAgent {
  type: 'invoke_agent';
  agent: string;
  prompt: string;
}

export interface ClientLoadHistory {
  type: 'load_history';
  before: string;
  limit: number;
}

export interface ClientKillAgent {
  type: 'kill_agent';
  agentName: string;
}

export interface ClientPauseAgent {
  type: 'pause_agent';
  agentName: string;
}

export interface ClientResumeAgent {
  type: 'resume_agent';
  agentName: string;
}

export interface ClientReadChat {
  type: 'read_chat';
  agentName: string;
}

export type ClientMessage =
  | ClientSendMessage
  | ClientInvokeAgent
  | ClientLoadHistory
  | ClientKillAgent
  | ClientPauseAgent
  | ClientResumeAgent
  | ClientReadChat;

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------

export interface ServerRoomState {
  type: 'room_state';
  room: Room;
  messages: Message[];
  agents: AgentStatus[];
  /** Human users currently connected to the room */
  connectedUsers: ConnectedUser[];
}

export interface ServerNewMessage {
  type: 'new_message';
  message: Message;
}

export interface ServerAgentStatus {
  type: 'agent_status';
  agent: string;
  status: AgentState;
  detail?: string;
  /** Metrics from the result event — only present when status === Done */
  durationMs?: number;
  numTurns?: number;
  inputTokens?: number;
  outputTokens?: number;
  contextWindow?: number;
}

export interface ServerToolEvent {
  type: 'tool_event';
  id: string;
  agent: string;
  tool: string;
  description: string;
}

export interface ServerHistoryPage {
  type: 'history_page';
  messages: Message[];
  hasMore: boolean;
}

export interface ServerError {
  type: 'error';
  message: string;
  code: string;
}

export interface ServerUserListUpdate {
  type: 'user_list_update';
  connectedUsers: ConnectedUser[];
}

export type ServerMessage =
  | ServerRoomState
  | ServerNewMessage
  | ServerAgentStatus
  | ServerToolEvent
  | ServerHistoryPage
  | ServerError
  | ServerUserListUpdate;
