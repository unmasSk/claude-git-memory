/**
 * agent-result.ts
 *
 * Post-stream result helpers extracted from agent-stream.ts.
 *
 * Exports:
 *   - persistAndBroadcast   — truncate, persist, broadcast, chain mentions, update session/cost
 *   - buildAgentMessage     — construct the Message + metadata from a stream result
 *   - scheduleChainMentions — extract @mentions from result text and enqueue follow-on invocations
 *   - maybeTruncate         — cap response at MAX_AGENT_RESPONSE_BYTES before DB insert
 */

import { createLogger } from '../logger.js';
import { broadcast } from './message-bus.js';
import {
  upsertAgentSession,
  incrementAgentCost,
  incrementAgentTurnCount,
  insertMessage,
  clearAgentSession,
  updateAgentMetrics,
  updateLastSeenMessage,
} from '../db/queries.js';
import { generateId, nowIso } from '../utils.js';
import type { Message } from '@agent-chatroom/shared';
import { AgentState } from '@agent-chatroom/shared';
import { sanitizePromptContent, CONTEXT_OVERFLOW_SIGNAL } from './agent-prompt.js';
import { extractMentions } from './mention-parser.js';
import { updateStatusAndBroadcast, postSystemMessage } from './agent-runner.js';
import type { InvocationContext } from './agent-scheduler.js';
import type { AgentStreamResult } from './agent-stream.js';
import { isAgentPaused, isAgentKilled, clearKilledAgent } from './agent-queue.js';

const logger = createLogger('agent-result');

const MAX_AGENT_RESPONSE_BYTES = 256_000;

// ---------------------------------------------------------------------------
// maybeTruncate
// ---------------------------------------------------------------------------

/**
 * Caps a response string at MAX_AGENT_RESPONSE_BYTES before DB insert to prevent
 * oversized rows. Appends a `[...truncated]` marker when the cap is reached.
 *
 * @param text      - The raw agent response text to cap.
 * @param agentName - The agent that produced the text (used in the warning log).
 * @param roomId    - The room the agent responded in (used in the warning log).
 * @returns The original text when within the byte cap; a byte-safe truncation otherwise.
 */
export function maybeTruncate(text: string, agentName: string, roomId: string): string {
  const byteLength = Buffer.byteLength(text, 'utf8');
  if (byteLength <= MAX_AGENT_RESPONSE_BYTES) return text;
  logger.warn({ agentName, roomId, byteLength, cap: MAX_AGENT_RESPONSE_BYTES },
    'agent response exceeds size cap — truncating before DB insert');
  return Buffer.from(text).subarray(0, MAX_AGENT_RESPONSE_BYTES).toString('utf-8') + '\n[...truncated]';
}

// ---------------------------------------------------------------------------
// buildAgentMessage
// ---------------------------------------------------------------------------

/**
 * Constructs the `Message` object and its associated metadata record from a completed
 * stream result. Does not persist or broadcast — callers do that.
 *
 * @param sr         - The AgentStreamResult containing session, cost, and token fields.
 * @param resultText - The (possibly truncated) response text to embed in the message.
 * @param roomId     - The room the message belongs to.
 * @param agentName  - The agent author of the message.
 * @param model      - The model identifier used for this invocation.
 * @returns An object containing the ready-to-persist `message` and the raw `meta` record.
 */
export function buildAgentMessage(
  sr: AgentStreamResult,
  resultText: string,
  roomId: string,
  agentName: string,
  model: string,
): { message: Message; meta: Record<string, unknown> } {
  const msgId = generateId();
  const createdAt = nowIso();
  const meta = {
    sessionId: sr.resultSessionId, costUsd: sr.resultCostUsd, model,
    durationMs: sr.resultDurationMs, numTurns: sr.resultNumTurns,
    inputTokens: sr.resultInputTokens, outputTokens: sr.resultOutputTokens,
    contextWindow: sr.resultContextWindow,
  };
  const message: Message = {
    id: msgId, roomId, author: agentName, authorType: 'agent',
    content: resultText, msgType: 'message', parentId: null,
    metadata: { ...meta, sessionId: sr.resultSessionId ?? undefined },
    createdAt,
  };
  return { message, meta };
}

// ---------------------------------------------------------------------------
// scheduleChainMentions
// ---------------------------------------------------------------------------

/**
 * Extracts @mentions from a completed agent response, enforces a per-agent turn cap of 5,
 * and enqueues follow-on invocations for agents that are within the cap.
 * Posts a system message listing any agents that were blocked by the turn cap.
 *
 * @param resultText - The agent's response text to scan for @mentions.
 * @param agentName  - The agent that just responded (excluded from its own mentions).
 * @param roomId     - The room to invoke chained agents in.
 * @param context    - Invocation context carrying the current per-agent turn counts.
 * @returns Resolves when all eligible agents have been enqueued and any blocked-agent
 *          system message has been posted.
 */
