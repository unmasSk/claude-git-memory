#!/usr/bin/env python3
"""
git-memory-dashboard -- Generate a static HTML dashboard from git memory.

Scans git history, extracts all memory data (decisions, memos, pending,
blockers, compliance, GC status), and generates a self-contained HTML
dashboard file using GitHub Primer dark theme.

Usage:
  git memory dashboard          # Generate + open in browser
  (called with --silent by post-hook for auto-regeneration)

Exit codes:
  0: Success
  1: Error
"""

import argparse
import html as html_mod
import json
import os
import sys
import webbrowser
from datetime import datetime
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from constants import CODE_TYPES, MEMORY_TYPES
from git_helpers import run_git
from parsing import normalize, parse_commit_type, parse_scope, parse_trailers_full


# ── Config ────────────────────────────────────────────────────────────────

SCAN_DEPTH = 500
STALE_DAYS = 30
DASHBOARD_PATH = os.path.join(".claude", "dashboard.html")


# ── Helpers ───────────────────────────────────────────────────────────────

def get_repo_info() -> dict[str, str]:
    """Get current branch name and repo name from git."""
    info = {}
    code, branch = run_git(["branch", "--show-current"], timeout=30)
    info["branch"] = branch if code == 0 else "unknown"
    code, root = run_git(["rev-parse", "--show-toplevel"], timeout=30)
    info["name"] = os.path.basename(root) if code == 0 else "unknown"
    return info


# ── Single-pass extraction ────────────────────────────────────────────────

def scan_commits() -> list[dict[str, Any]]:
    """Parse recent git commits, extracting type, scope, trailers, and compliance info.

    Returns:
        List of commit dicts with parsed metadata, or empty list on failure.
    """
    code, output = run_git([
        "log", "-n", str(SCAN_DEPTH),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1e",
    ], timeout=30)
    if code != 0 or not output:
        return []

    commits = []
    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 3)
        if len(parts) < 4:
            continue

        sha = parts[0].strip()
        subject = parts[1].strip()
        body = parts[2].strip()
        date_str = parts[3].strip()

        ctype = parse_commit_type(subject) or "other"
        scope = parse_scope(subject)
        trailers = parse_trailers_full(body)

        try:
            date = datetime.fromisoformat(date_str)
            # Strip timezone for naive age calculations
            date = date.replace(tzinfo=None)
        except (ValueError, IndexError):
            date = None

        # Compliance check
        is_code = ctype in CODE_TYPES
        is_memory = ctype in MEMORY_TYPES
        compliant = None
        if is_code:
            compliant = "Why" in trailers and "Touched" in trailers
        elif ctype == "context":
            compliant = "Why" in trailers and "Next" in trailers
        elif ctype == "decision":
            compliant = "Why" in trailers and "Decision" in trailers
        elif ctype == "memo":
            compliant = "Memo" in trailers

        # Track missing trailers for non-compliant
        missing_keys = []
        if compliant is False:
            if is_code:
                if "Why" not in trailers:
                    missing_keys.append("Why")
                if "Touched" not in trailers:
                    missing_keys.append("Touched")
            elif ctype == "context":
                if "Why" not in trailers:
                    missing_keys.append("Why")
                if "Next" not in trailers:
                    missing_keys.append("Next")
            elif ctype == "decision":
                if "Why" not in trailers:
                    missing_keys.append("Why")
                if "Decision" not in trailers:
                    missing_keys.append("Decision")
            elif ctype == "memo" and "Memo" not in trailers:
                missing_keys.append("Memo")

        commits.append({
            "sha": sha,
            "subject": subject,
            "date": date.isoformat() if date else None,
            "age_days": (datetime.now() - date).days if date else None,
            "type": ctype,
            "scope": scope,
            "trailers": trailers,
            "compliant": compliant,
            "is_code": is_code,
            "is_memory": is_memory,
            "missing_keys": missing_keys,
        })

    return commits


# ── Data Aggregation ──────────────────────────────────────────────────────

