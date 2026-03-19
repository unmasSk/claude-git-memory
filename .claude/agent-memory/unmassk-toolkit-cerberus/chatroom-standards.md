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

## Known violations as of 2026-03-19 (reference baseline)
- agent-runner.ts: spawnAndParse 403 LOC (T2), nesting depth 6 in stream parsing loop (T2), `as any` on Bun.spawn (documented inline — Bun 1.3.11 Windows bug)
- agent-runner.ts: doInvoke 76 LOC (T2), doInvoke/spawnAndParse/postSystemMessage/updateStatusAndBroadcast JSDoc missing @param/@returns (T3)
- ws-handlers.ts: open() 110 LOC (T2)
- ws-message-handlers.ts: handleEveryoneDirective 64 LOC (T2), handleSendMessage/handleInvokeAgent/handleLoadHistory missing JSDoc (T3)
- ws-state.ts: 11 exported constants/maps with no JSDoc (T3)
- config.ts: `throw new Error()` at line 143 — internally caught by its own catch block, exits via process.exit(1); the throw is a sentinel, not a propagated error. Classify T3 (documented).

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
