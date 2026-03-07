#!/usr/bin/env python3
"""
Post-commit trailer validation hook (suspenders).

Safety net after git commit executes. Reads the last commit and validates
trailers. If invalid and safe to reset (no upstream / not published), runs
git reset --soft HEAD~1. Otherwise suggests a correction commit.

Exit codes:
    0: Commit valid or not a git commit command.
    2: Block (trailers invalid, action taken or suggested).
"""

import json
import os
import re
import subprocess
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from constants import CODE_TYPES, MEMO_CATEGORIES, MEMORY_TYPES, RISK_VALUES, VALID_KEYS
from git_helpers import run_git
from parsing import parse_commit_type, parse_trailers
from colors import RED, YELLOW, RESET


def get_last_commit() -> str:
    """Get the full message (subject + body) of the last commit.

    Returns:
        Commit message string, or empty string on failure.
    """
    code, output = run_git(["log", "-1", "--pretty=format:%s%n%b"])
    return output if code == 0 else ""


def get_branch_name() -> str:
    """Get the current git branch name.

    Returns:
        Branch name, or empty string if detection fails.
    """
    code, output = run_git(["branch", "--show-current"])
    return output if code == 0 else ""


def branch_has_issue(branch: str) -> bool:
    """Check if the branch name contains an issue reference (CU-xxx, issue-xxx, #xxx).

    Args:
        branch: Branch name to inspect.

    Returns:
        True if an issue pattern is found.
    """
    if not branch:
        return False
    return bool(re.search(r"(CU-\d+|issue-\d+|#\d+)", branch, re.IGNORECASE))


def is_head_published() -> bool:
    """Check if HEAD is already published to the remote.

    Uses merge-base --is-ancestor for accuracy:
    - No upstream: not published (safe to reset).
    - Upstream exists but HEAD not ancestor of @{u}: not published (safe).
    - HEAD is ancestor of @{u}: published (do NOT reset).

    Returns:
        True if HEAD has been pushed to the remote.
    """
    # Check if upstream exists
    code, _ = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
    if code != 0:
        return False  # No upstream → safe

    # Upstream exists. Check if HEAD is already in remote.
    code, _ = run_git(["merge-base", "--is-ancestor", "HEAD", "@{u}"])
    return code == 0  # exit 0 = HEAD is ancestor of upstream = published


def validate_trailers(commit_type: str, trailers: dict[str, str], branch: str) -> list[str]:
    """Validate trailers against the spec for a given commit type.

    Checks required trailers per type and validates format of Memo, Risk,
    and Issue values when present.

    Args:
        commit_type: Parsed conventional commit type.
        trailers: Dict of trailer key-value pairs from the commit message.
        branch: Current branch name, used to check for issue references.

    Returns:
        List of error strings describing missing or invalid trailers.
    """
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


def safe_reset() -> bool:
    """Roll back the last commit with git reset --soft HEAD~1.

    Returns:
        True if the reset succeeded.
    """
    code, _ = run_git(["reset", "--soft", "HEAD~1"])
    return code == 0


def main() -> None:
    """Entry point. Reads hook input from stdin, validates the last commit's trailers.

    If trailers are invalid:
    - For Claude commits: resets the commit (if safe) or suggests a correction.
    - For human commits: warns but does not block.
    """
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_output", {})
    command = tool_input.get("command", "")

    # Only check git commit commands
    if "git commit" not in command:
        sys.exit(0)

    # Check exit code first (language-agnostic, works with any locale)
    exit_code = tool_output.get("exit_code")
    if exit_code is not None and int(exit_code) != 0:
        sys.exit(0)  # Commit failed (linting, conflict, etc.) — don't touch anything

    # Fallback: detect common failure strings in case exit_code is missing
    stdout = tool_output.get("stdout", "").lower()
    stderr = tool_output.get("stderr", "").lower()
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

    if commit_type in ["wip", "internal"]:
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
                        warn = f"\n{YELLOW}>>> Warning: Touched: uses glob but only {file_count} files changed."
                        warn += f" Consider listing paths explicitly.{RESET}"
                        print(warn, file=sys.stderr)
            except Exception:
                pass

        # Regenerate dashboard in background (non-blocking)
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            dashboard_script = os.path.join(script_dir, "..", "bin", "git-memory-dashboard.py")
            if os.path.exists(dashboard_script):
                subprocess.Popen(
                    ["python3", dashboard_script, "--silent"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
        except Exception:
            pass  # Dashboard regen is best-effort, never block commits

        sys.exit(0)

    # Trailers invalid — decide action based on author
    missing = ", ".join(errors)
    is_claude = bool(os.environ.get("CLAUDE_CODE"))

    if not is_claude:
        # Human commit — warn only, never block or reset
        warn_msg = f"\n{YELLOW}>>> Commit without trailers. No big deal.{RESET}"
        warn_msg += f"\n{YELLOW}>>> Missing: {missing}{RESET}"
        print(warn_msg, file=sys.stderr)
        sys.exit(0)

    # Claude commit — enforce strictly
    if is_head_published():
        # HEAD is published → DO NOT reset → suggest correction commit
        error_msg = f"\n{RED}>>> COMMIT MISSING TRAILERS: {missing}{RESET}"
        error_msg += f"\n{RED}>>> Type: {commit_type} | Branch: {branch}{RESET}"
        error_msg += f"\n{RED}>>> HEAD is published — cannot reset safely.{RESET}"
        error_msg += f"\n{RED}>>> Create a correction commit: chore(memory): add missing trailers{RESET}"
        error_msg += f"\n{RED}>>> Required trailers: {missing}{RESET}"
        print(error_msg, file=sys.stderr)
        sys.exit(2)
    else:
        # Safe to reset
        if safe_reset():
            error_msg = f"\n{RED}>>> COMMIT ROLLED BACK (reset --soft HEAD~1){RESET}"
            error_msg += f"\n{RED}>>> Missing trailers: {missing}{RESET}"
            error_msg += f"\n{RED}>>> Type: {commit_type} | Branch: {branch}{RESET}"
            error_msg += f"\n{RED}>>> Changes are staged. Fix the message and recommit.{RESET}"
            print(error_msg, file=sys.stderr)
            sys.exit(2)
        else:
            error_msg = f"\n{RED}>>> COMMIT MISSING TRAILERS: {missing}{RESET}"
            error_msg += f"\n{RED}>>> Reset failed. Amend the commit manually.{RESET}"
            print(error_msg, file=sys.stderr)
            sys.exit(2)


if __name__ == "__main__":
    main()
