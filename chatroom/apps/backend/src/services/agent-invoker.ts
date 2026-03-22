/**
 * agent-invoker.ts — thin facade
 *
 * Re-exports the full public API from the split modules so existing consumers
 * (routes/ws.ts, index.ts, and tests) continue to import from this single path
 * without change.
 *
 * Module split:
 *   agent-prompt.ts    — sanitizePromptContent, buildPrompt, buildSystemPrompt,
 *                        formatToolDescription, validateSessionId, getGitDiffStat,
 *                        RESPAWN_DELIMITER_BEGIN/END, CONTEXT_OVERFLOW_SIGNAL
 *   agent-runner.ts    — doInvoke, spawnAndParse, postSystemMessage,
 *                        updateStatusAndBroadcast
 *   agent-scheduler.ts — invokeAgents, invokeAgent, scheduleInvocation,
 *                        drainActiveInvocations, pauseInvocations, resumeInvocations,
 *                        isPaused, clearQueue, drainQueue, inFlight, activeInvocations
 *
 * Dependency direction: scheduler → runner → prompt. None import agent-invoker.ts.
 */

// Prompt module
export {
  validateSessionId,
  sanitizePromptContent,
  buildPrompt,
  buildSystemPrompt,
  formatToolDescription,
  getGitDiffStat,
  CONTEXT_OVERFLOW_SIGNAL,
  RESPAWN_DELIMITER_BEGIN,
  RESPAWN_DELIMITER_END,
} from './agent-prompt.js';

// Scheduler module (public API + state)
export {
  invokeAgents,
  invokeAgent,
  scheduleInvocation,
  drainActiveInvocations,
  pauseInvocations,
  resumeInvocations,
  isPaused,
  clearQueue,
  drainQueue,
  killAgent,
  pauseAgent,
  resumeAgent,
  isAgentPaused,
  inFlight,
  activeInvocations,
  activeProcesses,
} from './agent-scheduler.js';
export type { InvocationContext } from './agent-scheduler.js';

// Runner module (exported for advanced consumers and tests)
export {
  doInvoke,
  spawnAndParse,
  postSystemMessage,
  updateStatusAndBroadcast,
} from './agent-runner.js';
