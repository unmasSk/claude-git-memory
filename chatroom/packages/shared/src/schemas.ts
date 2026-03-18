import { z } from 'zod';
import { AgentState } from './constants.js';

// ---------------------------------------------------------------------------
// Domain schemas
// ---------------------------------------------------------------------------

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  topic: z.string(),
  createdAt: z.string(),
});

export const MessageMetadataSchema = z.object({
  tool: z.string().optional(),
  filePath: z.string().optional(),
  sessionId: z.string().optional(),
  costUsd: z.number().optional(),
  error: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  author: z.string(),
  authorType: z.enum(['agent', 'human', 'system']),
  content: z.string(),
  msgType: z.enum(['message', 'tool_use', 'system']),
  parentId: z.string().nullable(),
  metadata: MessageMetadataSchema,
  createdAt: z.string(),
});

export const ConnectedUserSchema = z.object({
  name: z.string(),
  connectedAt: z.string(),
});

export const AgentStatusSchema = z.object({
  agentName: z.string(),
  roomId: z.string(),
  sessionId: z.string().nullable(),
  model: z.string(),
  status: z.enum([
    AgentState.Idle,
    AgentState.Thinking,
    AgentState.ToolUse,
    AgentState.Done,
    AgentState.Out,
    AgentState.Error,
  ]),
  lastActive: z.string().nullable(),
  totalCost: z.number(),
  turnCount: z.number(),
});

// ---------------------------------------------------------------------------
// Client → Server message schemas
// ---------------------------------------------------------------------------

export const ClientSendMessageSchema = z.object({
  type: z.literal('send_message'),
  content: z.string().min(1).max(10000),
});

export const ClientInvokeAgentSchema = z.object({
  type: z.literal('invoke_agent'),
  agent: z.string().min(1),
  prompt: z.string().min(1).max(10000),
});

export const ClientLoadHistorySchema = z.object({
  type: z.literal('load_history'),
  before: z.string(),
  limit: z.number().int().min(1).max(100),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientSendMessageSchema,
  ClientInvokeAgentSchema,
  ClientLoadHistorySchema,
]);

// ---------------------------------------------------------------------------
// Server → Client message schemas
// ---------------------------------------------------------------------------

export const ServerRoomStateSchema = z.object({
  type: z.literal('room_state'),
  room: RoomSchema,
  messages: z.array(MessageSchema),
  agents: z.array(AgentStatusSchema),
  connectedUsers: z.array(ConnectedUserSchema),
});

export const ServerNewMessageSchema = z.object({
  type: z.literal('new_message'),
  message: MessageSchema,
});

export const ServerAgentStatusSchema = z.object({
  type: z.literal('agent_status'),
  agent: z.string(),
  status: z.enum([
    AgentState.Idle,
    AgentState.Thinking,
    AgentState.ToolUse,
    AgentState.Done,
    AgentState.Out,
    AgentState.Error,
  ]),
  detail: z.string().optional(),
});

export const ServerToolEventSchema = z.object({
  type: z.literal('tool_event'),
  agent: z.string(),
  tool: z.string(),
  description: z.string(),
});

export const ServerHistoryPageSchema = z.object({
  type: z.literal('history_page'),
  messages: z.array(MessageSchema),
  hasMore: z.boolean(),
});

export const ServerErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  code: z.string(),
});

export const ServerUserListUpdateSchema = z.object({
  type: z.literal('user_list_update'),
  connectedUsers: z.array(ConnectedUserSchema),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ServerRoomStateSchema,
  ServerNewMessageSchema,
  ServerAgentStatusSchema,
  ServerToolEventSchema,
  ServerHistoryPageSchema,
  ServerErrorSchema,
  ServerUserListUpdateSchema,
]);

// Inferred types (for convenience — prefer the types from protocol.ts)
export type ClientMessageInput = z.infer<typeof ClientMessageSchema>;
export type ServerMessageInput = z.infer<typeof ServerMessageSchema>;
