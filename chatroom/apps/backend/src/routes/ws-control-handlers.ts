/**
 * WS control handlers — kill_agent, pause_agent, resume_agent, read_chat.
 * Extracted from ws-message-handlers.ts (T2-03) to keep each file under 300 LOC.
 * Called from the message() dispatcher in ws-handlers.ts.
 */
import { getRoomById, insertMessage, getRecentMessages } from '../db/queries.js';
import { broadcastSync } from '../services/message-bus.js';
import {
  invokeAgent,
  killAgent,
  pauseAgent,
  resumeAgent,
  isAgentPaused,
  clearQueue,
  inFlight,
  activeProcesses,
  sanitizePromptContent,
} from '../services/agent-invoker.js';
import { stoppedRooms } from '../services/agent-scheduler.js';
import { getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, generateId, nowIso, safeMessage } from '../utils.js';
import { updateStatusAndBroadcast, postSystemMessage } from '../services/agent-runner.js';
import { ROOM_STATE_MESSAGE_LIMIT } from '../config.js';
import { AgentState } from '@agent-chatroom/shared';
import type { Message } from '@agent-chatroom/shared';
import { logger, sendError } from './ws-state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maximum number of recent messages fed to the agent via read_chat. */
const READ_CHAT_LIMIT = ROOM_STATE_MESSAGE_LIMIT;

