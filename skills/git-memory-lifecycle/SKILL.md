---
name: git-memory-lifecycle
description: Use when user says install, setup, configure, doctor, health, status, repair, fix, uninstall, remove memory system, or when checking system integrity.
---

# Git Memory — Lifecycle

**Rule: Claude executes all lifecycle commands. Never ask the user to run them.**

All scripts are at `$CLAUDE_PLUGIN_ROOT/bin/`. This env var is set by Claude Code when the plugin loads.
Execute with `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-<command>.py [flags]`.

## Install (transactional)

```
1. INSPECT
   - Is git repo? (no → abort with explanation)
   - Exists .claude/? settings.json? hooks? CLAUDE.md?
   - CI/commitlint active? → compatible mode
   - Decide mode: normal / compatible / read-only

2. PLAN (show to user before doing anything)
   - "Adding: hooks, skills, CLI, managed block in CLAUDE.md"
   - "Not touching your instructions outside the managed block"
   - "Your existing hooks are preserved"

3. APPLY
   - Copy hooks, skills, bin
   - Merge settings.json (namespaced, never overwrite existing)
   - Add managed block to CLAUDE.md
   - Create manifest.json

4. VERIFY → run doctor automatically

5. HEALTH PROOF
   - "All components installed. If anything fails, I can repair or uninstall."
```

Never install without showing plan first. Never merge JSON blindly.

## Doctor (diagnosis)

Check and report, one line per item:

```
Memory System Status
─────────────────────────
✅ Hooks: 6/6 registered
✅ Skills: 4/4 present
✅ CLI: bin/git-memory accessible
⚠️  Hook pre-commit: not executed in last 3 commits
✅ GC: last run 4 days ago
❌ Blocker stale: 2 items >30 days
✅ Version: v2.0 (current)
─────────────────────────
Recommendation: review stale blockers
```

Run silently on session start. Only report if problems found (noise level: inline for warnings, interrupt for broken).

## Repair

| Situation | Action |
|-----------|--------|
| .claude/ deleted | Reinstall runtime from manifest |
| settings.json corrupt | Reconstruct hook registrations |
| Hooks not executing | Verify registration, re-register |
| Snapshot desynced | Regenerate from live memory |
| Partial install | Complete missing pieces |

Always read manifest first to know what should exist.

## Uninstall

| Mode | Removes | Keeps |
|------|---------|-------|
| **safe** (default) | hooks, skills, CLI, CLAUDE.md block, manifest | Git history |
| **full-local** | Above + generated files (.claude/dashboard.html) | Git history |

Git history (commits with trailers) is **never deleted automatically**.
Say: "Removing runtime without touching past history."

## Manifest (.claude/git-memory-manifest.json)

```json
{
  "version": "2.0.0",
  "installed_at": "ISO8601",
  "runtime_mode": "normal|compatible|read-only",
  "managed_files": ["hooks/...", "skills/...", "bin/..."],
  "managed_blocks": [
    { "file": "CLAUDE.md", "begin": "BEGIN claude-git-memory", "end": "END claude-git-memory" }
  ],
  "hook_registrations": ["PreToolUse", "PostToolUse", "Stop", "PreCompact", "SessionStart", "UserPromptSubmit"],
  "last_healthcheck_at": "ISO8601",
  "install_fingerprint": "sha256:..."
}
```

Repair and uninstall read this to know what exists and what to clean.

## Maintenance: Opportunistic

No scheduled calendar. Claude cleans in passing (never asks user to run commands):

| When | What | Claude does |
|------|------|-------------|
| Session start | Silent health check | `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-doctor.py --json` → repair if needed |
| PR/merge | Clean stale trailers if seen | "Cleaned 2 stale items in passing" |
| Symptoms detected | GC on demand | Ask user "Clean up?" → `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-gc.py --auto` |
| User asks | Full GC | `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-gc.py` (Claude runs it, shows results) |

Never interrupt the user with unsolicited admin tasks. Never ask the user to run commands.
