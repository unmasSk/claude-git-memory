#!/usr/bin/env python3
"""
git-memory-install -- Configure git-memory for a project.

The plugin runs entirely from the plugin cache (~/.claude/plugins/cache/).
This script only manages the CLAUDE.md managed block and manifest at the
project root. No hooks, skills, bin, or lib files are copied.

If an old-style install is detected (files at project root), it cleans them up.

Usage:
  git memory install              # Interactive install
  git memory install --auto       # Non-interactive (for scripts/CI)
  git memory install --mode X     # Force mode: normal, compatible, read-only

Exit codes:
  0: Install successful
  1: Error
  2: Aborted by user
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git, ensure_gitignore
from version import VERSION


# ── Config ────────────────────────────────────────────────────────────────

MANAGED_BLOCK_BEGIN = "<!-- BEGIN unmassk-gitmemory (managed block — do not edit) -->"
MANAGED_BLOCK_END = "<!-- END unmassk-gitmemory -->"

MANAGED_BLOCK_CONTENT = """## Git Memory Active

This project uses **unmassk-gitmemory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="unmassk-gitmemory"` (TOOL CALL, not bash)
2. Read the `[git-memory-boot]` SessionStart output already in your context (do NOT run doctor or git-memory-log)
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" -> use skill `unmassk-gitmemory-lifecycle`.
Never ask the user to run commands -- run them yourself."""


# Old-style install files that should be cleaned up from the project root.
# These were copied by the v1 installer but should only live in the plugin cache.
OLD_BIN_FILES = [
    "bin/git-memory", "bin/git-memory-gc.py", "bin/git-memory-dashboard.py",
    "bin/git-memory-doctor.py", "bin/git-memory-install.py",
    "bin/git-memory-repair.py", "bin/git-memory-uninstall.py",
    "bin/git-memory-bootstrap.py", "bin/git-memory-upgrade.py",
]

OLD_HOOK_FILES = [
    "hooks/pre-validate-commit-trailers.py",
    "hooks/post-validate-commit-trailers.py",
    "hooks/precompact-snapshot.py",
    "hooks/stop-dod-check.py",
    "hooks/session-start-boot.py",
    "hooks/user-prompt-memory-check.py",
    "hooks/hooks.json",
]

OLD_LIB_FILES = [
    "lib/__init__.py", "lib/constants.py", "lib/git_helpers.py",
    "lib/parsing.py", "lib/colors.py",
]

OLD_SKILL_DIRS = [
    "skills/git-memory",
    "skills/git-memory-protocol",
    "skills/git-memory-lifecycle",
    "skills/git-memory-recovery",
]  # Keep old dirs listed for cleanup during upgrades


# ── Helpers ───────────────────────────────────────────────────────────────

def find_source_root() -> str:
    """Find the git-memory plugin source root (where this script lives)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_target_root() -> str:
    """Find the target repo root (cwd's git root)."""
    code, output = run_git(["rev-parse", "--show-toplevel"])
    if code == 0:
        return output
    return os.getcwd()


# ── Phase 1: Inspect ─────────────────────────────────────────────────────

def inspect(target: str) -> dict[str, Any]:
    """Inspect the target repository and detect its current state.

    Checks for git repo, CLAUDE.md managed block, manifest, and old-style
    install files.

    Args:
        target: Path to the target repository root.

    Returns:
        Dict with boolean flags and a suggested install mode.
    """
    report: dict[str, Any] = {
        "is_git": False,
        "has_claude_md": False,
        "has_managed_block": False,
        "has_manifest": False,
        "has_old_install": False,
        "has_commitlint": False,
        "suggested_mode": "normal",
    }

    # Git repo?
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    report["is_git"] = code == 0

    if not report["is_git"]:
        return report

    # CLAUDE.md
    claude_md = os.path.join(target, "CLAUDE.md")
    if os.path.isfile(claude_md):
        report["has_claude_md"] = True
        with open(claude_md) as f:
            report["has_managed_block"] = "BEGIN unmassk-gitmemory" in f.read()

    # Manifest
    manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
    report["has_manifest"] = os.path.isfile(manifest_path)

    # Detect old-style install (files copied to project root).
    # Skip if target IS the plugin source repo (has .claude-plugin/plugin.json
    # with our plugin name) — those files are source code, not old install copies.
    is_plugin_source = False
    plugin_json_path = os.path.join(target, ".claude-plugin", "plugin.json")
    if os.path.isfile(plugin_json_path):
        try:
            with open(plugin_json_path) as f:
                pj = json.load(f)
            if pj.get("name") == "unmassk-gitmemory":
                is_plugin_source = True
        except (json.JSONDecodeError, OSError):
            pass

    if not is_plugin_source:
        for f in OLD_BIN_FILES + OLD_HOOK_FILES:
            if os.path.isfile(os.path.join(target, f)):
                report["has_old_install"] = True
                break
        if not report["has_old_install"]:
            if os.path.isdir(os.path.join(target, ".claude-plugin")):
                report["has_old_install"] = True

    # Commitlint / CI that might reject trailers
    for ci_file in [".commitlintrc.json", ".commitlintrc.yml",
                    "commitlint.config.js", "commitlint.config.ts"]:
        if os.path.isfile(os.path.join(target, ci_file)):
            report["has_commitlint"] = True
            report["suggested_mode"] = "compatible"
            break

    # Check package.json for commitlint
    pkg_path = os.path.join(target, "package.json")
    if os.path.isfile(pkg_path):
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
            if "commitlint" in pkg.get("devDependencies", {}):
                report["has_commitlint"] = True
                report["suggested_mode"] = "compatible"
        except (json.JSONDecodeError, OSError):
            pass

    # Detect stale hook entries in project .claude/settings.json
    project_settings_path = os.path.join(target, ".claude", "settings.json")
    if os.path.isfile(project_settings_path):
        try:
            with open(project_settings_path) as f:
                project_settings = json.load(f)
            hooks_data = project_settings.get("hooks", {})
            if hooks_data and isinstance(hooks_data, dict):
                for event_hooks in hooks_data.values():
                    if not isinstance(event_hooks, list):
                        continue
                    for hook_group in event_hooks:
                        hook_list = hook_group.get("hooks", []) if isinstance(hook_group, dict) else []
                        for hook in hook_list:
                            cmd = hook.get("command", "") if isinstance(hook, dict) else ""
                            if cmd and "${CLAUDE_PLUGIN_ROOT}" not in cmd and (
                                "hooks/" in cmd or "bin/" in cmd
                            ):
                                report["has_stale_hooks"] = True
                                break
        except (json.JSONDecodeError, OSError):
            pass

    return report


# ── Phase 2: Plan ─────────────────────────────────────────────────────────

def create_plan(report: dict[str, Any], source: str, target: str,
                mode: str | None = None) -> dict[str, Any]:
    """Build an installation plan based on the inspection report.

    Args:
        report: Output from inspect().
        source: Plugin source root directory.
        target: Target repository root directory.
        mode: Forced install mode, or None to use the suggested one.

    Returns:
        Dict with "mode", "actions" list, and "skipped" list.
    """
    plan: dict[str, Any] = {
        "mode": mode or report["suggested_mode"],
        "actions": [],
        "skipped": [],
    }

    if not report["is_git"]:
        plan["actions"].append(("abort", "Not a git repository"))
        return plan

    # Clean up old-style install first
    is_self = os.path.realpath(source) == os.path.realpath(target)
    if report["has_old_install"] and not is_self:
        plan["actions"].append(("cleanup_old", "Remove old-style install files from project root"))

    if report.get("has_stale_hooks"):
        plan["actions"].append(("cleanup_stale_hooks", "Remove stale hook entries from .claude/settings.json"))

    # CLAUDE.md managed block
    if report["has_managed_block"]:
        plan["actions"].append(("update_claude_md", "Update managed block in CLAUDE.md"))
    else:
        plan["actions"].append(("update_claude_md", "Add managed block to CLAUDE.md"))

    # Manifest
    plan["actions"].append(("create_manifest", "Create/update .claude/git-memory-manifest.json"))

    # Statusline wrapper for context awareness
    plan["actions"].append(("setup_statusline", "Configure statusline wrapper for context tracking"))

    return plan


# ── Phase 3: Apply ────────────────────────────────────────────────────────

def apply_plan(plan: dict[str, Any], source: str, target: str) -> list[str]:
    """Execute the installation plan.

    Args:
        plan: Output from create_plan().
        source: Plugin source root directory.
        target: Target repository root directory.

    Returns:
        List of error messages. Empty list means all actions succeeded.
    """
    errors = []

    for action, description in plan["actions"]:
        try:
            if action == "abort":
                return [description]
            elif action == "cleanup_old":
                _cleanup_old_install(target, source)
            elif action == "cleanup_stale_hooks":
                _cleanup_stale_settings_hooks(target)
            elif action == "update_claude_md":
                _update_claude_md(target)
            elif action == "create_manifest":
                _create_manifest(target, plan["mode"])
            elif action == "setup_statusline":
                _setup_statusline_wrapper(source)
        except Exception as e:
            errors.append(f"{action}: {e}")

    return errors


def _cleanup_old_install(target: str, source: str) -> None:
    """Remove files from old-style installs that copied to project root.

    Only removes files we recognize as git-memory managed files.
    Never removes user files or directories that contain non-managed files.
    """
    is_self = os.path.realpath(source) == os.path.realpath(target)
    if is_self:
        return

    removed = []

    # Remove individual managed files
    for f in OLD_BIN_FILES + OLD_HOOK_FILES + OLD_LIB_FILES:
        path = os.path.join(target, f)
        if os.path.isfile(path) or os.path.islink(path):
            os.unlink(path)
            removed.append(f)

    # Remove old skill directories
    for d in OLD_SKILL_DIRS:
        path = os.path.join(target, d)
        if os.path.isdir(path) and not os.path.islink(path):
            shutil.rmtree(path)
            removed.append(d + "/")
        elif os.path.islink(path):
            os.unlink(path)
            removed.append(d)

    # Remove .claude-plugin/ directory (entirely ours)
    plugin_dir = os.path.join(target, ".claude-plugin")
    if os.path.isdir(plugin_dir):
        shutil.rmtree(plugin_dir)
        removed.append(".claude-plugin/")

    # Remove old .claude/hooks and .claude/skills symlink directories
    for subdir in ["hooks", "skills"]:
        path = os.path.join(target, ".claude", subdir)
        if os.path.isdir(path):
            # Only remove if it contains symlinks (our old install pattern)
            entries = os.listdir(path)
            all_symlinks = all(os.path.islink(os.path.join(path, e)) for e in entries) if entries else True
            if all_symlinks:
                shutil.rmtree(path)
                removed.append(f".claude/{subdir}/")

    # Clean up __pycache__ left by our old scripts, then try to remove empty dirs
    for d in ["bin", "hooks", "skills", "lib"]:
        path = os.path.join(target, d)
        if os.path.isdir(path):
            pycache = os.path.join(path, "__pycache__")
            if os.path.isdir(pycache):
                shutil.rmtree(pycache)
            try:
                os.rmdir(path)  # Only succeeds if empty
            except OSError:
                pass

    if removed:
        print(f"  Cleaned {len(removed)} old-style install files/directories")


def _cleanup_stale_settings_hooks(target: str) -> None:
    """Remove stale hook entries from the project's .claude/settings.json.

    When migrating from old-style installs, the project settings may contain
    hook commands that reference local paths (e.g. python3 hooks/...) instead
    of using ${CLAUDE_PLUGIN_ROOT}. Since the plugin now provides hooks via
    hooks.json, these entries are stale and should be removed.
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

    del settings["hooks"]

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")

    print("  Removed stale hook entries from .claude/settings.json")


def _update_claude_md(target: str) -> None:
    """Add or update the managed block in CLAUDE.md."""
    claude_md = os.path.join(target, "CLAUDE.md")

    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            content = f.read()

        # Replace existing block
        begin_idx = content.find(MANAGED_BLOCK_BEGIN)
        end_idx = content.find(MANAGED_BLOCK_END)
        if begin_idx != -1 and end_idx != -1:
            end_idx += len(MANAGED_BLOCK_END)
            new_block = f"{MANAGED_BLOCK_BEGIN}\n{MANAGED_BLOCK_CONTENT}\n{MANAGED_BLOCK_END}"
            content = content[:begin_idx] + new_block + content[end_idx:]
        else:
            # Append
            content = content.rstrip() + f"\n\n{MANAGED_BLOCK_BEGIN}\n{MANAGED_BLOCK_CONTENT}\n{MANAGED_BLOCK_END}\n"
    else:
        content = f"# CLAUDE.md\n\n{MANAGED_BLOCK_BEGIN}\n{MANAGED_BLOCK_CONTENT}\n{MANAGED_BLOCK_END}\n"

    with open(claude_md, "w") as f:
        f.write(content)


def _create_manifest(target: str, mode: str) -> None:
    """Create .claude/git-memory-manifest.json with install metadata."""
    claude_dir = os.path.join(target, ".claude")
    os.makedirs(claude_dir, exist_ok=True)

    manifest = {
        "version": VERSION,
        "installed_at": datetime.now().isoformat(),
        "runtime_mode": mode,
        "managed_blocks": [
            {
                "file": "CLAUDE.md",
                "begin": "BEGIN unmassk-gitmemory",
                "end": "END unmassk-gitmemory",
            }
        ],
        "hook_registrations": [
            "PreToolUse", "PostToolUse", "Stop",
            "PreCompact", "SessionStart", "UserPromptSubmit",
        ],
        "last_healthcheck_at": datetime.now().isoformat(),
    }

    manifest_path = os.path.join(claude_dir, "git-memory-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    ensure_gitignore(target)


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
    wrapper_script = os.path.join(source, "bin", "context-writer.py")

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

    # Case 1: Already configured with exact same command — skip
    if current_cmd == wrapper_cmd:
        if not os.path.isfile(backup_path):
            print("  Warning: statusline wrapper active but backup missing")
        return

    # Case 2: Our wrapper but different path (reinstall/upgrade) — update path only
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

    # Case 3: Fresh install — back up current command (even if empty)
    with open(backup_path, "w") as f:
        f.write(current_cmd)

    # Set our wrapper as the statusline
    settings["statusLine"] = {
        "type": "command",
        "command": wrapper_cmd,
        "padding": current_sl.get("padding", 0) if isinstance(current_sl, dict) else 0,
    }

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")


# ── Phase 4 & 5: Verify + Health Proof ───────────────────────────────────

def verify(target: str) -> dict[str, Any]:
    """Run git-memory-doctor.py --json to verify the installation.

    Returns:
        Parsed doctor JSON output, or a fallback dict on failure.
    """
    doctor_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor_script):
        result = subprocess.run(
            [sys.executable, doctor_script, "--json"],
            capture_output=True, text=True, timeout=15,
        )
        try:
            data: dict[str, Any] = json.loads(result.stdout)
            return data
        except json.JSONDecodeError:
            return {"status": "error", "checks": []}
    return {"status": "unknown", "checks": []}


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point: parse args and run the install pipeline."""
    parser = argparse.ArgumentParser(description="Configure git-memory for a project.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--mode", dest="mode",
                        choices=["normal", "compatible", "read-only"],
                        default=None, help="Force install mode")
    args = parser.parse_args()
    auto = args.auto
    forced_mode = args.mode

    source = find_source_root()
    target = find_target_root()

    # Self-install detection: source == target means dogfooding
    is_self = os.path.realpath(source) == os.path.realpath(target)

    print("=== git memory install ===")
    print(f"Plugin: {source}")
    print(f"Project: {target}")
    if is_self:
        print("(self-install: plugin source is the project)")
    print()

    # Phase 1: Inspect
    print("Phase 1: Inspecting project...")
    report = inspect(target)

    if not report["is_git"]:
        print("Error: not a git repository.", file=sys.stderr)
        sys.exit(1)

    # Phase 2: Plan
    plan = create_plan(report, source, target, forced_mode)

    print(f"\nPhase 2: Installation plan (mode: {plan['mode']})")
    print("─" * 40)
    for _, desc in plan["actions"]:
        print(f"  → {desc}")
    for desc in plan["skipped"]:
        print(f"  ⏭  {desc}")
    print("─" * 40)

    if not auto:
        try:
            answer = input("\nProceed with installation? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer and answer not in ("y", "yes", "s", "si", "sí", ""):
            print("Aborted.")
            sys.exit(2)

    # Phase 3: Apply
    print("\nPhase 3: Applying...")
    errors = apply_plan(plan, source, target)

    if errors:
        print("\nErrors during installation:", file=sys.stderr)
        for err in errors:
            print(f"  ❌ {err}", file=sys.stderr)
        sys.exit(1)

    print("  Done.")

    # Phase 4: Verify
    print("\nPhase 4: Verifying...")
    doctor_result = verify(target)

    # Phase 5: Health proof
    print("\nPhase 5: Health proof")
    print("─" * 40)
    status = doctor_result.get("status", "unknown")
    checks = doctor_result.get("checks", [])

    for check in checks:
        icon = {"ok": "✅", "warn": "⚠️ ", "error": "❌"}.get(check.get("level", ""), "?")
        print(f"  {icon} {check.get('component', '?')}: {check.get('message', '?')}")

    print("─" * 40)

    if status == "ok":
        print(f"\nInstallation complete. Mode: {plan['mode']}")
    elif status == "warn":
        print(f"\nInstalled with warnings. Mode: {plan['mode']}")
    else:
        print("\nInstalled but verification found issues.")

    sys.exit(0)


if __name__ == "__main__":
    main()
