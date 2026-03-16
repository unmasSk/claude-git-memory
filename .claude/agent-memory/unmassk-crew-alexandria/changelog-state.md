---
name: changelog-state
description: Tracks the last changelog update date and what was included, so future runs only process new commits
type: project
---

Last changelog update: 2026-03-16
Last commit covered: 0001616 (fix(plugin/config): restaurar scopes.json)
Current version in plugin.json: 3.7.0 (unmassk-gitmemory), 1.6.0 (unmassk-crew)
Versions documented: 1.0.0 through 3.7.0 plus [Unreleased] section; unmassk-crew 1.5.0 and 1.6.0 entries added
[Unreleased] contains: unmassk-ops plugin (5 skills), compliance-legal-docs skill (SKILL.md created + 12 reference files fixed), ops-error-tracking skill (SKILL.md created, 6 reference frontmatters stripped, otel-backends.md created)

**Why:** Alexandria needs to know where to resume on next launch — only commits after 0001616 need processing.
**How to apply:** On next run, `git log 0001616..HEAD --oneline` and check for new code changes not yet in CHANGELOG.md.
