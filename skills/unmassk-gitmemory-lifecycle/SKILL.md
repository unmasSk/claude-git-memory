---
name: unmassk-gitmemory-lifecycle
description: Use when user says install, setup, configure, doctor, health, status, repair, fix, uninstall, remove memory system, recovery, modes, compatible mode, CI compatibility, or when checking system integrity. Also used for self-healing after rebase/force-push.
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
✅ Version: v3.6.0 (current)
─────────────────────────
Recommendation: review stale blockers
```

Run silently by the SessionStart hook on every boot. STATUS section in boot output shows the result. Only report details to the user if problems found.

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
To remove the plugin itself: `/plugin uninstall unmassk-gitmemory`

## Manifest (.claude/git-memory-manifest.json)

```json
{
  "version": "3.6.0",
  "installed_at": "ISO8601",
  "runtime_mode": "normal|compatible|read-only",
  "managed_blocks": [
    { "file": "CLAUDE.md", "begin": "BEGIN unmassk-gitmemory", "end": "END unmassk-gitmemory" }
  ],
  "hook_registrations": ["PreToolUse", "PostToolUse", "Stop", "PreCompact", "SessionStart", "UserPromptSubmit"],
  "last_healthcheck_at": "ISO8601"
}
```

## Maintenance: Opportunistic

No scheduled calendar. Claude cleans in passing (never asks user to run commands):

| When | What | Claude does |
|------|------|-------------|
| Session start | STATUS in boot output | SessionStart hook runs doctor silently → shows result in STATUS section |
| PR/merge | Clean stale trailers if seen | "Cleaned 2 stale items in passing" |
| Symptoms detected | GC on demand | Ask user "Clean up?" → run GC from plugin cache |
| User asks | Full GC | Run GC (Claude runs it, shows results) |

Never interrupt the user with unsolicited admin tasks. Never ask the user to run commands.

## Modes of Operation

| Mode | When | Does | Doesn't |
|------|------|------|---------|
| **Normal** | Standard git repo | Full runtime: hooks + trailers + CLI | — |
| **Compatible** | CI/commitlint rejects trailers | git notes or local store instead | Touch commit messages |
| **Read-only** | No write perms, external repo | Read existing memory | Create commits |
| **Abort** | No git | Explain why and stop | Force anything |

Detected during install inspection. Stored in manifest. If uncertain, ask.

### CI Compatibility

Check compatibility BEFORE activating writes. If commitlint is active, use compatible mode or allowed namespace. Alternative: git notes for local memory.

## Recovery

### Self-Healing (rebase/reset detection)

On boot, compare known commit hashes with current tree. If amnesia detected (memory commits missing):

> "Seems like a rebase happened. I've rebuilt memory from current state, but prior design context may be missing."

Don't dramatize. Don't fake normalcy. Rebuild conservatively, be honest about gaps.

### Force Push Handling

- Detect history rewrite (known SHAs missing from tree)
- Don't assume "most recent = best"
- Conservative resolution — never invent missing context
- Log what was lost if detectable

### Branch-Aware Decisions

Decisions have scope: repo / branch / path / environment. Don't deduplicate across branches. Treat differing decisions on different branches as branch-specific context.

### Emergency: Lost Commits

```bash
git reflog                    # find SHA before the reset
git reset --hard <sha>        # recover (reflog keeps ~30 days)
```

Document recovery with `Risk: high` + `Why:` trailers. Create backup branch before any destructive recovery: `git branch backup-before-recovery`