/**
 * Persist a read_chat acknowledgement to DB and broadcast it to the room.
 * Returns false (and sends DB_ERROR) if the insert fails.
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room the agent is reading.
 * @param agentName - The agent receiving the transcript.
 * @param messageCount - Number of messages included in the transcript.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertAndBroadcastReadChat(ws: any, roomId: string, agentName: string, messageCount: number): boolean {
  const sysId = generateId();
  const sysCreatedAt = nowIso();
  const sysContent = `Agent ${agentName} received recent chat context (${messageCount} messages).`;
  try {
    insertMessage({
      id: sysId,
      roomId,
      author: 'system',
      authorType: 'system',
      content: sysContent,
      msgType: 'system',
      parentId: null,
      metadata: '{}',
    });
  } catch (err) {
    logger.error({ err, roomId, agentName }, 'WS read_chat: insertMessage (system) failed');
    sendError(ws, 'Failed to record action. Please try again.', 'DB_ERROR');
    return false;
  }
  const sysMsg: Message = {
    id: sysId,
    roomId,
    author: 'system',
    authorType: 'system',
    content: sysContent,
    msgType: 'system',
    parentId: null,
    metadata: {},
    createdAt: sysCreatedAt,
  };
  broadcastSync(roomId, { type: 'new_message', message: sysMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(sysMsg) }));
  return true;
}

// ---------------------------------------------------------------------------
// kill_agent
// ---------------------------------------------------------------------------

/**
 * Handle a kill_agent client message.
 * Sends SIGTERM to the running subprocess for the named agent, clears pending
 * queue entries for that agent+room, and broadcasts Out status only when the
 * agent actually had an active process (SEC-MED-002).
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room the agent is running in.
 * @param agentName - The name of the agent to kill.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleKillAgent(ws: any, roomId: string, agentName: string): void {
  const agentConf = getAgentConfig(agentName);
  if (!agentConf) {
    sendError(ws, `Unknown agent: ${agentName}`, 'UNKNOWN_AGENT');
    return;
  }

  logger.info({ agentName, roomId }, 'WS kill_agent');
  const killed = killAgent(agentName, roomId);

  if (!killed) {
    logger.info({ agentName, roomId }, 'WS kill_agent: agent not running');
    void postSystemMessage(roomId, `Agent ${agentName} is not currently running.`);
    return;
  }

  void updateStatusAndBroadcast(agentName, roomId, AgentState.Out);
  void postSystemMessage(roomId, `Agent ${agentName} was terminated by operator.`);
}

// ---------------------------------------------------------------------------
// pause_agent
// ---------------------------------------------------------------------------

/**
 * Handle a pause_agent client message.
 * Marks the agent as paused so future invocations are skipped.
 * Does not interrupt the currently running invocation (if any).
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room scope.
 * @param agentName - The agent to pause.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handlePauseAgent(ws: any, roomId: string, agentName: string): void {
  const agentConf = getAgentConfig(agentName);
  if (!agentConf) {
    sendError(ws, `Unknown agent: ${agentName}`, 'UNKNOWN_AGENT');
    return;
  }

  if (isAgentPaused(agentName, roomId)) {
    logger.debug({ agentName, roomId }, 'WS pause_agent: already paused');
    return;
  }

  logger.info({ agentName, roomId }, 'WS pause_agent');
  const frozen = pauseAgent(agentName, roomId);
  if (frozen) {
    // Process was found and SIGSTOP sent — broadcast Paused.
    void updateStatusAndBroadcast(agentName, roomId, AgentState.Paused);
    void postSystemMessage(roomId, `Agent ${agentName} frozen.`);
  } else {
    // No active process (already done or ESRCH) — do NOT broadcast Paused;
    // the flag was cleared by pauseAgent so invocations remain unblocked.
    void postSystemMessage(roomId, `Agent ${agentName} is not currently running — nothing to pause.`);
  }
}

// ---------------------------------------------------------------------------
// resume_agent
// ---------------------------------------------------------------------------

/**
 * Handle a resume_agent client message.
 * Clears the individual pause flag for the agent so future invocations proceed.
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room scope.
 * @param agentName - The agent to resume.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleResumeAgent(ws: any, roomId: string, agentName: string): void {
  const agentConf = getAgentConfig(agentName);
  if (!agentConf) {
    sendError(ws, `Unknown agent: ${agentName}`, 'UNKNOWN_AGENT');
    return;
  }

  logger.info({ agentName, roomId }, 'WS resume_agent');
  const unfrozen = resumeAgent(agentName, roomId);
  // Verify the process is still registered after SIGCONT — it may have completed between
  // the SIGCONT and this point. Stale Thinking broadcast would override a Done that already arrived.
  const stillAlive = unfrozen && activeProcesses.has(`${agentName}:${roomId}`);
  void updateStatusAndBroadcast(agentName, roomId, stillAlive ? AgentState.Thinking : AgentState.Idle);
  const resumeMsg = unfrozen
    ? `Agent ${agentName} resumed.`
    : `Agent ${agentName} resumed — invocations enabled.`;
  void postSystemMessage(roomId, resumeMsg);
}

// ---------------------------------------------------------------------------
// stop_all
// ---------------------------------------------------------------------------

/**
 * Handle a stop_all client message.
 * Atomically drains the pending queue and kills all in-flight agents for the room.
 * Replaces the N-message stopAll loop from the frontend, avoiding rate-limiter exposure.
 *
 * @param roomId - The room to stop all activity in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleStopAll(ws: any, roomId: string): void {
  stoppedRooms.add(roomId);
  const cleared = clearQueue(roomId);

  // Collect all in-flight agent keys for this room
  const suffix = `:${roomId}`;
  const activeAgents: string[] = [];
  for (const key of inFlight) {
    if (key.endsWith(suffix)) {
      activeAgents.push(key.slice(0, key.length - suffix.length));
    }
  }

  let killed = 0;
  for (const agentName of activeAgents) {
    const wasKilled = killAgent(agentName, roomId);
    if (wasKilled) {
      void updateStatusAndBroadcast(agentName, roomId, AgentState.Out);
      killed++;
    }
  }

  logger.info({ roomId, cleared, killed }, 'WS stop_all: queue cleared, agents killed');

  const parts: string[] = [];
  if (cleared > 0) parts.push(`${cleared} queued agent${cleared === 1 ? '' : 's'} removed`);
  if (killed > 0) parts.push(`${killed} running agent${killed === 1 ? '' : 's'} terminated`);
  if (parts.length > 0) {
    void postSystemMessage(roomId, `Stop all: ${parts.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------
// read_chat
// ---------------------------------------------------------------------------

/**
 * Handle a read_chat client message.
 * Fetches the most recent messages from the room and invokes the named agent
 * with a formatted transcript as the trigger prompt, so the agent can orient
 * itself in the ongoing conversation.
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room to read from.
 * @param agentName - The agent to invoke with the transcript.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleReadChat(ws: any, roomId: string, agentName: string): void {
  const agentConf = getAgentConfig(agentName);
  if (!agentConf || !agentConf.invokable) {
    sendError(ws, `Unknown or non-invokable agent: ${agentName}`, 'UNKNOWN_AGENT');
    return;
  }

  const room = getRoomById(roomId);
  if (!room) { sendError(ws, 'Room not found', 'ROOM_NOT_FOUND'); return; }

  const rows = getRecentMessages(roomId, READ_CHAT_LIMIT);
  if (rows.length === 0) {
    logger.info({ agentName, roomId }, 'WS read_chat: no messages in room');
    void postSystemMessage(roomId, `Agent ${agentName} requested chat context but the room has no messages yet.`);
    return;
  }

  // SEC-HIGH-002: Sanitize both author and content — author is user-supplied and can carry
  // trust-boundary delimiters that would let an attacker escape the transcript frame.
  const transcript = rows
    .map((row) => {
      const msg = mapMessageRow(row);
      return `[${sanitizePromptContent(msg.author)}]: ${sanitizePromptContent(msg.content)}`;
    })
    .join('\n');

  const prompt = `Please review the following recent conversation and respond if appropriate:\n\n${transcript}`;
  logger.info({ agentName, roomId, messageCount: rows.length }, 'WS read_chat: invoking agent with transcript');

  if (!insertAndBroadcastReadChat(ws, roomId, agentName, rows.length)) return;

  invokeAgent(roomId, agentName, prompt);
}
