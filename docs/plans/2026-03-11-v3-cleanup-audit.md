# v3.0.0 Cleanup & Full Audit Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix dead references, add git fetch to boot, deactivate dashboard from plugin, and audit every feature.

**Architecture:** Direct edits to source files in the repo. After all changes, copy to plugin cache and run tests.

**Tech Stack:** Python 3, Git, pytest

---

### Task 1: Fix PROTOCOL.md dead reference in skill

**Files:**
- Modify: `skills/git-memory/SKILL.md:15`

**Step 1: Fix the reference**

Line 15 says:
```
4. If conflict/risky op → stop, see PROTOCOL.md
```

Replace with:
```
4. If conflict/risky op → stop (see Conflict Resolution section below)
```

PROTOCOL.md was merged into this skill in v3.0.0 — the Conflict Resolution section already exists at line 187+.

**Step 2: Verify no other PROTOCOL.md references**

Run: `grep -r "PROTOCOL" skills/ hooks/ bin/ agents/`
Expected: zero matches

**Step 3: Commit**

```bash
git add skills/git-memory/SKILL.md
git commit -m "🐛 fix(skill): remove dead PROTOCOL.md reference

Why: PROTOCOL.md was merged into the core skill in v3.0.0 but the reference was never updated
Touched: skills/git-memory/SKILL.md"
```

---

### Task 2: Add git fetch to boot sequence

**Files:**
- Modify: `hooks/session-start-boot.py`
- Modify: `skills/git-memory/SKILL.md` (boot sequence docs)

**Step 1: Add fetch to session-start-boot.py**

After the git repo check (line 193-195) and before the doctor call (line 200), add:

```python
    # 0. Fetch remote refs silently (so we see remote commits)
    run_git(["fetch", "--quiet"])
```

This uses the existing `run_git()` helper which already handles failures silently (returns `(1, "")` on exception). If there's no remote or no network, it fails silently and boot continues.

**Step 2: Update skill boot sequence docs**

In `skills/git-memory/SKILL.md`, the boot sequence section (lines 36-43), add step 0:

```
0. `git fetch --quiet` — sync remote refs silently. If no network or no remote, continues without error.
1. Run `python3 <plugin-root>/bin/git-memory-doctor.py --json` silently...
```

**Step 3: Run tests**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/ -v`
Expected: all tests pass (fetch won't affect test repos since they have no remotes)

**Step 4: Commit**

```bash
git add hooks/session-start-boot.py skills/git-memory/SKILL.md
git commit -m "✨ feat(boot): add git fetch before reading commits

