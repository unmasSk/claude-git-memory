#!/usr/bin/env python3
"""
git-memory-repair — Reconstruct broken runtime from manifest.
=============================================================
Reads the manifest to know what should exist, checks what's
actually present, and fixes any gaps.

Usage:
  git memory repair              # Interactive repair
  git memory repair --auto       # Non-interactive
  git memory repair --dry-run    # Show what would be fixed

Exit codes:
  0: Repaired (or nothing to repair)
  1: Error (repair failed or no manifest)
  2: Aborted by user
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git


# ── Config ────────────────────────────────────────────────────────────────

VERSION = "2.0.0"

HOOKS = [
    "pre-validate-commit-trailers.py",
    "post-validate-commit-trailers.py",
    "precompact-snapshot.py",
    "stop-dod-check.py",
]

SKILLS = [
    "git-memory",
    "git-memory-protocol",
    "git-memory-lifecycle",
    "git-memory-recovery",
]


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


# ── Diagnosis ─────────────────────────────────────────────────────────────

def diagnose(source: str, target: str) -> list[tuple[str, str, str]]:
    """Find what's broken by comparing expected vs actual state."""
    issues = []

    # Check hooks
    for hook in HOOKS:
        src = os.path.join(source, "hooks", hook)
        dst = os.path.join(target, "hooks", hook)
        if not os.path.isfile(dst):
            if os.path.isfile(src):
                issues.append(("missing_hook", hook, f"Hook missing: {hook}"))

    # Check skills
    for skill in SKILLS:
        src = os.path.join(source, "skills", skill, "SKILL.md")
        dst = os.path.join(target, "skills", skill, "SKILL.md")
        if not os.path.isfile(dst):
            if os.path.isfile(src):
                issues.append(("missing_skill", skill, f"Skill missing: {skill}"))

    # Check CLI
    src_cli = os.path.join(source, "bin", "git-memory")
    dst_cli = os.path.join(target, "bin", "git-memory")
    if not os.path.isfile(dst_cli):
        if os.path.isfile(src_cli):
            issues.append(("missing_cli", "git-memory", "CLI missing: bin/git-memory"))
    elif not os.access(dst_cli, os.X_OK):
        issues.append(("cli_not_exec", "git-memory", "CLI not executable: bin/git-memory"))

    # Check .claude/ symlinks
    claude_dir = os.path.join(target, ".claude")
    for hook in HOOKS:
        link = os.path.join(claude_dir, "hooks", hook)
        if not os.path.exists(link):
            issues.append(("missing_symlink_hook", hook, f"Symlink missing: .claude/hooks/{hook}"))
        elif os.path.islink(link) and not os.path.exists(os.path.realpath(link)):
            issues.append(("broken_symlink_hook", hook, f"Broken symlink: .claude/hooks/{hook}"))

    for skill in SKILLS:
        link = os.path.join(claude_dir, "skills", skill)
        if not os.path.exists(link):
            issues.append(("missing_symlink_skill", skill, f"Symlink missing: .claude/skills/{skill}"))
        elif os.path.islink(link) and not os.path.exists(os.path.realpath(link)):
            issues.append(("broken_symlink_skill", skill, f"Broken symlink: .claude/skills/{skill}"))

    # Check CLAUDE.md managed block
    claude_md = os.path.join(target, "CLAUDE.md")
    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            content = f.read()
        if "BEGIN claude-git-memory" not in content:
            issues.append(("missing_block", "CLAUDE.md", "Managed block missing in CLAUDE.md"))
    else:
        issues.append(("missing_claude_md", "CLAUDE.md", "CLAUDE.md not found"))

    # Check hooks.json
    if not os.path.isfile(os.path.join(target, "hooks.json")):
        issues.append(("missing_hooks_json", "hooks.json", "hooks.json missing"))

    # Check manifest
    manifest_path = os.path.join(claude_dir, "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        issues.append(("missing_manifest", "manifest", "Manifest missing"))
    else:
        try:
            with open(manifest_path) as f:
                json.load(f)
        except json.JSONDecodeError:
            issues.append(("corrupt_manifest", "manifest", "Manifest corrupt (invalid JSON)"))

    return issues


# ── Install module loader ─────────────────────────────────────────────────

_install_mod = None

def _load_install_module() -> Any:
    """Load git-memory-install.py as a module (cached)."""
    global _install_mod
    if _install_mod is not None:
        return _install_mod
    from importlib.util import spec_from_file_location, module_from_spec
    install_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-install.py")
    if not os.path.isfile(install_path):
        raise FileNotFoundError(f"git-memory-install.py not found at {install_path}")
    spec = spec_from_file_location("install", install_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module spec for {install_path}")
    _install_mod = module_from_spec(spec)
    spec.loader.exec_module(_install_mod)  # type: ignore[union-attr]
    return _install_mod


def _read_existing_mode(target: str) -> str:
    """Read runtime_mode from existing manifest, or 'normal' as default."""
    manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path) as f:
                data = json.load(f)
            return str(data.get("runtime_mode", "normal"))
        except (json.JSONDecodeError, OSError):
            pass
    return "normal"


# ── Repair Actions ────────────────────────────────────────────────────────

def _safe_copy(src: str, dst: str) -> None:
    """Copy a file, refusing to follow symlinks (security)."""
    if os.path.islink(src):
        raise ValueError(f"Refusing to copy symlink: {src}")
    shutil.copy2(src, dst)


def repair_issue(issue_type: str, target_name: str, source: str, target: str) -> bool:
    """Repair a single issue. Returns True on success."""
    if issue_type == "missing_hook":
        src = os.path.join(source, "hooks", target_name)
        dst = os.path.join(target, "hooks", target_name)
        if os.path.islink(src):
            return False
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        _safe_copy(src, dst)
        return True

    elif issue_type == "missing_skill":
        src_dir = os.path.join(source, "skills", target_name)
        dst_dir = os.path.join(target, "skills", target_name)
        if os.path.islink(src_dir):
            return False
        os.makedirs(dst_dir, exist_ok=True)
        for f in os.listdir(src_dir):
            src = os.path.join(src_dir, f)
            if os.path.isfile(src) and not os.path.islink(src):
                _safe_copy(src, os.path.join(dst_dir, f))
        return True

    elif issue_type == "missing_cli":
        src_bin = os.path.join(source, "bin")
        dst_bin = os.path.join(target, "bin")
        os.makedirs(dst_bin, exist_ok=True)
        for f in os.listdir(src_bin):
            src = os.path.join(src_bin, f)
            dst = os.path.join(dst_bin, f)
            if os.path.isfile(src) and not os.path.islink(src):
                _safe_copy(src, dst)
                if f == "git-memory":
                    os.chmod(dst, 0o755)
        return True

    elif issue_type == "cli_not_exec":
        cli = os.path.join(target, "bin", "git-memory")
        os.chmod(cli, 0o755)
        return True

    elif issue_type in ("missing_symlink_hook", "broken_symlink_hook"):
        claude_hooks = os.path.join(target, ".claude", "hooks")
        os.makedirs(claude_hooks, exist_ok=True)
        link = os.path.join(claude_hooks, target_name)
        if os.path.islink(link):
            os.unlink(link)
        rel = os.path.join("..", "..", "hooks", target_name)
        os.symlink(rel, link)
        return True

    elif issue_type in ("missing_symlink_skill", "broken_symlink_skill"):
        claude_skills = os.path.join(target, ".claude", "skills")
        os.makedirs(claude_skills, exist_ok=True)
        link = os.path.join(claude_skills, target_name)
        if os.path.islink(link):
            os.unlink(link)
        rel = os.path.join("..", "..", "skills", target_name)
        os.symlink(rel, link)
        return True

    elif issue_type in ("missing_block", "missing_claude_md"):
        install_mod = _load_install_module()
        install_mod._update_claude_md(target)
        return True

    elif issue_type == "missing_hooks_json":
        src = os.path.join(source, "hooks.json")
        dst = os.path.join(target, "hooks.json")
        if os.path.isfile(src) and not os.path.islink(src):
            _safe_copy(src, dst)
            return True
        return False

    elif issue_type in ("missing_manifest", "corrupt_manifest"):
        mode = _read_existing_mode(target)
        install_mod = _load_install_module()
        install_mod._create_manifest(target, mode)
        return True

    return False


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Reconstruct broken runtime from manifest.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fixed")
    args = parser.parse_args()
    auto = args.auto
    dry_run = args.dry_run

    source = find_source_root()
    target = find_target_root()

    print("=== git memory repair ===")
    print(f"Source: {source}")
    print(f"Target: {target}")
    print()

    # Diagnose
    print("Diagnosing...")
    issues = diagnose(source, target)

    if not issues:
        print("\nNothing to repair — all components healthy.")
        sys.exit(0)

    print(f"\nFound {len(issues)} issue(s):")
    print("─" * 40)
    for _, _, desc in issues:
        print(f"  ❌ {desc}")
    print("─" * 40)

    if dry_run:
        print("\n(dry-run mode — no changes made)")
        sys.exit(0)

    if not auto:
        try:
            answer = input("\nRepair all issues? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer and answer not in ("y", "yes", "s", "si", "sí", ""):
            print("Aborted.")
            sys.exit(2)

    # Repair
    print("\nRepairing...")
    fixed = 0
    failed = 0

    for issue_type, target_name, desc in issues:
        try:
            if repair_issue(issue_type, target_name, source, target):
                print(f"  ✅ Fixed: {desc}")
                fixed += 1
            else:
                print(f"  ❌ Could not fix: {desc}")
                failed += 1
        except Exception as e:
            print(f"  ❌ Error fixing {desc}: {e}")
            failed += 1

    print(f"\nRepair complete: {fixed} fixed, {failed} failed.")

    if failed > 0:
        print("Some issues could not be fixed. Try: git memory install --auto")
        sys.exit(1)

    # Run doctor to confirm
    print("\nVerifying with doctor...")
    doctor = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor):
        subprocess.run([sys.executable, doctor], timeout=15)

    sys.exit(0)


if __name__ == "__main__":
    main()
