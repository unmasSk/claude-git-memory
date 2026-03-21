---
name: chatroom-backend-standards
description: Enterprise standards rules that apply ALWAYS to chatroom/apps/backend/src/ — enforced on every audit
type: feedback
---

These rules were mandated by the user for permanent enforcement on every review of this codebase:

1. File LOC max 300. If >300 → T2 mandatory split.
2. Exported function LOC max 50. If >50 → T2.
3. Helper function LOC max 30. If >30 → T2.
4. Nesting depth max 3 levels. If >3 → refactor.
5. Function params max 5. If >5 → use object param.
6. Generic `throw new Error()` → T2. Must use typed error classes.
7. `console.log/error` → T2 forbidden.
8. `process.env` direct access → T2 in any file except config.ts and logger.ts.
9. Code duplication: 3+ repeats = mandatory abstraction.
10. `as any` casts: document or eliminate.
11. JSDoc: every exported function needs `/** summary + @param + @returns + @throws */`. Every exported constant needs `/** description */`.
12. SOLID: Single Responsibility per file/function. Open/Closed. No god functions.
13. KISS: simplest solution that works. No over-abstraction.
14. YAGNI: no speculative code, no "just in case".
15. DRY: extract after 2nd duplication, mandatory at 3rd.

**Why:** User explicitly stated "Save these rules to your memory — they apply ALWAYS from now on."
**How to apply:** Apply all 15 rules on every audit, commit-review, or any touch to chatroom/apps/backend/src/ without exception.

## Known violations as of 2026-03-19 (pre-refactor baseline — superseded)
- agent-runner.ts: spawnAndParse 403 LOC (T2), nesting depth 6 in stream parsing loop (T2), `as any` on Bun.spawn (documented inline — Bun 1.3.11 Windows bug)
- agent-runner.ts: doInvoke 76 LOC (T2), JSDoc missing @param/@returns (T3)
- ws-handlers.ts: open() 110 LOC (T2)
- ws-message-handlers.ts: handleEveryoneDirective 64 LOC (T2), handleSendMessage/handleInvokeAgent/handleLoadHistory missing JSDoc (T3)
- ws-state.ts: 11 exported constants/maps with no JSDoc (T3) — still open
- config.ts: `throw new Error()` at line 143 — internally caught, exits via process.exit(1); sentinel, not propagated. T3 (documented).

## Violations after 2026-03-19 refactor of agent-scheduler.ts + agent-prompt.ts
### agent-scheduler.ts (post-refactor, still open)
- File 348 LOC (T2) — split into agent-queue.ts not yet done
- runInvocation has no JSDoc; RACE-002 invariant documented mid-body only (T3)
- All exported functions now have JSDoc with @param/@returns — RESOLVED (was T3)
- scheduleInvocation now 38 LOC — RESOLVED (was 95 LOC T2)
- Duplicate merge-into-queue block extracted into tryMergeOrEnqueue — RESOLVED (was DRY T2)

### agent-prompt.ts (post-refactor, still open)
- buildChatroomRules helper 54 LOC (T2) — extract rule clusters into named const arrays
- Six exported functions missing @param/@returns in JSDoc: validateSessionId, sanitizePromptContent, buildPrompt, getGitDiffStat, buildSystemPrompt (partial), formatToolDescription (T3)
- buildSystemPrompt now 7 LOC — RESOLVED (was 95 LOC T2)

## Final scan 2026-03-19 (post all refactors)

### RESOLVED (from previous open list)
- agent-runner.ts: spawnAndParse 8-param violation → SpawnAndParseOptions interface introduced — RESOLVED (T2 closed)
- agent-runner.ts: duplicate import from '../db/queries.js' (lines 20 and 30) — RESOLVED (consolidated to single import at line 20)
- agent-stream.ts: 386 LOC → 323 LOC — still T2 (>300 limit), improvement noted
- agent-stream.ts: readAgentStream JSDoc now has all 4 @param tags — RESOLVED (T3 closed)
- agent-stream.ts: AgentStreamResult interface now has full JSDoc with @property tags — RESOLVED (T3 closed)
- agent-stream.ts: handleAgentResult now has @param/@returns tags — RESOLVED (T3 closed)
- agent-scheduler.ts: 348 LOC → 294 LOC (split to agent-queue.ts) — RESOLVED (T2 closed)
- agent-prompt.ts: six missing @param/@returns — STILL OPEN (see below)

### Still open after final scan (T2/T3)

