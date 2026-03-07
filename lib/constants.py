"""
Shared constants for git-memory hooks, CLI scripts, and dashboard.

Single source of truth for trailer keys, commit types, risk levels,
and memo categories. Imported everywhere.
"""

# Trailer keys (case-sensitive, matching the spec)
VALID_KEYS: set[str] = {
    "Issue", "Why", "Touched", "Decision", "Memo", "Next",
    "Blocker", "Risk", "Conflict", "Resolution", "Refs",
    "Resolved-Next", "Stale-Blocker",  # GC tombstone trailers
}

# Risk levels for Risk: trailer
RISK_VALUES: set[str] = {"low", "medium", "high"}

# Memo categories for Memo: trailer (format: "category - description")
MEMO_CATEGORIES: set[str] = {"preference", "requirement", "antipattern", "stack"}

# Commit types that require code trailers (Why + Touched)
CODE_TYPES: set[str] = {"feat", "fix", "refactor", "perf", "chore", "ci", "test", "docs"}

# Commit types that are memory-only (allow-empty)
MEMORY_TYPES: set[str] = {"context", "decision", "memo"}
