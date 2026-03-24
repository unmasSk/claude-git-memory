---
name: False positives — patterns that are intentional
description: Patterns that look suspicious but are correct in this codebase
type: project
---

## scripts/README.md is not an orphaned file

In any `scripts/` directory inside a skill, a `README.md` is expected documentation. Do not flag it as an orphaned file when auditing routing table coverage against disk contents.

## SKILL.md has two routing tables

unmassk-marketing SKILL.md has BOTH a "Request Routing" table (lines 59-73) AND a "Reference Files" table (lines 189-205). Both reference the same 14 files. This is intentional redundancy (one for quick routing, one for load-when context). Do not flag as duplication.

## finalize_exit + exit $? two-step in cluster_health.sh and network_debug.sh

```bash
finalize_exit
exit $?
```

This is intentional. Calling `exit` directly in `finalize_exit()` would exit the shell if the function were ever sourced. The two-step preserves the exit code from the function's `return` statement and then exits the script. Do not flag as redundant.

## BM25 IDF variant (+1 outside log) in skill-search.py

`skill-search.py` uses `log((N - freq + 0.5) / (freq + 0.5) + 1)` (Robertson-Sparck-Jones variant). The `+1` is outside the log, not inside. This keeps IDF always positive for common terms in small corpora (N=36). It is intentional and correct for this use case. Do NOT flag as incorrect BM25 formula.

## BM25 ZeroDivisionError when avgdl=0 is latent but safe

`BM25.score()` divides by `self.avgdl` (via `doc_len / self.avgdl`). If all documents tokenize to empty strings, `avgdl=0`. However, in that case `self.idf` is also empty, so the inner loop `if token in self.idf:` never executes and the division is never reached. This is safe in practice. Do NOT flag as an active bug; it is a latent fragility.

## Dedup order (cache wins over dev-tree) in skill-search.py

`skill-search.py` deduplicates skills by name keeping the first occurrence. Search dirs are ordered: home cache first, then git-root last. This means cached plugin versions win over dev-tree versions. The comment `# keep first seen — cache version wins over dev` documents this as intentional. Do NOT flag as incorrect dedup ordering.

## sed -i.bak pattern in generate_* scripts

```bash
sed -i.bak "s/PLACEHOLDER/value/g" "$FILE"
rm -f "${FILE}.bak"
```

This is the cross-platform form of `sed -i` (GNU requires `-i ''`, macOS requires `-i .bak`). The `.bak` suffix approach is intentional for macOS compatibility. The `.bak` cleanup with `rm -f` is correct. Do not flag as unnecessary.

## configureRateLimitLogging registered AFTER applyRateLimit in app.middleware.ts

In `app.middleware.ts` lines 87-88, `applyRateLimit(app)` is called before `configureRateLimitLogging(app)`. This looks like it could be a registration order issue, but both register on `/api/v1`. The logging monitor patches `res.setHeader` and therefore intercepts the headers that `express-rate-limit` sets during request processing — not during registration. The order of Express middleware registration matters for *request processing*, and since `configureRateLimitLogging` is registered immediately after `applyRateLimit` (both during startup, not per-request), the `setHeader` wrapper WILL be present on the response object when the rate limiter fires on the *same request*. Do NOT flag as an ordering bug.

## `as any` in Bun.spawn call for cross-platform spawning

`agent-invoker.ts` line 498 uses `} as any` for the Bun.spawn options. This is intentional: Bun's TypeScript types for `spawn` don't correctly narrow the return type when `detached` is conditionally included (platform check). The `as any` is a genuine Bun type-system limitation, not sloppy typing. Do not flag.

## GC setInterval in auth-tokens.ts does not unref()

The 10-minute `setInterval` for token cleanup does not call `.unref()`. This is intentional — the interval must keep the process alive to purge expired tokens during long-running server sessions. In a CLI tool it would be a problem; in a server it is correct behavior.

## `activeInvocations` Map is declared but effectively unused for tracking