#### T2 (blocking)
- agent-stream.ts: 323 LOC (T2) — still over 300 limit; next split needed
- agent-prompt.ts: buildChatroomRules helper 55 LOC (T2) — extract rule clusters into named const arrays

### Audit 2026-03-21 — kill/pause/resume/read_chat commit (INITIAL)

#### ALL RESOLVED by re-audit 2026-03-21
- T1: ParticipantItem.tsx no Resume button — RESOLVED: toggle button with isPaused local state + aria-label flip
- T2: drainQueue bypassed _pausedAgents — RESOLVED: findIndex now filters all three conditions
- T2: killAgent JSDoc false claim — RESOLVED: JSDoc now correct + SEC-CRIT-002 inline comment
- T2: ws-message-handlers.ts 398 LOC — RESOLVED: 241 LOC, control handlers extracted to ws-control-handlers.ts (225 LOC)
- T2: handleReadChat 44 LOC — RESOLVED: insertAndBroadcastReadChat private helper extracted

### Re-Audit 2026-03-21 — after fixes

#### T2 (blocking — open)
- agent-scheduler.ts: 387 LOC (T2) — still over 300 hard limit. Split: move _pausedAgents + pauseAgent/resumeAgent/isAgentPaused/killAgent into agent-queue.ts (shared state already there)
- sendError: identical 8-line function in ws-message-handlers.ts (lines 36-43) AND ws-control-handlers.ts (lines 28-35) — DRY violation, extract to ws-state.ts or ws-helpers.ts

#### T3 (non-blocking — open)
- READ_CHAT_LIMIT = ROOM_STATE_MESSAGE_LIMIT alias is YAGNI — use constant directly (ws-control-handlers.ts:38)
- handlePauseAgent: no WS acknowledgment when already-paused (silent no-op)
- ParticipantItem.tsx: local isPaused state does not sync from server AgentStatus — stale on reload or multi-client
- Resume icon SVG (triangle polygon) is visually identical to Play icon — operator confusion risk; differentiate shapes
- Zero tests for 8 new exported functions (killAgent, pauseAgent, resumeAgent, isAgentPaused, handleKillAgent, handlePauseAgent, handleResumeAgent, handleReadChat)

#### FALSE POSITIVES (added 2026-03-21 — do not re-flag)
- killAgent double-delete of activeProcesses: benign on Map, not a bug (spawnAndParse deletes on exit, killAgent deletes earlier — second delete is no-op)
- ws-handlers.ts parseAndValidate return type `result.data as ClientMessage`: cast IS redundant but Zod discriminatedUnion already types result.data as ClientMessage — not a type escape
- ParticipantItem.tsx Resume triangle SVG has different points (2,1 10,6 2,11) vs Play (3,1 11,6 3,11) — different coordinates but same shape visually. Flag the UX confusion, not as a code bug.

#### T3 (non-blocking)
- agent-prompt.ts: validateSessionId — single-line JSDoc only, no @param/@returns (T3)
- agent-prompt.ts: sanitizePromptContent — description only, no @param/@returns (T3)
- agent-prompt.ts: buildPrompt — description only, no @param/@returns (T3)
- agent-prompt.ts: getGitDiffStat — description only, no @param (T3)
- agent-prompt.ts: formatToolDescription — description only, no @param/@returns (T3)
- agent-result.ts: maybeTruncate — no JSDoc at all (T3)
- agent-result.ts: buildAgentMessage — no JSDoc at all (T3)
- agent-result.ts: scheduleChainMentions — no JSDoc at all (T3)
- agent-result.ts: persistAndBroadcast — no JSDoc at all (T3)
- agent-scheduler.ts: tryMergeOrEnqueue helper — has 9 params (>5 limit, Rule 5) and no JSDoc (T3 — private helper)
- ws-state.ts: wsConnIds (Map<any, string>) — exported, no JSDoc describing the any type (T3)
- agent-stream.ts: line 206 is 215 chars — long line (T3)

#### FALSE POSITIVES (do not re-flag)
- agent-runner.ts: `as any` on Bun.spawn — documented inline ("Bun 1.3.11 Windows bug"), acceptable
- ws-handlers.ts: `any` on ws parameter — documented with eslint-disable, Elysia internals limitation, acceptable
- config.ts: `throw new Error()` inside ConfigError (subclass) — not generic throw, ConfigError is a typed subclass
- agent-scheduler.ts: tryMergeOrEnqueue 9 params — private helper (not exported), T3 at most
