/**
 * agent-runner.ts
 *
 * Subprocess lifecycle: spawns `claude -p`, parses its stream-json output,
 * persists results to DB, and broadcasts messages to the room.
 *
 * Exports:
 *   - doInvoke       — core invocation (config validation, prompt build, spawn)
 *   - spawnAndParse  — subprocess spawn + stream parse loop
 *   - postSystemMessage    — post a system message and broadcast it
 *   - updateStatusAndBroadcast — update agent status in DB and broadcast
 *
 * Dependency direction: runner → prompt (static). Runner → scheduler (dynamic
 * imports only, to avoid a circular static import cycle).
 */

import { createLogger } from '../logger.js';
import { parseStreamLine } from './stream-parser.js';
import { getAgentConfig, BANNED_TOOLS } from './agent-registry.js';
import { extractMentions } from './mention-parser.js';
import { broadcast } from './message-bus.js';
import {
  getAgentSession,
  upsertAgentSession,
  updateAgentStatus,
  incrementAgentCost,
  incrementAgentTurnCount,
  clearAgentSession,
  insertMessage,
} from '../db/queries.js';
import { generateId, nowIso } from '../utils.js';
import { AGENT_TIMEOUT_MS } from '../config.js';
import type { Message } from '@agent-chatroom/shared';
import { AgentState } from '@agent-chatroom/shared';
import {
  buildPrompt,
  buildSystemPrompt,
  sanitizePromptContent,
  formatToolDescription,
  validateSessionId,
  CONTEXT_OVERFLOW_SIGNAL,
} from './agent-prompt.js';
import type { InvocationContext } from './agent-scheduler.js';

const logger = createLogger('agent-runner');

// ---------------------------------------------------------------------------
// Core invocation
// ---------------------------------------------------------------------------

/**
 * Core invocation. Returns true when a retry was scheduled from within
 * (RACE-002), signalling runInvocation to skip inFlight/activeInvocations
 * cleanup so the retry's entries are not clobbered.
 */
export async function doInvoke(
  roomId: string,
  agentName: string,
  context: InvocationContext,
  isRetry: boolean,
): Promise<boolean> {
  // Issue #36: local flag replaces context.retryScheduled mutation.
  let retryScheduled = false;
  // SEC-FIX 3: Fail-closed — validate agent config and tools
  const agentConfig = getAgentConfig(agentName);

  logger.debug({ agentName, roomId, configFound: !!agentConfig, isRetry }, 'doInvoke');

  if (!agentConfig) {
    await postSystemMessage(roomId, `Unknown agent: ${agentName}`);
    return false;
  }

  if (!agentConfig.invokable) {
    await postSystemMessage(roomId, `Agent ${agentName} cannot be invoked: no tools configured.`);
    return false;
  }

  // SEC-FIX 3: Filter banned tools (belt-and-suspenders — registry already does this,
  // but we enforce here too so the invoker is safe regardless of registry state)
  const allowedTools = agentConfig.allowedTools.filter((t) => !BANNED_TOOLS.includes(t));

  logger.debug({ agentName, roomId, allowedTools, triggerBytes: context.triggerContent.length }, 'doInvoke tools');

  if (allowedTools.length === 0) {
    await postSystemMessage(roomId, `Agent ${agentName} has no permitted tools after security filtering.`);
    return false;
  }

  // Get existing session for --resume
  const existingSession = getAgentSession(agentName, roomId);
  let sessionId = validateSessionId(existingSession?.session_id);

  // FIX 2: If this is already a stale-session retry, run without --resume
  if (isRetry) {
    sessionId = null;
  }

  // Broadcast status: thinking
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Thinking);

  try {
    // Build prompt with injection defense inside try/catch so DB or sanitization
    // errors are surfaced as agent errors rather than uncaught promise rejections.
    // For respawned instances (context overflow), pass a high history limit so
    // the fresh agent gets the full conversation, not just the recent window.
    const prompt = buildPrompt(roomId, context.triggerContent, context.isRespawn ? 2000 : undefined);

    // Build system prompt with security rules.
    // For respawned instances, include a self-orientation notice.
    const systemPrompt = buildSystemPrompt(agentName, agentConfig.role, context.isRespawn);

    retryScheduled = await spawnAndParse(
      roomId,
      agentName,
      agentConfig.model,
      allowedTools,
      prompt,
      systemPrompt,
      sessionId,
      context,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ agentName, roomId, err: message }, 'error in doInvoke');
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Error, message);
    await postSystemMessage(roomId, `Agent ${agentName} error: ${message}`);
  }

  return retryScheduled;
}