def aggregate(commits: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate parsed commits into dashboard data sections.

    Extracts pending items, blockers, decisions, memos, compliance health,
    GC stats, and timeline into a single dict ready for HTML injection.
    """
    now = datetime.now()

    # Tombstones
    tombstones = set()
    for c in commits:
        for key in ("Resolved-Next", "Stale-Blocker"):
            val = c["trailers"].get(key)
            if val:
                vals = val if isinstance(val, list) else [val]
                for v in vals:
                    tombstones.add(normalize(v))

    # Pending
    pending = []
    for c in commits:
        if "Next" in c["trailers"]:
            texts = c["trailers"]["Next"]
            if not isinstance(texts, list):
                texts = [texts]
            for t in texts:
                if normalize(t) not in tombstones:
                    pending.append({
                        "text": t, "sha": c["sha"], "scope": c["scope"] or "",
                        "age_days": c["age_days"] or 0, "date": c["date"],
                    })

    # Blockers
    blockers = []
    for c in commits:
        if "Blocker" in c["trailers"]:
            text = c["trailers"]["Blocker"]
            if normalize(text) not in tombstones:
                ttl = STALE_DAYS - (c["age_days"] or 0)
                blockers.append({
                    "text": text, "sha": c["sha"], "scope": c["scope"] or "",
                    "age_days": c["age_days"] or 0, "date": c["date"],
                    "ttl_remaining": max(0, ttl), "is_stale": ttl <= 0,
                })

    # Decisions (latest per scope)
    decisions = {}
    for c in commits:
        if "Decision" in c["trailers"]:
            scope = c["scope"] or "global"
            if scope not in decisions:
                decisions[scope] = {
                    "text": c["trailers"]["Decision"], "sha": c["sha"],
                    "scope": scope, "date": c["date"],
                }
    decisions_list = sorted(decisions.values(), key=lambda x: x["date"] or "", reverse=True)

    # Memos (latest per scope)
    memos = {}
    for c in commits:
        if "Memo" in c["trailers"]:
            scope = c["scope"] or "global"
            if scope not in memos:
                memo_text = c["trailers"]["Memo"]
                parts = memo_text.split(" - ", 1)
                category = parts[0].strip() if len(parts) > 1 else "other"
                memos[scope] = {
                    "text": memo_text, "scope": scope, "sha": c["sha"],
                    "category": category, "date": c["date"],
                }
    memos_list = sorted(memos.values(), key=lambda x: x["date"] or "", reverse=True)

    # Health
    compliant_count = sum(1 for c in commits if c["compliant"] is True)
    non_compliant_count = sum(1 for c in commits if c["compliant"] is False)
    total_checkable = compliant_count + non_compliant_count
    pct = round(compliant_count / total_checkable * 100) if total_checkable > 0 else 100

    missing_counts: dict[str, int] = {}
    for c in commits:
        for k in c.get("missing_keys", []):
            missing_counts[k] = missing_counts.get(k, 0) + 1

    # GC
    gc_tombstone_count = len(tombstones)
    gc_last_run = None
    gc_stale_next = 0
    gc_stale_blocker = 0
    for c in commits:
        if "Resolved-Next" in c["trailers"] or "Stale-Blocker" in c["trailers"]:
            if gc_last_run is None:
                gc_last_run = c["age_days"]
            break
    # Count GC candidates (same heuristics as gc.py simplified)
    for p in pending:
        if (p["age_days"] or 0) > 60:
            gc_stale_next += 1
    for b in blockers:
        if b["is_stale"]:
            gc_stale_blocker += 1

    # Timeline (last 20)
    timeline = []
    for c in commits[:20]:
        timeline.append({
            "sha": c["sha"], "subject": c["subject"],
            "type": c["type"], "date": c["date"],
        })

    return {
        "repo": get_repo_info(),
        "generated_at": now.isoformat(),
        "scan_depth": SCAN_DEPTH,
        "total_commits": len(commits),
        "blockers": blockers,
        "pending": pending[:10],  # Top 10
        "decisions": decisions_list,
        "memos": memos_list,
        "health": {
            "compliance_pct": pct,
            "compliant": compliant_count,
            "total_checkable": total_checkable,
            "missing": missing_counts,
        },
        "gc": {
            "last_run_days_ago": gc_last_run,
            "tombstone_count": gc_tombstone_count,
            "candidates": {
                "stale_next": gc_stale_next,
                "stale_blocker": gc_stale_blocker,
            },
        },
        "timeline": timeline,
    }


# ── HTML Template ─────────────────────────────────────────────────────────

def get_html_template() -> str:
    """Read the HTML template from dashboard-preview.html."""
    # Look for template relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    template_path = os.path.join(repo_root, "dashboard-preview.html")

    if not os.path.exists(template_path):
        print(f"Error: template not found at {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


def _sanitize_value(val: Any) -> Any:
    """Recursively escape all string values to prevent XSS."""
    if isinstance(val, str):
        return html_mod.escape(val, quote=True)
    elif isinstance(val, dict):
        return {k: _sanitize_value(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [_sanitize_value(item) for item in val]
    return val


def inject_data(html_content: str, data: dict[str, Any]) -> str:
    """Replace the mock DATA object in the HTML template with real sanitized data."""
    safe_data = _sanitize_value(data)
    data_json = json.dumps(safe_data, ensure_ascii=False, indent=None)

    lines = html_content.split("\n")
    new_lines = []
    in_data_block = False
    brace_depth = 0

    for line in lines:
        if not in_data_block and "const DATA = {" in line:
            new_lines.append(f"    const DATA = {data_json};")
            in_data_block = True
            brace_depth = line.count("{") - line.count("}")
            if brace_depth <= 0:
                in_data_block = False
            continue

        if in_data_block:
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                in_data_block = False
            continue

        new_lines.append(line)

    return "\n".join(new_lines)


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """CLI entry point. Scans commits, generates dashboard HTML, and opens it in a browser."""
    parser = argparse.ArgumentParser(description="Generate a static HTML dashboard from git memory.")
    parser.add_argument("--silent", action="store_true", help="Suppress output")
    args = parser.parse_args()
    silent = args.silent

    # Verify git repo
    code, root = run_git(["rev-parse", "--show-toplevel"], timeout=30)
    if code != 0:
        if not silent:
            print("Error: not inside a git repository", file=sys.stderr)
        sys.exit(1)

    if not silent:
        print("🧠 Scanning git history...", file=sys.stderr)

    commits = scan_commits()
    if not commits:
        if not silent:
            print("No commits found.", file=sys.stderr)
        sys.exit(1)

    if not silent:
        print(f"   {len(commits)} commits scanned", file=sys.stderr)

    data = aggregate(commits)

    # Read template and inject data
    html_template = get_html_template()
    html_output = inject_data(html_template, data)

    # Write dashboard (atomic: write to tmp then replace)
    output_path = os.path.join(root, DASHBOARD_PATH)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    tmp_path = output_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(html_output)
    os.replace(tmp_path, output_path)

    if not silent:
        print(f"✅ Dashboard: {output_path}", file=sys.stderr)
        # Open in browser
        webbrowser.open(f"file://{output_path}")
        print("   Opened in browser", file=sys.stderr)


if __name__ == "__main__":
    main()
