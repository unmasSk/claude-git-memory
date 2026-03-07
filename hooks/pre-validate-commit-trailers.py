#!/usr/bin/env python3
"""
Pre-commit trailer validation hook (belt).

Intercepts git commit commands BEFORE execution. Parses the commit message
and blocks if required trailers are missing. If the message cannot be parsed
(heredoc, -F, no -m), passes through and lets the PostToolUse hook handle it.

Exit codes:
    0: Allow (trailers valid or message unparseable).
    2: Block (trailers missing).
"""

import json
import os
import re
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from constants import CODE_TYPES, MEMO_CATEGORIES, MEMORY_TYPES, RISK_VALUES, VALID_KEYS
from git_helpers import run_git
from parsing import extract_commit_message, parse_commit_type, parse_trailers
from colors import RED, YELLOW, RESET


def get_branch_name() -> str:
    """Get the current git branch name.

    Returns:
        Branch name, or empty string if detection fails.
    """
    code, output = run_git(["branch", "--show-current"], timeout=5)
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


def validate_trailers(commit_type: str, trailers: dict[str, str], branch: str) -> list[str]:
    """Validate trailers against the spec for a given commit type.

    Checks required trailers per type (code, context, decision, memo, wip)
    and validates format of Memo, Risk, and Issue values when present.

    Args:
        commit_type: Parsed conventional commit type.
        trailers: Dict of trailer key-value pairs from the commit message.
        branch: Current branch name, used to check for issue references.

    Returns:
        List of human-readable error strings. Empty if valid.
    """
    errors = []
    has_issue = branch_has_issue(branch)

    if commit_type in CODE_TYPES:
        if "Why" not in trailers:
            errors.append("Missing required trailer: Why:")
        if "Touched" not in trailers:
            errors.append("Missing required trailer: Touched:")
        if has_issue and "Issue" not in trailers:
            errors.append(f"Missing required trailer: Issue: (branch '{branch}' has issue reference)")

    elif commit_type == "context":
        if "Why" not in trailers:
            errors.append("Missing required trailer: Why:")
        if "Next" not in trailers:
            errors.append("Missing required trailer: Next: (context commits must say what's pending)")
        if has_issue and "Issue" not in trailers:
            errors.append(f"Missing required trailer: Issue: (branch '{branch}' has issue reference)")

    elif commit_type == "decision":
        if "Why" not in trailers:
            errors.append("Missing required trailer: Why:")
        if "Decision" not in trailers:
            errors.append("Missing required trailer: Decision:")
        if has_issue and "Issue" not in trailers:
            errors.append(f"Missing required trailer: Issue: (branch '{branch}' has issue reference)")

    elif commit_type == "memo":
        if "Memo" not in trailers:
            errors.append("Missing required trailer: Memo: (memo commits must include Memo: category - description)")
        if has_issue and "Issue" not in trailers:
            errors.append(f"Missing required trailer: Issue: (branch '{branch}' has issue reference)")

    elif commit_type == "wip":
        pass  # All trailers optional for wip

    # Validate Memo category if present
    if "Memo" in trailers:
        parts = trailers["Memo"].split(" - ", 1)
        if len(parts) < 2 or parts[0].strip() not in MEMO_CATEGORIES:
            errors.append(f"Invalid Memo format: '{trailers['Memo']}'. Must be: preference|requirement|antipattern - description")

    # Validate Risk values if present
    if "Risk" in trailers and trailers["Risk"] not in RISK_VALUES:
        errors.append(f"Invalid Risk value: '{trailers['Risk']}'. Must be: low, medium, high")

    # Validate Issue format if present
    if "Issue" in trailers:
        if not re.match(r"^(CU-\d+|#\d+)", trailers["Issue"]):
            errors.append(f"Invalid Issue format: '{trailers['Issue']}'. Must match CU-xxx or #xxx")

    return errors


def main() -> None:
    """Entry point. Reads hook input from stdin and validates trailers."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")

    # Only check git commit commands
    if "git commit" not in command:
        sys.exit(0)

    # Try to extract the commit message
    message = extract_commit_message(command)
    if message is None:
        # Cannot parse (heredoc, -F, no -m, etc.) → let PostToolUse handle it
        sys.exit(0)

    # Parse subject and type
    subject = message.split("\n")[0].strip()
    commit_type = parse_commit_type(subject)

    # Detect if Claude is the author (enforce strict) or human (warn only)
    is_claude = bool(os.environ.get("CLAUDE_CODE"))

    if commit_type is None:
        error_msg = f"\n{RED}>>> {'BLOCKED' if is_claude else 'WARNING'}: Not a conventional commit format{RESET}"
        error_msg += f"\n{RED}>>> Subject: {subject}{RESET}"
        error_msg += f"\n{RED}>>> Expected: type(scope): description{RESET}"
        print(error_msg, file=sys.stderr)
        sys.exit(2 if is_claude else 0)

    # WIP and Internal (Merge/Revert) commits pass without trailer validation
    if commit_type in ["wip", "internal"]:
        sys.exit(0)

    # Parse trailers
    trailers = parse_trailers(message)

    # Get branch for issue check
    branch = get_branch_name()

    # Validate
    errors = validate_trailers(commit_type, trailers, branch)

    if errors:
        if is_claude:
            error_msg = f"\n{RED}>>> BLOCKED: Missing commit trailers{RESET}"
            error_msg += f"\n{RED}>>> Type: {commit_type} | Branch: {branch}{RESET}"
            for err in errors:
                error_msg += f"\n{RED}>>>   - {err}{RESET}"
            error_msg += f"\n{RED}>>> Fix the commit message and retry.{RESET}"
            print(error_msg, file=sys.stderr)
            sys.exit(2)
        else:
            warn_msg = f"\n{YELLOW}>>> Commit without trailers. No big deal.{RESET}"
            warn_msg += f"\n{YELLOW}>>> Missing: {', '.join(errors)}{RESET}"
            print(warn_msg, file=sys.stderr)
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
