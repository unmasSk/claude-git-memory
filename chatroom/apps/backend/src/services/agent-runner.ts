/**
 * agent-runner.ts
 *
 * Subprocess lifecycle: spawns `claude -p`, parses its stream-json output,
 * persists results to DB, and broadcasts messages to the room.
 *
 * Exports:
 *   - doInvoke                   — core invocation (config validation, prompt build, spawn)
 *   - spawnAndParse              — subprocess spawn + stream parse loop
 *   - postSystemMessage          — post a system message and broadcast it
 *   - updateStatusAndBroadcast   — update agent status in DB and broadcast
 *
 * Dependency direction: runner → prompt (static). Runner → scheduler (dynamic
 * imports only, to avoid a circular static import cycle).
 */

import { createLogger } from '../logger.js';
import { getAgentConfig, BANNED_TOOLS } from './agent-registry.js';
import { broadcast } from './message-bus.js';
import { updateAgentStatus, getAgentSession } from '../db/queries.js';
import { generateId, nowIso } from '../utils.js';
import { AGENT_TIMEOUT_MS } from '../config.js';
import { AgentState } from '@agent-chatroom/shared';
import type { Message } from '@agent-chatroom/shared';
import {
  buildPrompt,
  buildSystemPrompt,
  validateSessionId,
} from './agent-prompt.js';
import { insertMessage } from '../db/queries.js';
import type { InvocationContext } from './agent-scheduler.js';
import { readAgentStream, handleAgentResult } from './agent-stream.js';

const logger = createLogger('agent-runner');

// ---------------------------------------------------------------------------
// Core invocation
// ---------------------------------------------------------------------------

/**
 * Core invocation entry point. Validates agent config, filters banned tools, resolves
 * the session ID, builds prompt and system prompt, then delegates to spawnAndParse.
 *
 * @param roomId - The room the agent is responding in.
 * @param agentName - The agent to invoke.
 * @param context - Invocation context (trigger content, turn counts, retry flags).
 * @param isRetry - When true, the --resume flag is suppressed to avoid stale-session loops.
 * @returns true when a retry was scheduled internally (RACE-002 signal), so that
 *   runInvocation skips inFlight/activeInvocations cleanup.
 */
export async function doInvoke(
  roomId: string,
  agentName: string,
  context: InvocationContext,
  isRetry: boolean,
): Promise<boolean> {
  let retryScheduled = false;
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

  // SEC-FIX 3: Filter banned tools (belt-and-suspenders — registry already does this)
  const allowedTools = agentConfig.allowedTools.filter((t) => !BANNED_TOOLS.includes(t));
  logger.debug({ agentName, roomId, allowedTools, triggerBytes: context.triggerContent.length }, 'doInvoke tools');
  if (allowedTools.length === 0) {
    await postSystemMessage(roomId, `Agent ${agentName} has no permitted tools after security filtering.`);
    return false;
  }

  // FIX 2: Skip --resume on stale-session retries
  const existingSession = getAgentSession(agentName, roomId);
  const sessionId = isRetry ? null : validateSessionId(existingSession?.session_id);
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Thinking);

  try {
    // For respawned instances (context overflow), pass a high history limit.
    const prompt = buildPrompt(roomId, context.triggerContent, context.isRespawn ? 2000 : undefined);
    const systemPrompt = buildSystemPrompt(agentName, agentConfig.role, context.isRespawn);
    retryScheduled = await spawnAndParse(
      roomId, agentName, agentConfig.model, allowedTools, prompt, systemPrompt, sessionId, context,
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
 * Spawn the claude subprocess and parse its stream-json output line by line.
 * Handles tool events, result events, stderr collection, timeout, and all
 * post-result logic (stale session retry, rate limit retry, response persist, chained mentions).
 *
 * @param roomId - The room the agent is responding in.
 * @param agentName - The agent being run.
 * @param model - The model identifier to pass to --model.
 * @param allowedTools - Tools to pass to --allowedTools (already filtered for banned tools).
 * @param prompt - The built prompt string.
 * @param systemPrompt - The system prompt string.
 * @param sessionId - A validated UUID to pass to --resume, or null to start a new session.
 * @param context - Invocation context (used for retry flags and chained mention turn counts).
 * @returns true when a retry was scheduled internally (RACE-002 signal).
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
  const args = buildSpawnArgs(model, allowedTools, prompt, systemPrompt, sessionId);

  logger.debug({ agentName, roomId, model, sessionId: sessionId ?? 'new' }, 'spawnAndParse');

  // FIX 16 / House diagnostic: On Windows, detached + windowsHide are broken in
  // Bun 1.3.11. Piped stdio alone suppresses console windows on Windows.
  const isUnix = process.platform !== 'win32';
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    ...(isUnix ? { detached: true } : {}),
    // as any: Bun's SpawnOptions type does not include `detached` in its public typings
    // even though the runtime supports it on Unix. Cast avoids a TS2345 error.
  } as any);

  logger.debug({ agentName, roomId, pid: proc.pid }, 'subprocess spawned');

  const timeoutHandle = makeTimeoutHandle(proc, agentName, roomId);
  const sr = await readAgentStream(proc, agentName, roomId, timeoutHandle);
  return handleAgentResult(sr, roomId, agentName, model, context);
}

// ---------------------------------------------------------------------------
// Private spawn helpers
// ---------------------------------------------------------------------------

function buildSpawnArgs(
  model: string,
  allowedTools: string[],
  prompt: string,
  systemPrompt: string,
  sessionId: string | null,
): string[] {
  // NEVER use shell string concatenation — always array args (injection defense)
  const args: string[] = [
    'claude', '-p', prompt,
    '--model', model,
    '--append-system-prompt', systemPrompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--allowedTools', allowedTools.join(','),
    '--permission-mode', 'auto',
  ];
  // FIX 2 + SEC-FIX 4: Only add --resume if we have a valid UUID session ID
  if (sessionId) args.push('--resume', sessionId);
  return args;
}

function makeTimeoutHandle(
  proc: { pid: number | undefined; kill: () => void },
  agentName: string,
  roomId: string,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    logger.warn({ agentName, roomId, pid: proc.pid }, 'timeout reached — killing subprocess');
    try {
      if (process.platform !== 'win32') {
        process.kill(-(proc.pid as number), 'SIGTERM');
      } else {
        proc.kill();
      }
    } catch {
      proc.kill();
    }
  }, AGENT_TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// Helpers (exported so agent-scheduler can call them via dynamic import)
// ---------------------------------------------------------------------------

/**
 * Persist a system-authored message to the database and broadcast it to all room subscribers.
 *
 * @param roomId - The target room.
 * @param content - The system message text.
 */
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
    } as Message,
  });
}

/**
 * Update an agent's status in the database and broadcast an agent_status event to the room.
 *
 * @param agentName - The agent whose status is changing.
 * @param roomId - The room the agent is active in.
 * @param status - The new AgentState value (e.g. Thinking, ToolUse, Done, Error).
 * @param detail - Optional detail string (tool name for ToolUse, error message for Error).
 */
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
