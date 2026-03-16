#!/usr/bin/env python3
"""
git-memory-commit — Pretty commit wrapper for git-memory.

Creates a git commit with proper emoji, type, scope, trailers,
and prints a single pretty line for the user.

Usage:
  git-memory-commit.py <type> <scope> <message> [--body TEXT] [--trailer KEY=VALUE]...
  git-memory-commit.py decision auth "usar JWT"
  git-memory-commit.py memo api "preference - siempre async/await" --trailer "Why=equipo lo prefiere"
  git-memory-commit.py feat forms "add date picker" --body "Full body text" --trailer "Why=users need dates" --trailer "Touched=src/forms/"
  git-memory-commit.py context forms "validación completada" --trailer "Next=wire to API"
  git-memory-commit.py wip forms "half-done date picker"

Exit codes:
  0: Commit created
  1: Error
"""

import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from constants import MEMORY_TYPES, DEFAULT_CO_AUTHOR
from git_helpers import run_git
from parsing import suggest_scope_from_paths

# ── Config ───────────────────────────────────────────────────────────────

# Co-author line: configurable via env var, falls back to constant
CO_AUTHOR = os.environ.get("GIT_MEMORY_CO_AUTHOR", DEFAULT_CO_AUTHOR)

EMOJIS = {
    "feat": "✨", "fix": "🐛", "refactor": "♻️", "perf": "⚡",
    "test": "🧪", "docs": "📝", "chore": "🔧", "ci": "👷",
    "wip": "🚧", "context": "💾", "decision": "🧭", "memo": "📌",
    "remember": "🧠",
}

_gh_available_cache: bool | None = None

def _gh_available() -> bool:
    """Check if gh CLI is installed and authenticated. Result is cached for the process."""
    global _gh_available_cache
    if _gh_available_cache is not None:
        return _gh_available_cache
    try:
        result = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True, text=True, timeout=5,
        )
        _gh_available_cache = result.returncode == 0
    except (FileNotFoundError, OSError):
        _gh_available_cache = False
    return _gh_available_cache


