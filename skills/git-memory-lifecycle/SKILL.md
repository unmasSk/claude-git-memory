---
name: git-memory-lifecycle
description: Use when user says install, setup, configure, doctor, health, status, repair, fix, uninstall, remove memory system, or when checking system integrity.
---

# Git Memory — Lifecycle

**Rule: Claude executes all lifecycle commands. Never ask the user to run them.**
**Rule: ALWAYS pass `--auto` to every script. Never let scripts prompt for input.**

### Finding scripts — READ THIS CAREFULLY

Scripts are ALWAYS at `bin/` in the project root. Run as: `python3 bin/git-memory-<command>.py --auto`

**NEVER use these paths** (common mistakes):
- `.claude-plugin/bin/` — WRONG, .claude-plugin/ only has manifests
- `$CLAUDE_PLUGIN_ROOT/bin/` — WRONG, this var does not exist in Bash
- `env | grep CLAUDE_PLUGIN` — USELESS, the var is not an env var

**First install** (before `bin/` exists locally): read `~/.claude/plugins/installed_plugins.json` → find `installPath` for `claude-git-memory@unmassk-claude-git-memory` → use that path.

## Install (transactional)

```bash
# First install (bin/ doesn't exist yet — use plugin cache path):
python3 <installPath>/bin/git-memory-install.py --auto

# Reinstall (bin/ already exists locally):
python3 bin/git-memory-install.py --auto
```

The `--auto` flag skips all interactive prompts. **Always use it.**

The script runs 5 phases automatically: inspect → plan → apply → verify → health proof.

Never install without showing plan first. Never merge JSON blindly.

### Post-install: ask about .gitignore

After a successful install, **always ask the user**:

> "The git-memory runtime files (bin/, hooks/, skills/, lib/, .claude-plugin/) are now in your project. Do you want to add them to .gitignore so they don't get committed? Only CLAUDE.md would be tracked."

If the user says yes, add a managed block to `.gitignore`:

```gitignore
# BEGIN claude-git-memory (managed — do not edit)
bin/git-memory*
hooks/*.py
hooks/hooks.json
skills/git-memory*/
lib/
.claude-plugin/
.claude/hooks/
.claude/skills/
.claude/git-memory-manifest.json
# END claude-git-memory
```

If the user says no, the files will show as untracked and the Stop hook will flag them.

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
| Session start | Silent health check | `python3 bin/git-memory-doctor.py --json` → repair if needed |
| PR/merge | Clean stale trailers if seen | "Cleaned 2 stale items in passing" |
| Symptoms detected | GC on demand | Ask user "Clean up?" → `python3 bin/git-memory-gc.py --auto` |
| User asks | Full GC | `python3 bin/git-memory-gc.py --auto` (Claude runs it, shows results) |

Never interrupt the user with unsolicited admin tasks. Never ask the user to run commands.
