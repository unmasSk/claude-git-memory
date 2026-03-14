"""
Shared constants for unmassk-gitmemory hooks and CLI scripts.

Single source of truth for trailer keys, commit types, risk levels,
and memo categories. Imported everywhere.
"""

# Trailer keys (case-sensitive, matching the spec)
VALID_KEYS: set[str] = {
    "Issue", "Why", "Touched", "Decision", "Memo", "Next",
    "Blocker", "Risk", "Conflict", "Resolution",
    "Remember",  # Personality/working-style notes between sessions
    "Resolved-Next", "Stale-Blocker",  # GC tombstone trailers
}

# Memory-relevant trailer keys for scan_trailers_memory
MEMORY_KEYS: set[str] = {
    "Decision", "Memo", "Next", "Blocker", "Remember",
    "Resolved-Next", "Stale-Blocker",
}

# Risk levels for Risk: trailer
RISK_VALUES: set[str] = {"low", "medium", "high"}

# Memo categories for Memo: trailer (format: "category - description")
MEMO_CATEGORIES: set[str] = {"preference", "requirement", "antipattern", "stack"}

# Commit types that require code trailers (Why + Touched)
CODE_TYPES: set[str] = {"feat", "fix", "refactor", "perf", "chore", "ci", "test", "docs"}

# Commit types that are memory-only (allow-empty)
MEMORY_TYPES: set[str] = {"context", "decision", "memo", "remember"}

# Default Co-Author line appended to every commit.
# Override via GIT_MEMORY_CO_AUTHOR environment variable.
DEFAULT_CO_AUTHOR: str = "Co-Authored-By: Claude <noreply@anthropic.com>"
