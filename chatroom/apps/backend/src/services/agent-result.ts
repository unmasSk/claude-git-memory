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
} from '../db/queries.js';
import { generateId, nowIso } from '../utils.js';
import type { Message } from '@agent-chatroom/shared';
import { AgentState } from '@agent-chatroom/shared';
import { sanitizePromptContent } from './agent-prompt.js';
import { extractMentions } from './mention-parser.js';
import { updateStatusAndBroadcast, postSystemMessage } from './agent-runner.js';
import type { InvocationContext } from './agent-scheduler.js';
import type { AgentStreamResult } from './agent-stream.js';

const logger = createLogger('agent-result');

const MAX_AGENT_RESPONSE_BYTES = 256_000;

// ---------------------------------------------------------------------------
// maybeTruncate
// ---------------------------------------------------------------------------

export function maybeTruncate(text: string, agentName: string, roomId: string): string {
  const byteLength = Buffer.byteLength(text, 'utf8');
  if (byteLength <= MAX_AGENT_RESPONSE_BYTES) return text;
  logger.warn({ agentName, roomId, byteLength, cap: MAX_AGENT_RESPONSE_BYTES },
    'agent response exceeds size cap — truncating before DB insert');
  return text.slice(0, MAX_AGENT_RESPONSE_BYTES) + '\n[...truncated]';
}

// ---------------------------------------------------------------------------
// buildAgentMessage
// ---------------------------------------------------------------------------

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
    const { invokeAgents } = await import('./agent-scheduler.js');
    invokeAgents(roomId, chainedMentions, sanitizePromptContent(resultText), updatedTurns);
  }
}

// ---------------------------------------------------------------------------
// persistAndBroadcast
// ---------------------------------------------------------------------------

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
  await scheduleChainMentions(resultText, agentName, roomId, context);

  upsertAgentSession({ agentName, roomId, sessionId: sr.resultSessionId, model, status: 'done' });
  if (sr.resultCostUsd > 0) incrementAgentCost(agentName, roomId, sr.resultCostUsd);
  incrementAgentTurnCount(agentName, roomId);
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
}