`activeInvocations` holds promises keyed by `${agentName}:${roomId}` but nothing awaits them or reads them outside `runInvocation`. Its purpose is to count concurrent invocations (`activeInvocations.size >= MAX_CONCURRENT_AGENTS`). The Map of promises is intentional (reachable in future if tracking/cancellation is added). Do not flag as dead code.

## chatroom mockup: dual hex + OKLCH color token sets are intentional (unreconciled but both present)

In `option-b-cursor-style.html`, agent colors are defined twice: as WoW-palette hex values (lines 43-52: `--color-ultron: #0070DD`) and as OKLCH values (lines 65-75: `--c-ultron: oklch(65% 0.18 250)`). The HTML uses the hex set. The OKLCH set appears unused in the mockup file itself. This is NOT intentional good design — it is a W1 structural warning — but do not treat the OKLCH set as "dead code" requiring deletion. It is the intended production token system and should replace the hex set, not be removed.

## chatroom mockup: `overflow: hidden` on `.agent-list` is a bug, not intentional

Line 287: `.agent-list { overflow: hidden; }`. The scrollbar CSS at lines 290-292 is defined but inactive because the parent suppresses scroll. This is a confirmed bug (S7). Do not treat the scrollbar CSS as dead code — the fix is changing `hidden` to `auto`.

## BunSpawnOptionsWithDetached stdin generic mismatch is benign

`agent-runner.ts` defines `BunSpawnOptionsWithDetached = Bun.Spawn.SpawnOptions<"ignore", "pipe", "pipe"> & { detached?: boolean }`. The `"ignore"` stdin generic does not match the actual runtime behavior (stdin is not set in `spawnOpts`, so Bun uses its default). This is a type-annotation imprecision only — stdin is never read in this codebase. Do NOT flag as a functional bug.

## connection.test.ts singleton test hits real DB singleton — intentional

After the 2026-03-23 rewrite, the `getDb()` singleton-identity tests in `connection.test.ts` import the cached module without redirecting `DB_PATH`. They test the singleton contract (same ref returned), not the path. The SQL/WAL execution tests use their own `new Database(tempPath)`. This split is intentional design. Do not flag the singleton tests as "testing the wrong database."

## IGNORECASE=1 replaced by tolower() in dockerfile-validate.sh awk

In `dockerfile-validate.sh` around line 415, the comment explains that BSD awk (macOS) does not honour `IGNORECASE=1` for the `~` dynamic regex operator, only for literal `/patterns/`. Using `tolower()` before the `~` comparison is the correct workaround. Do not flag as inconsistent style.

## agent-result-kill-guard.test.ts: broadcast contract is intentionally untested (bun mock constraint)

The test `'persists message to DB when agent is killed (broadcast path reached via insertion ordering)'` does NOT directly verify that `message-bus.broadcast()` was called. The original assertion (`broadcastCalls.length > 0`) was removed because `mock.module('../../src/services/message-bus.js', ...)` leaks into bun 1.3.11's global module registry and breaks 32 other tests.

The replacement assertion (`countAgentMessages(ROOM, AGENT) > 0`) only verifies message persistence, not broadcast. This is a documented, acknowledged coverage gap — not a mistake. The comment in the test explains the constraint and the proxy reasoning.

Do NOT flag this as a missing assertion bug. The correct long-term fix is DI for the broadcast function so mock.module is not needed — but that is a future Dante task, not a present bug.

## afterAll scheduler cleanup in kill-guard test is order-dependent by design

`afterAll(() => { activeInvocations.clear(); inFlight.clear(); })` at the bottom of `agent-result-kill-guard.test.ts` deliberately clears global state left by `agent-invoker-schedule.test.ts`. This looks like a test that is cleaning up after a different test file, which would normally be a flaky pattern. It IS that — but it is intentional, documented, and the alternative (running each file in isolation) is not supported by the current bun test runner. Do not flag as a shared-state anti-pattern without reading the comment block first.
