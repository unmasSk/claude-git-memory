---
name: changelog-state
description: Tracks the last changelog update date and what was included, so future runs only process new commits
type: project
---

Last full audit: 2026-03-24
Last commit covered (toolkit root): 420da45 (chore(plugin): bump to 1.1.1 + changelog for agent prompt normalization)
Last commit covered (chatroom): f4196fa (fix(plugin/chatroom/frontend): formatContent keeps agent name capitalized in queue messages)
Current version in plugin.json: 1.1.1 (unmassk-toolkit)
Versions documented (toolkit root): 1.0.0 through 1.1.1 plus [Unreleased] section (empty); also contains unmassk-crew history (1.5.0, 1.6.0) and original git-memory history (1.0.0-gitmemory through 3.7.0)

Root CHANGELOG structure note: Three product timelines merged into one file. Old git-memory [1.1.0] entry was renamed [1.1.0-gitmemory] on 2026-03-24 to avoid collision with toolkit [1.1.0].

[Unreleased] contains (chatroom/CHANGELOG.md): V2 agent prompts (all V2 files now deleted from chatroom/ — fixed in Removed section 2026-03-24), 5-phase pipeline, file attachments (API + UI + DB + frontend), LOC refactor, mention-parser fix, stoppedRooms guard. Not yet versioned/released.

**Why:** Alexandria needs to know where to resume on next launch — only commits after the covered commits need processing.
**How to apply:** On next run: `git log 420da45..HEAD --oneline` for toolkit root; `git log f4196fa..HEAD --oneline -- chatroom/` for chatroom. Check for new code changes not yet in either CHANGELOG.md.
