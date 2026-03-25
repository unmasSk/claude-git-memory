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
import { updateAgentStatus, getAgentSession, getRoomById, insertMessage } from '../db/queries.js';
import { generateId, nowIso } from '../utils.js';
import { AGENT_TIMEOUT_MS } from '../config.js';
import { AgentState } from '@agent-chatroom/shared';
import type { Message } from '@agent-chatroom/shared';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import {
  buildPrompt,
  buildSystemPrompt,
  validateSessionId,
  sanitizePromptContent,
} from './agent-prompt.js';
import type { InvocationContext } from './agent-scheduler.js';
import { readAgentStream, handleAgentResult } from './agent-stream.js';
import { activeProcesses, isAgentPaused } from './agent-queue.js';

const logger = createLogger('agent-runner');

// Explicit context window sizes per model ID (tokens).
// Only models with non-standard windows need entries; the default covers sonnet + opus.
const CONTEXT_WINDOW_MAP: Record<string, number> = {
  'claude-haiku-4-5': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
};
const DEFAULT_CONTEXT_WINDOW = 1_000_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Spawn options bag for Bun.spawn with piped stdout/stderr and typed stdin.
 * On Unix: stdin is a Uint8Array (in-memory prompt bytes), avoiding Windows
 * CreateProcess command-line length limits (~32 767 chars) that caused
 * ENAMETOOLONG when chat history grew large (FIX: stdin-prompt).
 * On Windows: stdin is a BunFile backed by a temp file — Uint8Array EOF
 * signaling is unreliable on Windows pipes; file-backed stdin lets the OS
 * manage the pipe lifecycle from the file descriptor so the final result
 * event is not lost (FIX: win32-stdin-tempfile).
 *
 * Typed as a plain object rather than the generic SpawnOptions alias so that
 * Uint8Array and BunFile (both valid Writable values at runtime) do not
 * conflict with the literal-union constraint in bun-types' generic parameter.
 */
interface BunSpawnOptionsWithDetached {
  stdin: Uint8Array | ReturnType<typeof Bun.file>;
  stdout: 'pipe';
  stderr: 'pipe';
  detached?: boolean;
  cwd?: string;
}

