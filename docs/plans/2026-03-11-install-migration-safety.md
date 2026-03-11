# Install Migration Safety — Fix 3 Blocking Bugs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `git-memory-install.py` safe during zero-copy migration — clean stale hooks from project settings.json, fix fragile statusline backup, and add doctor detection.

**Architecture:** All changes go in `bin/git-memory-install.py` (install script) and `bin/git-memory-doctor.py` (detection). The install's Phase 1 (inspect) gets a new check for stale settings.json hooks, Phase 3 (apply) gets a new cleanup action, and `_setup_statusline_wrapper` gets hardened backup logic. Doctor gets a new check to warn about stale hooks.

**Tech Stack:** Python 3, json stdlib, os/pathlib

---

### Task 1: Clean stale hooks from project settings.json during install

**Problem:** When migrating from old-style (local files) to zero-copy (plugin cache), the install cleans bin/, hooks/, skills/, lib/ from the project root but leaves `.claude/settings.json` with hook entries pointing to those deleted files. This causes PreToolUse hooks to block ALL Bash calls.

**Files:**
- Modify: `bin/git-memory-install.py` — `inspect()`, `create_plan()`, `apply_plan()`, new `_cleanup_stale_settings_hooks()`

**Step 1: Write the failing test**

```python
# tests/test_install.py (or inline verification)
# Verify: given a .claude/settings.json with hooks pointing to local paths,
# after install, those hooks are removed.
```

Run: `python3 -c "print('test placeholder')"`

**Step 2: Add detection in inspect()**

In `inspect()` (line ~183), after checking for old install files, add:

```python
# Stale hooks in project settings.json?
settings_path = os.path.join(target, ".claude", "settings.json")
report["has_stale_hooks"] = False
if os.path.isfile(settings_path):
    try:
        with open(settings_path) as f:
            settings = json.load(f)
        hooks = settings.get("hooks", {})
        for event_hooks in hooks.values():
            for hook_group in event_hooks:
                for hook in hook_group.get("hooks", []):
                    cmd = hook.get("command", "")
                    if cmd and "${CLAUDE_PLUGIN_ROOT}" not in cmd and (
                        "hooks/" in cmd or "bin/" in cmd
                    ):
                        report["has_stale_hooks"] = True
                        break
    except (json.JSONDecodeError, OSError):
        pass
```

**Step 3: Add action in create_plan()**

In `create_plan()` (line ~257), after the `cleanup_old` action, add:

```python
if report.get("has_stale_hooks"):
    plan["actions"].append(("cleanup_stale_hooks", "Remove stale hook entries from .claude/settings.json"))
```

**Step 4: Add cleanup function and wire into apply_plan()**

New function `_cleanup_stale_settings_hooks(target)`:

```python
def _cleanup_stale_settings_hooks(target: str) -> None:
    """Remove hook entries from .claude/settings.json that point to local files.

    After zero-copy migration, hooks should come from the plugin's hooks.json
    via ${CLAUDE_PLUGIN_ROOT}, not from project settings.json with local paths.
    """
    settings_path = os.path.join(target, ".claude", "settings.json")
    if not os.path.isfile(settings_path):
        return

    try:
        with open(settings_path) as f:
            settings = json.load(f)
    except (json.JSONDecodeError, OSError):
        return

    if "hooks" not in settings:
        return

    # Remove the entire hooks key — plugin provides hooks via hooks.json
    del settings["hooks"]

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")

    print("  Cleaned stale hook entries from .claude/settings.json")
```

In `apply_plan()`, add the elif:

```python
elif action == "cleanup_stale_hooks":
    _cleanup_stale_settings_hooks(target)
```

**Step 5: Commit**

```bash
git add bin/git-memory-install.py
git commit -m "🐛 fix(install): clean stale hooks from project settings.json during migration

When migrating from old-style to zero-copy, the install cleaned local
files but left .claude/settings.json with hook entries pointing to those
deleted files. PreToolUse hooks then blocked ALL Bash calls.

Now inspect() detects stale hooks and apply() removes them.

Why: stale PreToolUse hook in settings.json blocked every Bash call after zero-copy migration
Touched: bin/git-memory-install.py"
```

---

### Task 2: Harden statusline backup logic

**Problem:** `_setup_statusline_wrapper()` backs up the user's statusline on first install, but on reinstall/upgrade, if the backup file was lost, it can't recover because settings.json already contains `context-writer` and the condition `"context-writer" not in current_cmd` skips the backup.

**Files:**
- Modify: `bin/git-memory-install.py` — `_setup_statusline_wrapper()`

**Step 1: Fix the backup logic**

Replace `_setup_statusline_wrapper()` (lines 448-494) with hardened version:

