#!/usr/bin/env python3
"""
Claude Code Hook: Pre-Validate Commit Trailers (Belt)
======================================================
Intercepts git commit commands BEFORE execution.
Parses the commit message and blocks if required trailers are missing.

If the message cannot be parsed (heredoc, -F, no -m), passes through
and lets the PostToolUse hook handle validation.

Exit codes:
- 0: Allow operation (trailers valid or cannot parse)
- 2: Block operation (trailers missing)
"""

import json
import re
import subprocess
import sys


# Trailer keys (case-sensitive)
VALID_KEYS = {
    "Issue", "Why", "Touched", "Decision", "Memo", "Next",
    "Blocker", "Risk", "Conflict", "Resolution", "Refs",
}

RISK_VALUES = {"low", "medium", "high"}
MEMO_CATEGORIES = {"preference", "requirement", "antipattern"}

# Commit types that require code trailers (Why + Touched)
CODE_TYPES = {"feat", "fix", "refactor", "perf", "chore", "ci", "test", "docs"}

# Commit types that are memory-only (allow-empty)
MEMORY_TYPES = {"context", "decision", "memo"}


def get_branch_name():
    """Get current branch name."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True, timeout=5,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def branch_has_issue(branch: str) -> bool:
    """Check if branch name contains an issue reference."""
    if not branch:
        return False
    return bool(re.search(r"(CU-\d+|issue-\d+|#\d+)", branch, re.IGNORECASE))


def extract_commit_message(command: str) -> str | None:
    """
    Try to extract commit message from a git commit command.
    Returns None if cannot parse (heredoc, -F, no -m, etc.)
    """
    if "git commit" not in command:
        return None

    # Try to find -m "message" or -m 'message'
    # Handle multiple -m flags (git commit -m "subject" -m "body" -m "trailers")
    messages = []
    pattern = r'-m\s+(?:"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'|(\S+))'
    matches = re.finditer(pattern, command)
    for match in matches:
        msg = match.group(1) or match.group(2) or match.group(3)
        if msg:
            messages.append(msg)

    if not messages:
        return None

    return "\n\n".join(messages)


def parse_commit_type(subject: str) -> str | None:
    """Extract commit type from conventional commit subject.
    Supports optional emoji prefix: '✨ feat(scope): ...' or 'feat(scope): ...'
    """
    # Strip leading emoji(s) and whitespace (preserve # for issue refs)
    cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
    # Match: type(scope): or type:
    match = re.match(r"^(\w+)(?:\([^)]*\))?[!]?:", cleaned)
    if match:
        return match.group(1).lower()
    # Match wip: (not conventional but allowed)
    if cleaned.lower().startswith("wip:"):
        return "wip"
    return None


def parse_trailers(message: str) -> dict[str, str]:
    """Extract trailers from commit message."""
    trailers = {}
    lines = message.strip().split("\n")

    # Read from bottom up, collecting trailer lines
    for line in reversed(lines):
        line = line.strip()
        if not line:
            break  # Empty line = end of trailer block
        match = re.match(r"^([A-Z][a-z]+):\s*(.+)$", line)
        if match:
            key = match.group(1)
            value = match.group(2).strip()
            if key in VALID_KEYS:
                trailers[key] = value
        else:
            break  # Non-trailer line = end of trailer block

    return trailers


def validate_trailers(commit_type: str, trailers: dict, branch: str) -> list[str]:
    """Validate trailers against the spec. Returns list of errors."""
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


def main():
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

    if commit_type is None:
        error_msg = "\n\033[91m>>> BLOCKED: Not a conventional commit format\033[0m"
        error_msg += f"\n\033[91m>>> Subject: {subject}\033[0m"
        error_msg += "\n\033[91m>>> Expected: type(scope): description\033[0m"
        print(error_msg, file=sys.stderr)
        sys.exit(2)

    # WIP commits pass without trailer validation
    if commit_type == "wip":
        sys.exit(0)

    # Parse trailers
    trailers = parse_trailers(message)

    # Get branch for issue check
    branch = get_branch_name()

    # Validate
    errors = validate_trailers(commit_type, trailers, branch)

    if errors:
        error_msg = "\n\033[91m>>> BLOCKED: Missing commit trailers\033[0m"
        error_msg += f"\n\033[91m>>> Type: {commit_type} | Branch: {branch}\033[0m"
        for err in errors:
            error_msg += f"\n\033[91m>>>   - {err}\033[0m"
        error_msg += "\n\033[91m>>> Fix the commit message and retry.\033[0m"
        print(error_msg, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
