---
name: Anti-patterns found in ops scripts, hooks, and chatroom bridge plans
description: Recurring shell, Python, and TypeScript/Bun anti-patterns found in ops-containers, ops-scripting/ops-observability skills, unmassk-crew hooks (2026-03-14, 2026-03-16), chatroom bridge plan (2026-03-18), and chatroom @mention depth feature (2026-03-18)
type: project
---

## set -e without -u or -o pipefail

Scripts in ops-containers/scripts/ use mixed `set -e` (generate_chart_structure.sh, generate_standard_helpers.sh, k8s-detect-crd-wrapper.sh, k8s-setup-tools.sh) while most others use `set -euo pipefail`. The correct baseline for all scripts in this project is:

```bash
set -euo pipefail
```

Flag any script that uses `set -e` without `-u` and/or without `-o pipefail`.

## source activate inside non-interactive scripts

`k8s-detect-crd-wrapper.sh` uses `source "$TEMP_VENV/bin/activate"` then bare `pip install`. This is wrong: it pollutes the caller's environment and may resolve to the wrong pip. The correct pattern (used in `helm-detect-crd-wrapper.sh`) is:

```bash
python3 -m venv "$TEMP_VENV" >/dev/null 2>&1
"$TEMP_VENV/bin/python3" -m pip install --quiet --disable-pip-version-check pyyaml
"$TEMP_VENV/bin/python3" "$PYTHON_SCRIPT" "${FILES[@]}"
```

## Unquoted variable in trap

`trap "rm -rf $TEMP_VENV" EXIT` expands the variable at definition time. If it contains spaces this silently deletes the wrong directory. Always use single quotes for trap bodies:

```bash
trap 'rm -rf "$TEMP_VENV"' EXIT
```

## #!/bin/bash shebang for scripts requiring bash 4+

Scripts using arrays, `[[`, `BASH_REMATCH`, or `((...))` must use `#!/usr/bin/env bash` because macOS ships `/bin/bash` 3.2. Four scripts in this directory have the wrong shebang.

## set -- "${POSITIONAL_ARGS[@]}" when array may be empty

Under `set -u`, an empty array expansion with `"${arr[@]}"` produces a single empty string argument on some bash versions. Guard with:

```bash
if [ ${#POSITIONAL_ARGS[@]} -gt 0 ]; then
    set -- "${POSITIONAL_ARGS[@]}"
else
    set --
fi
```

## ((...)) arithmetic increment under set -e

`((var++))` exits with code 1 when var is 0 (the result of the expression is 0 = falsy). Under `set -e` this terminates the script. Use `var=$((var + 1))` instead.

Confirmed in ops-cicd Jenkins scripts: `jenkins-best-practices.sh:40,47,54,60`, `jenkins-validate-declarative.sh:37,44,51`, `jenkins-validate-scripted.sh:37,44,51`. All use `((ERRORS++))` / `((WARNINGS++))` etc. as counters starting at 0. The first found issue kills the script silently.

Reference implementation: `jenkins-validate-shared-library.sh` uses `ERRORS=$((ERRORS + 1))` — use this as the correct model.

Note: `jenkins-common-validation.sh` has the same `((var++))` but uses `set -uo pipefail` (no `-e`, intentional) — this is a false positive. Do NOT flag it.

## Wrong sys.path subdirectory in Python generators

`jenkins-generate-declarative.py` and `jenkins-generate-scripted.py` use:

```python
sys.path.insert(0, str(Path(__file__).parent / 'lib'))
```

But the actual module directory is `jenkins-lib/`, not `lib/`. This produces `ModuleNotFoundError` on cold-start. Always verify the actual directory name before flagging — check `ls scripts/` to confirm.

Also found in `jenkins-test-declarative.py:12`. The test scripts that use `SCRIPT_DIR` directly without a subdirectory (e.g., `jenkins-test-shared-library.py`) are correct.

## bash -n with multiple file arguments

`bash -n file1 file2 file3` only checks file1 syntax; file2 and file3 are positional arguments to that check, not independent checks. Correct:

```bash
bash -n file1
bash -n file2
bash -n file3
```

## Python `or`-based defaults replace falsy caller values

`kwargs.get("key") or default` silently replaces 0, empty string, and False with the default even when the caller explicitly passed those values. Use `is not None` instead:

```python
# WRONG
value = kwargs.get("ingestion_rate_mb") or 10

# CORRECT
value = kwargs["ingestion_rate_mb"] if kwargs.get("ingestion_rate_mb") is not None else 10
```

Found in: `loki-generate-config.py` `_generate_monolithic`, `_generate_simple_scalable`, `_generate_microservices`. The fluentbit generator explicitly tests and documents the fix (`TestFalsyDefaults`).

## `exit $?` after a command under `set -e` is unreachable on failure

```bash
some_command "$@"
exit $?   # only reached when some_command succeeds (exit 0)
```

Under `set -e`, if `some_command` exits non-zero, the script is already terminated before `exit $?` runs. Save the exit code explicitly:

```bash
local rc=0
some_command "$@" || rc=$?
exit "$rc"
```

Found in: `shellcheck_wrapper.sh:49` `check_system_shellcheck()`.

## ASCII box line[:85] + '|' truncation pattern

In `skill-search.py` `format_ascii()`, the corpus line is constructed as:
```python
lines.append(f'|  Corpus: {total_skills} skills indexed ...|'[:85] + '|')
```
The intent is to pad to 85 chars. The pattern is fragile: if the raw string is exactly 85 chars, slice returns all 85 then '|' is appended making it 86 chars (one over the box). For skill counts >= 100, the raw string is already 86+ chars and the slice-then-append makes it 86, misaligning the closing border.

Correct pattern: use an f-string with explicit ljust or format spec to 83 inner chars, then wrap in '| ... |'.

## Unused wrapper function (thin forwarding)

`get_plugin_json_path()` in `bump-version.py` is a one-line wrapper that just calls `safe_plugin_path()`. It is never called internally (all callers use `safe_plugin_path()` directly or `load_plugin_json()`). Dead code.

## --all error path saves partial state without rollback

In `bump-version.py` `main()`, the `--all` path calls `bump_plugin()` in a loop and then `save_marketplace()` regardless of per-plugin failures. If one plugin's marketplace entry fails to update (plugin not found), `save_marketplace()` still persists the partial changes. No dry-run or rollback mechanism.

## Windows drive-letter case mismatch in path startswith checks

`git rev-parse --show-toplevel` on Windows Git Bash returns lowercase drive letters (e.g., `c:/Users/...`). `os.path.abspath()` returns OS-cased paths (e.g., `C:\Users\...`). After `.replace("\\", "/")` you get `C:/Users/...`. A `str.startswith()` comparison between `c:/Users/...` and `C:/Users/...` is case-sensitive and fails silently.

Correct pattern — always normalize case before comparison on Windows-hosting code:

```python
if resolved.lower().startswith(valid_prefix.lower()):
```

Or use `os.path.normcase()` on both sides before the comparison (platform-aware).

Found in: `unmassk-crew/hooks/validate-memory-path.py:63` (2026-03-16).

## os.path.abspath() anchored to cwd, not to project root

`os.path.abspath(relative_path)` resolves against `os.getcwd()`, which in a subprocess hook context is NOT guaranteed to be the git root. An agent writing a relative path like `backend/.claude/agent-memory/...` will resolve it against whatever cwd the hook process was spawned with.

Correct pattern — anchor relative paths explicitly:

```python
if os.path.isabs(file_path):
    resolved = os.path.normpath(file_path)
else:
    resolved = os.path.normpath(os.path.join(git_root, file_path))
resolved = resolved.replace("\\", "/")
```

Found in: `unmassk-crew/hooks/validate-memory-path.py:61` (2026-03-16).

## Dead negative lookahead for `git mergetool` exclusion

In `pre-merge-gate.py`, the regex includes `(?!\s*tool\b)` intended to exclude `git mergetool`. This is dead code: `\bgit\s+merge\b` never matches `git mergetool` because the word boundary `\b` after `merge` requires a non-word character — but in `mergetool`, the character after `merge` is `t` (word character). The lookahead never fires and creates false documentation confidence.

