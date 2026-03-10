#!/usr/bin/env python3
"""
git-memory-uninstall -- Clean removal of git-memory from a project.

Removes the CLAUDE.md managed block, manifest, and optionally generated files.
The plugin itself is uninstalled via `/plugin uninstall` in Claude Code.
Never touches git history (commits with trailers are preserved).

Usage:
  git memory uninstall                # Safe mode (default)
  git memory uninstall --full-local   # Also removes generated files
  git memory uninstall --auto         # Non-interactive

Modes:
  safe (default): Remove CLAUDE.md block, manifest
  full-local:     Above + generated files (.claude/dashboard.html, etc.)

Exit codes:
  0: Uninstall complete
  1: Error
  2: Aborted
"""

import argparse
import json
import os
import shutil
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git


# ── Config ────────────────────────────────────────────────────────────────

GENERATED_FILES = [
    ".claude/dashboard.html",
    ".claude/precompact-snapshot.md",
]

# Old-style install remnants that might still exist
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
]


# ── Helpers ───────────────────────────────────────────────────────────────

def find_source_root() -> str:
    """Get the git-memory plugin source root (parent of this script's directory)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_target_root() -> str:
    """Get the target repo root via git, falling back to cwd."""
    code, output = run_git(["rev-parse", "--show-toplevel"])
    if code == 0:
        return output
    return os.getcwd()


def safe_remove(path: str) -> bool:
    """Remove a file or symlink if it exists. Returns True if something was removed."""
    if os.path.islink(path) or os.path.isfile(path):
        os.unlink(path)
        return True
    return False


def safe_rmdir(path: str) -> bool:
    """Remove a directory only if it exists and is empty. Returns True on success."""
    if os.path.isdir(path):
        try:
            os.rmdir(path)
            return True
        except OSError:
            return False  # Not empty
    return False


# ── Uninstall Steps ──────────────────────────────────────────────────────

def remove_claude_md_block(target: str) -> bool:
    """Remove the managed block from CLAUDE.md without touching other content."""
    claude_md = os.path.join(target, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return False

    with open(claude_md) as f:
        content = f.read()

    begin = "<!-- BEGIN claude-git-memory (managed block — do not edit) -->"
    end = "<!-- END claude-git-memory -->"

    begin_idx = content.find(begin)
    end_idx = content.find(end)

    if begin_idx == -1 or end_idx == -1:
        return False

    end_idx += len(end)
    # Also remove surrounding blank lines
    before = content[:begin_idx].rstrip()
    after = content[end_idx:].lstrip()

    if before and after:
        new_content = before + "\n\n" + after
    elif before:
        new_content = before + "\n"
    elif after:
        new_content = after
    else:
        # CLAUDE.md would be empty — remove the file
        os.unlink(claude_md)
        return True

    with open(claude_md, "w") as f:
        f.write(new_content)
    return True


def remove_manifest(target: str) -> bool:
    """Remove the manifest file."""
    path = os.path.join(target, ".claude", "git-memory-manifest.json")
    return safe_remove(path)


def remove_generated_files(target: str) -> list[str]:
    """Remove generated files like dashboard and snapshots (full-local mode only).

    Returns:
        List of relative paths that were removed.
    """
    removed = []
    for rel_path in GENERATED_FILES:
        path = os.path.join(target, rel_path)
        if safe_remove(path):
            removed.append(rel_path)
    return removed


def remove_old_install_files(target: str) -> list[str]:
    """Remove any old-style install remnants from the project root.

    Returns:
        List of relative paths that were removed.
    """
    removed = []

    # Remove individual files
    for f in OLD_BIN_FILES + OLD_HOOK_FILES + OLD_LIB_FILES:
        path = os.path.join(target, f)
        if safe_remove(path):
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

    # Remove .claude-plugin/
    plugin_dir = os.path.join(target, ".claude-plugin")
    if os.path.isdir(plugin_dir):
        shutil.rmtree(plugin_dir)
        removed.append(".claude-plugin/")

    # Remove old .claude/hooks and .claude/skills symlink directories
    for subdir in ["hooks", "skills"]:
        path = os.path.join(target, ".claude", subdir)
        if os.path.isdir(path):
            entries = os.listdir(path)
            all_symlinks = all(os.path.islink(os.path.join(path, e)) for e in entries) if entries else True
            if all_symlinks:
                shutil.rmtree(path)
                removed.append(f".claude/{subdir}/")

    # Clean empty parent dirs
    for d in ["bin", "hooks", "skills", "lib"]:
        safe_rmdir(os.path.join(target, d))

    return removed


def _restore_statusline() -> bool:
    """Restore the user's original statusline in ~/.claude/settings.json."""
    claude_home = os.path.join(os.path.expanduser("~"), ".claude")
    settings_path = os.path.join(claude_home, "settings.json")
    backup_path = os.path.join(claude_home, ".git-memory-original-statusline")

    if not os.path.isfile(settings_path):
        return False

    try:
        with open(settings_path) as f:
            settings = json.load(f)
    except (json.JSONDecodeError, ValueError):
        return False

    current_sl = settings.get("statusLine", {})
    current_cmd = current_sl.get("command", "") if isinstance(current_sl, dict) else ""

    # Only restore if our wrapper is active
    if "context-writer" not in current_cmd:
        return False

    # Restore original or remove statusline entirely
    orig_cmd = ""
    if os.path.isfile(backup_path):
        with open(backup_path) as f:
            orig_cmd = f.read().strip()
        os.unlink(backup_path)

    if orig_cmd:
        settings["statusLine"] = {
            "type": "command",
            "command": orig_cmd,
            "padding": current_sl.get("padding", 0) if isinstance(current_sl, dict) else 0,
        }
    else:
        del settings["statusLine"]

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")

    return True


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """CLI entry point. Shows removal plan, asks for confirmation, and executes."""
    parser = argparse.ArgumentParser(description="Clean removal of git-memory from a project.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--full-local", action="store_true", help="Also remove generated files")
    args = parser.parse_args()
    auto = args.auto
    full_local = args.full_local

    source = find_source_root()
    target = find_target_root()
    mode = "full-local" if full_local else "safe"

    # Self-uninstall guard
    is_self = os.path.realpath(source) == os.path.realpath(target)
    if is_self:
        print("Error: cannot uninstall from the plugin source repo.", file=sys.stderr)
        sys.exit(1)

    print("=== git memory uninstall ===")
    print(f"Project: {target}")
    print(f"Mode: {mode}")
    print()

    # Build plan
    plan = []
    plan.append("Remove CLAUDE.md managed block")
    plan.append("Remove manifest (.claude/git-memory-manifest.json)")
    plan.append("Remove any old-style install remnants (bin/, hooks/, skills/, lib/, .claude-plugin/)")
    if full_local:
        plan.append("Remove generated files (dashboard, snapshots)")
    plan.append("Git history (commits with trailers) is preserved")
    plan.append("To remove the plugin itself: /plugin uninstall claude-git-memory")

    print("Removal plan:")
    print("─" * 40)
    for step in plan:
        print(f"  → {step}")
    print("─" * 40)

    if not auto:
        try:
            answer = input("\nProceed with uninstall? [y/N] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer not in ("y", "yes", "s", "si", "sí"):
            print("Aborted.")
            sys.exit(2)

    print("\nRemoving...")

    all_removed = []

    # Execute removal
    if remove_claude_md_block(target):
        all_removed.append("CLAUDE.md managed block")

    if remove_manifest(target):
        all_removed.append(".claude/git-memory-manifest.json")

    old_files = remove_old_install_files(target)
    all_removed.extend(old_files)

    if full_local:
        all_removed.extend(remove_generated_files(target))

    # Restore original statusline
    if _restore_statusline():
        all_removed.append("statusline wrapper (original restored)")

    # Remove context status file
    ctx_file = os.path.join(target, ".claude", ".context-status.json")
    if safe_remove(ctx_file):
        all_removed.append(".claude/.context-status.json")

    print(f"\nRemoved {len(all_removed)} items:")
    for item in all_removed:
        print(f"  - {item}")

    print("\nUninstall complete.")
    print("Git history (commits with trailers) was preserved.")
    print("To remove the plugin: /plugin uninstall claude-git-memory")

    sys.exit(0)


if __name__ == "__main__":
    main()
