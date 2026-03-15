---
name: Anti-patterns found in ops scripts
description: Recurring shell and Python scripting anti-patterns found in ops-containers and ops-scripting/ops-observability skills (2026-03-14)
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
