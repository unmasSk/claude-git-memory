#!/usr/bin/env python3
"""Pre-write hook: block agent-memory writes outside git root.

Intercepts Write and Edit tool calls that target .claude/agent-memory/.
If the resolved path is NOT under the git root's .claude/agent-memory/,
the hook blocks the operation with an error message.
"""

import json
import os
import subprocess
import sys


def get_git_root():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def resolve_real_path(path, git_root):
    """Resolve path to a canonical real path, handling symlinks and relativity.

    If the path does not exist yet, resolve the parent directory and append
    the filename — this handles files that are about to be created.
    """
    if not os.path.isabs(path):
        path = os.path.join(git_root, path)
    if os.path.exists(path):
        return os.path.realpath(path)
    # File doesn't exist yet: resolve parent, keep filename
    parent = os.path.dirname(path)
    filename = os.path.basename(path)
    resolved_parent = os.path.realpath(parent) if os.path.exists(parent) else parent
    return os.path.join(resolved_parent, filename)


def main():
    try:
        raw = sys.stdin.read()
        hook_input = json.loads(raw)
        tool_name = hook_input.get("tool_name", "")
        tool_input = hook_input.get("tool_input") or {}

        # Only check Write and Edit calls
        if tool_name not in ("Write", "Edit"):
            json.dump({"decision": "approve"}, sys.stdout)
            sys.stdout.flush()
            return

        file_path = tool_input.get("file_path", "")
        if not file_path:
            json.dump({"decision": "approve"}, sys.stdout)
            sys.stdout.flush()
            return

        # Normalize path BEFORE trigger check so double-slashes and case
        # variants (.Claude/Agent-Memory/) are caught reliably.
        # os.path.normpath collapses // and resolves . / .. segments.
        normalized = os.path.normpath(file_path)
        # Use forward slashes for the substring check (cross-platform stable)
        normalized_fwd = normalized.replace("\\", "/")

        # Case-insensitive trigger on Windows NTFS; case-sensitive elsewhere
        trigger = ".claude/agent-memory/"
        check_str = normalized_fwd.lower() if sys.platform == "win32" else normalized_fwd
        check_trigger = trigger.lower() if sys.platform == "win32" else trigger

        # Only care about agent-memory paths
        if check_trigger not in check_str:
            json.dump({"decision": "approve"}, sys.stdout)
            sys.stdout.flush()
            return

        # Resolve git root — FAIL CLOSED if unavailable
        git_root = get_git_root()
        if not git_root:
            json.dump({
                "decision": "block",
                "reason": (
                    "BLOCKED: cannot validate agent-memory path — git root is unavailable. "
                    "Ensure this hook runs inside a git repository."
                )
            }, sys.stdout)
            sys.stdout.flush()
            return

        # Resolve both sides with realpath so symlinks cannot be used to escape
        resolved = resolve_real_path(file_path, git_root)
        resolved_root = os.path.realpath(git_root)

        # The valid prefix — ensure it ends with separator so 'startswith' is
        # an exact directory boundary check, not a prefix substring match.
        valid_prefix = os.path.join(resolved_root, ".claude", "agent-memory") + os.sep

        # Normalize case on Windows to handle drive-letter case mismatches
        # (git returns lowercase drive, os.path functions return uppercase).
        if sys.platform == "win32":
            compare_resolved = os.path.normcase(resolved)
            compare_prefix = os.path.normcase(valid_prefix)
        else:
            compare_resolved = resolved
            compare_prefix = valid_prefix

        if compare_resolved.startswith(compare_prefix):
            json.dump({"decision": "approve"}, sys.stdout)
        else:
            json.dump({
                "decision": "block",
                "reason": (
                    f"BLOCKED: agent-memory write outside git root. "
                    f"Path '{resolved}' is not under '{valid_prefix}'. "
                    f"Use $GIT_ROOT/.claude/agent-memory/ with the absolute path resolved at boot."
                )
            }, sys.stdout)

        sys.stdout.flush()

    except Exception as exc:
        # Fail closed on any unhandled error — never let a broken hook approve silently
        try:
            json.dump({
                "decision": "block",
                "reason": (
                    f"BLOCKED: validate-memory-path hook raised an unhandled error: {exc}. "
                    "Fix the hook or investigate the input before retrying."
                )
            }, sys.stdout)
            sys.stdout.flush()
        except Exception:
            pass


if __name__ == "__main__":
    main()