// ---------------------------------------------------------------------------
// Subprocess spawn and stream parsing
// ---------------------------------------------------------------------------

/**
 * Spawns the claude subprocess and parses its stream output.
 * Returns true when a retry was scheduled from within (RACE-002 signal).
 */
export async function spawnAndParse(
  roomId: string,
  agentName: string,
  model: string,
  allowedTools: string[],
  prompt: string,
  systemPrompt: string,
  sessionId: string | null,
  context: InvocationContext,
): Promise<boolean> {
  // Build args array — NEVER use shell string concatenation (Bun.spawn with array)
  const args: string[] = [
    'claude',
    '-p',
    prompt,
    '--model',
    model,
    '--append-system-prompt',
    systemPrompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--allowedTools',
    allowedTools.join(','),
    '--permission-mode',
    'auto',
  ];

  // FIX 2 + SEC-FIX 4: Only add --resume if we have a valid UUID session ID
  if (sessionId) {
    args.push('--resume', sessionId);
  }

  logger.debug({ agentName, roomId, model, sessionId: sessionId ?? 'new' }, 'spawnAndParse');

  // FIX 16 / House diagnostic: On Unix, detached creates a process group for
  // group kill on timeout. On Windows, both detached AND windowsHide are broken
  // in Bun 1.3.11 — windowsHide is INVERTED (creates windows), detached creates
  // console windows, and process.kill(-pid) fails with ESRCH. Piped stdio alone
  // suppresses console windows on Windows.
  const isUnix = process.platform !== 'win32';
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    ...(isUnix ? { detached: true } : {}),
  } as any);

  logger.debug({ agentName, roomId, pid: proc.pid }, 'subprocess spawned');

  // FIX 16: Orphan cleanup on timeout
  const timeoutHandle = setTimeout(() => {
    logger.warn({ agentName, roomId, pid: proc.pid }, 'timeout reached — killing subprocess');
    try {
      if (process.platform !== 'win32') {
        // Negative PID = process group kill on Unix
        process.kill(-(proc.pid as number), 'SIGTERM');
      } else {
        // On Windows, kill the process directly (no process groups via detached)
        proc.kill();
      }
    } catch {
      // Fallback to direct kill if process group kill fails
      proc.kill();
    }
  }, AGENT_TIMEOUT_MS);

  let resultText = '';
  let resultSessionId: string | null = null;
  let resultCostUsd = 0;
  let resultSuccess = false;
  let resultDurationMs = 0;
  let resultNumTurns = 0;
  let resultInputTokens = 0;
  let resultOutputTokens = 0;
  let resultContextWindow = 0;
  let hasResult = false;
  // Track last tool event per agent to avoid spamming the UI (FIX 17 partial)
  let lastToolBroadcastTime = 0;
  // Collect stderr for error diagnosis (House diagnostic: rate limit detection)
  let stderrOutput = '';

  // Read stderr in background — never block stdout on it
  // proc.stderr is always present because we spawn with { stderr: 'pipe' }
  const stderrStream = proc.stderr as unknown as ReadableStream<Uint8Array>;
  const stderrReader = stderrStream.getReader();
  const stderrDecoder = new TextDecoder();
  const stderrDone = (async () => {
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      chunks.push(stderrDecoder.decode(value));
    }
    stderrOutput = chunks.join('');
  })();

  try {
    // Read stdout line by line
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        const events = parseStreamLine(line);
        for (const event of events) {
          if (event.type === 'tool_use') {
            logger.debug({ agentName, roomId, tool: event.name }, 'tool_use');
            // Broadcast tool event (throttle to avoid render storm — FIX 17)
            const now = Date.now();
            if (now - lastToolBroadcastTime > 500) {
              lastToolBroadcastTime = now;
              await broadcast(roomId, {
                type: 'tool_event',
                id: generateId(),
                agent: agentName,
                tool: event.name,
                description: formatToolDescription(event.name, event.input),
              });
            }
            // Always update status to tool-use
            await updateStatusAndBroadcast(agentName, roomId, AgentState.ToolUse, event.name);
          } else if (event.type === 'result') {
            hasResult = true;
            resultText = event.result;
            resultSessionId = validateSessionId(event.sessionId);
            resultCostUsd = event.costUsd;
            resultSuccess = event.success;
            resultDurationMs = event.durationMs;
            resultNumTurns = event.numTurns;
            resultInputTokens = event.inputTokens;
            resultOutputTokens = event.outputTokens;
            resultContextWindow = event.contextWindow;
            const durationSec = (event.durationMs / 1000).toFixed(1);
            const totalTokens = event.inputTokens + event.outputTokens;
            const denialCount = event.permissionDenials.length;
            logger.info(
              {
                agentName,
                success: resultSuccess,
                costUsd: resultCostUsd,
                durationMs: event.durationMs,
                numTurns: event.numTurns,
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                cacheReadTokens: event.cacheReadTokens,
                permissionDenials: denialCount > 0 ? event.permissionDenials : undefined,
              },
              `${agentName} ${resultSuccess ? '✓' : '✗'} ${durationSec}s | ${event.numTurns} turns | ${totalTokens.toLocaleString()} tokens | $${resultCostUsd.toFixed(4)}${denialCount ? ` | ${denialCount} denied` : ''}`,
            );
          }
          // text events are collected implicitly via resultText from the result event
        }
      }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
      const events = parseStreamLine(buffer);
      for (const event of events) {
        if (event.type === 'result') {
          hasResult = true;
          resultText = event.result;
          resultSessionId = validateSessionId(event.sessionId);
          resultCostUsd = event.costUsd;
          resultSuccess = event.success;
        }
      }
    }

    await proc.exited;
    await stderrDone; // ensure stderr fully collected before we inspect it
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (stderrOutput.trim()) {
    // SEC-OPEN-012: Sanitize stderr before logging — subprocess output can contain
    // prompt injection markers that would poison structured log ingestion pipelines.
    const safeStderr = sanitizePromptContent(stderrOutput.trim());
    logger.warn({ agentName, roomId, stderr: safeStderr }, 'subprocess stderr');
  }

  // FIX 2: Stale session detection (includes context-overflow "Prompt is too long")
  // FIX 1: Case-insensitive match — Claude may vary capitalisation across versions.
  if (hasResult && !resultSuccess) {
    const isContextOverflow =
      resultText.toLowerCase().includes(CONTEXT_OVERFLOW_SIGNAL) ||
      stderrOutput.toLowerCase().includes(CONTEXT_OVERFLOW_SIGNAL);

    const isStaleSession =
      isContextOverflow ||
      resultText.includes('No conversation found') ||
      resultText.includes('conversation not found');

    if (isStaleSession) {
      // Clear stale/overflowed session and retry without --resume (one retry only)
      clearAgentSession(agentName, roomId);
      const staleReason = isContextOverflow ? 'context too long' : 'stale session';
      logger.warn({ agentName, roomId, staleReason }, 'stale session detected — scheduling retry');

      if (isContextOverflow) {
        // Visible announcement: all participants (humans and agents) must know
        // this is a fresh instance, not a continuation of the exhausted session.
        const agentDisplayName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
        await postSystemMessage(roomId, `🔄 ${agentDisplayName} reinvocado (contexto agotado, nueva sesión)`);
      } else {
        await postSystemMessage(roomId, `Agent ${agentName}: ${staleReason} detected, retrying fresh...`);
      }

      // RACE-002: Mark context for the retry so it receives full history and a
      // self-orientation notice in the prompt.
      context.isRespawn = isContextOverflow;

      // Schedule the retry — isRetry=true prevents another retry loop.
      // FIX 7: priority=true so the respawn isn't starved behind accumulated agent chains.
      // Dynamic import breaks the circular static dependency: runner → scheduler.
      const { scheduleInvocation } = await import('./agent-scheduler.js');
      scheduleInvocation(roomId, agentName, context, true, true);
      // Issue #36: return true so runInvocation skips inFlight/activeInvocations cleanup
      // (RACE-002: the retry call above already inserted its own entries).
      return true;
    }

    // Non-stale error result
    const errorMsg = resultText || 'Agent returned an error result';
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Error, errorMsg);
    await postSystemMessage(roomId, `Agent ${agentName} failed: ${errorMsg}`);
    return false;
  }

  if (!hasResult || !resultText.trim()) {
    // House diagnostic: detect rate limit / overload in stderr → retry with backoff
    const isRateLimit =
      stderrOutput.includes('429') ||
      stderrOutput.toLowerCase().includes('rate limit') ||
      stderrOutput.toLowerCase().includes('overloaded') ||
      stderrOutput.toLowerCase().includes('too many requests');

    if (isRateLimit && !context.rateLimitRetry) {
      logger.warn({ agentName, roomId }, 'rate limit detected — releasing lock and retrying in 12s');
      await postSystemMessage(roomId, `Agent ${agentName}: rate limited, retrying in 12s...`);
      context.rateLimitRetry = true;
      // Release the in-flight lock immediately so drainQueue can serve other agents
      // during the 12s wait. The retry re-acquires the lock when it runs.
      const key = `${agentName}:${roomId}`;
      // Dynamic import: runner → scheduler (avoids circular static import)
      const sched = await import('./agent-scheduler.js');
      sched.inFlight.delete(key);
      sched.activeInvocations.delete(key);
      sched.drainQueue();
      setTimeout(() => {
        sched.scheduleInvocation(roomId, agentName, context, false);
      }, 12_000);
      // Return false — lock was already released above; runInvocation must NOT
      // skip cleanup (there is nothing to preserve at this point).
      return false;
    }

    await postSystemMessage(roomId, `Agent ${agentName} returned no response.`);
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
    return false;
  }

  // SKIP mechanism: agent explicitly opted out — suppress message entirely
  if (/^skip\.?$/i.test(resultText.trim())) {
    logger.debug({ agentName, roomId }, 'SKIP received — suppressing message');
    await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
    return false;
  }

  // Cap response size before DB insert to prevent SQLite page exhaustion and
  // unbounded broadcast payloads. Truncation is logged as a warning.
  const MAX_AGENT_RESPONSE_BYTES = 256_000;
  const responseByteLength = Buffer.byteLength(resultText, 'utf8');
  if (responseByteLength > MAX_AGENT_RESPONSE_BYTES) {
    logger.warn(
      { agentName, roomId, byteLength: responseByteLength, cap: MAX_AGENT_RESPONSE_BYTES },
      'agent response exceeds size cap — truncating before DB insert',
    );
    // Truncate to cap bytes at a character boundary (slice operates on code units, close enough for UTF-8 prose)
    resultText = resultText.slice(0, MAX_AGENT_RESPONSE_BYTES) + '\n[...truncated]';
  }

  // Persist and broadcast the agent's response message
  const msgId = generateId();
  const createdAt = nowIso();

  insertMessage({
    id: msgId,
    roomId,
    author: agentName,
    authorType: 'agent',
    content: resultText,
    msgType: 'message',
    parentId: null,
    // SEC-FIX 5: Store sessionId in DB for --resume, but message-bus.ts strips it before broadcast
    metadata: JSON.stringify({
      sessionId: resultSessionId,
      costUsd: resultCostUsd,
      model,
      durationMs: resultDurationMs,
      numTurns: resultNumTurns,
      inputTokens: resultInputTokens,
      outputTokens: resultOutputTokens,
      contextWindow: resultContextWindow,
    }),
  });

  const agentMessage: Message = {
    id: msgId,
    roomId,
    author: agentName,
    authorType: 'agent',
    content: resultText,
    msgType: 'message',
    parentId: null,
    metadata: {
      // sessionId intentionally included here — message-bus.ts strips it before broadcast
      sessionId: resultSessionId ?? undefined,
      costUsd: resultCostUsd,
      model,
      durationMs: resultDurationMs,
      numTurns: resultNumTurns,
      inputTokens: resultInputTokens,
      outputTokens: resultOutputTokens,
      contextWindow: resultContextWindow,
    },
    createdAt,
  };

  await broadcast(roomId, { type: 'new_message', message: agentMessage });

  // Agent→agent chained @mentions: per-agent turn limit (5 per agent per chain)
  const updatedTurns = new Map(context.agentTurns);
  updatedTurns.set(agentName, (updatedTurns.get(agentName) ?? 0) + 1);

  const rawMentions = extractMentions(resultText);
  // Filter out agents that have reached their 5-turn limit
  const chainedMentions = new Set<string>();
  const blockedAgents: string[] = [];
  for (const name of rawMentions) {
    if (name === agentName) continue; // self-mention: never self-invoke
    if ((updatedTurns.get(name) ?? 0) >= 5) {
      blockedAgents.push(name);
    } else {
      chainedMentions.add(name);
    }
  }

  logger.debug(
    {
      agentName,
      roomId,
      turns: Object.fromEntries(updatedTurns),
      allowed: [...chainedMentions],
      blocked: blockedAgents,
    },
    'chain mentions',
  );

  if (blockedAgents.length > 0) {
    await postSystemMessage(
      roomId,
      `Agent(s) ${blockedAgents.join(', ')} reached max turns (5). Mentions not invoked.`,
    );
  }

  if (chainedMentions.size > 0) {
    // Dynamic import: runner → scheduler (avoids circular static import)
    const { invokeAgents } = await import('./agent-scheduler.js');
    invokeAgents(roomId, chainedMentions, resultText, updatedTurns);
  }

  // Update session state
  upsertAgentSession({
    agentName,
    roomId,
    sessionId: resultSessionId,
    model,
    status: 'done',
  });

  // Atomic cost increment (FIX 4)
  if (resultCostUsd > 0) {
    incrementAgentCost(agentName, roomId, resultCostUsd);
  }
  incrementAgentTurnCount(agentName, roomId);

  await updateStatusAndBroadcast(agentName, roomId, AgentState.Done);
  return false;
}

// ---------------------------------------------------------------------------
// Helpers (exported so agent-scheduler can call them via dynamic import)
// ---------------------------------------------------------------------------

/** Post a system message to the room and broadcast it. */
export async function postSystemMessage(roomId: string, content: string): Promise<void> {
  const id = generateId();
  const createdAt = nowIso();

  insertMessage({
    id,
    roomId,
    author: 'system',
    authorType: 'system',
    content,
    msgType: 'system',
    parentId: null,
    metadata: '{}',
  });

  await broadcast(roomId, {
    type: 'new_message',
    message: {
      id,
      roomId,
      author: 'system',
      authorType: 'system',
      content,
      msgType: 'system',
      parentId: null,
      metadata: {},
      createdAt,
    },
  });
}

/** Update agent status in DB and broadcast status event. */
export async function updateStatusAndBroadcast(
  agentName: string,
  roomId: string,
  status: AgentState,
  detail?: string,
): Promise<void> {
  updateAgentStatus(agentName, roomId, status);

  await broadcast(roomId, {
    type: 'agent_status',
    agent: agentName,
    status,
    detail,
  });
}
