# Test Guide — unmassk-gitmemory v2.1.0

Manual testing checklist for all features added in this release.

## Prerequisites

```bash
# Run automated tests first (49 tests, all must pass)
python3 -m pytest tests/ -v
```

Have a **scratch git repo** ready for manual tests:

```bash
mkdir /tmp/test-gm && cd /tmp/test-gm && git init && git commit --allow-empty -m "init"
```

---

## 1. Fresh Install

```bash
cd /tmp/test-gm
python3 ~/Workspace/claude-git-memory/bin/git-memory-install.py --auto
```

**Verify:**
- [ ] `CLAUDE.md` exists and contains `<!-- BEGIN GIT-MEMORY MANAGED BLOCK -->`
- [ ] CLAUDE.md has **"Wip Commit Strategy"** section
- [ ] CLAUDE.md stop hook description says **"Never blocks"** (not "Blocks exit")
- [ ] `.claude/hooks/stop-dod-check.py` is symlinked
- [ ] `.claude/hooks/context-writer.py` is symlinked
- [ ] `settings.local.json` has statusline pointing to context-writer wrapper

---

## 2. Stop Hook — Silent Auto-Wip

```bash
cd /tmp/test-gm
echo "test content" > somefile.txt
python3 .claude/hooks/stop-dod-check.py
```

**Verify:**
- [ ] Exit code is **0** (never 2)
- [ ] Output contains `[auto-wip]` instruction telling Claude to commit silently
- [ ] Output does NOT show a blocking menu with options

---

## 3. Stop Hook — Wip Checkpoint Suggestion

```bash
cd /tmp/test-gm
# Create 3+ consecutive wip commits
git add -A && git commit -m "wip: first change"
echo "more" >> somefile.txt && git add -A && git commit -m "wip: second change"
echo "even more" >> somefile.txt && git add -A && git commit -m "wip: third change"

# Now create uncommitted changes and run stop hook
echo "fourth" >> somefile.txt
python3 .claude/hooks/stop-dod-check.py
```

**Verify:**
- [ ] Output contains `[auto-wip]` (for uncommitted changes)
- [ ] Output contains `[wip-checkpoint]` (for 3+ consecutive wips)
- [ ] Suggestion mentions squashing wips into a proper commit
- [ ] Exit code is still **0**

---

## 4. Context Awareness

```bash
cd /tmp/test-gm
# Simulate statusline data (as Claude Code would send it)
mkdir -p .claude
echo '{"context_window":{"used_percentage":75,"remaining_percentage":25,"context_window_size":200000}}' | \
  python3 .claude/hooks/context-writer.py

# Check the file was written
cat .claude/.context-status.json
```

**Verify:**
- [ ] `.claude/.context-status.json` exists with `used_percentage`, `remaining_percentage`, `timestamp`
- [ ] Run stop hook: `python3 .claude/hooks/stop-dod-check.py` — should show context warning (75% > 60%)

Test thresholds:
- **< 60%**: no context warning
- **60-79%**: yellow warning (⚠️)
- **≥ 80%**: red critical warning (🔴)
- **Stale data** (>5 min old): ignored silently

---

## 5. Gitto Agent

From Claude Code in any git-memory-enabled repo:

```
Invoke the gitto agent and ask: "what decisions have been made in this project?"
```

**Verify:**
- [ ] Agent launches (uses haiku model)
- [ ] Runs `git memory boot` for quick context
- [ ] Runs `git log --all --grep` for deep search
- [ ] Returns structured markdown with Decision/Memo/Pending blocks
- [ ] Is READ-ONLY — makes no changes to the repo

---

## 6. Uninstall

```bash
cd /tmp/test-gm
python3 ~/Workspace/claude-git-memory/bin/git-memory-install.py --uninstall
```

**Verify:**
- [ ] CLAUDE.md managed block removed
- [ ] Hooks removed from `.claude/hooks/`
- [ ] Statusline restored to original value (or removed if none existed)

---

## 7. Cleanup

```bash
rm -rf /tmp/test-gm
```
