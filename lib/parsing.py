"""
Shared parsing functions for git-memory.
Commit type extraction, trailer parsing, scope extraction, normalization.
"""

import re

from constants import VALID_KEYS


def parse_commit_type(subject: str) -> str | None:
    """Extract commit type from conventional commit subject.

    Supports:
    - Emoji prefix: '✨ feat(scope): ...'
    - Git prefixes: 'fixup!', 'squash!', 'amend!' (nested)
    - Internal Git: 'Merge branch', 'Revert', 'Cherry-pick'
    - WIP commits: 'wip: ...'

    Returns lowercase type string, "internal" for Git messages,
    "wip" for WIP commits, or None if unparseable.
    """
    # Whitelist internal Git messages
    if re.match(r"^(Merge branch|Merge remote-tracking branch|Revert |Cherry-pick )", subject):
        return "internal"

    # Strip Git prefixes for validation (handles nested: squash! fixup! feat:)
    cleaned = re.sub(r"^((?:fixup!|squash!|amend!)\s*)+", "", subject).strip()

    # Strip leading emoji(s) and whitespace (preserve # for issue refs)
    cleaned = re.sub(r"^[^\w#]+", "", cleaned).strip()

    # Match: type(scope): or type:
    match = re.match(r"^(\w+)(?:\([^)]*\))?[!]?:", cleaned)
    if match:
        return match.group(1).lower()

    # Match wip: (not conventional but allowed)
    if cleaned.lower().startswith("wip:"):
        return "wip"

    return None


def parse_scope(subject: str) -> str | None:
    """Extract scope from conventional commit subject.

    'feat(auth): ...' → 'auth'
    'feat: ...' → None
    """
    cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
    match = re.match(r"^\w+\(([^)]+)\)", cleaned)
    return match.group(1) if match else None


def parse_trailers(message: str) -> dict[str, str]:
    """Extract trailers from commit message (bottom-up, single value per key).

    Reads from the end of the message, stopping at the first empty line
    or non-trailer line. Used by validation hooks.
    """
    trailers: dict[str, str] = {}
    lines = message.strip().split("\n")

    for line in reversed(lines):
        line = line.strip()
        if not line:
            break
        match = re.match(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$", line)
        if match:
            key = match.group(1)
            value = match.group(2).strip()
            if key in VALID_KEYS:
                trailers[key] = value
        else:
            break

    return trailers


def parse_trailers_full(body: str) -> dict[str, str | list[str]]:
    """Extract all trailers from commit body (full scan, multi-value support).

    Scans all lines (not just trailing block). If a key appears multiple
    times, values are collected into a list. Used by dashboard/gc.
    """
    trailers: dict[str, str | list[str]] = {}
    for line in body.strip().split("\n"):
        line = line.strip()
        match = re.match(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$", line)
        if match and match.group(1) in VALID_KEYS:
            key = match.group(1)
            val = match.group(2).strip()
            if key in trailers:
                existing = trailers[key]
                if isinstance(existing, list):
                    existing.append(val)
                else:
                    trailers[key] = [existing, val]
            else:
                trailers[key] = val
    return trailers


def extract_commit_message(command: str) -> str | None:
    """Try to extract commit message from a git commit command.

    Handles multiple -m flags. Returns None if cannot parse
    (heredoc, -F, no -m, etc.)
    """
    if "git commit" not in command:
        return None

    messages: list[str] = []
    pattern = r'-m\s+(?:"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'|(\S+))'
    matches = re.finditer(pattern, command)
    for match in matches:
        msg = match.group(1) or match.group(2) or match.group(3)
        if msg:
            messages.append(msg)

    if not messages:
        return None

    return "\n\n".join(messages)


def normalize(text: str) -> str:
    """Normalize text for tombstone matching: lowercase, collapse whitespace, strip."""
    return re.sub(r"\s+", " ", text.strip().lower())
