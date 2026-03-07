#!/usr/bin/env python3
"""
git-memory-uninstall -- Clean removal of git-memory runtime.

Removes hooks, skills, CLI, managed blocks, and manifest.
Never touches git history (commits with trailers are preserved).

Usage:
  git memory uninstall                # Safe mode (default)
  git memory uninstall --full-local   # Also removes generated files
  git memory uninstall --auto         # Non-interactive

Modes:
  safe (default): Remove hooks, skills, CLI, CLAUDE.md block, manifest
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

HOOKS = [
    "pre-validate-commit-trailers.py",
    "post-validate-commit-trailers.py",
    "precompact-snapshot.py",
    "stop-dod-check.py",
    "session-start-boot.py",
    "user-prompt-memory-check.py",
]

SKILLS = [
    "git-memory",
    "git-memory-protocol",
    "git-memory-lifecycle",
    "git-memory-recovery",
]

GENERATED_FILES = [
    ".claude/dashboard.html",
    ".claude/precompact-snapshot.md",
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

def remove_hooks(target: str) -> list[str]:
    """Remove hook files and their .claude/hooks symlinks.

    Returns:
        List of relative paths that were removed.
    """
    removed = []

    # Remove source hooks
    for hook in HOOKS:
        path = os.path.join(target, "hooks", hook)
        if safe_remove(path):
            removed.append(f"hooks/{hook}")

    # Remove .claude/hooks symlinks
    for hook in HOOKS:
        link = os.path.join(target, ".claude", "hooks", hook)
        if safe_remove(link):
            removed.append(f".claude/hooks/{hook}")

    # Clean empty dirs
    safe_rmdir(os.path.join(target, "hooks"))
    safe_rmdir(os.path.join(target, ".claude", "hooks"))

    return removed


def remove_skills(target: str) -> list[str]:
    """Remove skill directories and their .claude/skills symlinks.

    Returns:
        List of relative paths that were removed.
    """
    removed = []

    for skill in SKILLS:
        # Remove source skill dir
        skill_dir = os.path.join(target, "skills", skill)
        if os.path.isdir(skill_dir) and not os.path.islink(skill_dir):
            shutil.rmtree(skill_dir)
            removed.append(f"skills/{skill}/")
        elif os.path.islink(skill_dir):
            os.unlink(skill_dir)
            removed.append(f"skills/{skill} (symlink)")

        # Remove .claude/skills symlink
        link = os.path.join(target, ".claude", "skills", skill)
        if safe_remove(link):
            removed.append(f".claude/skills/{skill}")

    # Clean empty dirs
    safe_rmdir(os.path.join(target, "skills"))
    safe_rmdir(os.path.join(target, ".claude", "skills"))

    return removed


def remove_cli(target: str) -> list[str]:
    """Remove CLI scripts from the bin/ directory.

    Returns:
        List of relative paths that were removed.
    """
    removed = []
    bin_dir = os.path.join(target, "bin")

    cli_files = ["git-memory", "git-memory-gc.py", "git-memory-dashboard.py",
                 "git-memory-doctor.py", "git-memory-install.py",
                 "git-memory-repair.py", "git-memory-uninstall.py",
                 "git-memory-bootstrap.py", "git-memory-upgrade.py"]

    for f in cli_files:
        path = os.path.join(bin_dir, f)
        if safe_remove(path):
            removed.append(f"bin/{f}")

    safe_rmdir(bin_dir)
    return removed


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


def remove_hooks_json(target: str) -> bool:
    """Remove hooks.json from root."""
    return safe_remove(os.path.join(target, "hooks.json"))


def remove_plugin_manifest(target: str) -> bool:
    """Remove .claude-plugin/ directory."""
    plugin_dir = os.path.join(target, ".claude-plugin")
    if os.path.isdir(plugin_dir):
        shutil.rmtree(plugin_dir)
        return True
    return False


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


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """CLI entry point. Shows removal plan, asks for confirmation, and executes."""
    parser = argparse.ArgumentParser(description="Clean removal of git-memory runtime.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--full-local", action="store_true", help="Also remove generated files")
    args = parser.parse_args()
    auto = args.auto
    full_local = args.full_local

    source = find_source_root()
    target = find_target_root()
    mode = "full-local" if full_local else "safe"

    # Self-uninstall guard: refuse to delete source repo's own files
    is_self = os.path.realpath(source) == os.path.realpath(target)
    if is_self:
        print("Error: cannot uninstall from the source repo (would delete source files).", file=sys.stderr)
        print("To uninstall from a target repo, run from that repo's directory.", file=sys.stderr)
        sys.exit(1)

    print("=== git memory uninstall ===")
    print(f"Target: {target}")
    print(f"Mode: {mode}")
    print()

    # Build plan
    plan = []
    plan.append("Remove hooks (6 files + symlinks)")
    plan.append("Remove skills (4 directories + symlinks)")
    plan.append("Remove CLI (bin/ scripts)")
    plan.append("Remove CLAUDE.md managed block")
    plan.append("Remove manifest (.claude/git-memory-manifest.json)")
    plan.append("Remove hooks.json")
    plan.append("Remove .claude-plugin/ directory")
    if full_local:
        plan.append("Remove generated files (dashboard, snapshots)")
    plan.append("Git history (commits with trailers) is preserved")

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
    all_removed.extend(remove_hooks(target))
    all_removed.extend(remove_skills(target))
    all_removed.extend(remove_cli(target))

    if remove_claude_md_block(target):
        all_removed.append("CLAUDE.md managed block")

    if remove_manifest(target):
        all_removed.append(".claude/git-memory-manifest.json")

    if remove_hooks_json(target):
        all_removed.append("hooks.json")

    if remove_plugin_manifest(target):
        all_removed.append(".claude-plugin/")

    if full_local:
        all_removed.extend(remove_generated_files(target))

    print(f"\nRemoved {len(all_removed)} items:")
    for item in all_removed:
        print(f"  🗑  {item}")

    print("\nUninstall complete.")
    print("Git history (commits with trailers) was preserved.")
    print("To reinstall: git memory install")

    sys.exit(0)


if __name__ == "__main__":
    main()
