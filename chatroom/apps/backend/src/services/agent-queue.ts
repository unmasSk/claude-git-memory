/**
 * agent-queue.ts — Shared queue state and types for the agent scheduler.
 *
 * Extracted from agent-scheduler.ts to keep that file under 300 LOC.
 * agent-scheduler.ts imports everything it needs from here.
 */

import { MAX_CONCURRENT_AGENTS, AGENT_TIMEOUT_MS } from '../config.js';
import { createLogger } from '../logger.js';

// Re-export so callers that previously imported from agent-scheduler still work
export { MAX_CONCURRENT_AGENTS };

const logger = createLogger('agent-queue');

// ---------------------------------------------------------------------------
// Context type (exported so agent-runner can reference it)
// ---------------------------------------------------------------------------

export interface InvocationContext {
  /** The message content that triggered this invocation (for prompt building) */
  triggerContent: string;
  /** Per-agent turn count in this chain — blocks an agent after 5 turns */
  agentTurns: Map<string, number>;
  /** Prevents a second rate-limit retry loop */
  rateLimitRetry?: boolean;
  /**
   * RESPAWN: Set to true when this invocation is a fresh instance replacing a
   * previous session that exhausted its context window. Causes buildPrompt to
   * fetch the full room history (not just the recent window) so the replacement
   * agent can situate itself in the conversation.
   */
  isRespawn?: boolean;
  /** execute = agents act; brainstorm = agents analyze/propose, no code changes. Default: execute */
  mode?: 'execute' | 'brainstorm';
}

// ---------------------------------------------------------------------------
// Concurrency state — FIX 14 + FIX 15
// ---------------------------------------------------------------------------

/**
 * Currently running invocations keyed by "${agentName}:${roomId}".
 * Consumed by drainActiveInvocations() for graceful shutdown.
 */
export const activeInvocations = new Map<string, Promise<void>>();

/**
 * Active subprocess handles keyed by "${agentName}:${roomId}".
 * Populated by agent-runner after spawn; cleared by runInvocation cleanup.
 * Used by kill_agent WS handler to SIGTERM the running process.
 */
export interface ActiveProcess {
  pid: number | undefined;
  kill: () => void;
  /** Timeout handle from makeTimeoutHandle — cleared when agent is paused. */
  timeoutHandle?: ReturnType<typeof setTimeout>;
  /** Epoch ms when the agent was paused — used to compute remaining timeout. */
  pausedAt?: number;
  /** Remaining timeout ms at the time the agent was paused. */
  remainingTimeoutMs?: number;
  /** Epoch ms when the agent subprocess was spawned — used for elapsed calculation on first pause. */
  startedAt: number;
  /** Epoch ms when the agent was last resumed via SIGCONT — used for elapsed calculation on subsequent pauses. */
  resumedAt?: number;
}

export const activeProcesses = new Map<string, ActiveProcess>();

/**
 * Per-agent-per-room in-flight lock keyed by "${agentName}:${roomId}".
 * An agent with an existing entry is queued rather than started concurrently (FIX 15).
 */
export const inFlight = new Set<string>();

// ---------------------------------------------------------------------------
// Pending queue — FIX 14
// ---------------------------------------------------------------------------

export interface QueueEntry {
  roomId: string;
  agentName: string;
  context: InvocationContext;
  isRetry: boolean;
  /** When true, entry is inserted at the front of the queue (human-originated messages). */
  priority: boolean;
}

/**
 * FIX 14: Pending queue — holds invocations waiting for a slot.
 * SEC-FIX 6 aligns: max queue size is 10 (consistent with WS queue cap).
 */
export const pendingQueue: QueueEntry[] = [];

/** Maximum pending queue entries before new entries are dropped. */
export const MAX_QUEUE_SIZE = 10;

/** FIX 3: Maximum combined triggerContent bytes before a merge is rejected. */
export const MAX_TRIGGER_CONTENT_BYTES = 16_000;

/**
 * FIX 8: enqueue at module scope — captures nothing per-call.
 * Priority entries go to the front; normal entries go to the back.
 */
export function enqueue(entry: QueueEntry): void {
  if (entry.priority) {
    // O(n) with current MAX_QUEUE_SIZE=10 — acceptable. If cap increases significantly, replace with a deque.
    pendingQueue.unshift(entry);
  } else {
    pendingQueue.push(entry);
  }
}

// ---------------------------------------------------------------------------
// Per-agent pause state — individual agent control (Issue #24)
// ---------------------------------------------------------------------------

/**
 * Agents that have been individually paused via pause_agent.
 * Keyed by "${agentName}:${roomId}" to allow room-scoped control.
 */
const _pausedAgents = new Set<string>();

