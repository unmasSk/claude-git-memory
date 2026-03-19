/**
 * agent-stream.ts
 *
 * Stream-reading and result-handling helpers extracted from agent-runner.ts.
 *
 * Exports:
 *   - AgentStreamResult  — shaped data returned from the subprocess stdout
 *   - readAgentStream    — reads stdout line-by-line, fires tool callbacks,
 *                          returns AgentStreamResult
 *   - handleAgentResult  — post-stream logic: stale-session/rate-limit detection,
 *                          SKIP suppression, DB persist, broadcast, chain mentions
 *
 * Persist/broadcast helpers live in agent-result.ts.
 */

import { createLogger } from '../logger.js';
import { parseStreamLine } from './stream-parser.js';
import type { ResultEvent } from './stream-parser.js';
import {
  clearAgentSession,
} from '../db/queries.js';
import { broadcast } from './message-bus.js';
import { generateId } from '../utils.js';
import { AGENT_TIMEOUT_MS } from '../config.js';
import { AgentState } from '@agent-chatroom/shared';
import {
  formatToolDescription,
  validateSessionId,
  sanitizePromptContent,
  CONTEXT_OVERFLOW_SIGNAL,
} from './agent-prompt.js';
import { updateStatusAndBroadcast, postSystemMessage } from './agent-runner.js';
import type { InvocationContext } from './agent-scheduler.js';
import { persistAndBroadcast } from './agent-result.js';

const logger = createLogger('agent-stream');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shaped data collected from a single claude subprocess run.
 *
 * @property resultText         - The agent's final response text (empty when no result event arrived).
 * @property resultSessionId    - Validated UUID from the result event, or null if absent/invalid.
 * @property resultCostUsd      - Reported cost in USD from the result event.
 * @property resultSuccess      - True when the result event carried `success: true`.
 * @property resultDurationMs   - Wall-clock duration reported by claude, in milliseconds.
 * @property resultNumTurns     - Number of agentic turns reported by claude.
 * @property resultInputTokens  - Input token count from the result event.
 * @property resultOutputTokens - Output token count from the result event.
 * @property resultContextWindow - Context window size in tokens reported by claude.
 * @property hasResult          - True when at least one result event was parsed from stdout.
 * @property stderrOutput       - Raw concatenated stderr output from the subprocess.
 */
export interface AgentStreamResult {
  resultText: string;
  resultSessionId: string | null;
  resultCostUsd: number;
  resultSuccess: boolean;
  resultDurationMs: number;
  resultNumTurns: number;
  resultInputTokens: number;
  resultOutputTokens: number;
  resultContextWindow: number;
  hasResult: boolean;
  stderrOutput: string;
}

// ---------------------------------------------------------------------------
// readAgentStream
// ---------------------------------------------------------------------------

/**
 * Reads the subprocess stdout and stderr concurrently, parses stream-json
 * events line by line, and broadcasts tool_use events (throttled to 500 ms).
 * Returns an AgentStreamResult with all collected data.
 *
 * @param proc          - The spawned Bun subprocess with piped stdout/stderr.
 * @param agentName     - The agent being run (used in log and broadcast events).
 * @param roomId        - The room the agent is responding in (used in broadcast events).
 * @param timeoutHandle - The setTimeout handle from makeTimeoutHandle; cleared on stream end.
 * @returns A populated AgentStreamResult containing all parsed fields and raw stderr.
 */
export async function readAgentStream(
  proc: { stdout: ReadableStream<Uint8Array>; stderr: unknown; exited: Promise<number>; pid: number | undefined },
  agentName: string,
  roomId: string,
  timeoutHandle: ReturnType<typeof setTimeout>,
): Promise<AgentStreamResult> {
  const result: AgentStreamResult = {
    resultText: '', resultSessionId: null, resultCostUsd: 0, resultSuccess: false,
    resultDurationMs: 0, resultNumTurns: 0, resultInputTokens: 0, resultOutputTokens: 0,
    resultContextWindow: 0, hasResult: false, stderrOutput: '',
  };

  // Read stderr in background — never block stdout on it
  const stderrDone = readStderr(proc.stderr, result);
  let lastToolBroadcastTime = 0;
  const setTime = (t: number) => { lastToolBroadcastTime = t; };

  try {
    const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) await processStreamLine(line, agentName, roomId, result, lastToolBroadcastTime, setTime);
      }
    }
    if (buffer.trim()) await processStreamLine(buffer, agentName, roomId, result, lastToolBroadcastTime, setTime);
    await proc.exited;
    await stderrDone;
  } finally {
    clearTimeout(timeoutHandle);
  }
  // SEC-OPEN-012: Sanitize stderr before logging to avoid prompt injection in log pipelines
  if (result.stderrOutput.trim()) {
    logger.warn({ agentName, roomId, stderr: sanitizePromptContent(result.stderrOutput.trim()) }, 'subprocess stderr');
  }
  return result;
}

function readStderr(stderr: unknown, result: AgentStreamResult): Promise<void> {
  const stream = stderr as unknown as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  return (async () => {
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }
    result.stderrOutput = chunks.join('');
  })();
}

// ---------------------------------------------------------------------------
// processStreamLine — private helper, ≤30 LOC
// ---------------------------------------------------------------------------

async function processStreamLine(
  line: string,
  agentName: string,
  roomId: string,
  result: AgentStreamResult,
  lastToolBroadcastTime: number,
  setLastToolBroadcastTime: (t: number) => void,
): Promise<void> {
  const events = parseStreamLine(line);
  for (const event of events) {
    if (event.type === 'tool_use') {
      logger.debug({ agentName, roomId, tool: event.name }, 'tool_use');
      const now = Date.now();
      if (now - lastToolBroadcastTime > 500) {
        setLastToolBroadcastTime(now);
        await broadcast(roomId, {
          type: 'tool_event',
          id: generateId(),
          agent: agentName,
          tool: event.name,
          description: formatToolDescription(event.name, event.input),
        });
      }
      await updateStatusAndBroadcast(agentName, roomId, AgentState.ToolUse, event.name);
    } else if (event.type === 'result') {
      applyResultEvent(event, agentName, result);
    }
  }
}

