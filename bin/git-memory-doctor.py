#!/usr/bin/env python3
"""
git-memory-doctor -- Health check for the git-memory system.

Checks plugin files (in cache), CLAUDE.md managed block, hook execution,
GC status, stale blockers, manifest, and version.

The plugin runs from the plugin cache. This script checks both:
- Plugin files: hooks, skills, bin, lib (at the plugin root / cache)
- Project files: CLAUDE.md managed block, manifest (at the git repo root)

Usage:
  git memory doctor              # Full diagnostic
  git memory doctor --json       # Machine-readable JSON output
  git memory doctor --silent     # Exit code only (0=healthy, 1=issues)

Exit codes:
  0: All checks pass (or warnings only)
  1: Errors found (broken components)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git


# ── Config ────────────────────────────────────────────────────────────────

EXPECTED_HOOKS = [
    "pre-validate-commit-trailers.py",
    "post-validate-commit-trailers.py",
    "precompact-snapshot.py",
    "stop-dod-check.py",
    "session-start-boot.py",
    "user-prompt-memory-check.py",
]

EXPECTED_SKILLS = [
    "git-memory",
    "git-memory-protocol",
    "git-memory-lifecycle",
    "git-memory-recovery",
]

STALE_BLOCKER_DAYS = 30
SCAN_DEPTH = 50
VERSION = "2.1.0"


# ── Helpers ───────────────────────────────────────────────────────────────

def find_plugin_root() -> str:
    """Find the plugin root (where this script lives in the cache).

    Returns:
        Absolute path to the plugin root directory.
    """
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_project_root() -> str:
    """Find the project root (git repo root of cwd).

    Returns:
        Absolute path to the project root, or cwd if not in a git repo.
    """
    code, git_root = run_git(["rev-parse", "--show-toplevel"])
    if code == 0 and git_root:
        return git_root
    return os.getcwd()


def parse_date(date_str: str) -> datetime | None:
    """Parse an ISO 8601 date string from git log output.

    Returns:
        Parsed datetime, or None if parsing fails.
    """
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00").split("+")[0])
    except (ValueError, IndexError):
        return None


# ── Checks ────────────────────────────────────────────────────────────────

def check_git_repo() -> bool:
    """Verify we're in a git repository."""
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    return code == 0


def check_hooks(plugin_root: str) -> tuple[list[str], list[str]]:
    """Check that all expected hook files exist in the plugin cache.

    Returns:
        Tuple of (found hook names, missing hook names).
    """
    hooks_dir = os.path.join(plugin_root, "hooks")
    found = []
    missing = []
    for hook in EXPECTED_HOOKS:
        path = os.path.join(hooks_dir, hook)
        if os.path.isfile(path):
            found.append(hook)
        else:
            missing.append(hook)
    return found, missing


def check_skills(plugin_root: str) -> tuple[list[str], list[str]]:
    """Check that all expected skill directories contain a SKILL.md file.

    Returns:
        Tuple of (found skill names, missing skill names).
    """
    skills_dir = os.path.join(plugin_root, "skills")
    found = []
    missing = []
    for skill in EXPECTED_SKILLS:
        skill_file = os.path.join(skills_dir, skill, "SKILL.md")
        if os.path.isfile(skill_file):
            found.append(skill)
        else:
            missing.append(skill)
    return found, missing


def check_cli(plugin_root: str) -> tuple[bool, str]:
    """Check that bin/git-memory exists in the plugin cache.

    Returns:
        Tuple of (ok, status_message).
    """
    cli_path = os.path.join(plugin_root, "bin", "git-memory")
    if not os.path.isfile(cli_path):
        return False, "not found"
    return True, "ok"


def check_hooks_json(plugin_root: str) -> bool:
    """Check that hooks/hooks.json exists in the plugin cache."""
    return os.path.isfile(os.path.join(plugin_root, "hooks", "hooks.json"))


def check_claude_md(project_root: str) -> tuple[bool, str]:
    """Check if CLAUDE.md exists and contains the managed block.

    Returns:
        Tuple of (block_present, status message).
    """
    claude_md = os.path.join(project_root, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return False, "CLAUDE.md not found"
    try:
        with open(claude_md) as f:
            content = f.read()
        if "BEGIN claude-git-memory" in content and "END claude-git-memory" in content:
            return True, "managed block present"
        return False, "managed block missing"
    except OSError:
        return False, "read error"


def check_hook_execution(depth: int = SCAN_DEPTH) -> tuple[int, int, int]:
    """Check if hooks have been active by looking for trailers in recent commits.

    Returns:
        Tuple of (commits_with_trailers, total_commits, scan_depth).
    """
    code, output = run_git([
        "log", "-n", str(depth),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1e",
    ])
    if code != 0 or not output:
        return 0, 0, depth

    trailer_re = re.compile(r"^[A-Z][a-z]+(?:-[A-Z][a-z]+)*:\s*.+$", re.MULTILINE)
    total = 0
    with_trailers = 0

    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 3)
        if len(parts) < 3:
            continue
        total += 1
        body = parts[2]
        if trailer_re.search(body):
            with_trailers += 1

    return with_trailers, total, depth