export async function scheduleChainMentions(resultText: string, agentName: string, roomId: string, context: InvocationContext): Promise<void> {
  const updatedTurns = new Map(context.agentTurns);
  updatedTurns.set(agentName, (updatedTurns.get(agentName) ?? 0) + 1);

  const rawMentions = extractMentions(resultText);
  const chainedMentions = new Set<string>();
  const blockedAgents: string[] = [];
  for (const name of rawMentions) {
    if (name === agentName) continue;
    if ((updatedTurns.get(name) ?? 0) >= 5) blockedAgents.push(name);
    else chainedMentions.add(name);
  }

  logger.debug({ agentName, roomId, turns: Object.fromEntries(updatedTurns), allowed: [...chainedMentions], blocked: blockedAgents }, 'chain mentions');

  if (blockedAgents.length > 0) {
    await postSystemMessage(roomId, `Agent(s) ${blockedAgents.join(', ')} reached max turns (5). Mentions not invoked.`);
  }
  if (chainedMentions.size > 0) {
    const { invokeAgents, stoppedRooms } = await import('./agent-scheduler.js');
    if (stoppedRooms.has(roomId)) {
      logger.info({ roomId, chainedMentions: [...chainedMentions] }, 'scheduleChainMentions: room stopped — chain suppressed');
    } else {
      invokeAgents(roomId, chainedMentions, sanitizePromptContent(resultText), updatedTurns);
    }
  }
}

// ---------------------------------------------------------------------------
// persistAndBroadcast
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// handleFailedResult
// ---------------------------------------------------------------------------

/**
 * Handles a stream result where `sr.hasResult` is true but `sr.resultSuccess` is false.
 * Detects stale-session and context-overflow conditions, scheduling a retry when found.
 * Falls through to posting an error system message for all other failures.
 *
 * @param sr - The AgentStreamResult from readAgentStream.
 * @param roomId - The room the agent ran in.
 * @param agentName - The agent that was run.
 * @param context - Invocation context carrying trigger content, turn counts, and retry flags.
 * @returns true when a stale-session retry was scheduled (caller must skip cleanup);
 *          false for all other failure modes.
 */
// Note: handleFailedResult and handleEmptyResult intentionally do NOT advance
// the last_seen_message_id checkpoint. Only persistAndBroadcast (the happy path)
// advances the checkpoint — failed/empty runs leave it in place so the agent
// will re-process the same message window on the next invocation.
export async function handleFailedResult(
  sr: AgentStreamResult,
  roomId: string,
  agentName: string,
  context: InvocationContext,
): Promise<boolean> {
  const lo = (s: string) => s.toLowerCase();
  const isContextOverflow = lo(sr.resultText).includes(CONTEXT_OVERFLOW_SIGNAL) || lo(sr.stderrOutput).includes(CONTEXT_OVERFLOW_SIGNAL);
  const isStaleSession = isContextOverflow || sr.resultText.includes('No conversation found') || sr.resultText.includes('conversation not found');
  if (isContextOverflow) {
    clearAgentSession(agentName, roomId);
    logger.warn({ agentName, roomId }, 'context overflow — no auto-respawn, emitting context_overflow badge');
    const display = agentName.charAt(0).toUpperCase() + agentName.slice(1);
    await postSystemMessage(roomId, `⚠️ ${display} ran out of context. Click the badge to reinvoke.`);
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Out);
    await broadcast(roomId, { type: 'context_overflow', agentName });
    return false;
  }

  if (isStaleSession) {
    clearAgentSession(agentName, roomId);
    logger.warn({ agentName, roomId }, 'stale session detected — scheduling retry');
    await postSystemMessage(roomId, `Agent ${agentName}: stale session detected, retrying fresh...`);
    const { scheduleInvocation } = await import('./agent-scheduler.js');
    scheduleInvocation(roomId, agentName, context, true, true);
    return true;
  }

  const errorMsg = sanitizePromptContent(sr.resultText || 'Agent returned an error result');
  const killed = isAgentKilled(agentName, roomId);
  clearKilledAgent(agentName, roomId);
  // Suppress error output for killed agents — Out status was already set by killAgent.
  if (killed) return false;
  // Fix 4: do not overwrite Paused status when agent completed while frozen.
  if (!isAgentPaused(agentName, roomId)) {
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Error, errorMsg);
  }
  await postSystemMessage(roomId, `Agent ${agentName} failed: ${errorMsg}`);
  return false;
}

// ---------------------------------------------------------------------------
// handleEmptyResult
// ---------------------------------------------------------------------------

/**
 * Handles a stream result where no result event arrived or the result text is blank.
 * Detects rate-limit conditions in stderr and schedules a delayed retry when found.
 * Falls through to posting a "no response" system message for all other empty results.
 *
 * @param sr - The AgentStreamResult from readAgentStream.
 * @param roomId - The room the agent ran in.
 * @param agentName - The agent that was run.
 * @param context - Invocation context carrying trigger content, turn counts, and retry flags.
 * @returns false in all cases (rate-limit retry is fire-and-forget, caller proceeds normally).
 */