def _auto_create_issue(next_text: str) -> str | None:
    """Try to create a GitHub issue from a Next: trailer text.

    Returns '#N' issue reference if successful, None otherwise.
    Only runs if gh CLI is available and the text has no existing #ref.
    """
    if re.search(r"#\d+", next_text):
        return None  # Already has an issue reference
    if not _gh_available():
        return None
    try:
        result = subprocess.run(
            ["gh", "issue", "create", "--title", next_text, "--label", "next", "--body",
             f"Auto-created from git-memory Next: trailer.\n\nSource: `Next: {next_text}`"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            # gh issue create prints the URL, extract issue number
            url = result.stdout.strip()
            # URL format: https://github.com/owner/repo/issues/42
            match = re.search(r"/issues/(\d+)", url)
            if match:
                return f"#{match.group(1)}"
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass
    return None


def _auto_close_issue(issue_ref: str) -> None:
    """Try to close a GitHub issue referenced in a Resolved-Next: trailer.

    Silently degrades if gh CLI is unavailable.
    """
    match = re.search(r"#(\d+)", issue_ref)
    if not match:
        return
    if not _gh_available():
        return
    try:
        subprocess.run(
            ["gh", "issue", "close", match.group(1), "--comment",
             "Resolved via git-memory Resolved-Next: trailer"],
            capture_output=True, text=True, timeout=15,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass

# ANSI colors
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
RED = "\033[91m"

CYAN = "\033[36m"

TYPE_COLORS = {
    "decision": YELLOW, "memo": BLUE, "context": GREEN,
    "remember": CYAN,
    "feat": MAGENTA, "fix": MAGENTA, "refactor": MAGENTA,
    "perf": MAGENTA, "test": MAGENTA, "docs": MAGENTA,
    "chore": MAGENTA, "ci": MAGENTA, "wip": DIM,
}


def _load_scope_map() -> dict[str, str]:
    """Load scope map from .claude/git-memory-scopes.json or agent-memory, flatten to {dir_prefix: scope_name}."""
    try:
        _, toplevel = run_git(["rev-parse", "--show-toplevel"])
        if not toplevel:
            return {}
        # Check primary location first, then agent-memory fallback
        scopes_file = os.path.join(toplevel, ".claude", "git-memory-scopes.json")
        if not os.path.isfile(scopes_file):
            # Search in agent-memory directories
            agent_mem = os.path.join(toplevel, ".claude", "agent-memory")
            if os.path.isdir(agent_mem):
                for agent_dir in os.listdir(agent_mem):
                    candidate = os.path.join(agent_mem, agent_dir, "scopes.json")
                    if os.path.isfile(candidate):
                        scopes_file = candidate
                        break
        if not os.path.isfile(scopes_file):
            return {}
        with open(scopes_file) as f:
            data = json.load(f)
        result: dict[str, str] = {}
        for scope_name, scope_info in data.get("scopes", {}).items():
            result[scope_name] = scope_name
        return result
    except (OSError, ValueError):
        return {}


def _suggest_scope(given_scope: str) -> None:
    """Print a hint if staged files suggest a more specific scope than what was given."""
    scope_map = _load_scope_map()
    if not scope_map:
        return
    code, output = run_git(["diff", "--cached", "--name-only"])
    if code != 0 or not output:
        return
    changed = [f for f in output.strip().splitlines() if f]
    if not changed:
        return
    suggested = suggest_scope_from_paths(changed, scope_map)
    if not suggested:
        return
    scope_base = given_scope.split("/")[0]
    if suggested != scope_base and suggested != given_scope:
        print(f"  {DIM}hint: files are in {suggested}/, consider scope '{suggested}' or '{suggested}/...'{RESET}",
              file=sys.stderr)


def build_commit_message(type_: str, scope: str, message: str,
                         body: str | None, trailers: list[str]) -> str:
    """Build the full commit message with emoji, subject, body, trailers.

    Note: does NOT process Next/Resolved-Next issues — that happens
    post-commit in main() to avoid side effects if the commit fails.
    """
    emoji = EMOJIS.get(type_, "")
    subject = f"{emoji} {type_}({scope}): {message}"

    parts = [subject]

    if body or trailers:
        parts.append("")  # blank line after subject

    if body:
        parts.append(body)

    if trailers:
        if body:
            parts.append("")  # blank line between body and trailers
        for t in trailers:
            key, _, value = t.partition("=")
            parts.append(f"{key}: {value}")

    # Co-author
    parts.append("")
    parts.append(CO_AUTHOR)

    return "\n".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pretty git commit for git-memory")
    parser.add_argument("type", help="Commit type (feat, fix, decision, memo, context, wip, ...)")
    parser.add_argument("scope", help="Scope (auth, api, forms, ...)")
    parser.add_argument("message", help="Commit message (subject line)")
    parser.add_argument("--body", default=None, help="Commit body text")
    parser.add_argument("--trailer", action="append", default=[], dest="trailers",
                        help="Trailer in KEY=VALUE format (repeatable)")
    parser.add_argument("--push", action="store_true", help="Push after commit")
    args = parser.parse_args()

    type_ = args.type
    if type_ not in EMOJIS:
        print(f"{RED}{BOLD}Error{RESET}: unknown type '{type_}'. Valid: {', '.join(sorted(EMOJIS))}", file=sys.stderr)
        sys.exit(1)

    # Scope suggestion from staged files (non-blocking hint)
    if type_ not in MEMORY_TYPES:
        _suggest_scope(args.scope)

    # Process Next/Resolved-Next trailers for issue management (pre-compute, apply post-commit)
    processed_trailers = []
    for t in args.trailers:
        key, _, value = t.partition("=")
        if key == "Next":
            issue_ref = _auto_create_issue(value)
            if issue_ref:
                processed_trailers.append(f"Next={value} {issue_ref}")
            else:
                processed_trailers.append(t)
        else:
            processed_trailers.append(t)

    # Build message
    msg = build_commit_message(type_, args.scope, args.message, args.body, processed_trailers)

    # Build git command
    git_args = ["commit"]
    if type_ in MEMORY_TYPES:
        git_args.append("--allow-empty")
    git_args += ["-m", msg]

    # Execute
    try:
        result = subprocess.run(
            ["git"] + git_args,
            capture_output=True, text=True, timeout=15,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired) as e:
        print(f"{RED}{BOLD}Error{RESET}: git commit failed: {e}", file=sys.stderr)
        sys.exit(1)

    if result.returncode != 0:
        stderr = result.stderr.strip()
        print(f"{RED}{BOLD}Error{RESET}: git commit failed: {stderr}", file=sys.stderr)
        sys.exit(1)

    # Post-commit: close resolved issues
    for t in args.trailers:
        key, _, value = t.partition("=")
        if key == "Resolved-Next":
            _auto_close_issue(value)

    # Extract SHA from output (format: "[branch SHA] message")
    sha = "?"
    sha_match = re.search(r"\[\S+\s+([a-f0-9]+)\]", result.stdout)
    if sha_match:
        sha = sha_match.group(1)[:7]

    # Pretty output
    emoji = EMOJIS.get(type_, "")
    color = TYPE_COLORS.get(type_, RESET)
    print(f"  {emoji} {color}{BOLD}{type_}{RESET}{DIM}({args.scope}){RESET}: {args.message} {DIM}[{sha}]{RESET}")

    # Notify about created issues so Claude fills in the details
    for t in processed_trailers:
        key, _, value = t.partition("=")
        if key == "Next":
            match = re.search(r"#(\d+)", value)
            if match:
                print(f"  📎 Issue {match.group(0)} created — fill in the body with: "
                      f"gh issue edit {match.group(1)} --body \"<description, context, acceptance criteria>\"")

    # Push if requested
    if args.push:
        try:
            push_result = subprocess.run(
                ["git", "push"],
                capture_output=True, text=True, timeout=30,
            )
        except (FileNotFoundError, OSError, subprocess.TimeoutExpired) as e:
            print(f"  {RED}push failed: {e}{RESET}", file=sys.stderr)
            sys.exit(1)
        if push_result.returncode == 0:
            print(f"  {DIM}↑ pushed{RESET}")
        else:
            print(f"  {RED}push failed: {push_result.stderr.strip()}{RESET}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