def check_gc_status(depth: int = 200) -> tuple[int | None, int, list[dict[str, Any]]]:
    """Check when GC last ran and count stale blockers.

    Returns:
        Tuple of (days_since_last_gc or None, stale_blocker_count,
        list of stale blocker details).
    """
    code, output = run_git([
        "log", "-n", str(depth),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1e",
    ])
    if code != 0 or not output:
        return None, 0, []

    now = datetime.now()
    last_gc: datetime | None = None
    stale_blockers: list[dict[str, Any]] = []

    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 3)
        if len(parts) < 4:
            continue

        subject = parts[1].strip()
        body = parts[2].strip()
        date = parse_date(parts[3].strip())

        # Check for GC commits
        if "gc" in subject.lower() and "memory" in subject.lower() and last_gc is None:
            last_gc = date

        # Check for stale blockers
        for line in body.split("\n"):
            line = line.strip()
            m = re.match(r"^Blocker:\s*(.+)$", line)
            if m and date:
                age = (now - date).days
                if age > STALE_BLOCKER_DAYS:
                    blocker_text = m.group(1).strip()
                    stale_blockers.append({
                        "text": blocker_text,
                        "sha": parts[0].strip(),
                        "age_days": age,
                    })

    # Filter out tombstoned blockers
    tombstoned = set()
    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 3)
        if len(parts) < 3:
            continue
        body = parts[2].strip()
        for line in body.split("\n"):
            m = re.match(r"^Stale-Blocker:\s*(.+)$", line.strip())
            if m:
                tombstoned.add(m.group(1).strip().lower())

    active_stale = [b for b in stale_blockers if b["text"].lower() not in tombstoned]

    gc_days_ago = (now - last_gc).days if last_gc else None
    return gc_days_ago, len(active_stale), active_stale