Correct regex (remove the dead lookahead):
```python
_GIT_MERGE_RE = re.compile(
    r'\bgit\s+merge\b(?!\s*--abort\b)(?!\s*--continue\b)'
)
```

When reviewing hook regexes that claim to exclude subcommands: verify whether the base pattern would even match the subcommand before adding a lookahead for it.

Found in: `unmassk-crew/hooks/pre-merge-gate.py:17-19` (2026-03-16).

## Dual severity framework conflict in agent mode definitions

Agent mode instructions that define two independent severity/category axes (e.g., category: Issue/Suggestion/Nitpick AND severity: Critical/Major/Minor/Trivial) produce incoherent combinations (e.g., "Nitpick Critical"). If both dimensions are needed, add an explicit constraint table showing valid combinations. Otherwise collapse to one axis.

Found in: `unmassk-crew/agents/cerberus.md` commit-review mode (2026-03-16).

## Mode-scoped "do NOT" instructions conflicting with unconditional MANDATORY sections

When an agent has multiple modes and one mode prohibits an action (e.g., "do NOT touch memory in merge mode"), any MANDATORY section below it that covers the same action without a mode guard creates a direct instruction conflict. Always add an explicit mode conditional to MANDATORY sections, or move them above the mode definitions.

Found in: `unmassk-crew/agents/alexandria.md` — merge mode says "do NOT touch memory", Shutdown section says MANDATORY save (2026-03-16).

## IPC via /tmp files in a security-hardened WS codebase

Using `/tmp` flat files as IPC for a bridge component that connects to a hardened WebSocket server creates a perimeter mismatch: all the server-side guards (origin check, rate limit, Zod validation, author enforcement) are bypassed because the bridge holds a trusted long-lived connection and forwards anything placed in the file. This pattern appeared in the chatroom claude-bridge plan (2026-03-18).

Correct pattern: keep the IPC file under `$XDG_RUNTIME_DIR` (user-private), `chmod 600` immediately, validate owning UID before reading, enforce per-send rate limit and message length cap in the bridge itself before forwarding to WS.

## Polling a file with setInterval when Bun.watch() is available

Using a 500ms `setInterval` to poll an outbox file for new content is a patch when the runtime already provides `Bun.watch()` for zero-latency change detection. Pattern seen in claude-bridge plan (2026-03-18). Always use `Bun.watch()` first; fall back to polling only on platforms where it is unavailable (document explicitly).

## Reserved name set with explicit exclusions that create identity collision

A `RESERVED_AGENT_NAMES` Set that filters OUT certain names (e.g., `!== 'claude'`) to allow them as WS client names creates an identity collision when a bridge script connects with that exact name. If the server sets `authorType='human'` for all WS client messages, the excluded name appears as a human in the DB and triggers @mention agent invocations. Found in chatroom ws.ts + bridge plan (2026-03-18) and confirmed again in claude-bridge.ts implementation audit (2026-03-18). Either: (a) do not exclude names from the reserved set without a corresponding authorType distinction, or (b) introduce a dedicated `authorType='orchestrator'` that bypasses mention parsing.

## Dead parameter in multi-argument guard function (TypeScript)

A function that accepts a parameter (e.g. `authorType: AuthorType`) and uses it in neither the guard condition nor the body creates a false contract. Callers believe the function is author-aware; tests pass for the wrong reason. Found in `mention-parser.ts:extractMentions` (2026-03-18): `authorType` was accepted but unused — the depth guard fired unconditionally for all author types.

Pattern to watch for: functions with a discriminant parameter (`authorType`, `role`, `mode`) whose body contains only one branch. Verify the parameter is read somewhere in the body before approving.

## Bridge singleton check defeated by auth on health endpoint

When a bridge process checks for an existing instance by probing `GET /health` unauthenticated, applying an auth guard to ALL routes (including `/health`) causes the probe to receive `401` instead of `200`. The singleton check only treats `200` as "already running", so `401` is silently interpreted as "no bridge present". Two instances start up. Found in `claude-bridge.ts:checkSingleton + handleRequest` (2026-03-18).