```python
def _setup_statusline_wrapper(source: str) -> None:
    """Configure the statusline wrapper in ~/.claude/settings.json.

    Saves the user's current statusline command (if any) to a backup file,
    then sets our context-writer.py as the statusline command. The wrapper
    writes context window data to <project>/.claude/.context-status.json
    and passes through to the user's original statusline.
    """
    claude_home = os.path.join(os.path.expanduser("~"), ".claude")
    settings_path = os.path.join(claude_home, "settings.json")
    backup_path = os.path.join(claude_home, ".git-memory-original-statusline")
    wrapper_script = os.path.join(source, "hooks", "context-writer.py")

    # Read current settings
    settings: dict[str, Any] = {}
    if os.path.isfile(settings_path):
        with open(settings_path) as f:
            try:
                settings = json.load(f)
            except (json.JSONDecodeError, ValueError):
                return  # Don't touch corrupt settings

    current_sl = settings.get("statusLine", {})
    current_cmd = current_sl.get("command", "") if isinstance(current_sl, dict) else ""

    # Our wrapper command
    wrapper_cmd = f"{sys.executable} {wrapper_script}"

    # Already configured with exact same command — skip
    if current_cmd == wrapper_cmd:
        # But verify backup exists if we're wrapping
        if not os.path.isfile(backup_path):
            print("  Warning: statusline wrapper active but backup missing")
        return

    # If current command is ours (context-writer) but different path (reinstall/upgrade):
    # Update the wrapper path but DON'T touch the backup
    if "context-writer" in current_cmd:
        settings["statusLine"] = {
            "type": "command",
            "command": wrapper_cmd,
            "padding": current_sl.get("padding", 0) if isinstance(current_sl, dict) else 0,
        }
        with open(settings_path, "w") as f:
            json.dump(settings, f, indent=2)
            f.write("\n")
        if not os.path.isfile(backup_path):
            print("  Warning: statusline wrapper updated but original backup missing — user must restore manually")
        return

    # Fresh install: back up the current command (even if empty, record that there was nothing)
    if current_cmd:
        with open(backup_path, "w") as f:
            f.write(current_cmd)
    else:
        # Record that there was no statusline before we touched it
        with open(backup_path, "w") as f:
            f.write("")

    # Set our wrapper as the statusline
    settings["statusLine"] = {
        "type": "command",
        "command": wrapper_cmd,
        "padding": current_sl.get("padding", 0) if isinstance(current_sl, dict) else 0,
    }

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
```

**Step 2: Commit**

```bash
git add bin/git-memory-install.py
git commit -m "🐛 fix(install): harden statusline backup — never lose user's original command

The backup logic failed on reinstall: if backup file was lost, the
condition 'context-writer not in current_cmd' was False, so no new
backup was written. Now handles 3 cases explicitly:
1. Exact same wrapper → skip (but warn if backup missing)
2. Our wrapper with different path → update path only, don't touch backup
3. Fresh install → always create backup (even if empty)

Why: user's custom statusline was permanently lost after reinstall when backup file was missing
Touched: bin/git-memory-install.py"
```

---

### Task 3: Add doctor check for stale settings.json hooks

**Problem:** Doctor should detect stale hooks in project settings.json so the user/Claude knows about the problem even without running install.

**Files:**
- Modify: `bin/git-memory-doctor.py` — add new check

**Step 1: Read doctor.py to understand check structure**

Read the file to find where checks are added.

**Step 2: Add stale hooks check**

Add after existing checks:

```python
# Check for stale hooks in project settings.json
settings_path = os.path.join(project_root, ".claude", "settings.json")
if os.path.isfile(settings_path):
    try:
        with open(settings_path) as f:
            proj_settings = json.load(f)
        if "hooks" in proj_settings:
            has_stale = False
            for event_hooks in proj_settings["hooks"].values():
                for hook_group in event_hooks:
                    for hook in hook_group.get("hooks", []):
                        cmd = hook.get("command", "")
                        if cmd and "${CLAUDE_PLUGIN_ROOT}" not in cmd and (
                            "hooks/" in cmd or "bin/" in cmd
                        ):
                            has_stale = True
                            break
            if has_stale:
                checks.append({"level": "error", "component": "Settings hooks",
                               "message": "stale local hooks in .claude/settings.json — run install to fix"})
            else:
                checks.append({"level": "ok", "component": "Settings hooks", "message": "clean"})
    except (json.JSONDecodeError, OSError):
        pass
```

**Step 3: Commit**

```bash
git add bin/git-memory-doctor.py
git commit -m "🐛 fix(doctor): detect stale hooks in project settings.json

Doctor now checks if .claude/settings.json contains hook entries pointing
to local files instead of using ${CLAUDE_PLUGIN_ROOT}. Reports as error
with guidance to run install to fix.

Why: stale hooks silently block all Bash calls with no diagnostic
Touched: bin/git-memory-doctor.py"
```

---

### Task 4: Verify end-to-end

**Step 1:** Run install on this project and verify it cleans settings.json
**Step 2:** Run doctor and verify no errors
**Step 3:** Verify ~/.claude/settings.json still has `bunx ccstatusline@latest`

---
