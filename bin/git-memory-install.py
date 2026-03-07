#!/usr/bin/env python3
"""
git-memory-install — Transactional installer for git-memory.
=============================================================
Follows: inspect → plan → apply → verify → health proof.

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

MANAGED_BLOCK_BEGIN = "<!-- BEGIN claude-git-memory (managed block — do not edit) -->"
MANAGED_BLOCK_END = "<!-- END claude-git-memory -->"

MANAGED_BLOCK_CONTENT = """## Git Memory Active

Este proyecto usa claude-git-memory v2.
Git es la memoria. Cada commit es resumible entre sesiones y máquinas.

### Instrucciones para Claude (no para el usuario)
1. Al iniciar sesión: lee el skill `git-memory` y ejecuta AUTO-BOOT + doctor automáticamente
2. Ejecuta `python3 bin/git-memory-doctor.py --json` al arrancar. Si hay errores, repara con `python3 bin/git-memory-repair.py --auto`
3. Nunca le pidas al usuario que ejecute comandos del sistema de memoria — ejecútalos tú
4. Si el usuario dice "instala/repara/desinstala/doctor/estado" → lee skill `git-memory-lifecycle` y actúa
5. Si el usuario dice "qué recuerdas" → ejecuta boot extendido
6. Sistema en alpha: verifica todo, reporta fallos al usuario, no asumas que funciona"""


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


def compute_fingerprint(root: str) -> str:
    """Compute a sha256 fingerprint of installed files."""
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


# ── Phase 1: Inspect ─────────────────────────────────────────────────────

def inspect(target: str) -> dict[str, Any]:
    """Inspect the target repository and detect current state."""
    report = {
        "is_git": False,
        "has_claude_dir": False,
        "has_settings": False,
        "has_hooks": False,
        "has_skills": False,
        "has_cli": False,
        "has_claude_md": False,
        "has_managed_block": False,
        "has_manifest": False,
        "has_commitlint": False,
        "existing_hooks": [],
        "suggested_mode": "normal",
    }

    # Git repo?
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    report["is_git"] = code == 0

    if not report["is_git"]:
        return report

    # .claude/ directory
    claude_dir = os.path.join(target, ".claude")
    report["has_claude_dir"] = os.path.isdir(claude_dir)

    # settings.json
    settings_path = os.path.join(claude_dir, "settings.json")
    report["has_settings"] = os.path.isfile(settings_path)

    # Existing hooks
    hooks_dir = os.path.join(claude_dir, "hooks")
    if os.path.isdir(hooks_dir):
        report["has_hooks"] = True
        report["existing_hooks"] = os.listdir(hooks_dir)

    # Existing skills
    skills_dir = os.path.join(claude_dir, "skills")
    if os.path.isdir(skills_dir):
        report["has_skills"] = True

    # CLI
    report["has_cli"] = os.path.isfile(os.path.join(target, "bin", "git-memory"))

    # CLAUDE.md
    claude_md = os.path.join(target, "CLAUDE.md")
    if os.path.isfile(claude_md):
        report["has_claude_md"] = True
        with open(claude_md) as f:
            content = f.read()
        report["has_managed_block"] = "BEGIN claude-git-memory" in content

    # Manifest
    manifest_path = os.path.join(claude_dir, "git-memory-manifest.json")
    report["has_manifest"] = os.path.isfile(manifest_path)

    # Commitlint / CI that might reject trailers
    for ci_file in [".commitlintrc.json", ".commitlintrc.yml", "commitlint.config.js", "commitlint.config.ts"]:
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

    return report


# ── Phase 2: Plan ─────────────────────────────────────────────────────────

def create_plan(report: dict[str, Any], source: str, target: str, mode: str | None = None) -> dict[str, Any]:
    """Create an installation plan based on inspection."""
    plan: dict[str, Any] = {
        "mode": mode or report["suggested_mode"],
        "actions": [],
        "skipped": [],
    }

    if not report["is_git"]:
        plan["actions"].append(("abort", "Not a git repository"))
        return plan

    # Hooks
    plan["actions"].append(("copy_hooks", f"Install {len(HOOKS)} hooks to hooks/"))

    # Skills
    plan["actions"].append(("copy_skills", f"Install {len(SKILLS)} skills to skills/"))

    # CLI
    plan["actions"].append(("copy_cli", "Install bin/git-memory CLI"))

    # Shared lib
    plan["actions"].append(("copy_lib", "Install lib/ shared modules"))

    # Symlinks (.claude/ → source)
    plan["actions"].append(("create_symlinks", "Create .claude/hooks/ and .claude/skills/ symlinks"))

    # CLAUDE.md managed block
    if report["has_managed_block"]:
        plan["skipped"].append("CLAUDE.md managed block already present")
    else:
        plan["actions"].append(("update_claude_md", "Add managed block to CLAUDE.md"))

    # hooks.json
    plan["actions"].append(("copy_hooks_json", "Install hooks.json for plugin system"))

    # Plugin manifest
    plan["actions"].append(("copy_plugin_manifest", "Install .claude-plugin/ manifests"))

    # Manifest
    plan["actions"].append(("create_manifest", "Create .claude/git-memory-manifest.json"))

    return plan


# ── Phase 3: Apply ────────────────────────────────────────────────────────

def apply_plan(plan: dict[str, Any], source: str, target: str) -> list[str]:
    """Execute the installation plan."""
    errors = []
    is_self = os.path.realpath(source) == os.path.realpath(target)

    for action, description in plan["actions"]:
        try:
            if action == "abort":
                return [description]
            elif action == "copy_hooks":
                if not is_self:
                    _copy_hooks(source, target)
            elif action == "copy_skills":
                if not is_self:
                    _copy_skills(source, target)
            elif action == "copy_cli":
                if not is_self:
                    _copy_cli(source, target)
            elif action == "copy_lib":
                if not is_self:
                    _copy_lib(source, target)
            elif action == "create_symlinks":
                _create_symlinks(target)
            elif action == "update_claude_md":
                _update_claude_md(target)
            elif action == "copy_hooks_json":
                if not is_self:
                    _copy_hooks_json(source, target)
            elif action == "copy_plugin_manifest":
                if not is_self:
                    _copy_plugin_manifest(source, target)
            elif action == "create_manifest":
                _create_manifest(target, plan["mode"])
        except Exception as e:
            errors.append(f"{action}: {e}")

    return errors


def _safe_copy(src: str, dst: str) -> None:
    """Copy a file, refusing to follow symlinks (security: prevent symlink attacks)."""
    if os.path.islink(src):
        raise ValueError(f"Refusing to copy symlink: {src}")
    shutil.copy2(src, dst)


def _copy_hooks(source: str, target: str) -> None:
    """Copy hook files from source to target."""
    src_hooks = os.path.join(source, "hooks")
    dst_hooks = os.path.join(target, "hooks")
    os.makedirs(dst_hooks, exist_ok=True)
    for hook in HOOKS:
        src = os.path.join(src_hooks, hook)
        dst = os.path.join(dst_hooks, hook)
        if os.path.isfile(src) and not os.path.islink(src):
            _safe_copy(src, dst)


def _copy_skills(source: str, target: str) -> None:
    """Copy skill directories from source to target."""
    src_skills = os.path.join(source, "skills")
    dst_skills = os.path.join(target, "skills")
    for skill in SKILLS:
        src_dir = os.path.join(src_skills, skill)
        dst_dir = os.path.join(dst_skills, skill)
        if os.path.isdir(src_dir) and not os.path.islink(src_dir):
            os.makedirs(dst_dir, exist_ok=True)
            for f in os.listdir(src_dir):
                src = os.path.join(src_dir, f)
                if os.path.isfile(src) and not os.path.islink(src):
                    _safe_copy(src, os.path.join(dst_dir, f))


def _copy_cli(source: str, target: str) -> None:
    """Copy CLI scripts to target."""
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


def _copy_lib(source: str, target: str) -> None:
    """Copy shared lib/ modules to target."""
    src_lib = os.path.join(source, "lib")
    dst_lib = os.path.join(target, "lib")
    if not os.path.isdir(src_lib):
        return
    os.makedirs(dst_lib, exist_ok=True)
    for f in os.listdir(src_lib):
        src = os.path.join(src_lib, f)
        dst = os.path.join(dst_lib, f)
        if os.path.isfile(src) and not os.path.islink(src):
            _safe_copy(src, dst)


def _create_symlinks(target: str) -> None:
    """Create .claude/hooks/ and .claude/skills/ symlinks."""
    claude_dir = os.path.join(target, ".claude")
    os.makedirs(claude_dir, exist_ok=True)

    # Hooks symlinks
    _create_hook_symlinks(claude_dir)

    # Skills symlinks
    _create_skill_symlinks(claude_dir)


def _create_hook_symlinks(claude_dir: str) -> None:
    """Create .claude/hooks/ symlinks."""
    hooks_link_dir = os.path.join(claude_dir, "hooks")
    if os.path.islink(hooks_link_dir):
        os.unlink(hooks_link_dir)
    os.makedirs(hooks_link_dir, exist_ok=True)
    for hook in HOOKS:
        src = os.path.join("..", "..", "hooks", hook)
        dst = os.path.join(hooks_link_dir, hook)
        if os.path.islink(dst):
            os.unlink(dst)
        if not os.path.exists(dst):
            os.symlink(src, dst)


def _create_skill_symlinks(claude_dir: str) -> None:
    """Create .claude/skills/ symlinks."""
    skills_link_dir = os.path.join(claude_dir, "skills")
    os.makedirs(skills_link_dir, exist_ok=True)
    for skill in SKILLS:
        src = os.path.join("..", "..", "skills", skill)
        dst = os.path.join(skills_link_dir, skill)
        if os.path.islink(dst):
            os.unlink(dst)
        if not os.path.exists(dst):
            os.symlink(src, dst)


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


def _copy_hooks_json(source: str, target: str) -> None:
    """Copy hooks.json to target root."""
    src = os.path.join(source, "hooks.json")
    dst = os.path.join(target, "hooks.json")
    if os.path.isfile(src) and not os.path.islink(src):
        _safe_copy(src, dst)


def _copy_plugin_manifest(source: str, target: str) -> None:
    """Copy .claude-plugin/ directory to target."""
    src_dir = os.path.join(source, ".claude-plugin")
    dst_dir = os.path.join(target, ".claude-plugin")
    if os.path.isdir(src_dir) and not os.path.islink(src_dir):
        os.makedirs(dst_dir, exist_ok=True)
        for f in os.listdir(src_dir):
            src = os.path.join(src_dir, f)
            if os.path.isfile(src) and not os.path.islink(src):
                _safe_copy(src, os.path.join(dst_dir, f))


def _create_manifest(target: str, mode: str) -> None:
    """Create the git-memory manifest file."""
    claude_dir = os.path.join(target, ".claude")
    os.makedirs(claude_dir, exist_ok=True)

    managed_files = []
    for hook in HOOKS:
        managed_files.append(f"hooks/{hook}")
    for skill in SKILLS:
        managed_files.append(f"skills/{skill}/SKILL.md")
    managed_files.append("bin/git-memory")
    # All CLI scripts that get copied
    for cli_script in ["git-memory-gc.py", "git-memory-dashboard.py",
                       "git-memory-doctor.py", "git-memory-install.py",
                       "git-memory-repair.py", "git-memory-uninstall.py",
                       "git-memory-bootstrap.py", "git-memory-upgrade.py"]:
        managed_files.append(f"bin/{cli_script}")
    # Shared lib modules
    for lib_file in ["__init__.py", "constants.py", "git_helpers.py", "parsing.py", "colors.py"]:
        managed_files.append(f"lib/{lib_file}")
    # Non-bin managed files
    managed_files.append("hooks.json")
    managed_files.append(".claude-plugin/plugin.json")
    managed_files.append(".claude-plugin/marketplace.json")

    manifest = {
        "version": VERSION,
        "installed_at": datetime.now().isoformat(),
        "runtime_mode": mode,
        "managed_files": managed_files,
        "managed_blocks": [
            {
                "file": "CLAUDE.md",
                "begin": "BEGIN claude-git-memory",
                "end": "END claude-git-memory",
            }
        ],
        "hook_registrations": ["PreToolUse", "PostToolUse", "Stop", "PreCompact"],
        "last_healthcheck_at": datetime.now().isoformat(),
        "install_fingerprint": compute_fingerprint(target),
    }

    manifest_path = os.path.join(claude_dir, "git-memory-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)


# ── Phase 4 & 5: Verify + Health Proof ───────────────────────────────────

def verify(target: str) -> dict[str, Any]:
    """Run doctor to verify installation."""
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
    parser = argparse.ArgumentParser(description="Transactional installer for git-memory.")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode")
    parser.add_argument("--mode", dest="mode", choices=["normal", "compatible", "read-only"], default=None, help="Force install mode")
    args = parser.parse_args()
    auto = args.auto
    forced_mode = args.mode

    source = find_source_root()
    target = find_target_root()

    # Self-install detection: source == target means dogfooding
    is_self = os.path.realpath(source) == os.path.realpath(target)

    print("=== git memory install ===")
    print(f"Source: {source}")
    print(f"Target: {target}")
    if is_self:
        print("(self-install: source and target are the same repo)")
    print()

    # Phase 1: Inspect
    print("Phase 1: Inspecting target...")
    report = inspect(target)

    if not report["is_git"]:
        print("Error: target is not a git repository.", file=sys.stderr)
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
        print("If anything fails, run: git memory repair")
    elif status == "warn":
        print(f"\nInstalled with warnings. Mode: {plan['mode']}")
        print("Run: git memory doctor for details")
    else:
        print(f"\nInstalled but verification found issues.")
        print("Run: git memory repair to fix")

    sys.exit(0)


if __name__ == "__main__":
    main()
