#!/usr/bin/env python3
"""
Claude Code Hook: Post-Validate Commit Trailers (Suspenders)
=============================================================
Safety net after git commit executes. Reads the last commit
and validates trailers. If invalid:
- Safe to reset (no upstream / not published) → git reset --soft HEAD~1
- Not safe → suggests chore(memory) correction commit

Exit codes:
- 0: Commit valid or not a git commit command
- 2: Block (trailers invalid, action taken or suggested)
"""

import json
import re
import subprocess
import sys


VALID_KEYS = {
    "Issue", "Why", "Touched", "Decision", "Memo", "Next",
    "Blocker", "Risk", "Conflict", "Resolution", "Refs",
}

RISK_VALUES = {"low", "medium", "high"}
MEMO_CATEGORIES = {"preference", "requirement", "antipattern"}

CODE_TYPES = {"feat", "fix", "refactor", "perf", "chore", "ci", "test", "docs"}
MEMORY_TYPES = {"context", "decision", "memo"}


def run_git(args: list[str]) -> tuple[int, str]:
    """Run a git command and return (exit_code, stdout)."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def get_last_commit() -> str:
    """Get the full message of the last commit."""
    code, output = run_git(["log", "-1", "--pretty=format:%s%n%b"])
    return output if code == 0 else ""


def get_branch_name() -> str:
    """Get current branch name."""
    code, output = run_git(["branch", "--show-current"])
    return output if code == 0 else ""


def branch_has_issue(branch: str) -> bool:
    """Check if branch name contains an issue reference."""
    if not branch:
        return False
    return bool(re.search(r"(CU-\d+|issue-\d+|#\d+)", branch, re.IGNORECASE))


def is_head_published() -> bool:
    """
    Check if HEAD is already published to remote.
    Uses merge-base --is-ancestor to be accurate:
    - No upstream → not published (safe to reset)
    - Upstream exists but HEAD not ancestor of @{u} → not published (safe)
    - HEAD is ancestor of @{u} → published (DO NOT reset)
    """
    # Check if upstream exists
    code, _ = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
    if code != 0:
        return False  # No upstream → safe

    # Upstream exists. Check if HEAD is already in remote.
    code, _ = run_git(["merge-base", "--is-ancestor", "HEAD", "@{u}"])
    return code == 0  # exit 0 = HEAD is ancestor of upstream = published


def parse_commit_type(subject: str) -> str | None:
    """Extract commit type from conventional commit subject.
    Supports optional emoji prefix: '✨ feat(scope): ...' or 'feat(scope): ...'
    """
    # Strip leading emoji(s) and whitespace (preserve # for issue refs)
    cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
    match = re.match(r"^(\w+)(?:\([^)]*\))?[!]?:", cleaned)
    if match:
        return match.group(1).lower()
    if cleaned.lower().startswith("wip:"):
        return "wip"
    return None


def parse_trailers(message: str) -> dict[str, str]:
    """Extract trailers from commit message."""
    trailers = {}
    lines = message.strip().split("\n")

    for line in reversed(lines):
        line = line.strip()
        if not line:
            break
        match = re.match(r"^([A-Z][a-z]+):\s*(.+)$", line)
        if match:
            key = match.group(1)
            value = match.group(2).strip()
            if key in VALID_KEYS:
                trailers[key] = value
        else:
            break

    return trailers


def validate_trailers(commit_type: str, trailers: dict, branch: str) -> list[str]:
    """Validate trailers against the spec. Returns list of errors."""
    errors = []
    has_issue = branch_has_issue(branch)

    if commit_type in CODE_TYPES:
        if "Why" not in trailers:
            errors.append("Why:")
        if "Touched" not in trailers:
            errors.append("Touched:")
        if has_issue and "Issue" not in trailers:
            errors.append("Issue:")

    elif commit_type == "context":
        if "Why" not in trailers:
            errors.append("Why:")
        if "Next" not in trailers:
            errors.append("Next:")
        if has_issue and "Issue" not in trailers:
            errors.append("Issue:")

    elif commit_type == "decision":
        if "Why" not in trailers:
            errors.append("Why:")
        if "Decision" not in trailers:
            errors.append("Decision:")
        if has_issue and "Issue" not in trailers:
            errors.append("Issue:")

    elif commit_type == "memo":
        if "Memo" not in trailers:
            errors.append("Memo:")
        if has_issue and "Issue" not in trailers:
            errors.append("Issue:")

    elif commit_type == "wip":
        return []  # All optional

    # Validate Memo category if present
    if "Memo" in trailers:
        parts = trailers["Memo"].split(" - ", 1)
        if len(parts) < 2 or parts[0].strip() not in MEMO_CATEGORIES:
            errors.append(f"Memo: (invalid format '{trailers['Memo']}')")

    # Validate values
    if "Risk" in trailers and trailers["Risk"] not in RISK_VALUES:
        errors.append(f"Risk: (invalid value '{trailers['Risk']}')")

    if "Issue" in trailers:
        if not re.match(r"^(CU-\d+|#\d+)", trailers["Issue"]):
            errors.append(f"Issue: (invalid format '{trailers['Issue']}')")

    return errors


def safe_reset():
    """Perform git reset --soft HEAD~1."""
    code, _ = run_git(["reset", "--soft", "HEAD~1"])
    return code == 0


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_output", {})
    command = tool_input.get("command", "")

    # Only check git commit commands that succeeded
    if "git commit" not in command:
        sys.exit(0)

    # Check if command succeeded (exit code 0)
    stdout = tool_output.get("stdout", "")
    stderr = tool_output.get("stderr", "")
    # If the commit failed (nothing to commit, etc.), skip
    if "nothing to commit" in stdout or "nothing to commit" in stderr:
        sys.exit(0)

    # Read last commit
    message = get_last_commit()
    if not message:
        sys.exit(0)

    # Parse
    subject = message.split("\n")[0].strip()
    commit_type = parse_commit_type(subject)

    if commit_type is None:
        # Not conventional — warn but don't block (PreToolUse should have caught this)
        sys.exit(0)

    if commit_type == "wip":
        sys.exit(0)

    # Parse and validate trailers
    trailers = parse_trailers(message)
    branch = get_branch_name()
    errors = validate_trailers(commit_type, trailers, branch)

    if not errors:
        # Check Touched: warning (glob used with few files)
        if "Touched" in trailers and "*" in trailers["Touched"]:
            try:
                code, diff_output = run_git(["diff", "--name-only", "HEAD~1..HEAD"])
                if code == 0:
                    file_count = len([f for f in diff_output.split("\n") if f.strip()])
                    if file_count <= 10:
                        warn = f"\n\033[93m>>> Warning: Touched: uses glob but only {file_count} files changed."
                        warn += " Consider listing paths explicitly.\033[0m"
                        print(warn, file=sys.stderr)
            except Exception:
                pass
        sys.exit(0)

    # Trailers invalid — decide action
    missing = ", ".join(errors)

    if is_head_published():
        # HEAD is published → DO NOT reset → suggest correction commit
        error_msg = f"\n\033[91m>>> COMMIT MISSING TRAILERS: {missing}\033[0m"
        error_msg += f"\n\033[91m>>> Type: {commit_type} | Branch: {branch}\033[0m"
        error_msg += "\n\033[91m>>> HEAD is published — cannot reset safely.\033[0m"
        error_msg += "\n\033[91m>>> Create a correction commit: chore(memory): add missing trailers\033[0m"
        error_msg += f"\n\033[91m>>> Required trailers: {missing}\033[0m"
        print(error_msg, file=sys.stderr)
        sys.exit(2)
    else:
        # Safe to reset
        if safe_reset():
            error_msg = f"\n\033[91m>>> COMMIT ROLLED BACK (reset --soft HEAD~1)\033[0m"
            error_msg += f"\n\033[91m>>> Missing trailers: {missing}\033[0m"
            error_msg += f"\n\033[91m>>> Type: {commit_type} | Branch: {branch}\033[0m"
            error_msg += "\n\033[91m>>> Changes are staged. Fix the message and recommit.\033[0m"
            print(error_msg, file=sys.stderr)
            sys.exit(2)
        else:
            error_msg = f"\n\033[91m>>> COMMIT MISSING TRAILERS: {missing}\033[0m"
            error_msg += "\n\033[91m>>> Reset failed. Amend the commit manually.\033[0m"
            print(error_msg, file=sys.stderr)
            sys.exit(2)


if __name__ == "__main__":
    main()