/**
 * Pause a single agent's future invocations without killing its current run.
 * On Unix, also sends SIGSTOP to the active subprocess (if any) to freeze it
 * mid-stream. The pause flag is always set regardless of whether a process is
 * running — it prevents new invocations from being scheduled.
 *
 * @param agentName - The agent to pause.
 * @param roomId - The room to scope the pause to.
 * @returns true if an active process was frozen, false if only the flag was set.
 */
export function pauseAgent(agentName: string, roomId: string): boolean {
  _pausedAgents.add(`${agentName}:${roomId}`);
  if (process.platform === 'win32') return false;
  const active = activeProcesses.get(`${agentName}:${roomId}`);
  logger.debug(
    { agentName, roomId, hasActive: !!active, pid: active?.pid, activeKeys: Array.from(activeProcesses.keys()) },
    'pauseAgent: looking up process',
  );
  if (!active) {
    logger.warn({ agentName, roomId }, 'pauseAgent: no active process found');
    return false;
  }
  if (typeof active.pid !== 'number' || active.pid <= 0) return false;
  try {
    // Negative PID targets the process GROUP (pgid == pid when spawned with detached: true).
    // This freezes MCP server children spawned by the claude subprocess as well.
    process.kill(-active.pid, 'SIGSTOP');
    // Pause the timeout so elapsed pause time is not counted against the agent budget.
    if (active.timeoutHandle !== undefined) {
      const elapsed = Date.now() - (active.pausedAt ?? active.resumedAt ?? active.startedAt ?? Date.now());
      clearTimeout(active.timeoutHandle);
      active.timeoutHandle = undefined;
      active.remainingTimeoutMs = Math.min(
        AGENT_TIMEOUT_MS,
        Math.max(0, (active.remainingTimeoutMs ?? AGENT_TIMEOUT_MS) - elapsed),
      );
    }
    active.pausedAt = Date.now();
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') {
      // Process already exited — clear the pause flag we just set so the agent is not
      // permanently stuck in a paused state for a process that is no longer alive.
      _pausedAgents.delete(`${agentName}:${roomId}`);
    } else {
      logger.warn({ agentName, roomId, pid: active.pid, err }, 'SIGSTOP failed unexpectedly');
    }
    return false;
  }
}

/**
 * Resume a previously paused agent.
 * On Unix, also sends SIGCONT to the active subprocess (if any) to unfreeze it.
 *
 * @param agentName - The agent to resume.
 * @param roomId - The room scope.
 * @returns true if an active process was unfrozen, false if only the flag was cleared.
 */
export function resumeAgent(agentName: string, roomId: string): boolean {
  const key = `${agentName}:${roomId}`;
  if (!_pausedAgents.has(key)) return false;
  _pausedAgents.delete(key);
  if (process.platform === 'win32') return false;
  const active = activeProcesses.get(key);
  logger.debug(
    { agentName, roomId, hasActive: !!active, pid: active?.pid, activeKeys: Array.from(activeProcesses.keys()) },
    'resumeAgent: looking up process',
  );
  if (!active) {
    logger.warn({ agentName, roomId }, 'resumeAgent: no active process found');
    return false;
  }
  if (typeof active.pid !== 'number' || active.pid <= 0) return false;
  try {
    // Negative PID targets the process GROUP — mirrors the SIGSTOP call above.
    process.kill(-active.pid, 'SIGCONT');
    // Restart the timeout with the remaining budget computed at pause time.
    const remaining = active.remainingTimeoutMs ?? AGENT_TIMEOUT_MS;
    if (active.timeoutHandle !== undefined) clearTimeout(active.timeoutHandle);
    const pid = active.pid!;
    active.timeoutHandle = setTimeout(() => {
      logger.warn({ agentName, roomId, pid }, 'timeout reached after resume — killing subprocess');
      try {
        if (process.platform !== 'win32') {
          process.kill(-pid, 'SIGTERM');
        }
      } catch {
        // Process may have already exited
      }
    }, remaining);
    active.pausedAt = undefined;
    active.resumedAt = Date.now();
    // Preserve remainingTimeoutMs — it holds the remaining budget for the *next* pause.
    // Clearing it here would reset the budget to the full AGENT_TIMEOUT_MS on subsequent pauses.
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ESRCH') {
      logger.warn({ agentName, roomId, pid: active.pid, err }, 'SIGCONT failed unexpectedly');
    }
    return false;
  }
}

/**
 * Returns whether a specific agent is individually paused in a room.
 *
 * @param agentName - The agent name to check.
 * @param roomId - The room scope.
 */
export function isAgentPaused(agentName: string, roomId: string): boolean {
  return _pausedAgents.has(`${agentName}:${roomId}`);
}
