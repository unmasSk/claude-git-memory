#!/usr/bin/env python3
"""
session-start-boot -- Auto-boot hook for SessionStart.

Runs automatically when Claude starts a new session. Executes doctor
silently, extracts memory from recent commits, and prints a compact
summary that Claude receives as context.

Exit codes:
  0: Always (never blocks session start)
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib"))

from parsing import scan_trailers_memory as scan_trailers, normalize, parse_scope
from version import VERSION as PLUGIN_VERSION


def check_version_mismatch() -> str | None:
    """Compare installed manifest version vs plugin VERSION constant.

    Returns warning string if mismatch, None if OK or can't check.
    """
    code, root = run_git(["rev-parse", "--show-toplevel"])
    if code != 0 or not root:
        return None
    manifest_path = os.path.join(root, ".claude", "git-memory-manifest.json")
    if not os.path.isfile(manifest_path):
        return None
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
        installed = manifest.get("version", "")
        if installed and installed != PLUGIN_VERSION:
            return f"Plugin v{PLUGIN_VERSION} available (installed: v{installed}). Suggest /plugin update"
        return None
    except (json.JSONDecodeError, OSError):
        return None


def parse_branch_keywords(branch: str) -> tuple[list[str], str | None]:
    """Extract keywords and issue number from branch name.

    'feat/issue-42-auth-refactor' -> (['auth', 'refactor', '42'], '#42')
    'main' -> ([], None)
    """
    # Strip prefix (feat/, fix/, chore/, etc.)
    stripped = re.sub(r"^(feat|fix|chore|refactor|docs|test|ci|perf)/", "", branch)
    # Extract issue number
    issue_match = re.search(r"(?:issue[- ]?|#)(\d+)", stripped, re.IGNORECASE)
    issue_ref = f"#{issue_match.group(1)}" if issue_match else None
    # Extract keywords (split on -, _, /, filter short/noise)
    tokens = re.split(r"[-_/]", stripped)
    noise = {"feat", "fix", "chore", "issue", "refactor", "dev", "main", "master", "staging"}
    keywords = [t.lower() for t in tokens if len(t) > 2 and t.lower() not in noise]
    return keywords, issue_ref


def time_ago(iso_or_unix: str) -> str:
    """Convert ISO timestamp or unix timestamp to human-readable 'N ago' string.

    '2026-03-13T08:00:00+00:00' -> '2h ago'
    """
    try:
        if iso_or_unix.isdigit():
            dt = datetime.fromtimestamp(int(iso_or_unix), tz=timezone.utc)
        else:
            # git log %aI format
            dt = datetime.fromisoformat(iso_or_unix)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - dt
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            return f"{seconds // 60}m ago"
        elif seconds < 86400:
            return f"{seconds // 3600}h ago"
        elif seconds < 604800:
            return f"{seconds // 86400}d ago"
        else:
            return f"{seconds // 604800}w ago"
    except (ValueError, TypeError, OSError):
        return "unknown"


def score_branch_relevance(text: str, keywords: list[str]) -> int:
    """Score how relevant a text is to branch keywords. Higher = more relevant."""
    if not keywords:
        return 0
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


SCAN_DEPTH = 30
MAX_PENDING = 30
MAX_BLOCKERS = 20
MAX_DECISIONS = 20
MAX_MEMOS = 10

# Glossary: deeper scan for full memory picture
GLOSSARY_MAX_DECISIONS = 10
GLOSSARY_MAX_MEMOS = 10


def run_git(args: list[str]) -> tuple[int, str]:
    """Run a git command and return (returncode, stdout)."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def run_doctor() -> dict:
    """Run doctor silently and return parsed JSON."""
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    doctor = os.path.join(plugin_root, "bin", "git-memory-doctor.py")
    if not os.path.isfile(doctor):
        return {"status": "skip", "checks": []}
    try:
        result = subprocess.run(
            [sys.executable, doctor, "--json"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return {"status": "error", "checks": []}


def run_repair() -> bool:
    """Run repair silently. Returns True if successful."""
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repair = os.path.join(plugin_root, "bin", "git-memory-repair.py")
    if not os.path.isfile(repair):
        return False
    try:
        result = subprocess.run(
            [sys.executable, repair, "--auto"],
            capture_output=True, text=True, timeout=15,
        )
        return result.returncode == 0
    except Exception:
        return False


def extract_memory() -> dict:
    """Extract memory from recent commits."""
    code, log_output = run_git([
        "log", f"-n{SCAN_DEPTH}",
        "--pretty=format:%h\x1f%s\x1f%b\x1e"
    ])
    if code != 0 or not log_output:
        return {}

    tombstones: set[str] = set()
    commits = log_output.split("\x1e")
    pending: list[str] = []
    blockers: list[str] = []
    decisions: list[tuple[str, str]] = []  # (scope, text)
    memos: list[tuple[str, str]] = []      # (scope, text)
    remembers: list[tuple[str, str]] = []  # (scope, text)
    last_context: str = ""
    decision_scopes: set[str] = set()
    memo_scopes: set[str] = set()
    remember_seen: set[str] = set()  # dedup by normalized text

    for entry in commits:
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("\x1f", 2)
        if len(parts) < 3:
            continue
        sha, subject, body = parts[0], parts[1], parts[2]
        trailers = scan_trailers(body)

        # Last context bookmark
        if not last_context and "context(" in subject.lower():
            last_context = f"{sha} {subject}"

        scope = parse_scope(subject) or ""
        label = f"({scope})" if scope else "(global)"

        # Tombstones (GC markers) — collect in same pass
        for key in ("Resolved-Next", "Stale-Blocker"):
            if key in trailers:
                tombstones.add(normalize(trailers[key]))

        # Pending items (include subject for branch-relevance scoring)
        if "Next" in trailers and len(pending) < MAX_PENDING:
            text = trailers["Next"]
            if normalize(text) not in tombstones:
                scope_prefix = f"({scope}) " if scope else ""
                pending.append(f"{sha}: {scope_prefix}{text}")

        # Blockers
        if "Blocker" in trailers and len(blockers) < MAX_BLOCKERS:
            text = trailers["Blocker"]
            if normalize(text) not in tombstones:
                blockers.append(f"{sha}: {text}")

        # Decisions (one per scope)
        if "Decision" in trailers and len(decisions) < MAX_DECISIONS:
            if scope not in decision_scopes:
                decision_scopes.add(scope)
                decisions.append((label, trailers["Decision"]))

        # Memos (one per scope)
        if "Memo" in trailers and len(memos) < MAX_MEMOS:
            if scope not in memo_scopes:
                memo_scopes.add(scope)
                memos.append((label, trailers["Memo"]))

        # Remembers (personality notes between sessions)
        if "Remember" in trailers:
            text = trailers["Remember"]
            norm = normalize(text)
            if norm not in remember_seen:
                remember_seen.add(norm)
                remembers.append((label, text))

    return {
        "last_context": last_context,
        "pending": pending,
        "blockers": blockers,
        "decisions": decisions,
        "memos": memos,
        "remembers": remembers,
    }


def extract_glossary() -> dict:
    """Extract a full glossary of decisions and memos from the entire git history.

    Goes deeper than extract_memory() — scans ALL commits, not just last 30.
    Returns deduplicated lists by scope (most recent wins per scope).
    """
    code, log_output = run_git([
        "log", "--all", "-n500",
        "--pretty=format:%h\x1f%s\x1f%b\x1e"
    ])
    if code != 0 or not log_output:
        return {"decisions": [], "memos": [], "remembers": []}

    decisions: list[tuple[str, str]] = []
    memos: list[tuple[str, str]] = []
    remembers: list[tuple[str, str]] = []
    decision_scopes: set[str] = set()
    memo_scopes: set[str] = set()
    remember_seen: set[str] = set()

    commits = log_output.split("\x1e")
    for entry in commits:
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("\x1f", 2)
        if len(parts) < 3:
            continue
        subject, body = parts[1], parts[2]
        trailers = scan_trailers(body)
        scope = parse_scope(subject) or ""
        label = f"({scope})" if scope else "(global)"

        if "Decision" in trailers and len(decisions) < GLOSSARY_MAX_DECISIONS:
            if scope not in decision_scopes:
                decision_scopes.add(scope)
                decisions.append((label, trailers["Decision"]))

        if "Memo" in trailers and len(memos) < GLOSSARY_MAX_MEMOS:
            if scope not in memo_scopes:
                memo_scopes.add(scope)
                memos.append((label, trailers["Memo"]))

        if "Remember" in trailers:
            text = trailers["Remember"]
            norm = normalize(text)
            if norm not in remember_seen:
                remember_seen.add(norm)
                remembers.append((label, text))

    return {"decisions": decisions, "memos": memos, "remembers": remembers}


GLOSSARY_CACHE_TTL = 86400  # 24 hours


_project_root_cache: str | None = None


def _get_project_root() -> str | None:
    """Get project root, cached for the process."""
    global _project_root_cache
    if _project_root_cache is None:
        code, root = run_git(["rev-parse", "--show-toplevel"])
        _project_root_cache = root if code == 0 and root else ""
    return _project_root_cache or None


def _glossary_cache_path() -> str | None:
    """Return path to .claude/.glossary-cache.json, or None if no project root."""
    root = _get_project_root()
    if not root:
        return None
    return os.path.join(root, ".claude", ".glossary-cache.json")


def _read_glossary_cache() -> dict | None:
    """Read glossary cache if fresh. Returns None if stale or missing."""
    path = _glossary_cache_path()
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            cache = json.load(f)
        # Check staleness
        generated = cache.get("generated_at", "")
        if generated:
            gen_dt = datetime.fromisoformat(generated)
            if gen_dt.tzinfo is None:
                gen_dt = gen_dt.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - gen_dt).total_seconds()
            if age > GLOSSARY_CACHE_TTL:
                return None
        # Check HEAD match
        code, head_sha = run_git(["rev-parse", "HEAD"])
        if code != 0:
            return None
        if cache.get("head_sha") != head_sha:
            return None
        return cache
    except (json.JSONDecodeError, OSError, ValueError, KeyError):
        return None


def _write_glossary_cache(glossary: dict) -> None:
    """Write glossary cache to .claude/.glossary-cache.json."""
    path = _glossary_cache_path()
    if not path:
        return
    code, head_sha = run_git(["rev-parse", "HEAD"])
    if code != 0:
        return
    cache = {
        "head_sha": head_sha,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "decisions": glossary.get("decisions", []),
        "memos": glossary.get("memos", []),
        "remembers": glossary.get("remembers", []),
    }
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(cache, f, indent=2)
    except OSError:
        pass


def extract_glossary_cached() -> dict:
    """Extract glossary, using cache if available."""
    cached = _read_glossary_cache()
    if cached:
        return {
            "decisions": cached.get("decisions", []),
            "memos": cached.get("memos", []),
            "remembers": cached.get("remembers", []),
        }
    glossary = extract_glossary()
    _write_glossary_cache(glossary)
    return glossary


def _ensure_statusline() -> None:
    """Ensure the statusline wrapper is configured for context tracking.

    Checks ~/.claude/settings.json for context-writer.py. If not present,
    configures it (backing up any existing statusline command).
    """
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    wrapper_script = os.path.join(plugin_root, "bin", "context-writer.py")
    if not os.path.isfile(wrapper_script):
        return

    claude_home = os.path.join(os.path.expanduser("~"), ".claude")
    settings_path = os.path.join(claude_home, "settings.json")
    backup_path = os.path.join(claude_home, ".git-memory-original-statusline")

    try:
        if os.path.isfile(settings_path):
            with open(settings_path) as f:
                settings = json.load(f)
        else:
            settings = {}
    except (json.JSONDecodeError, OSError):
        return

    current_sl = settings.get("statusLine", {})
    current_cmd = current_sl.get("command", "") if isinstance(current_sl, dict) else ""

    # Already configured — just update path if plugin root changed
    if "context-writer" in current_cmd:
        expected_cmd = f"python3 {wrapper_script.replace(os.sep, '/')}"
        if current_cmd != expected_cmd:
            settings["statusLine"] = {
                "type": "command",
                "command": expected_cmd,
                "padding": 0,
            }
            try:
                with open(settings_path, "w") as f:
                    json.dump(settings, f, indent=2)
            except OSError:
                pass
        return

    # Not configured — backup existing and set ours
    if current_cmd and not os.path.isfile(backup_path):
        try:
            with open(backup_path, "w") as f:
                f.write(current_cmd)
        except OSError:
            pass

    settings["statusLine"] = {
        "type": "command",
        "command": f"python3 {wrapper_script.replace(os.sep, '/')}",
        "padding": 0,
    }
    try:
        with open(settings_path, "w") as f:
            json.dump(settings, f, indent=2)
    except OSError:
        pass


# Scaling limits (from design doc)
BOOT_MAX_BRANCH_DECISIONS = 10
BOOT_MAX_OTHER_DECISIONS = 10
BOOT_MAX_DECISIONS = 20
BOOT_MAX_BRANCH_MEMOS = 10
BOOT_MAX_OTHER_MEMOS = 10
BOOT_MAX_MEMOS = 20
BOOT_MAX_REMEMBERS = 30
BOOT_MAX_BRANCH_NEXT = 10
BOOT_MAX_OTHER_NEXT = 5
BOOT_MAX_NEXT = 10
BOOT_MAX_TIMELINE = 10


def get_timeline(n: int = 10) -> list[str]:
    """Get last N commits as timeline entries with time_ago."""
    code, output = run_git([
        "log", f"-n{n}",
        "--pretty=format:%h\x1f%s\x1f%aI"
    ])
    if code != 0 or not output:
        return []
    entries = []
    for line in output.split("\n"):
        parts = line.strip().split("\x1f", 2)
        if len(parts) < 3:
            continue
        sha, subject, date_str = parts
        entries.append(f"  {sha} {subject} | {time_ago(date_str)}")
    return entries


def get_last_context_time() -> str | None:
    """Get the timestamp of the last context() commit as time_ago string."""
    code, output = run_git([
        "log", "-n30",
        "--pretty=format:%h\x1f%s\x1f%aI"
    ])
    if code != 0 or not output:
        return None
    for line in output.split("\n"):
        parts = line.strip().split("\x1f", 2)
        if len(parts) < 3:
            continue
        sha, subject, date_str = parts
        cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
        if cleaned.lower().startswith("context"):
            return time_ago(date_str)
    return None


def partition_by_relevance(items, keywords, text_fn):
    """Split items into (branch_scoped, other) based on keyword relevance.

    items: list of anything
    keywords: branch keywords
    text_fn: function to extract text from an item for scoring
    Returns (branch_scoped, other) where branch_scoped items are sorted by score descending.
    """
    if not keywords:
        return [], items
    scored = [(score_branch_relevance(text_fn(item), keywords), item) for item in items]
    # Sort branch-matching items by score descending
    branch_scoped = [item for _, item in sorted(
        [(s, i) for s, i in scored if s > 0], key=lambda x: -x[0]
    )]
    other = [item for score, item in scored if score == 0]
    return branch_scoped, other


def main() -> None:
    """Auto-boot: structured briefing with all context pre-extracted."""
    # Check if we're in a git repo
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    if code != 0:
        sys.exit(0)

    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace(os.sep, "/")
    lines: list[str] = []

    # 0. Clean session-booted flag (new session = fresh boot)
    project_root = _get_project_root()
    if project_root:
        booted_flag = os.path.join(project_root, ".claude", ".session-booted")
        try:
            os.remove(booted_flag)
        except FileNotFoundError:
            pass

    # 0a. Ensure statusline wrapper is configured
    _ensure_statusline()

    # 0b. Fetch remote refs silently
    run_git(["fetch", "--quiet"])

    # ── HEADER ──────────────────────────────────────────────────────
    lines.append(f"[git-memory-boot] v{PLUGIN_VERSION} | {plugin_root}")
    lines.append("")

    # ── STATUS ──────────────────────────────────────────────────────
    doctor_result = run_doctor()
    status = "ok"
    status_detail = ""
    if doctor_result.get("status") == "error":
        repaired = run_repair()
        if repaired:
            status = "warn"
            status_detail = " — auto-repaired issues"
        else:
            status = "error"
            status_detail = " — run doctor for details"

    version_warning = check_version_mismatch()

    lines.append(f"STATUS: {status}{status_detail}")
    if version_warning:
        lines.append(f"  {version_warning}")
    lines.append("")

    # ── BRANCH ──────────────────────────────────────────────────────
    _, branch = run_git(["branch", "--show-current"])
    branch = branch or "(detached HEAD)"
    branch_keywords, branch_issue = parse_branch_keywords(branch)

    # Ahead/behind (single rev-list call with --left-right --count)
    ahead_behind = ""
    ahead_n = 0
    behind_n = 0
    if branch and branch != "(detached HEAD)":
        code_ab, ab_out = run_git(["rev-list", "--left-right", "--count", f"HEAD...@{{u}}"])
        if code_ab == 0 and ab_out.strip():
            parts = ab_out.strip().split()
            if len(parts) == 2:
                ahead_n, behind_n = int(parts[0]), int(parts[1])
                ahead_behind = f" [{ahead_n}/{behind_n} vs upstream]"

    lines.append(f"BRANCH: {branch}{ahead_behind}")

    # Dirty state
    _, status_porcelain = run_git(["status", "--porcelain"])
    if status_porcelain:
        dirty_count = len([l for l in status_porcelain.splitlines() if l.strip()])
        lines.append(f"  DIRTY: {dirty_count} files")

    # Pull recommendation (reuses behind_n from the single rev-list call above)
    if behind_n > 0:
        lines.append(f"  PULL RECOMMENDED: remote is {behind_n} ahead")

    lines.append("")

    # ── SCOPES ──────────────────────────────────────────────────────
    scopes_file = os.path.join(project_root, ".claude", "git-memory-scopes.json") if project_root else None
    if scopes_file and os.path.isfile(scopes_file):
        try:
            with open(scopes_file) as f:
                scopes_data = json.load(f)
            scope_map = scopes_data.get("scopes", {})
            if scope_map:
                lines.append("SCOPES:")
                for scope_name, scope_info in scope_map.items():
                    desc = scope_info.get("description", "") if isinstance(scope_info, dict) else str(scope_info)
                    children = scope_info.get("children", {}) if isinstance(scope_info, dict) else {}
                    if children:
                        child_list = ", ".join(f"{scope_name}/{k}" for k in children)
                        lines.append(f"  {scope_name}: {desc} [{child_list}]")
                    else:
                        lines.append(f"  {scope_name}: {desc}")
                lines.append("")
        except (json.JSONDecodeError, OSError):
            pass  # Silently skip if file is corrupt

    # ── RESUME ──────────────────────────────────────────────────────
    memory = extract_memory()

    lines.append("RESUME:")

    # Last context with time_ago
    if memory.get("last_context"):
        ctx_time = get_last_context_time() or ""
        time_part = f" | {ctx_time}" if ctx_time else ""
        lines.append(f"  Last: {memory['last_context']}{time_part}")

    # Issue from branch
    if branch_issue:
        lines.append(f"  Issue (from branch): {branch_issue}")

    # Next items — branch-scoped first
    if memory.get("pending"):
        branch_next, other_next = partition_by_relevance(
            memory["pending"], branch_keywords, lambda x: x)
        all_next = branch_next[:BOOT_MAX_BRANCH_NEXT] + other_next[:BOOT_MAX_OTHER_NEXT]
        all_next = all_next[:BOOT_MAX_NEXT]
        for item in all_next:
            lines.append(f"  Next: {item}")
        remaining = len(memory["pending"]) - len(all_next)
        if remaining > 0:
            lines.append(f"  ({remaining} more Next items in history. Use git-memory-log --type context)")

    # Blockers
    if memory.get("blockers"):
        for item in memory["blockers"]:
            lines.append(f"  Blocker: {item}")

    if not memory.get("last_context") and not memory.get("pending") and not memory.get("blockers"):
        lines.append("  (no prior session found)")

    lines.append("")

    # ── REMEMBER ────────────────────────────────────────────────────
    # Merge recent + glossary remembers
    glossary = extract_glossary_cached()

    all_remembers: list[tuple[str, str]] = list(memory.get("remembers", []))
    recent_remember_texts = {normalize(t) for _, t in all_remembers}
    for scope, text in glossary.get("remembers", []):
        if normalize(text) not in recent_remember_texts:
            all_remembers.append((scope, text))
            recent_remember_texts.add(normalize(text))

    if all_remembers:
        lines.append("REMEMBER:")
        for scope, text in all_remembers[:BOOT_MAX_REMEMBERS]:
            lines.append(f"  {scope} {text}")
        remaining = len(all_remembers) - BOOT_MAX_REMEMBERS
        if remaining > 0:
            lines.append(f"  ({remaining} more. Use git-memory-log --type remember)")
        lines.append("")

    # ── DECISIONS ───────────────────────────────────────────────────
    all_decisions: list[tuple[str, str]] = list(memory.get("decisions", []))
    recent_decision_scopes = {s for s, _ in all_decisions}
    for scope, text in glossary.get("decisions", []):
        if scope not in recent_decision_scopes:
            all_decisions.append((scope, text))
            recent_decision_scopes.add(scope)

    if all_decisions:
        branch_decs, other_decs = partition_by_relevance(
            all_decisions, branch_keywords, lambda x: f"{x[0]} {x[1]}")
        shown = branch_decs[:BOOT_MAX_BRANCH_DECISIONS] + other_decs[:BOOT_MAX_OTHER_DECISIONS]
        shown = shown[:BOOT_MAX_DECISIONS]
        lines.append("DECISIONS:")
        for scope, text in shown:
            lines.append(f"  {scope} {text}")
        remaining = len(all_decisions) - len(shown)
        if remaining > 0:
            lines.append(f"  ({remaining} more decisions in history. Use git-memory-log --type decision)")
        lines.append("")

    # ── MEMOS ───────────────────────────────────────────────────────
    all_memos: list[tuple[str, str]] = list(memory.get("memos", []))
    recent_memo_scopes = {s for s, _ in all_memos}
    for scope, text in glossary.get("memos", []):
        if scope not in recent_memo_scopes:
            all_memos.append((scope, text))
            recent_memo_scopes.add(scope)

    if all_memos:
        branch_memos, other_memos = partition_by_relevance(
            all_memos, branch_keywords, lambda x: f"{x[0]} {x[1]}")
        shown = branch_memos[:BOOT_MAX_BRANCH_MEMOS] + other_memos[:BOOT_MAX_OTHER_MEMOS]
        shown = shown[:BOOT_MAX_MEMOS]
        lines.append("MEMOS:")
        for scope, text in shown:
            lines.append(f"  {scope} {text}")
        remaining = len(all_memos) - len(shown)
        if remaining > 0:
            lines.append(f"  ({remaining} more memos in history. Use git-memory-log --type memo)")
        lines.append("")

    # ── TIMELINE ────────────────────────────────────────────────────
    timeline = get_timeline(BOOT_MAX_TIMELINE)
    if timeline:
        lines.append(f"TIMELINE (last {len(timeline)}):")
        lines.extend(timeline)
        lines.append("")

    # ── BOOT COMPLETE ───────────────────────────────────────────────
    commit_script = os.path.join(plugin_root, "bin", "git-memory-commit.py").replace(os.sep, "/")
    log_script = os.path.join(plugin_root, "bin", "git-memory-log.py").replace(os.sep, "/")
    lines.append("---")
    lines.append("BOOT COMPLETE. Do NOT run doctor or git-memory-log. All context is above.")
    lines.append(f'Commit: python3 "{commit_script}"')
    lines.append(f'Log: python3 "{log_script}"')

    print("\n".join(lines))
    sys.exit(0)


if __name__ == "__main__":
    main()
