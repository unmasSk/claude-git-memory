/**
 * agent-scheduler.ts
 *
 * Queue-based concurrency scheduler for agent invocations.
 *
 * Key concerns:
 *   FIX 14 — Queue with consumer (semaphore pattern)
 *   FIX 15 — Per-agent in-flight lock (scoped per room: agentName:roomId)
 *   SEC-SCOPE-001 — Room-scoped pause state
 *
 * Exports (public API):
 *   - InvocationContext (type)
 *   - invokeAgents   — fire-and-forget multi-agent dispatch
 *   - invokeAgent    — fire-and-forget single-agent dispatch
 *   - scheduleInvocation — enqueue/run one agent invocation
 *   - drainQueue     — drain next entry from pending queue
 *   - drainActiveInvocations — waits for all in-flight to settle
 *   - pauseInvocations / resumeInvocations / isPaused — room-scoped pause
 *   - clearQueue     — per-room queue drain
 *
 * Exported state (consumed by agent-runner):
 *   - inFlight
 *   - activeInvocations
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

/** Currently running invocations keyed by "${agentName}:${roomId}" */
export const activeInvocations = new Map<string, Promise<void>>();

/** FIX 15: In-flight lock keyed by "${agentName}:${roomId}" (per-room scope) */
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

export function pauseInvocations(roomId: string): void {
  _pausedRooms.add(roomId);
}
export function resumeInvocations(roomId: string): void {
  _pausedRooms.delete(roomId);
}
export function isPaused(roomId: string): boolean {
  return _pausedRooms.has(roomId);
}

/**
 * Remove all pending queue entries for a room.
 * Returns the number of entries removed.
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
 * Called from the WS send_message handler after extracting @mentions.
 *
 * Fire-and-forget — returns immediately, work runs async.
 *
 * @param priority — when true (human-originated), entries go to the front of
 *   the queue so human messages are processed before pending agent-chained work.
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
 * Invoke a single agent explicitly (from invoke_agent WS message).
 * Fire-and-forget — returns immediately, work runs async.
 */
export function invokeAgent(roomId: string, agentName: string, prompt: string): void {
  scheduleInvocation(roomId, agentName, { triggerContent: prompt, agentTurns: new Map() }, false);
}

// ---------------------------------------------------------------------------
// Scheduling logic — FIX 14 + FIX 15
// ---------------------------------------------------------------------------

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
    {
      agentName,
      roomId,
      turns: Object.fromEntries(context.agentTurns),
      isRetry,
      priority,
      inFlight: inFlight.has(flightKey),
      queueSize: pendingQueue.length,
    },
    'scheduleInvocation',
  );

  // FIX 15: Per-agent-per-room in-flight lock — queue if already running
  if (inFlight.has(flightKey)) {
    // Issue #31: merge into an existing pending entry for the same agent+room
    // instead of adding a new queue slot. This prevents running the agent N times
    // for N queued messages — the next run will have all trigger content combined.
    const existing = pendingQueue.find((e) => e.agentName === agentName && e.roomId === roomId);
    if (existing) {
      // FIX 3: Reject merge if combined content exceeds size cap
      const merged = existing.context.triggerContent + `\n\n${context.triggerContent}`;
      if (merged.length > MAX_TRIGGER_CONTENT_BYTES) {
        void postSystemMessageAsync(roomId, `Agent ${agentName} trigger content too large — message dropped.`);
        return;
      }
      existing.context.triggerContent = merged;
      // FIX 1: Escalate priority if incoming context has higher priority
      if (priority) existing.priority = true;
      logger.debug(
        { agentName, roomId, queueSize: pendingQueue.length },
        'scheduleInvocation: merged into existing queue entry',
      );
      void postSystemMessageAsync(roomId, `Agent ${agentName} is busy. Message merged into pending invocation.`);
      return;
    }

    if (pendingQueue.length >= MAX_QUEUE_SIZE) {
      void postSystemMessageAsync(roomId, `Agent ${agentName} cannot be queued — too many pending invocations.`);
      return;
    }
    enqueue({ roomId, agentName, context, isRetry, priority });
    logger.debug({ agentName, roomId, queueSize: pendingQueue.length }, 'scheduleInvocation: in-flight, queued');
    void postSystemMessageAsync(roomId, `Agent ${agentName} is busy. Message queued (${pendingQueue.length} pending).`);
    return;
  }

  // FIX 14: Concurrency cap
  if (activeInvocations.size >= MAX_CONCURRENT_AGENTS) {
    // Issue #31: merge into an existing pending entry for the same agent+room
    const existing = pendingQueue.find((e) => e.agentName === agentName && e.roomId === roomId);
    if (existing) {
      // FIX 3: Reject merge if combined content exceeds size cap
      const merged = existing.context.triggerContent + `\n\n${context.triggerContent}`;
      if (merged.length > MAX_TRIGGER_CONTENT_BYTES) {
        void postSystemMessageAsync(roomId, `Agent ${agentName} trigger content too large — message dropped.`);
        return;
      }
      existing.context.triggerContent = merged;
      // FIX 1: Escalate priority if incoming context has higher priority
      if (priority) existing.priority = true;
      logger.debug(
        { agentName, roomId, queueSize: pendingQueue.length },
        'scheduleInvocation: merged into existing queue entry (cap)',
      );
      void postSystemMessageAsync(roomId, `Agent ${agentName} queued. Message merged into pending invocation.`);
      return;
    }

    if (pendingQueue.length >= MAX_QUEUE_SIZE) {
      void postSystemMessageAsync(roomId, `Agent ${agentName} cannot be queued — too many pending invocations.`);
      return;
    }
    enqueue({ roomId, agentName, context, isRetry, priority });
    void postSystemMessageAsync(roomId, `Agent ${agentName} queued (${pendingQueue.length} in queue).`);
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

/** FIX 14: Drain the next entry from the queue when a slot opens up. */
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
