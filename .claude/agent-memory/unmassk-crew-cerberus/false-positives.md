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

## IGNORECASE=1 replaced by tolower() in dockerfile-validate.sh awk

In `dockerfile-validate.sh` around line 415, the comment explains that BSD awk (macOS) does not honour `IGNORECASE=1` for the `~` dynamic regex operator, only for literal `/patterns/`. Using `tolower()` before the `~` comparison is the correct workaround. Do not flag as inconsistent style.
