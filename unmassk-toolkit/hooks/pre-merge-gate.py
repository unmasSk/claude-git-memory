#!/usr/bin/env python3
"""PreToolUse hook: block git merge / git pull and require Cerberus + Alexandria review first.

Intercepts Bash tool calls that contain a `git merge` or `git pull` command
(excluding `git merge --abort`, `git merge --continue`, and `git pull --rebase`,
which do not create a merge commit). Also intercepts eval/bash-c/sh-c
variable-indirection patterns that reference git or merge.

When detected, blocks and instructs the orchestrator to run Cerberus and
Alexandria in parallel before retrying.
"""

import json
import re
import sys


# Matches `git merge` (with optional .exe, case-insensitive).
# Exempt check is done separately — see _GIT_MERGE_EXEMPT_RE below.
_GIT_MERGE_RE = re.compile(
    r'\bgit(\.exe)?\s+merge\b',
    re.IGNORECASE,
)

# Exempt: --abort or --continue anywhere after `git merge` in the command.
_GIT_MERGE_EXEMPT_RE = re.compile(
    r'\bgit(\.exe)?\s+merge\b.*?\s--(abort|continue)\b',
    re.IGNORECASE,
)

# Matches `git pull` without --rebase (pull triggers an implicit merge).
# Negative lookahead for --rebase so `git pull --rebase` is allowed through.
_GIT_PULL_RE = re.compile(
    r'\bgit(\.exe)?\s+pull\b(?!.*--rebase\b)',
    re.IGNORECASE,
)

# Matches variable-indirection patterns: eval / bash -c / sh -c that also
# reference 'git' or 'merge' somewhere in the command — indirect merge bypass.
_EVAL_INDIRECTION_RE = re.compile(
    r'\b(eval|bash\s+-c|sh\s+-c)\b',
    re.IGNORECASE,
)

# Control characters and null bytes to strip before matching.
_CONTROL_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def _normalize(command: str) -> str:
    """Strip null bytes and control characters from command before matching."""
    return _CONTROL_CHARS_RE.sub('', command)


MERGE_GATE_MESSAGE = (
    "MERGE GATE (blocked command: {cmd!r}): Before merging, launch in parallel: "
    "(1) Cerberus in commit-review mode on the merge diff, "
    "(2) Alexandria in merge mode for changelog + CLAUDE.md check. "
    "If Cerberus has 0 blocking issues, retry the merge. "
    "If there are issues, show them to the user. "
    "After reviews pass with 0 blocking issues, retry the merge with "
    "`# merge-reviewed` appended to the command."
)

INDIRECTION_GATE_MESSAGE = (
    "MERGE GATE (blocked command: {cmd!r}): Command uses eval/bash-c/sh-c with "
    "'git' or 'merge' present — possible variable-indirection bypass. "
    "Run the git merge directly (not via eval/sh) so the hook can inspect it. "
    "If this is a false positive, remove the eval wrapper and retry."
)


def main():
    try:
        raw = sys.stdin.read()
        hook_input = json.loads(raw)
        tool_name = hook_input.get("tool_name", "")
        tool_input = hook_input.get("tool_input") or {}

        # Only act on Bash calls.
        if tool_name != "Bash":
            json.dump({"decision": "approve"}, sys.stdout)
            sys.stdout.flush()
            return

        command = tool_input.get("command", "")
        if not command:
            json.dump({"decision": "approve"}, sys.stdout)
            sys.stdout.flush()
            return

        normalized = _normalize(command)

        # Bypass: orchestrator has already run reviews and signals approval.
        if '# merge-reviewed' in command:
            json.dump({
                "decision": "approve",
                "reason": "merge-reviewed bypass acknowledged"
            }, sys.stdout)
            sys.stdout.flush()
            return

        # Check for variable-indirection bypass first.
        if _EVAL_INDIRECTION_RE.search(normalized):
            lower = normalized.lower()
            if 'git' in lower or 'merge' in lower:
                json.dump({
                    "decision": "block",
                    "reason": INDIRECTION_GATE_MESSAGE.format(cmd=command)
                }, sys.stdout)
                sys.stdout.flush()
                return

        # Check git merge (exempt: --abort / --continue anywhere in command).
        if _GIT_MERGE_RE.search(normalized) and not _GIT_MERGE_EXEMPT_RE.search(normalized):
            json.dump({
                "decision": "block",
                "reason": MERGE_GATE_MESSAGE.format(cmd=command)
            }, sys.stdout)
            sys.stdout.flush()
            return

        # Check git pull without --rebase (implicit merge).
        if _GIT_PULL_RE.search(normalized):
            json.dump({
                "decision": "block",
                "reason": MERGE_GATE_MESSAGE.format(cmd=command)
            }, sys.stdout)
            sys.stdout.flush()
            return

        json.dump({"decision": "approve"}, sys.stdout)
        sys.stdout.flush()

    except Exception as exc:
        # Fail closed on any unhandled error — never let a broken hook approve silently.
        try:
            json.dump({
                "decision": "block",
                "reason": (
                    f"BLOCKED: pre-merge-gate hook raised an unhandled error: {exc}. "
                    "Fix the hook or investigate the input before retrying."
                )
            }, sys.stdout)
            sys.stdout.flush()
        except Exception:
            pass


if __name__ == "__main__":
    main()
