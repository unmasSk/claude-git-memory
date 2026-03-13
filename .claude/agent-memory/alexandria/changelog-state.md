---
name: changelog-state
description: Tracks the last changelog update date and what was included, so future runs only process new commits
type: project
---

Last changelog update: 2026-03-13
Last entry added: [Unreleased] — statusline forward-slash fix for Windows Git Bash, ctx% output
Current version in plugin.json: 3.6.0
Versions documented: 1.0.0 through 3.6.0 plus [Unreleased] section

**Why:** Alexandria needs to know where to resume on next launch — only commits after the latest covered need processing.
**How to apply:** On next run, check git log for commits not yet reflected in CHANGELOG.md.
