---
name: changelog-state
description: Tracks the last changelog update date and what was included, so future runs only process new commits
type: project
---

Last changelog update: 2026-03-15
Last commit covered: 36617e0 (context(plugin/compliance): session end — compliance structure mounted)
Current version in plugin.json: 3.7.0 (unverified — no new release yet)
Versions documented: 1.0.0 through 3.7.0 plus [Unreleased] section
[Unreleased] contains: unmassk-ops plugin (5 skills), compliance-legal-docs skill (SKILL.md created + 12 reference files fixed), ops-error-tracking skill (SKILL.md created, 6 reference frontmatters stripped, otel-backends.md created)

**Why:** Alexandria needs to know where to resume on next launch — only commits after 36617e0 need processing.
**How to apply:** On next run, `git log 36617e0..HEAD --oneline` and check for new code changes not yet in CHANGELOG.md.