def check_manifest(project_root: str) -> tuple[dict[str, Any] | None, str]:
    """Check if .claude/git-memory-manifest.json exists and is valid JSON.

    Returns:
        Tuple of (parsed manifest dict or None, status message).
    """
    manifest_path = os.path.join(project_root, ".claude", "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        return None, "not found"
    try:
        with open(manifest_path) as f:
            data = json.load(f)
        return data, "ok"
    except (json.JSONDecodeError, OSError) as e:
        return None, f"corrupt: {e}"


# ── Report ────────────────────────────────────────────────────────────────

def run_doctor(silent: bool = False, as_json: bool = False) -> int:
    """Run all health checks and produce a diagnostic report.

    Args:
        silent: If True, suppress all output (exit code only).
        as_json: If True, output machine-readable JSON.

    Returns:
        Exit code: 0 if healthy (or warnings only), 1 if errors found.
    """
    plugin_root = find_plugin_root()
    project_root = find_project_root()
    results = []
    has_errors = False
    has_warnings = False

    # 1. Git repo
    if not check_git_repo():
        results.append(("error", "Git", "not inside a git repository"))
        if as_json:
            print(json.dumps({"status": "error", "checks": [
                {"level": r[0], "component": r[1], "message": r[2]} for r in results
            ]}))
        elif not silent:
            print("Not inside a git repository.")
        return 1

    # 2. Hooks (in plugin cache)
    found_hooks, missing_hooks = check_hooks(plugin_root)
    total_hooks = len(EXPECTED_HOOKS)
    if missing_hooks:
        has_errors = True
        results.append(("error", "Hooks", f"{len(found_hooks)}/{total_hooks} in cache — missing: {', '.join(missing_hooks)}"))
    else:
        results.append(("ok", "Hooks", f"{total_hooks}/{total_hooks} in plugin cache"))

    # 3. Skills (in plugin cache)
    found_skills, missing_skills = check_skills(plugin_root)
    total_skills = len(EXPECTED_SKILLS)
    if missing_skills:
        has_errors = True
        results.append(("error", "Skills", f"{len(found_skills)}/{total_skills} in cache — missing: {', '.join(missing_skills)}"))
    else:
        results.append(("ok", "Skills", f"{total_skills}/{total_skills} in plugin cache"))

    # 4. CLI (in plugin cache)
    cli_ok, cli_msg = check_cli(plugin_root)
    if cli_ok:
        results.append(("ok", "CLI", "bin/git-memory in plugin cache"))
    else:
        has_warnings = True
        results.append(("warn", "CLI", f"bin/git-memory {cli_msg}"))

    # 5. hooks.json (in plugin cache)
    if check_hooks_json(plugin_root):
        results.append(("ok", "hooks.json", "present in plugin cache"))
    else:
        has_warnings = True
        results.append(("warn", "hooks.json", "not found in plugin cache"))

    # 6. CLAUDE.md (in project root)
    block_ok, block_msg = check_claude_md(project_root)
    if block_ok:
        results.append(("ok", "CLAUDE.md", block_msg))
    else:
        has_errors = True
        results.append(("error", "CLAUDE.md", block_msg))

    # 7. Hook execution (trailer presence in recent commits)
    with_trailers, total_commits, scanned = check_hook_execution()
    if total_commits == 0:
        results.append(("warn", "Hook activity", "no commits found"))
        has_warnings = True
    elif with_trailers == 0:
        results.append(("warn", "Hook activity", f"no trailers in last {total_commits} commits"))
        has_warnings = True
    else:
        pct = round(with_trailers / total_commits * 100)
        results.append(("ok", "Hook activity", f"{with_trailers}/{total_commits} commits have trailers ({pct}%)"))

    # 8. GC status
    gc_days, stale_count, stale_items = check_gc_status()
    if gc_days is not None:
        results.append(("ok", "GC", f"last run {gc_days} days ago"))
    else:
        results.append(("warn", "GC", "never run"))
        has_warnings = True

    if stale_count > 0:
        has_warnings = True
        results.append(("warn", "Stale blockers", f"{stale_count} items >{STALE_BLOCKER_DAYS} days"))
    else:
        results.append(("ok", "Stale blockers", "none"))

    # 9. Version
    results.append(("ok", "Version", f"v{VERSION}"))

    # 10. Manifest (in project root)
    manifest, manifest_msg = check_manifest(project_root)
    if manifest:
        results.append(("ok", "Manifest", f"v{manifest.get('version', '?')}"))
    elif manifest_msg == "not found":
        results.append(("error", "Manifest", "not found (run install to create)"))
        has_errors = True
    else:
        has_errors = True
        results.append(("error", "Manifest", manifest_msg))

    # 11. Stale hooks in project settings.json
    settings_path = os.path.join(project_root, ".claude", "settings.json")
    if os.path.isfile(settings_path):
        try:
            with open(settings_path) as f:
                proj_settings = json.load(f)
            if "hooks" in proj_settings:
                has_stale = False
                hooks_data = proj_settings["hooks"]
                if isinstance(hooks_data, dict):
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
                                    has_stale = True
                                    break
                if has_stale:
                    has_errors = True
                    results.append(("error", "Settings hooks",
                                    "stale local hooks in .claude/settings.json — run install to fix"))
                else:
                    results.append(("ok", "Settings hooks", "clean"))
        except (json.JSONDecodeError, OSError):
            pass

    # Output
    if as_json:
        status = "error" if has_errors else ("warn" if has_warnings else "ok")
        output = {
            "status": status,
            "version": VERSION,
            "plugin_root": plugin_root,
            "project_root": project_root,
            "checks": [{"level": r[0], "component": r[1], "message": r[2]} for r in results],
        }
        print(json.dumps(output, indent=2))
    elif not silent:
        print("Memory System Status")
        print("─" * 35)
        for level, component, message in results:
            icon = {"ok": "✅", "warn": "⚠️ ", "error": "❌"}[level]
            print(f"{icon} {component}: {message}")
        print("─" * 35)

        if has_errors:
            print("Action: run 'git memory repair' to fix errors")
        elif has_warnings:
            print("Recommendation: review warnings above")
        else:
            print("All systems healthy")

    # Update manifest healthcheck timestamp
    manifest_path = os.path.join(project_root, ".claude", "git-memory-manifest.json")
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path) as f:
                data = json.load(f)
            data["last_healthcheck_at"] = datetime.now().isoformat()
            with open(manifest_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    return 1 if has_errors else 0


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point: parse args and run the doctor checks."""
    parser = argparse.ArgumentParser(description="Health check for the git-memory system.")
    parser.add_argument("--silent", action="store_true", help="Exit code only")
    parser.add_argument("--json", dest="json", action="store_true", help="Machine-readable JSON output")
    args = parser.parse_args()
    silent = args.silent
    as_json = args.json

    exit_code = run_doctor(silent=silent, as_json=as_json)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