/** Options bag for spawnAndParse — replaces the 8-argument positional signature. */
export interface SpawnAndParseOptions {
  roomId: string;
  agentName: string;
  model: string;
  allowedTools: string[];
  prompt: string;
  systemPrompt: string;
  sessionId: string | null;
  context: InvocationContext;
  /** Absolute path to use as the agent subprocess cwd. Defaults to server process.cwd(). */
  cwd?: string;
}

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
  let allowedTools = agentConfig.allowedTools.filter((t) => !BANNED_TOOLS.includes(t));

  // Brainstorm mode: enforce read-only whitelist via --allowedTools (not just honor system in prompt).
  // Whitelist: Read, Grep, Glob, Agent. Write/Edit/Bash are stripped so the restriction is real.
  // Case-insensitive comparison — tool names in the registry are PascalCase but we don't trust future additions.
  if (context.mode === 'brainstorm') {
    const BRAINSTORM_WHITELIST = new Set(['read', 'grep', 'glob', 'agent']);
    allowedTools = allowedTools.filter((t) => BRAINSTORM_WHITELIST.has(t.toLowerCase()));
    logger.debug({ agentName, roomId, allowedTools }, 'doInvoke brainstorm: tools filtered to read-only whitelist');
  }

  logger.debug({ agentName, roomId, allowedTools, triggerBytes: context.triggerContent.length }, 'doInvoke tools');
  if (allowedTools.length === 0) {
    await postSystemMessage(roomId, `Agent ${agentName} has no permitted tools after security filtering.`);
    return false;
  }

  // FIX 2: Skip --resume on stale-session retries
  const existingSession = getAgentSession(agentName, roomId);
  const sessionId = isRetry ? null : validateSessionId(existingSession?.session_id);
  const roomCwd = getRoomById(roomId)?.cwd ?? undefined;
  // SEC-WARN-002: sanitize cwd before embedding in system prompt to prevent prompt injection.
  const sanitizedRoomCwd = roomCwd !== undefined ? sanitizePromptContent(roomCwd) : undefined;
  await updateStatusAndBroadcast(agentName, roomId, AgentState.Thinking);

  try {
    // For respawned instances (context overflow), pass a high history limit.
    // delta-messages: pass agentName so buildPrompt can use the last_seen checkpoint.
    const prompt = buildPrompt(roomId, context.triggerContent, context.isRespawn ? 2000 : undefined, agentName);
    const systemPrompt = buildSystemPrompt(agentName, agentConfig.role, context.isRespawn, context.mode, sanitizedRoomCwd);
    retryScheduled = await spawnAndParse({
      roomId, agentName, model: agentConfig.model, allowedTools, prompt, systemPrompt, sessionId, context, cwd: roomCwd,
    });
  } catch (err: unknown) {
    const message = sanitizePromptContent(err instanceof Error ? err.message : String(err));
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
export async function spawnAndParse(opts: SpawnAndParseOptions): Promise<boolean> {
  const { roomId, agentName, model, allowedTools, prompt, systemPrompt, sessionId, context, cwd } = opts;
  const args = buildSpawnArgs(model, allowedTools, systemPrompt, sessionId);

  logger.debug({ agentName, roomId, model, sessionId: sessionId ?? 'new', cwd: cwd ?? 'default' }, 'spawnAndParse');

  // FIX 16 / House diagnostic: On Windows, detached + windowsHide are broken in
  // Bun 1.3.11. Piped stdio alone suppresses console windows on Windows.
  // FIX stdin-prompt: prompt is passed via stdin instead of -p to avoid Windows
  // CreateProcess command-line limit (~32 767 chars). The claude CLI reads from
  // stdin when -p is not present.
  // FIX win32-stdin-tempfile: On Windows, Uint8Array EOF signaling via Bun.spawn
  // stdin is unreliable — Windows pipe semantics do not flush the stdout buffer
  // properly on forced termination, causing the final result event to be lost and
  // triggering handleEmptyResult ("returned no response"). Fix: write the prompt
  // to a temp file and use Bun.file(tempPath) as stdin. File-backed stdin lets
  // the OS manage the pipe lifecycle from the file descriptor, ensuring the
  // subprocess sees a clean EOF and flushes its output buffer before exiting.
  // Unix keeps the existing Uint8Array path — it works correctly there.
  const isUnix = process.platform !== 'win32';
  let tempFilePath: string | undefined;

  try {
    let stdinValue: Uint8Array | ReturnType<typeof Bun.file>;
    if (isUnix) {
      stdinValue = new TextEncoder().encode(prompt);
    } else {
      tempFilePath = join(tmpdir(), `agent-prompt-${crypto.randomUUID()}.txt`);
      logger.debug({ agentName, roomId, tempFilePath }, 'win32: writing prompt to temp file for stdin');
      await Bun.write(tempFilePath, prompt);
      stdinValue = Bun.file(tempFilePath);
    }

    const spawnOpts: BunSpawnOptionsWithDetached = {
      stdin: stdinValue,
      stdout: 'pipe',
      stderr: 'pipe',
      ...(isUnix ? { detached: true } : {}),
      ...(cwd ? { cwd } : {}),
    };
    const proc = Bun.spawn(args, spawnOpts);
    logger.debug({ agentName, roomId, pid: proc.pid }, 'subprocess spawned');

    // registerActiveProcess creates the timeout handle and registers it atomically so
    // pauseAgent always finds a valid timeoutHandle at registration time.
    const { entry: activeEntry, flightKey } = registerActiveProcess(proc, agentName, roomId);

    const sr = await readAgentStream(proc, agentName, roomId, activeEntry.timeoutHandle!);
    // Cancel whichever timeout is currently in activeEntry — resumeAgent may have replaced
    // the original handle with a shorter one after a pause/resume cycle.
    if (activeEntry.timeoutHandle !== undefined) {
      clearTimeout(activeEntry.timeoutHandle);
      activeEntry.timeoutHandle = undefined;
    }
    activeProcesses.delete(flightKey);
    // Fallback: if CLI didn't emit model_usage.contextWindow, use explicit model map
    if (sr.resultContextWindow === 0) {
      const fallback = CONTEXT_WINDOW_MAP[model] ?? DEFAULT_CONTEXT_WINDOW;
      logger.warn({ agentName, roomId, model, fallback }, 'CLI did not emit contextWindow — using model fallback');
      sr.resultContextWindow = fallback;
    }
    // Diagnostic: if the agent is still flagged as paused when its process completes,
    // SIGSTOP failed to reach the subprocess. The result will overwrite Paused status.
    if (isAgentPaused(agentName, roomId)) {
      logger.warn({ agentName, roomId }, 'agent completed while flagged as paused — SIGSTOP likely failed');
    }
    return handleAgentResult(sr, roomId, agentName, model, context);
  } finally {
    if (tempFilePath !== undefined) {
      logger.debug({ agentName, roomId, tempFilePath }, 'win32: cleaning up prompt temp file');
      await unlink(tempFilePath).catch(() => { /* best-effort cleanup — ignore ENOENT */ });
    }
  }
}

// ---------------------------------------------------------------------------
// Private spawn helpers
// ---------------------------------------------------------------------------

// SEC-HIGH-002: Guard --append-system-prompt CLI arg length. On Windows the
// CreateProcess command line has a ~32 767 char limit. Truncating here prevents
// ENAMETOOLONG failures if the system prompt grows unexpectedly large.
const MAX_SYSTEM_PROMPT_CLI_LENGTH = 8000;

function buildSpawnArgs(
  model: string,
  allowedTools: string[],
  systemPrompt: string,
  sessionId: string | null,
): string[] {
  // NEVER use shell string concatenation — always array args (injection defense).
  // FIX stdin-prompt: -p and the prompt string are omitted here; the prompt is
  // passed via stdin in spawnOpts to avoid Windows CreateProcess length limits.
  let safeSystemPrompt = systemPrompt;
  if (systemPrompt.length > MAX_SYSTEM_PROMPT_CLI_LENGTH) {
    logger.error(
      { promptLength: systemPrompt.length, cap: MAX_SYSTEM_PROMPT_CLI_LENGTH },
      'SEC-HIGH-002: system prompt exceeds CLI length cap — truncating from start to preserve security rules',
    );
    // Slice from the END so the security rules (appended last) are preserved.
    // Dropping preamble/identity text is safer than silently losing the security rules.
    safeSystemPrompt = systemPrompt.slice(-MAX_SYSTEM_PROMPT_CLI_LENGTH);
  }

  // SEC-LOW-001: Validate model matches expected pattern before passing to subprocess.
  const MODEL_RE = /^claude-[a-z0-9][a-z0-9-.]*$/;
  if (!MODEL_RE.test(model)) {
    throw new Error(`SEC-LOW-001: Invalid model identifier — does not match allowed pattern`);
  }

  const args: string[] = [
    'claude',
    '--model', model,
    '--append-system-prompt', safeSystemPrompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--allowedTools', allowedTools.join(','),
    '--permission-mode', 'auto',
  ];
  // FIX 2 + SEC-FIX 4: Only add --resume if we have a valid UUID session ID
  if (sessionId) args.push('--resume', sessionId);
  return args;
}

function registerActiveProcess(
  proc: { pid: number | undefined; kill: () => void },
  agentName: string,
  roomId: string,
): { entry: import('./agent-queue.js').ActiveProcess; flightKey: string } {
  const flightKey = `${agentName}:${roomId}`;
  const timeoutHandle = makeTimeoutHandle(proc, agentName, roomId);
  const entry: import('./agent-queue.js').ActiveProcess = {
    pid: proc.pid,
    kill: () => proc.kill(),
    timeoutHandle,
    remainingTimeoutMs: AGENT_TIMEOUT_MS,
    startedAt: Date.now(),
  };
  activeProcesses.set(flightKey, entry);
  return { entry, flightKey };
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
        if (!proc.pid || proc.pid <= 0) { proc.kill(); return; }
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

interface StatusMetrics {
  durationMs?: number;
  numTurns?: number;
  inputTokens?: number;
  outputTokens?: number;
  contextWindow?: number;
}

/**
 * Update an agent's status in the database and broadcast an agent_status event to the room.
 *
 * @param agentName - The agent whose status is changing.
 * @param roomId - The room the agent is active in.
 * @param status - The new AgentState value (e.g. Thinking, ToolUse, Done, Error).
 * @param detail - Optional detail string (tool name for ToolUse, error message for Error).
 * @param metrics - Optional result metrics (only passed when status === Done from persistAndBroadcast).
 */
export async function updateStatusAndBroadcast(
  agentName: string,
  roomId: string,
  status: AgentState,
  detail?: string,
  metrics?: StatusMetrics,
): Promise<void> {
  updateAgentStatus(agentName, roomId, status);

  await broadcast(roomId, {
    type: 'agent_status',
    agent: agentName,
    status,
    detail,
    ...metrics,
  });
}