Rule: health/liveness endpoints MUST be exempt from auth if they are used for singleton detection or readiness probing.

## `inFlight` lock keyed by agent name only (not agent:room)

Using a `Set<string>` keyed by agent name alone for a per-agent in-flight lock blocks the agent across ALL rooms when the desired scope is per-agent-per-room. The `activeInvocations` map uses `${agentName}:${roomId}` — the `inFlight` lock must use the same compound key for consistency. Found in `agent-invoker.ts:inFlight` (2026-03-18). Check that all concurrency primitives in the same module use the same key scope.

NOTE (2026-03-18 follow-up): This was already fixed — `agent-invoker.ts:144` uses `${agentName}:${roomId}` as the compound key. Do not re-flag.

## Unbounded in-memory token Map with public unauthenticated endpoint

An in-memory `Map<string, TokenEntry>` for WS auth tokens with no size cap, combined with a `POST /api/auth/token` endpoint that is unauthenticated and has no rate limit, creates a memory-exhaustion vector. The GC interval only removes expired entries; it does not cap total size. Found in `auth-tokens.ts` (2026-03-18).

Rule: any in-memory store fed by a public endpoint must have an upper-bound (`TOKEN_MAX`) checked in the issuer function before inserting.

## Async reconnect path that omits retry on token fetch failure

When a WS connect function is wrapped in an async IIFE to fetch an auth token first, the catch block for token fetch failure must schedule a reconnect the same way `ws.onclose` does — otherwise token fetch errors leave the UI silently stuck in `disconnected` while WS-level errors correctly retry. Found in `ws-store.ts` (2026-03-18).

Asymmetry pattern: `ws.onclose` → retry; token fetch error → no retry. Always mirror the reconnect logic across all error paths in the same connect flow.

## Token in WS query string without documenting the access-log risk

Passing a short-lived auth token as `?token=<uuid>` in the WS upgrade URL is the only standard option when the `Authorization` header cannot be set (browser WebSocket). However, the token appears in server access logs if logging is enabled. This is acceptable for localhost dev tools, but the trade-off must be documented in a code comment. Found in `claude-bridge.ts:247` and `ws-store.ts` (2026-03-18).

## Dead function after render-path migration (React)

When a React component is migrated from a manual render path (e.g., splitting text with a helper function) to a declarative renderer (e.g., ReactMarkdown), the helper function is often left defined but not wired into the new renderer. The component compiles and renders without errors, but the feature silently stops working.

Pattern to detect: a named function that returns `React.ReactNode[]` or similar, defined in the same file as a component, but never called in the JSX. Always verify that helper functions from the old render path are either deleted or re-wired into the new one.

Found in: `MessageLine.tsx:splitMentions` (2026-03-18) — function defined, ReactMarkdown migration did not wire it in, @mention CSS highlighting silently broken.

## Fenced code block `isBlock` heuristic via `className` presence

In ReactMarkdown, the `code` component prop receives `className="language-xyz"` for fenced code blocks with a language specifier, and `className={undefined}` for both inline code AND fenced code blocks with no language tag. The pattern `const isBlock = !!className` incorrectly renders unlabeled fenced blocks as inline code.

Correct pattern — use the `node` AST prop (available in react-markdown v9+) to check whether the parent is a `pre` element, or check `node.position.start.line !== node.position.end.line` as a multiline heuristic.

Found in: `MessageLine.tsx:65` (2026-03-18).

## NODE_ENV bypass comment says "dev" but applies to all non-production environments

A guard `process.env.NODE_ENV !== 'production'` activates in staging, test, and undefined environments — not just "dev". Documenting it as "In dev, ..." misleads operators who run staging without NODE_ENV=production and believe they are protected.

Always say "non-production environments (NODE_ENV !== 'production')" and add an explicit NOTE that staging operators must set NODE_ENV=production.

Found in: `config.ts:78` (chatroom WS_ALLOWED_ORIGINS dev bypass, 2026-03-18).
