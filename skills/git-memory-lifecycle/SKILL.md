---
name: git-memory-lifecycle
description: Use when user says install, setup, configure, doctor, health, status, repair, fix, uninstall, remove memory system, or when checking system integrity.
---

# Git Memory — Lifecycle

**Rule: Claude executes all lifecycle commands. Never ask the user to run them.**
**Rule: ALWAYS pass `--auto` to every script. Never let scripts prompt for input.**

### Finding scripts

Scripts live in the plugin cache, NOT at the project root. The `[git-memory-boot]` hook output provides the plugin root path. Use it: `python3 <plugin-root>/bin/git-memory-<command>.py --auto`

**NEVER hardcode paths** like `python3 bin/...` — the project root has NO plugin files.

## Install (transactional)

```bash
python3 <plugin-root>/bin/git-memory-install.py --auto
```

The `--auto` flag skips all interactive prompts. **Always use it.**

The script runs 5 phases: inspect → plan → apply → verify → health proof.
It only writes CLAUDE.md and `.claude/git-memory-manifest.json` to the project.
No files are copied to the project root — the plugin runs entirely from the cache.

## Doctor (diagnosis)

Check and report, one line per item:

```
Memory System Status
─────────────────────────
✅ Hooks: 6/6 in plugin cache
✅ Skills: 2/2 in plugin cache
✅ CLAUDE.md: managed block present
✅ Hook activity: 12/15 commits have trailers (80%)
✅ GC: last run 4 days ago
❌ Stale blockers: 2 items >30 days
✅ Version: v2.0 (current)
─────────────────────────
Recommendation: review stale blockers
```

Run silently on session start. Only report if problems found.

## Repair

| Situation | Action |
|-----------|--------|
| CLAUDE.md block missing | Recreate managed block |
| Manifest missing/corrupt | Regenerate manifest |
| Old-style install files at root | Run install to clean up |
| Plugin cache broken | User must run `/plugin install` |

## Uninstall

| Mode | Removes | Keeps |
|------|---------|-------|
| **safe** (default) | CLAUDE.md block, manifest | Git history |
| **full-local** | Above + generated files | Git history |

Git history (commits with trailers) is **never deleted automatically**.
To remove the plugin itself: `/plugin uninstall claude-git-memory`

## Manifest (.claude/git-memory-manifest.json)

```json
{
  "version": "3.1.0",
  "installed_at": "ISO8601",
  "runtime_mode": "normal|compatible|read-only",
  "managed_blocks": [
    { "file": "CLAUDE.md", "begin": "BEGIN claude-git-memory", "end": "END claude-git-memory" }
  ],
  "hook_registrations": ["PreToolUse", "PostToolUse", "Stop", "PreCompact", "SessionStart", "UserPromptSubmit"],
  "last_healthcheck_at": "ISO8601"
}
```

## Maintenance: Opportunistic

No scheduled calendar. Claude cleans in passing (never asks user to run commands):

| When | What | Claude does |
|------|------|-------------|
| Session start | Silent health check | Doctor from plugin cache → repair if needed |
| PR/merge | Clean stale trailers if seen | "Cleaned 2 stale items in passing" |
| Symptoms detected | GC on demand | Ask user "Clean up?" → run GC from plugin cache |
| User asks | Full GC | Run GC (Claude runs it, shows results) |

Never interrupt the user with unsolicited admin tasks. Never ask the user to run commands.