// ---------------------------------------------------------------------------
// applyResultEvent — private helper, ≤30 LOC
// ---------------------------------------------------------------------------

function applyResultEvent(event: ResultEvent, agentName: string, result: AgentStreamResult): void {
  result.hasResult = true;
  result.resultText = event.result;
  result.resultSessionId = validateSessionId(event.sessionId);
  result.resultCostUsd = event.costUsd;
  result.resultSuccess = event.success;
  result.resultDurationMs = event.durationMs;
  result.resultNumTurns = event.numTurns;
  result.resultInputTokens = event.inputTokens;
  result.resultOutputTokens = event.outputTokens;
  result.resultContextWindow = event.contextWindow;

  const durationSec = (event.durationMs / 1000).toFixed(1);
  const totalTokens = event.inputTokens + event.outputTokens;
  const denialCount = event.permissionDenials.length;
  const logCtx = {
    agentName, success: result.resultSuccess, costUsd: result.resultCostUsd,
    durationMs: event.durationMs, numTurns: event.numTurns,
    inputTokens: event.inputTokens, outputTokens: event.outputTokens,
    cacheReadTokens: event.cacheReadTokens,
    permissionDenials: denialCount > 0 ? event.permissionDenials : undefined,
  };
  const mark = result.resultSuccess ? '✓' : '✗';
  logger.info(logCtx, `${agentName} ${mark} ${durationSec}s | ${event.numTurns} turns | ${totalTokens.toLocaleString()} tokens | $${result.resultCostUsd.toFixed(4)}${denialCount ? ` | ${denialCount} denied` : ''}`);
}

// ---------------------------------------------------------------------------
// handleAgentResult
// ---------------------------------------------------------------------------

/**
 * Post-stream result handler. Covers:
 *   - stale-session / context-overflow detection → schedules retry, returns true
 *   - rate-limit detection → releases lock, schedules delayed retry, returns false
 *   - empty result → posts system message, returns false
 *   - SKIP suppression → returns false
 *   - happy path: truncate, persist, broadcast, chain mentions, update session/cost
 *
 * @param sr        - The AgentStreamResult returned by readAgentStream.
 * @param roomId    - The room the agent ran in.
 * @param agentName - The agent that was run.
 * @param model     - The model identifier used for this invocation (persisted with the message).
 * @param context   - Invocation context carrying trigger content, turn counts, and retry flags.
 * @returns true when a retry was scheduled internally (RACE-002 signal, caller must skip cleanup);
 *          false in all other cases (success, error, empty, SKIP, rate-limit).
 */
export async function handleAgentResult(
  sr: AgentStreamResult,
  roomId: string,
  agentName: string,
  model: string,
  context: InvocationContext,
): Promise<boolean> {
  if (sr.hasResult && !sr.resultSuccess) {
    return handleFailedResult(sr, roomId, agentName, context);
  }

  if (!sr.hasResult || !sr.resultText.trim()) {
    return handleEmptyResult(sr, roomId, agentName, context);
  }

  // SKIP mechanism: agent explicitly opted out
  if (/^skip\.?$/i.test(sr.resultText.trim())) {
    logger.debug({ agentName, roomId }, 'SKIP received — suppressing message');
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
    return false;
  }

  await persistAndBroadcast(sr, roomId, agentName, model, context);
  return false;
}

// ---------------------------------------------------------------------------
// handleFailedResult — private, ≤30 LOC
// ---------------------------------------------------------------------------

async function handleFailedResult(
  sr: AgentStreamResult,
  roomId: string,
  agentName: string,
  context: InvocationContext,
): Promise<boolean> {
  const lo = (s: string) => s.toLowerCase();
  const isContextOverflow = lo(sr.resultText).includes(CONTEXT_OVERFLOW_SIGNAL) || lo(sr.stderrOutput).includes(CONTEXT_OVERFLOW_SIGNAL);
  const isStaleSession = isContextOverflow || sr.resultText.includes('No conversation found') || sr.resultText.includes('conversation not found');
  if (isStaleSession) {
    clearAgentSession(agentName, roomId);
    const staleReason = isContextOverflow ? 'context too long' : 'stale session';
    logger.warn({ agentName, roomId, staleReason }, 'stale session detected — scheduling retry');
    if (isContextOverflow) {
      const display = agentName.charAt(0).toUpperCase() + agentName.slice(1);
      await postSystemMessage(roomId, `🔄 ${display} reinvocado (contexto agotado, nueva sesión)`);
    } else {
      await postSystemMessage(roomId, `Agent ${agentName}: ${staleReason} detected, retrying fresh...`);
    }
    context.isRespawn = isContextOverflow;
    const { scheduleInvocation } = await import('./agent-scheduler.js');
    scheduleInvocation(roomId, agentName, context, true, true);
    return true;
  }

  const errorMsg = sanitizePromptContent(sr.resultText || 'Agent returned an error result');
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Error, errorMsg);
  await postSystemMessage(roomId, `Agent ${agentName} failed: ${errorMsg}`);
  return false;
}

// ---------------------------------------------------------------------------
// handleEmptyResult — private, ≤30 LOC
// ---------------------------------------------------------------------------

async function handleEmptyResult(
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

  await postSystemMessage(roomId, `Agent ${agentName} returned no response.`);
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
  return false;
}

