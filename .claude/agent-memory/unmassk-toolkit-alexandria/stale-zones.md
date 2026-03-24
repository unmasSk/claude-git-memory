---
name: stale-zones
description: Documentation zones known to be outdated or needing review — revisit on next run
type: project
---

## Cleared zones (fixed 2026-03-24)

- chatroom/CHANGELOG.md [Unreleased] Removed section: falsely said moriarty-system-prompt-v2.md still exists after it was deleted — corrected
- Root CHANGELOG.md: missing [Unreleased] section — added
- Root CHANGELOG.md: duplicate [1.1.0] version tag — old entry renamed [1.1.0-gitmemory]
- chatroom/README.md: test count was 535+ (stale) — corrected to 1200+
- chatroom/CLAUDE.md and chatroom/apps/backend/CLAUDE.md: brainstorm mode undocumented — added
- chatroom/apps/backend/CLAUDE.md: WS message types undocumented — added

## Active stale zones

### chatroom/CHANGELOG.md [Unreleased] — no version stamp
Recent commits (Tauri 2 shell, stdin delivery, repo cwd selector, security hardening, tab title, queue messages) are NOT in the chatroom changelog at all. The [Unreleased] section covers up to the LOC refactor but not the more recent frontend/backend changes. If chatroom cuts a release, a significant backfill is needed.

### chatroom/docs/ folder — not deeply audited
Docs may have drifted given volume of changes. Priority files to re-verify: websocket-protocol.md (brainstorm mode, clear_queue, stop_all not documented there), agent-invocation-pipeline.md (brainstorm mode filter not shown in the spawn example), module-reference.md.

### project-context.md memory file — stale version
project-context.md says "Current version: 3.6.0 (unmassk-gitmemory)" — this is very stale. The project is now unmassk-toolkit 1.1.1.
