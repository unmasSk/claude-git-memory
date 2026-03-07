#!/usr/bin/env python3
"""
git-memory-upgrade -- Safe upgrade for the git-memory system.

Compares installed version vs source, shows diff, creates backup,
and applies the upgrade while preserving mode and configuration.

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
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
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

BIN_FILES = [
    "git-memory",
    "git-memory-gc.py",
    "git-memory-dashboard.py",
    "git-memory-doctor.py",
    "git-memory-install.py",
    "git-memory-repair.py",
    "git-memory-uninstall.py",
    "git-memory-upgrade.py",
    "git-memory-bootstrap.py",
]


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


def file_hash(path: str) -> str | None:
    """SHA256 hash of a file, or None if missing. Skips symlinks."""
    if not os.path.isfile(path) or os.path.islink(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()[:16]


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


def read_source_version(source: str) -> str:
    """Get the source version (this script defines the canonical version)."""
    return VERSION


# ── Comparison ────────────────────────────────────────────────────────────

def compute_diff(source: str, target: str) -> dict[str, list[str]]:
    """Compare source files vs installed files, produce a detailed diff.

    Returns:
        Dict with "added", "modified", "removed", and "unchanged" file lists.
    """
    changes: dict[str, list[str]] = {
        "added": [],       # New files not in target
        "modified": [],    # Files that changed
        "removed": [],     # Files in target that no longer exist in source
        "unchanged": [],   # Identical files
    }

    # Hooks
    for hook in HOOKS:
        src = os.path.join(source, "hooks", hook)
        dst = os.path.join(target, "hooks", hook)
        _compare_file(src, dst, f"hooks/{hook}", changes)

    # Skills (compare all files in each skill dir)
    for skill in SKILLS:
        src_dir = os.path.join(source, "skills", skill)
        dst_dir = os.path.join(target, "skills", skill)
        if os.path.isdir(src_dir):
            for fname in os.listdir(src_dir):
                src = os.path.join(src_dir, fname)
                dst = os.path.join(dst_dir, fname)
                if os.path.isfile(src):
                    _compare_file(src, dst, f"skills/{skill}/{fname}", changes)

    # Bin files
    for bf in BIN_FILES:
        src = os.path.join(source, "bin", bf)
        dst = os.path.join(target, "bin", bf)
        _compare_file(src, dst, f"bin/{bf}", changes)

    # hooks.json
    src = os.path.join(source, "hooks.json")
    dst = os.path.join(target, "hooks.json")
    _compare_file(src, dst, "hooks.json", changes)

    # Plugin manifest
    src = os.path.join(source, ".claude-plugin", "plugin.json")
    dst = os.path.join(target, ".claude-plugin", "plugin.json")
    _compare_file(src, dst, ".claude-plugin/plugin.json", changes)

    return changes


def _compare_file(src: str, dst: str, label: str, changes: dict[str, list[str]]) -> None:
    """Compare a single source file against its installed counterpart."""
    src_hash = file_hash(src)
    dst_hash = file_hash(dst)

    if src_hash and not dst_hash:
        changes["added"].append(label)
    elif not src_hash and dst_hash:
        changes["removed"].append(label)
    elif src_hash and dst_hash:
        if src_hash != dst_hash:
            changes["modified"].append(label)
        else:
            changes["unchanged"].append(label)


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


# ── Migrations ────────────────────────────────────────────────────────────

# Registry of migrations between versions.
# Each migration is a function that takes (target, manifest) and returns the updated manifest.
# They run in version order.

MIGRATIONS: dict[str, Any] = {
    # "1.0.0→2.0.0": migration_1_to_2,
    # Add future migrations here
}


def get_needed_migrations(from_version: str, to_version: str) -> list[tuple[str, Any]]:
    """Determine which migrations need to run between two versions."""
    needed = []
    for key, fn in MIGRATIONS.items():
        src_v, dst_v = key.split("→")
        # Simple check: if the installed version is older
        if src_v == from_version and dst_v != from_version:
            needed.append((key, fn))
    return needed


# ── Apply upgrade ─────────────────────────────────────────────────────────

def apply_upgrade(source: str, target: str, changes: dict[str, list[str]], manifest: dict[str, Any]) -> list[str]:
    """Copy changed files, update symlinks, refresh CLAUDE.md and manifest.

    Returns:
        List of error messages (empty on success).
    """
    errors = []

    is_self = os.path.realpath(source) == os.path.realpath(target)

    # Copy modified and new files (skip in self-install mode)
    if not is_self:
        for label in changes["added"] + changes["modified"]:
            try:
                src = os.path.join(source, label)
                dst = os.path.join(target, label)
                # Safety: do not follow symlinks
                if os.path.islink(src):
                    errors.append(f"Symlink rejected (security): {label}")
                    continue
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                # Make executable if it's bin/git-memory
                if label == "bin/git-memory":
                    os.chmod(dst, 0o755)
            except Exception as e:
                errors.append(f"Error copiando {label}: {e}")

    # Update symlinks in .claude/
    claude_dir = os.path.join(target, ".claude")
    for hook in HOOKS:
        link = os.path.join(claude_dir, "hooks", hook)
        if not os.path.exists(link):
            os.makedirs(os.path.dirname(link), exist_ok=True)
            rel = os.path.join("..", "..", "hooks", hook)
            try:
                os.symlink(rel, link)
            except Exception as e:
                errors.append(f"Error creando symlink hooks/{hook}: {e}")

    for skill in SKILLS:
        link = os.path.join(claude_dir, "skills", skill)
        if not os.path.exists(link):
            os.makedirs(os.path.dirname(link), exist_ok=True)
            rel = os.path.join("..", "..", "skills", skill)
            try:
                os.symlink(rel, link)
            except Exception as e:
                errors.append(f"Error creando symlink skills/{skill}: {e}")

    # Update managed block in CLAUDE.md
    try:
        install_mod = _load_install_module()
        install_mod._update_claude_md(target)
    except Exception as e:
        errors.append(f"Error updating CLAUDE.md: {e}")

    # Update manifest
    try:
        new_manifest = dict(manifest)
        new_manifest["version"] = VERSION
        new_manifest["upgraded_at"] = datetime.now().isoformat()
        new_manifest["install_fingerprint"] = _compute_fingerprint(target)

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


def _compute_fingerprint(root: str) -> str:
    """Compute a SHA256 fingerprint of all installed files (hooks, skills, CLI)."""
    h = hashlib.sha256()
    for hook in HOOKS:
        path = os.path.join(root, "hooks", hook)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                h.update(f.read())
    for skill in SKILLS:
        path = os.path.join(root, "skills", skill, "SKILL.md")
        if os.path.isfile(path):
            with open(path, "rb") as f:
                h.update(f.read())
    cli_path = os.path.join(root, "bin", "git-memory")
    if os.path.isfile(cli_path):
        with open(cli_path, "rb") as f:
            h.update(f.read())
    return f"sha256:{h.hexdigest()[:16]}"


# ── Output ────────────────────────────────────────────────────────────────

def format_diff_human(changes: dict[str, list[str]], from_version: str, to_version: str) -> str:
    """Format the file diff as a human-readable summary."""
    lines = []
    lines.append(f"Installed version: v{from_version}")
    lines.append(f"Available version: v{to_version}")
    lines.append("")

    total_changes = len(changes["added"]) + len(changes["modified"])
    if total_changes == 0:
        lines.append("No changes -- already on the latest version.")
        return "\n".join(lines)

    if changes["added"]:
        lines.append(f"  + {len(changes['added'])} new files:")
        for f in changes["added"]:
            lines.append(f"    + {f}")

    if changes["modified"]:
        lines.append(f"  ~ {len(changes['modified'])} modified files:")
        for f in changes["modified"]:
            lines.append(f"    ~ {f}")

    if changes["removed"]:
        lines.append(f"  - {len(changes['removed'])} removed files:")
        for f in changes["removed"]:
            lines.append(f"    - {f}")

    lines.append(f"\n  = {len(changes['unchanged'])} unchanged files")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """CLI entry point. Compares versions, shows diff, and applies upgrade if confirmed."""
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

    # Self-upgrade guard
    is_self = os.path.realpath(source) == os.path.realpath(target)

    # Read current state
    manifest = read_installed_manifest(target)
    if manifest is None:
        if as_json:
            print(json.dumps({"status": "error", "message": "No installation to upgrade. Use: git memory install"}))
        else:
            print("Error: no git-memory installation to upgrade.", file=sys.stderr)
            print("Use: git memory install", file=sys.stderr)
        sys.exit(1)

    from_version = manifest.get("version", "unknown")
    to_version = read_source_version(source)

    # Compute diff
    changes = compute_diff(source, target)
    total_changes = len(changes["added"]) + len(changes["modified"])

    # --check: only report if an upgrade is available
    if check_only:
        has_update = total_changes > 0 or from_version != to_version
        if as_json:
            print(json.dumps({
                "status": "update_available" if has_update else "up_to_date",
                "installed_version": from_version,
                "available_version": to_version,
                "changes": {k: len(v) for k, v in changes.items()},
            }))
        else:
            if has_update:
                print(f"Upgrade available: v{from_version} -> v{to_version}")
                print(f"  {total_changes} files to update")
            else:
                print(f"Already on the latest version (v{to_version})")
        sys.exit(0)

    # Full output
    if as_json:
        output = {
            "installed_version": from_version,
            "available_version": to_version,
            "changes": changes,
            "is_self": is_self,
            "migrations": [k for k, _ in get_needed_migrations(from_version, to_version)],
        }

        if total_changes == 0 and from_version == to_version:
            output["status"] = "up_to_date"
            print(json.dumps(output, indent=2))
            sys.exit(0)

        output["status"] = "update_available"
        if dry_run:
            output["dry_run"] = True
            print(json.dumps(output, indent=2))
            sys.exit(0)

    else:
        print("=== git memory upgrade ===")
        print(f"Source: {source}")
        print(f"Target: {target}")
        if is_self:
            print("(self-upgrade mode -- source == target)")
        print()
        print(format_diff_human(changes, from_version, to_version))
        print()

    # Nothing to upgrade
    if total_changes == 0 and from_version == to_version:
        if not as_json:
            print("Nothing to upgrade.")
        sys.exit(0)

    # Dry run
    if dry_run:
        if not as_json:
            print("(dry-run -- no changes applied)")
        sys.exit(0)

    # Confirmation
    if not auto:
        try:
            answer = input("\nApply upgrade? [Y/n] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer and answer not in ("y", "yes", "s", "si", "sí", ""):
            print("Aborted.")
            sys.exit(2)

    # Backup
    if not as_json:
        print("\nCreating backup...")
    backup_path = create_backup(target, manifest)
    if not as_json:
        print(f"  Backup: {backup_path}")

    # Migrations
    migrations = get_needed_migrations(from_version, to_version)
    if migrations:
        if not as_json:
            print(f"\nRunning {len(migrations)} migration(s)...")
        for key, fn in migrations:
            try:
                manifest = fn(target, manifest)
                if not as_json:
                    print(f"  ✅ {key}")
            except Exception as e:
                if not as_json:
                    print(f"  ❌ {key}: {e}")
                    print("Upgrade aborted. Original manifest preserved in backup.")
                sys.exit(1)

    # Apply
    if not as_json:
        print("\nApplying upgrade...")
    errors = apply_upgrade(source, target, changes, manifest)

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
        print("\nVerifying...")
    doctor_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "git-memory-doctor.py")
    if os.path.isfile(doctor_script):
        subprocess.run([sys.executable, doctor_script], timeout=15)

    if as_json:
        print(json.dumps({
            "status": "upgraded",
            "from_version": from_version,
            "to_version": to_version,
            "changes_applied": total_changes,
            "backup": backup_path,
        }))
    else:
        print(f"\nUpgrade complete: v{from_version} -> v{to_version}")
        print(f"   {total_changes} files updated")
        print(f"   Backup: {backup_path}")


if __name__ == "__main__":
    main()
