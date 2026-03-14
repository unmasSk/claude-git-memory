#!/usr/bin/env python3
"""
git-memory-upgrade -- Safe upgrade for the git-memory system.

Since the plugin runs from the cache (~/.claude/plugins/cache/), "upgrade"
means: update the CLAUDE.md managed block and manifest at the project root,
and clean up any old-style install files. The plugin itself is updated by
`/plugin install`.

Usage:
  git memory upgrade              # Interactive: shows changes, asks for confirmation
  git memory upgrade --auto       # Non-interactive
  git memory upgrade --dry-run    # Only shows what would change
  git memory upgrade --check      # Only checks if an upgrade is available
  git memory upgrade --json       # JSON output (for Claude consumption)

Exit codes:
  0: Upgrade successful (or nothing to upgrade)
  1: Error
  2: Aborted by user
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git
from version import VERSION


# ── Config ────────────────────────────────────────────────────────────────


# ── Helpers ───────────────────────────────────────────────────────────────

def find_source_root() -> str:
    """Find the git-memory plugin source root."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_target_root() -> str:
    """Find the target repo root."""
    code, output = run_git(["rev-parse", "--show-toplevel"])
    if code == 0:
        return output
    return os.getcwd()


# ── Read current state ────────────────────────────────────────────────────

def read_installed_manifest(target: str) -> dict[str, Any] | None:
    """Read the manifest from the current installation.

    Returns:
        Parsed manifest dict, or None if missing or corrupt.
    """
    manifest_path = os.path.join(target, ".claude", "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        return None
    try:
        with open(manifest_path) as f:
            data: dict[str, Any] = json.load(f)
            return data
    except (json.JSONDecodeError, OSError):
        return None


# ── Comparison ────────────────────────────────────────────────────────────

def check_upgrade_needed(source: str, target: str, manifest: dict[str, Any]) -> dict[str, Any]:
    """Check what needs upgrading at the project level.

    Returns:
        Dict with "needs_update", "reasons", and version info.
    """
    result: dict[str, Any] = {
        "needs_update": False,
        "installed_version": manifest.get("version", "unknown"),
        "available_version": VERSION,
        "reasons": [],
        "has_old_install": False,
    }

    # Version mismatch
    if manifest.get("version") != VERSION:
        result["needs_update"] = True
        result["reasons"].append(f"Version mismatch: {manifest.get('version')} → {VERSION}")

    # CLAUDE.md managed block outdated or missing
    claude_md = os.path.join(target, "CLAUDE.md")
    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            content = f.read()
        if "BEGIN unmassk-gitmemory" not in content:
            result["needs_update"] = True
            result["reasons"].append("CLAUDE.md managed block missing")
        else:
            # Load the current managed block content from install module
            install_mod = _load_install_module()
            expected = install_mod.MANAGED_BLOCK_CONTENT
            begin_marker = install_mod.MANAGED_BLOCK_BEGIN
            end_marker = install_mod.MANAGED_BLOCK_END
            begin_idx = content.find(begin_marker)
            end_idx = content.find(end_marker)
            if begin_idx != -1 and end_idx != -1:
                current_block = content[begin_idx + len(begin_marker):end_idx].strip()
                if current_block != expected.strip():
                    result["needs_update"] = True
                    result["reasons"].append("CLAUDE.md managed block content outdated")
    else:
        result["needs_update"] = True
        result["reasons"].append("CLAUDE.md missing")

    # Old-style install files at project root
    install_mod = _load_install_module()
    for f in install_mod.OLD_BIN_FILES + install_mod.OLD_HOOK_FILES:
        if os.path.isfile(os.path.join(target, f)):
            result["needs_update"] = True
            result["has_old_install"] = True
            result["reasons"].append("Old-style install files at project root")
            break
    if not result["has_old_install"]:
        if os.path.isdir(os.path.join(target, ".claude-plugin")):
            result["needs_update"] = True
            result["has_old_install"] = True
            result["reasons"].append("Old .claude-plugin/ directory at project root")

    return result


# ── Backup ────────────────────────────────────────────────────────────────

def create_backup(target: str, manifest: dict[str, Any]) -> str:
    """Create a timestamped backup of the current manifest before upgrading.

    Returns:
        Path to the backup file.
    """
    claude_dir = os.path.join(target, ".claude")
    backup_dir = os.path.join(claude_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version = manifest.get("version", "unknown")
    backup_name = f"manifest-v{version}-{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_name)

    with open(backup_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return backup_path


# ── Apply upgrade ─────────────────────────────────────────────────────────

def apply_upgrade(source: str, target: str, manifest: dict[str, Any], check_result: dict[str, Any]) -> list[str]:
    """Apply the upgrade: update CLAUDE.md, manifest, clean old files.

    Returns:
        List of error messages (empty on success).
    """
    errors = []
    install_mod = _load_install_module()

    # Clean up old-style install files
    if check_result.get("has_old_install"):
        try:
            install_mod._cleanup_old_install(target, source)
        except Exception as e:
            errors.append(f"Error cleaning old install: {e}")

    # Update CLAUDE.md managed block
    try:
        install_mod._update_claude_md(target)
    except Exception as e:
        errors.append(f"Error updating CLAUDE.md: {e}")

    # Update manifest
    try:
        mode = manifest.get("runtime_mode", "normal")
        claude_dir = os.path.join(target, ".claude")
        os.makedirs(claude_dir, exist_ok=True)

        new_manifest = {
            "version": VERSION,
            "installed_at": manifest.get("installed_at", datetime.now().isoformat()),
            "upgraded_at": datetime.now().isoformat(),
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
            json.dump(new_manifest, f, indent=2)
    except Exception as e:
        errors.append(f"Error updating manifest: {e}")

    return errors


# ── Internal helpers ──────────────────────────────────────────────────────

_install_mod = None

def _load_install_module() -> Any:
    """Load git-memory-install.py as a module (cached after first call)."""
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


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """CLI entry point. Checks what needs upgrading and applies if confirmed."""
    parser = argparse.ArgumentParser(description="Safe upgrade for the git-memory system.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change")
    parser.add_argument("--check", action="store_true", help="Only check if upgrade is available")
    parser.add_argument("--json", dest="json", action="store_true", help="JSON output")
    args = parser.parse_args()
    auto = args.auto
    dry_run = args.dry_run
    check_only = args.check
    as_json = args.json

    source = find_source_root()
    target = find_target_root()

    # Read current state
    manifest = read_installed_manifest(target)
    if manifest is None:
        if as_json:
            print(json.dumps({"status": "error", "message": "No installation to upgrade. Use: git memory install"}))
        else:
            print("Error: no git-memory installation to upgrade.", file=sys.stderr)
            print("Use: git memory install", file=sys.stderr)
        sys.exit(1)

    # Check what needs upgrading
    check_result = check_upgrade_needed(source, target, manifest)

    # --check: only report
    if check_only:
        if as_json:
            print(json.dumps({
                "status": "update_available" if check_result["needs_update"] else "up_to_date",
                "installed_version": check_result["installed_version"],
                "available_version": check_result["available_version"],
                "reasons": check_result["reasons"],
            }))
        else:
            if check_result["needs_update"]:
                print(f"Upgrade available: v{check_result['installed_version']} -> v{check_result['available_version']}")
                for reason in check_result["reasons"]:
                    print(f"  - {reason}")
            else:
                print(f"Already on the latest version (v{check_result['available_version']})")
        sys.exit(0)

    # Full output
    if not as_json:
        print("=== git memory upgrade ===")
        print(f"Plugin: {source}")
        print(f"Project: {target}")
        print()

    if not check_result["needs_update"]:
        if as_json:
            print(json.dumps({
                "status": "up_to_date",
                "installed_version": check_result["installed_version"],
                "available_version": check_result["available_version"],
            }))
        else:
            print(f"Already on the latest version (v{check_result['available_version']}). Nothing to upgrade.")
        sys.exit(0)

    # Show what needs upgrading
    if as_json:
        output = {
            "status": "update_available",
            "installed_version": check_result["installed_version"],
            "available_version": check_result["available_version"],
            "reasons": check_result["reasons"],
        }
        if dry_run:
            output["dry_run"] = True
            print(json.dumps(output, indent=2))
            sys.exit(0)
    else:
        print(f"Installed: v{check_result['installed_version']}")
        print(f"Available: v{check_result['available_version']}")
        print()
        print("Changes needed:")
        for reason in check_result["reasons"]:
            print(f"  - {reason}")
        print()

    if dry_run:
        if not as_json:
            print("(dry-run -- no changes applied)")
        sys.exit(0)

    # Confirmation
    if not auto:
        try:
            answer = input("Apply upgrade? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer and answer not in ("y", "yes", "s", "si", "sí", ""):
            print("Aborted.")
            sys.exit(2)

    # Backup
    if not as_json:
        print("Creating backup...")
    backup_path = create_backup(target, manifest)
    if not as_json:
        print(f"  Backup: {backup_path}")

    # Apply
    if not as_json:
        print("Applying upgrade...")
    errors = apply_upgrade(source, target, manifest, check_result)

    if errors:
        if as_json:
            print(json.dumps({"status": "error", "errors": errors}))
        else:
            print(f"\n{len(errors)} error(s):")
            for err in errors:
                print(f"  ❌ {err}")
            print(f"\nBackup available at: {backup_path}")
        sys.exit(1)

    # Verify
    if not as_json:
        print("Verifying...")
    doctor_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor_script):
        subprocess.run([sys.executable, doctor_script], capture_output=True, timeout=15)

    if as_json:
        print(json.dumps({
            "status": "upgraded",
            "from_version": check_result["installed_version"],
            "to_version": check_result["available_version"],
            "backup": backup_path,
        }))
    else:
        print(f"\nUpgrade complete: v{check_result['installed_version']} -> v{check_result['available_version']}")
        print(f"  Backup: {backup_path}")

    sys.exit(0)


if __name__ == "__main__":
    main()