export async function handleEmptyResult(
  sr: AgentStreamResult,
  roomId: string,
  agentName: string,
  context: InvocationContext,
): Promise<boolean> {
  const isRateLimit =
    sr.stderrOutput.includes('429') ||
    sr.stderrOutput.toLowerCase().includes('rate limit') ||
    sr.stderrOutput.toLowerCase().includes('overloaded') ||
    sr.stderrOutput.toLowerCase().includes('too many requests');

  if (isRateLimit && !context.rateLimitRetry) {
    logger.warn({ agentName, roomId }, 'rate limit detected — releasing lock and retrying in 12s');
    await postSystemMessage(roomId, `Agent ${agentName}: rate limited, retrying in 12s...`);
    context.rateLimitRetry = true;
    const key = `${agentName}:${roomId}`;
    const sched = await import('./agent-scheduler.js');
    sched.inFlight.delete(key);
    sched.activeInvocations.delete(key);
    sched.drainQueue();
    setTimeout(() => { sched.scheduleInvocation(roomId, agentName, context, false); }, 12_000);
    return false;
  }

  const killed = isAgentKilled(agentName, roomId);
  clearKilledAgent(agentName, roomId);
  // Suppress output for killed agents — Out status was already set by killAgent.
  if (!killed) {
    await postSystemMessage(roomId, `Agent ${agentName} returned no response.`);
  }
  // Fix 4: do not overwrite Paused status when agent completed while frozen.
  if (!isAgentPaused(agentName, roomId) && !killed) {
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
  }
  return false;
}

// ---------------------------------------------------------------------------
// persistAndBroadcast
// ---------------------------------------------------------------------------

/**
 * Happy-path post-stream handler: truncates the result text, persists the message to DB,
 * broadcasts it to the room, schedules any chained @mentions, and updates agent session
 * state and cost counters.
 *
 * @param sr        - The AgentStreamResult returned by readAgentStream.
 * @param roomId    - The room the agent responded in.
 * @param agentName - The agent that produced the response.
 * @param model     - The model identifier used for this invocation (persisted in metadata).
 * @param context   - Invocation context used by scheduleChainMentions for turn accounting.
 * @returns Resolves when the message is persisted, broadcast, and all follow-on work is queued.
 */
export async function persistAndBroadcast(
  sr: AgentStreamResult,
  roomId: string,
  agentName: string,
  model: string,
  context: InvocationContext,
): Promise<void> {
  const resultText = maybeTruncate(sr.resultText, agentName, roomId);
  const { message, meta } = buildAgentMessage(sr, resultText, roomId, agentName, model);

  // SEC-FIX 5: Store sessionId in DB; message-bus.ts strips it before broadcast
  insertMessage({ id: message.id, roomId, author: agentName, authorType: 'agent',
    content: resultText, msgType: 'message', parentId: null, metadata: JSON.stringify(meta) });

  await broadcast(roomId, { type: 'new_message', message });

  // Read the pause/kill flags once — avoids races between checks.
  // Must be done before scheduleChainMentions to gate chain invocations on killed agents.
  const isPaused = isAgentPaused(agentName, roomId);
  const isKilled = isAgentKilled(agentName, roomId);
  clearKilledAgent(agentName, roomId);

  // T3: do not chain mentions from a killed agent — SIGTERM raced with result production.
  if (!isKilled) await scheduleChainMentions(resultText, agentName, roomId, context);

  // SEC-CRT-002: advance the checkpoint AFTER chain mentions are enqueued so that
  // chained agents see the full context including this message when they are invoked.
  updateLastSeenMessage(agentName, roomId, message.id);

  const finalStatus = isPaused ? 'paused' : isKilled ? 'out' : 'done';
  upsertAgentSession({ agentName, roomId, sessionId: sr.resultSessionId, model, status: finalStatus });
  if (sr.resultCostUsd > 0) incrementAgentCost(agentName, roomId, sr.resultCostUsd);
  incrementAgentTurnCount(agentName, roomId);
  // Persist metrics to DB so room_state on reconnection includes up-to-date token counts.
  updateAgentMetrics(agentName, roomId, {
    inputTokens: sr.resultInputTokens,
    outputTokens: sr.resultOutputTokens,
    contextWindow: sr.resultContextWindow,
    durationMs: sr.resultDurationMs,
    numTurns: sr.resultNumTurns,
  });

  // Fix 4: do not overwrite Paused status when the agent completes while frozen.
  // Kill guard: do not overwrite Out status when the agent completed a result after SIGTERM.
  if (!isPaused && !isKilled) {
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Done, undefined, {
      durationMs: sr.resultDurationMs,
      numTurns: sr.resultNumTurns,
      inputTokens: sr.resultInputTokens,
      outputTokens: sr.resultOutputTokens,
      contextWindow: sr.resultContextWindow,
    });
  }
}
