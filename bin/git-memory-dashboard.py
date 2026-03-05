#!/usr/bin/env python3
"""
git-memory-dashboard — Generate a static HTML dashboard from git memory.
=========================================================================
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

import json
import os
import re
import subprocess
import sys
import webbrowser
from datetime import datetime


# ── Config ────────────────────────────────────────────────────────────────

SCAN_DEPTH = 500
STALE_DAYS = 30
DASHBOARD_PATH = os.path.join(".claude", "dashboard.html")

VALID_KEYS = {
    "Issue", "Why", "Touched", "Decision", "Memo", "Next",
    "Blocker", "Risk", "Conflict", "Resolution", "Refs",
    "Resolved-Next", "Stale-Blocker",
}

CODE_TYPES = {"feat", "fix", "refactor", "perf", "chore", "ci", "test", "docs"}
MEMORY_TYPES = {"context", "decision", "memo"}


# ── Git Helpers ───────────────────────────────────────────────────────────

def run_git(args):
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=30,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def get_repo_info():
    info = {}
    code, branch = run_git(["branch", "--show-current"])
    info["branch"] = branch if code == 0 else "unknown"
    code, root = run_git(["rev-parse", "--show-toplevel"])
    info["name"] = os.path.basename(root) if code == 0 else "unknown"
    return info


# ── Parsing (reuses patterns from gc.py / precompact-snapshot.py) ─────────

def parse_scope(subject):
    cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
    m = re.match(r"^\w+\(([^)]+)\)", cleaned)
    return m.group(1) if m else None


def parse_commit_type(subject):
    cleaned = re.sub(r"^((?:fixup!|squash!|amend!)\s*)+", "", subject).strip()
    cleaned = re.sub(r"^[^\w#]+", "", cleaned).strip()
    m = re.match(r"^(\w+)(?:\([^)]*\))?[!]?:", cleaned)
    if m:
        return m.group(1).lower()
    return "other"


def parse_trailers(body):
    trailers = {}
    for line in body.strip().split("\n"):
        line = line.strip()
        m = re.match(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$", line)
        if m and m.group(1) in VALID_KEYS:
            key = m.group(1)
            val = m.group(2).strip()
            if key in trailers:
                if isinstance(trailers[key], list):
                    trailers[key].append(val)
                else:
                    trailers[key] = [trailers[key], val]
            else:
                trailers[key] = val
    return trailers


# ── Single-pass extraction ────────────────────────────────────────────────

def scan_commits():
    code, output = run_git([
        "log", "-n", str(SCAN_DEPTH),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1e",
    ])
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

        ctype = parse_commit_type(subject)
        scope = parse_scope(subject)
        trailers = parse_trailers(body)

        try:
            date = datetime.fromisoformat(date_str.split("+")[0].split("-0")[0].replace("Z", ""))
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

def aggregate(commits):
    now = datetime.now()

    # Tombstones
    tombstones = set()
    for c in commits:
        for key in ("Resolved-Next", "Stale-Blocker"):
            val = c["trailers"].get(key)
            if val:
                vals = val if isinstance(val, list) else [val]
                for v in vals:
                    tombstones.add(v.lower().strip())

    # Pending
    pending = []
    for c in commits:
        if "Next" in c["trailers"]:
            texts = c["trailers"]["Next"]
            if not isinstance(texts, list):
                texts = [texts]
            for t in texts:
                if t.lower().strip() not in tombstones:
                    pending.append({
                        "text": t, "sha": c["sha"], "scope": c["scope"] or "",
                        "age_days": c["age_days"] or 0, "date": c["date"],
                    })

    # Blockers
    blockers = []
    for c in commits:
        if "Blocker" in c["trailers"]:
            text = c["trailers"]["Blocker"]
            if text.lower().strip() not in tombstones:
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

    missing_counts = {}
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

def get_html_template():
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


def inject_data(html, data):
    """Replace the mock DATA object with real data."""
    data_json = json.dumps(data, ensure_ascii=False, indent=None)

    # Find and replace the DATA block
    # Pattern: "const DATA = { ... };" — everything between "const DATA = " and the next "// ===" line
    import re as re_mod
    pattern = r"const DATA = \{[\s\S]*?\};\s*\n"
    replacement = f"const DATA = {data_json};\n"

    # More reliable: find "const DATA = {" and replace until we hit a line starting with function/const///
    lines = html.split("\n")
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

def main():
    silent = "--silent" in sys.argv

    # Verify git repo
    code, root = run_git(["rev-parse", "--show-toplevel"])
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
    html = inject_data(html_template, data)

    # Write dashboard
    output_path = os.path.join(root, DASHBOARD_PATH)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    if not silent:
        print(f"✅ Dashboard: {output_path}", file=sys.stderr)
        # Open in browser
        webbrowser.open(f"file://{output_path}")
        print("   Opened in browser", file=sys.stderr)


if __name__ == "__main__":
    main()
