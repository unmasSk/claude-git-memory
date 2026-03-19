/**
 * agent-scheduler.ts — Queue-based concurrency scheduler for agent invocations.
 *
 * FIX 14 — Queue with consumer (semaphore pattern)
 * FIX 15 — Per-agent in-flight lock (scoped per room: agentName:roomId)
 * SEC-SCOPE-001 — Room-scoped pause state
 */

import { createLogger } from '../logger.js';
import { MAX_CONCURRENT_AGENTS } from '../config.js';

const logger = createLogger('agent-scheduler');

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
 * Per-agent-per-room in-flight lock keyed by "${agentName}:${roomId}".
 * An agent with an existing entry is queued rather than started concurrently (FIX 15).
 */
export const inFlight = new Set<string>();

/**
 * Returns a Promise that resolves once all currently active invocations complete.
 * Used by gracefulShutdown in index.ts to ensure no agents are mid-run when
 * the DB is closed. If there are no active invocations, resolves immediately.
 */
export function drainActiveInvocations(): Promise<void> {
  const running = Array.from(activeInvocations.values());
  if (running.length === 0) return Promise.resolve();
  return Promise.allSettled(running).then(() => undefined);
}

interface QueueEntry {
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
const pendingQueue: QueueEntry[] = [];
const MAX_QUEUE_SIZE = 10;

/** FIX 3: Maximum combined triggerContent bytes before a merge is rejected. */
const MAX_TRIGGER_CONTENT_BYTES = 16_000;

/**
 * FIX 8: enqueue at module scope — captures nothing per-call.
 * Priority entries go to the front; normal entries go to the back.
 */
function enqueue(entry: QueueEntry): void {
  if (entry.priority) {
    pendingQueue.unshift(entry);
  } else {
    pendingQueue.push(entry);
  }
}

// ---------------------------------------------------------------------------
// @everyone stop — pause / clear controls (SEC-SCOPE-001: room-scoped)
// ---------------------------------------------------------------------------

/**
 * SEC-SCOPE-001: Pause state is per-room.
 * Previously a single global boolean caused @everyone stop in one room
 * to halt all agent invocations across every room. Now scoped to roomId.
 */
const _pausedRooms = new Set<string>();

/**
 * Pause all new agent invocations for a room (triggered by @everyone stop).
 * Queued invocations are discarded by clearQueue; in-flight ones run to completion.
 *
 * @param roomId - The room to pause.
 */
export function pauseInvocations(roomId: string): void {
  _pausedRooms.add(roomId);
}

/**
 * Resume agent invocations for a room after an @everyone stop was issued.
 *
 * @param roomId - The room to resume.
 */
export function resumeInvocations(roomId: string): void {
  _pausedRooms.delete(roomId);
}

/**
 * Returns whether agent invocations are currently paused for a room.
 *
 * @param roomId - The room to check.
 * @returns true if the room is paused, false otherwise.
 */
export function isPaused(roomId: string): boolean {
  return _pausedRooms.has(roomId);
}

/**
 * Remove all pending queue entries for a room.
 *
 * @param roomId - The room whose pending entries should be cleared.
 * @returns The number of entries removed from the queue.
 */
export function clearQueue(roomId: string): number {
  const before = pendingQueue.length;
  for (let i = pendingQueue.length - 1; i >= 0; i--) {
    if (pendingQueue[i]!.roomId === roomId) pendingQueue.splice(i, 1);
  }
  return before - pendingQueue.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Invoke one or more agents by name in a room.
 * Staggered by 600ms per agent to avoid simultaneous rate-limit spikes.
 * Called from the WS send_message handler after extracting @mentions.
 * Fire-and-forget — returns immediately, work runs async.
 *
 * @param roomId - The room where agents will be invoked.
 * @param agentNames - Set of agent names to invoke.
 * @param triggerContent - The message content that triggered the invocations.
 * @param agentTurns - Per-agent turn count for the current chain (default empty map).
 * @param priority - When true (human-originated), entries go to the front of the queue.
 */
export function invokeAgents(
  roomId: string,
  agentNames: Set<string>,
  triggerContent: string,
  agentTurns: Map<string, number> = new Map(),
  priority = false,
): void {
  // Stagger invocations by 600ms per agent to avoid concurrent rate-limit spikes
  // (House diagnostic: @everyone firing 8+ claude processes simultaneously saturates the API)
  let delay = 0;
  for (const agentName of agentNames) {
    setTimeout(() => {
      scheduleInvocation(roomId, agentName, { triggerContent, agentTurns }, false, priority);
    }, delay);
    delay += 600;
  }
}

/**
 * Invoke a single agent explicitly from an invoke_agent WS message.
 * Fire-and-forget — returns immediately, work runs async.
 *
 * @param roomId - The room where the agent will be invoked.
 * @param agentName - The agent to invoke.
 * @param prompt - The prompt to pass to the agent.
 */
export function invokeAgent(roomId: string, agentName: string, prompt: string): void {
  scheduleInvocation(roomId, agentName, { triggerContent: prompt, agentTurns: new Map() }, false);
}

// ---------------------------------------------------------------------------
// Scheduling logic — FIX 14 + FIX 15
// ---------------------------------------------------------------------------

/**
 * Merge into an existing pending queue entry for the same agent+room, or
 * enqueue a new entry. Always handles the invocation — caller must return.
 * Distinct log/system messages per call site preserve branch-level observability.
 */
function tryMergeOrEnqueue(
  roomId: string,
  agentName: string,
  context: InvocationContext,
  isRetry: boolean,
  priority: boolean,
  mergedLogMsg: string,
  mergedSysMsg: string,
  enqueuedSysMsg: (queueSize: number) => string,
): void {
  // Issue #31: merge into existing pending entry to avoid N runs for N queued messages
  const existing = pendingQueue.find((e) => e.agentName === agentName && e.roomId === roomId);
  if (existing) {
    // FIX 3: Reject merge if combined content exceeds size cap
    const merged = existing.context.triggerContent + `\n\n${context.triggerContent}`;
    if (merged.length > MAX_TRIGGER_CONTENT_BYTES) {
      void postSystemMessageAsync(roomId, `Agent ${agentName} trigger content too large — message dropped.`);
      return;
    }
    existing.context.triggerContent = merged;
    if (priority) existing.priority = true; // FIX 1: escalate priority
    logger.debug({ agentName, roomId, queueSize: pendingQueue.length }, mergedLogMsg);
    void postSystemMessageAsync(roomId, mergedSysMsg);
    return;
  }

  if (pendingQueue.length >= MAX_QUEUE_SIZE) {
    void postSystemMessageAsync(roomId, `Agent ${agentName} cannot be queued — too many pending invocations.`);
    return;
  }
  enqueue({ roomId, agentName, context, isRetry, priority });
  void postSystemMessageAsync(roomId, enqueuedSysMsg(pendingQueue.length));
}

/**
 * Schedule an agent invocation, subject to the room pause state, per-agent
 * in-flight lock, and global concurrency cap. Starts immediately if a slot
 * is available; otherwise merges into an existing pending entry or enqueues.
 *
 * @param roomId - The room to run the agent in.
 * @param agentName - The agent to invoke.
 * @param context - Invocation context (trigger content, turn counts, retry flags).
 * @param isRetry - When true, prevents a second retry loop on stale-session detection.
 * @param priority - When true, the entry is inserted at the front of the queue.
 */
export function scheduleInvocation(
  roomId: string,
  agentName: string,
  context: InvocationContext,
  isRetry: boolean,
  priority = false,
): void {
  if (_pausedRooms.has(roomId)) {
    logger.info({ roomId }, 'scheduleInvocation PAUSED — @everyone stop active');
    return;
  }

  // T2-05: inFlight key is per-room so the same agent can run in parallel in different rooms
  const flightKey = `${agentName}:${roomId}`;

  logger.debug(
    { agentName, roomId, turns: Object.fromEntries(context.agentTurns), isRetry, priority,
      inFlight: inFlight.has(flightKey), queueSize: pendingQueue.length },
    'scheduleInvocation',
  );

  // FIX 15: Per-agent-per-room in-flight lock — queue if already running
  if (inFlight.has(flightKey)) {
    tryMergeOrEnqueue(
      roomId, agentName, context, isRetry, priority,
      'scheduleInvocation: merged into existing queue entry',
      `Agent ${agentName} is busy. Message merged into pending invocation.`,
      (n) => `Agent ${agentName} is busy. Message queued (${n} pending).`,
    );
    return;
  }

  // FIX 14: Concurrency cap — queue if global limit reached
  if (activeInvocations.size >= MAX_CONCURRENT_AGENTS) {
    tryMergeOrEnqueue(
      roomId, agentName, context, isRetry, priority,
      'scheduleInvocation: merged into existing queue entry (cap)',
      `Agent ${agentName} queued. Message merged into pending invocation.`,
      (n) => `Agent ${agentName} queued (${n} in queue).`,
    );
    return;
  }

  runInvocation(roomId, agentName, context, isRetry);
}

function runInvocation(roomId: string, agentName: string, context: InvocationContext, isRetry: boolean): void {
  const key = `${agentName}:${roomId}`;
  // T2-05: use composite key so same agent can run in different rooms simultaneously
  inFlight.add(key);

  logger.debug({ agentName, roomId }, 'runInvocation starting');

  // Issue #36: doInvoke returns true when a retry was scheduled from within.
  // RACE-002: When a retry is scheduled, the retry call already inserts new
  // inFlight/activeInvocations entries — do NOT delete them here.
  const promise = import('./agent-runner.js')
    .then(({ doInvoke }) => doInvoke(roomId, agentName, context, isRetry))
    .then((retryScheduled) => {
      if (!retryScheduled) {
        inFlight.delete(key);
        activeInvocations.delete(key);
      }
    })
    .catch(() => {
      // Unexpected rejection from doInvoke (doInvoke catches internally, but guard here)
      inFlight.delete(key);
      activeInvocations.delete(key);
    })
    .finally(() => {
      drainQueue();
    });

  activeInvocations.set(key, promise);
}

/**
 * Drain the next eligible entry from the pending queue when a concurrency slot opens.
 * Skips entries whose agent is already in-flight in the same room (T2-05).
 * No-op if the queue is empty or the concurrency cap is still reached.
 */
export function drainQueue(): void {
  if (pendingQueue.length === 0) return;
  if (activeInvocations.size >= MAX_CONCURRENT_AGENTS) return;

  // T2-05: skip entries whose composite key is already in-flight
  const idx = pendingQueue.findIndex((e) => !inFlight.has(`${e.agentName}:${e.roomId}`));
  if (idx === -1) return;

  const [next] = pendingQueue.splice(idx, 1);
  if (!next) return;
  logger.debug({ agentName: next.agentName, roomId: next.roomId }, 'drainQueue dequeuing');
  runInvocation(next.roomId, next.agentName, next.context, next.isRetry);
}

// ---------------------------------------------------------------------------
// Internal helper — post system message without importing runner
// (avoids circular static import; uses dynamic import)
// ---------------------------------------------------------------------------

function postSystemMessageAsync(roomId: string, content: string): Promise<void> {
  return import('./agent-runner.js').then(({ postSystemMessage }) => postSystemMessage(roomId, content));
}
