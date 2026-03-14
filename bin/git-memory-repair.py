#!/usr/bin/env python3
"""
git-memory-repair -- Repair git-memory configuration at the project level.

The plugin runs from the plugin cache. This script only repairs project-level
files: CLAUDE.md managed block and manifest. If plugin cache files are broken,
the user needs to reinstall the plugin with `/plugin install`.

Usage:
  git memory repair              # Interactive repair
  git memory repair --auto       # Non-interactive
  git memory repair --dry-run    # Show what would be fixed

Exit codes:
  0: Repaired (or nothing to repair)
  1: Error (repair failed)
  2: Aborted by user
"""

import argparse
import json
import os
import subprocess
import sys
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git


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

def diagnose(target: str) -> list[tuple[str, str, str]]:
    """Find what is broken at the project level.

    Checks CLAUDE.md managed block, manifest, and old-style install remnants.

    Args:
        target: Target repository root directory.

    Returns:
        List of (issue_type, target_name, description) tuples.
    """
    issues = []

    # Check CLAUDE.md managed block
    claude_md = os.path.join(target, "CLAUDE.md")
    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            content = f.read()
        if "BEGIN unmassk-gitmemory" not in content:
            issues.append(("missing_block", "CLAUDE.md", "Managed block missing in CLAUDE.md"))
    else:
        issues.append(("missing_claude_md", "CLAUDE.md", "CLAUDE.md not found"))

    # Check manifest
    manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        issues.append(("missing_manifest", "manifest", "Manifest missing"))
    else:
        try:
            with open(manifest_path) as f:
                json.load(f)
        except json.JSONDecodeError:
            issues.append(("corrupt_manifest", "manifest", "Manifest corrupt (invalid JSON)"))

    # Check for old-style install remnants
    old_files = [
        "bin/git-memory-doctor.py", "hooks/pre-validate-commit-trailers.py",
        ".claude-plugin/plugin.json",
    ]
    for f in old_files:
        if os.path.isfile(os.path.join(target, f)):
            issues.append(("old_install", f, "Old-style install files at project root"))
            break

    return issues


# ── Repair Actions ────────────────────────────────────────────────────────

def repair_issue(issue_type: str, source: str, target: str) -> bool:
    """Repair a single diagnosed issue.

    Args:
        issue_type: Type key from diagnose().
        source: Plugin source root directory.
        target: Target repository root directory.

    Returns:
        True if the issue was fixed successfully.
    """
    if issue_type in ("missing_block", "missing_claude_md"):
        # Load install module to reuse _update_claude_md
        from importlib.util import spec_from_file_location, module_from_spec
        install_path = os.path.join(source, "bin", "git-memory-install.py")
        if not os.path.isfile(install_path):
            return False
        spec = spec_from_file_location("install", install_path)
        if spec is None or spec.loader is None:
            return False
        mod = module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        mod._update_claude_md(target)
        return True

    elif issue_type in ("missing_manifest", "corrupt_manifest"):
        from importlib.util import spec_from_file_location, module_from_spec
        install_path = os.path.join(source, "bin", "git-memory-install.py")
        if not os.path.isfile(install_path):
            return False
        spec = spec_from_file_location("install", install_path)
        if spec is None or spec.loader is None:
            return False
        mod = module_from_spec(spec)
        spec.loader.exec_module(mod)  # type: ignore[union-attr]

        # Read existing mode from manifest if possible
        mode = "normal"
        manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
        if os.path.isfile(manifest_path):
            try:
                with open(manifest_path) as f:
                    data = json.load(f)
                mode = str(data.get("runtime_mode", "normal"))
            except (json.JSONDecodeError, OSError):
                pass

        mod._create_manifest(target, mode)
        return True

    elif issue_type == "old_install":
        # Run install with --auto to clean up old files
        install_script = os.path.join(source, "bin", "git-memory-install.py")
        if os.path.isfile(install_script):
            subprocess.run(
                [sys.executable, install_script, "--auto"],
                capture_output=True, text=True, timeout=30,
            )
            return True
        return False

    return False


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point: parse args, diagnose issues, and repair."""
    parser = argparse.ArgumentParser(description="Repair git-memory project configuration.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fixed")
    args = parser.parse_args()
    auto = args.auto
    dry_run = args.dry_run

    source = find_source_root()
    target = find_target_root()

    print("=== git memory repair ===")
    print(f"Plugin: {source}")
    print(f"Project: {target}")
    print()

    # Diagnose
    print("Diagnosing...")
    issues = diagnose(target)

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
            if repair_issue(issue_type, source, target):
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
        print("Some issues could not be fixed. Try: /plugin install unmassk-gitmemory@unmassk-claude-toolkit")
        sys.exit(1)

    # Run doctor to confirm
    print("\nVerifying with doctor...")
    doctor = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor):
        subprocess.run([sys.executable, doctor], timeout=15)

    sys.exit(0)


if __name__ == "__main__":
    main()