Why: without fetch, boot reads stale local history and misses remote commits (decisions, memos, context from other machines)
Touched: hooks/session-start-boot.py, skills/git-memory/SKILL.md"
```

---

### Task 3: Deactivate dashboard from plugin

**Files:**
- Modify: `hooks/post-validate-commit-trailers.py:227-237` (remove dashboard regen)
- Modify: `skills/git-memory-lifecycle/SKILL.md:64` (remove dashboard.html from uninstall)

The dashboard code (`bin/git-memory-dashboard.py`, `dashboard-preview.html`, `dashboard-screenshot.png`) stays in the repo for future use. We only deactivate the automatic trigger.

**Step 1: Remove dashboard regeneration from post-validate hook**

Delete lines 227-237 in `hooks/post-validate-commit-trailers.py`:

```python
        # Regenerate dashboard in background (non-blocking)
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            dashboard_script = os.path.join(script_dir, "..", "bin", "git-memory-dashboard.py")
            if os.path.exists(dashboard_script):
                subprocess.Popen(
                    ["python3", dashboard_script, "--silent"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
        except Exception:
            pass  # Dashboard regen is best-effort, never block commits
```

**Step 2: Update lifecycle skill**

In `skills/git-memory-lifecycle/SKILL.md` line 64, change:
```
| **full-local** | Above + generated files (.claude/dashboard.html) | Git history |
```
to:
```
| **full-local** | Above + generated files | Git history |
```

**Step 3: Run tests**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/ -v`

**Step 4: Commit**

```bash
git add hooks/post-validate-commit-trailers.py skills/git-memory-lifecycle/SKILL.md
git commit -m "🔧 chore(dashboard): deactivate auto-regeneration from plugin

Why: dashboard feature deactivated from plugin hooks — code remains in repo for future reuse
Touched: hooks/post-validate-commit-trailers.py, skills/git-memory-lifecycle/SKILL.md"
```

---

### Task 4: Fix stale data in lifecycle skill

**Files:**
- Modify: `skills/git-memory-lifecycle/SKILL.md`

**Step 1: Fix skills count**

Line 39 shows the doctor example output with "Skills: 4/4". Change to "Skills: 2/2" (v3.0.0 merged 4 skills into 2).

**Step 2: Fix version in manifest example**

Line 72 shows `"version": "2.1.0"` in the manifest JSON example. Change to `"3.0.0"`.

**Step 3: Commit**

```bash
git add skills/git-memory-lifecycle/SKILL.md
git commit -m "📝 docs(skill): fix stale counts and version in lifecycle skill

Why: skills merged 4→2 in v3.0.0 but examples still showed old counts
Touched: skills/git-memory-lifecycle/SKILL.md"
```

---

### Task 5: Update README

**Files:**
- Modify: `README.md`

**Step 1: Dashboard section**

Replace the dashboard section (lines 355-370) with an archived notice:

```markdown
## Dashboard (archived)

> The dashboard generator is included in the codebase but deactivated from automatic hooks. The code remains in `bin/git-memory-dashboard.py` for future use. You can still run it manually: "generate the dashboard".
```

Remove `dashboard-screenshot.png` image reference.

**Step 2: Post-commit hook description**

Line 299: remove "Also regenerates the dashboard in the background." from the Suspenders description.

**Step 3: CLI reference**

Line 521: change the dashboard CLI entry to note it's manual-only now.

**Step 4: Navigation links**

Line 17: remove or update the Dashboard link in the top nav.

**Step 5: Commit**

```bash
git add README.md
git commit -m "📝 docs: update README — dashboard archived, descriptions corrected

Why: dashboard deactivated from hooks, README must reflect current state
Touched: README.md"
```

---

### Task 6: Full feature audit

**Files:** Read-only audit of every component

**Step 1: Run test suite**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/ -v`
Document: pass/fail count, any failures

**Step 2: Verify each hook fires correctly**

For each hook, verify the Python script executes without errors:
- `python3 hooks/session-start-boot.py` (should output boot summary)
- `echo '{}' | python3 hooks/user-prompt-memory-check.py` (should output boot reminder)
- `echo '{}' | python3 hooks/stop-dod-check.py` (should check uncommitted changes)
- `echo '{"tool_input":{"command":"echo hi"},"tool_output":{}}' | python3 hooks/pre-validate-commit-trailers.py` (should pass through)
- `echo '{"tool_input":{"command":"echo hi"},"tool_output":{}}' | python3 hooks/post-validate-commit-trailers.py` (should pass through)
- `python3 hooks/precompact-snapshot.py` (should output memory snapshot)

**Step 3: Verify each bin script has --help or runs**

For each script: `python3 bin/<script>.py --help` or dry run

**Step 4: Verify lib imports work**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -c "from lib.constants import *; from lib.parsing import *; from lib.git_helpers import *; from lib.colors import *; print('OK')"`

**Step 5: Verify Gitto agent loads**

Check agents/gitto.md YAML frontmatter is valid.

**Step 6: Document findings**

Create a summary of what works, what's broken, what needs follow-up.

---

### Task 7: Sync changes to plugin cache

**Step 1: Copy modified files to cache**

```bash
CACHE=~/.claude/plugins/cache/unmassk-claude-git-memory/claude-git-memory/3.0.0
cp hooks/session-start-boot.py "$CACHE/hooks/"
cp hooks/post-validate-commit-trailers.py "$CACHE/hooks/"
cp skills/git-memory/SKILL.md "$CACHE/skills/git-memory/"
cp skills/git-memory-lifecycle/SKILL.md "$CACHE/skills/git-memory-lifecycle/"
```

**Step 2: Verify cache is consistent**

Run: `python3 ~/.claude/plugins/cache/unmassk-claude-git-memory/claude-git-memory/3.0.0/bin/git-memory-doctor.py --json`
Expected: all checks OK

---

### Task 8: Final context commit

```bash
git commit --allow-empty -m "💾 context(v3-cleanup): dead refs fixed, fetch added to boot, dashboard archived, full audit done

Why: cleanup session completing v3.0.0 stabilization
Next: user has new dashboard idea — wait for specs
Next: consider improving Gitto trigger conditions
Decision: dashboard code stays in repo but deactivated from hooks
Decision: boot sequence must git fetch before reading local commits"
```
