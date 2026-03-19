/**
 * agent-queue.ts — Shared queue state and types for the agent scheduler.
 *
 * Extracted from agent-scheduler.ts to keep that file under 300 LOC.
 * agent-scheduler.ts imports everything it needs from here.
 */

import { MAX_CONCURRENT_AGENTS } from '../config.js';

// Re-export so callers that previously imported from agent-scheduler still work
export { MAX_CONCURRENT_AGENTS };

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
