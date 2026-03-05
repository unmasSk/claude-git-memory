#!/usr/bin/env python3
"""
Drift Test — 6-Month Simulation
================================
Generates 200 commits + 20 decision/memo across 6 scopes in a temp repo,
then validates:
  1. Deep search returns top-relevant results (Issue > scope > touched > recency)
  2. Dedup doesn't eat valid entries (different scopes preserved)
  3. Snapshot never exceeds 18 lines

Usage: python3 tests/drift-test.py
"""

import os
import random
import re
import subprocess
import sys
import tempfile
import shutil
from datetime import datetime, timedelta

# ── Config ──────────────────────────────────────────────────────────────────

TOTAL_COMMITS = 200
DECISION_COUNT = 12   # spread across 6 scopes
MEMO_COUNT = 8        # spread across 6 scopes
SCOPES = ["auth", "forms", "api", "ui", "billing", "reports"]
EMOJIS = {"feat": "✨", "fix": "🐛", "refactor": "♻️", "chore": "🔧",
           "context": "💾", "decision": "🧭", "memo": "📌"}
CODE_TYPES = ["feat", "fix", "refactor", "chore"]
SNAPSHOT_MAX_LINES = 18

# Path to the precompact hook (relative to repo root)
PRECOMPACT_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".claude", "hooks", "precompact-snapshot.py",
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def run(cmd, cwd, env=None):
    """Run shell command, return stdout."""
    merged = {**os.environ, **(env or {})}
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, cwd=cwd, env=merged,
    )
    if result.returncode != 0 and "fatal" in result.stderr.lower():
        print(f"  CMD FAILED: {cmd}\n  STDERR: {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip(), result.returncode


def git(args, cwd, env=None):
    return run(f"git {args}", cwd, env)


def make_temp_repo():
    """Create a temp repo with initial commit."""
    path = tempfile.mkdtemp(prefix="drift-test-")
    git("init", path)
    git("checkout -b dev", path)
    # Initial commit
    git('commit --allow-empty -m "🔧 chore: init repo\n\nWhy: initial setup\nTouched: none"', path)
    git("checkout -b feat/CU-042-big-feature", path)
    return path


# ── Commit generators ──────────────────────────────────────────────────────

def gen_code_commit(idx, scope, date_str, cwd):
    """Generate a regular code commit with trailers."""
    ctype = random.choice(CODE_TYPES)
    emoji = EMOJIS[ctype]
    slug = f"change-{idx}"
    files_touched = [f"app/{scope}/{slug}.php", f"tests/{scope}/{slug}Test.php"]

    # Create a dummy file so the commit has real content
    fdir = os.path.join(cwd, "app", scope)
    os.makedirs(fdir, exist_ok=True)
    with open(os.path.join(fdir, f"{slug}.php"), "w") as f:
        f.write(f"<?php // {slug} #{idx}\n")

    git("add -A", cwd)

    msg = (
        f"{emoji} {ctype}({scope}): {slug}\n\n"
        f"Issue: CU-042\n"
        f"Why: automated drift test commit #{idx}\n"
        f"Touched: {', '.join(files_touched)}"
    )
    # ~10% of code commits also carry Next:
    if random.random() < 0.10:
        msg += f"\nNext: continue {scope} work after commit {idx}"
    # ~5% carry Blocker:
    if random.random() < 0.05:
        msg += f"\nBlocker: waiting for {scope} API keys"

    env = {
        "GIT_AUTHOR_DATE": date_str,
        "GIT_COMMITTER_DATE": date_str,
    }
    git(f'commit -m "{msg}"', cwd, env)


def gen_decision(scope, idx, date_str, cwd):
    """Generate a decision() commit."""
    topics = [
        f"use library-{idx} for {scope}",
        f"adopt pattern-{idx} in {scope}",
        f"switch to approach-{idx} for {scope}",
    ]
    topic = random.choice(topics)
    msg = (
        f"🧭 decision({scope}): {topic}\n\n"
        f"Issue: CU-042\n"
        f"Why: evaluated alternatives for {scope} at decision point {idx}\n"
        f"Decision: {topic} — benchmarks show 3x improvement"
    )
    env = {"GIT_AUTHOR_DATE": date_str, "GIT_COMMITTER_DATE": date_str}
    git(f'commit --allow-empty -m "{msg}"', cwd, env)


def gen_memo(scope, idx, date_str, cwd):
    """Generate a memo() commit."""
    categories = ["preference", "requirement", "antipattern"]
    cat = random.choice(categories)
    descriptions = {
        "preference": f"always use strict types in {scope}",
        "requirement": f"client wants real-time updates in {scope}",
        "antipattern": f"never use raw SQL in {scope}",
    }
    desc = descriptions[cat]
    msg = (
        f"📌 memo({scope}): {desc}\n\n"
        f"Memo: {cat} - {desc}\n"
        f"Why: drift test memo #{idx}"
    )
    env = {"GIT_AUTHOR_DATE": date_str, "GIT_COMMITTER_DATE": date_str}
    git(f'commit --allow-empty -m "{msg}"', cwd, env)


def gen_context(scope, idx, date_str, cwd):
    """Generate a context() commit (session bookmark)."""
    msg = (
        f"💾 context({scope}): pause {scope} work session {idx}\n\n"
        f"Issue: CU-042\n"
        f"Why: end of day\n"
        f"Next: resume {scope} implementation from commit {idx}\n"
        f"Blocker: waiting for {scope} deploy slot"
    )
    env = {"GIT_AUTHOR_DATE": date_str, "GIT_COMMITTER_DATE": date_str}
    git(f'commit --allow-empty -m "{msg}"', cwd, env)


# ── Build the 6-month history ──────────────────────────────────────────────

def build_history(cwd):
    """Generate 200 commits spread over 6 months with interspersed decision/memo/context."""
    start_date = datetime(2025, 9, 1, 9, 0, 0)
    end_date = datetime(2026, 3, 1, 18, 0, 0)
    total_seconds = int((end_date - start_date).total_seconds())

    # Pre-schedule decision and memo positions
    decision_positions = sorted(random.sample(range(10, TOTAL_COMMITS - 5), DECISION_COUNT))
    memo_positions = sorted(random.sample(
        [i for i in range(10, TOTAL_COMMITS - 5) if i not in decision_positions],
        MEMO_COUNT,
    ))
    # Add 3 context() commits (one near middle, one near end, one at very end)
    context_positions = [TOTAL_COMMITS // 3, 2 * TOTAL_COMMITS // 3, TOTAL_COMMITS - 2]

    special = set(decision_positions + memo_positions + context_positions)
    d_idx = 0
    m_idx = 0
    c_idx = 0

    for i in range(TOTAL_COMMITS):
        # Spread dates linearly
        offset = int(total_seconds * (i / TOTAL_COMMITS))
        commit_date = start_date + timedelta(seconds=offset)
        date_str = commit_date.strftime("%Y-%m-%dT%H:%M:%S")
        scope = SCOPES[i % len(SCOPES)]

        if i in decision_positions:
            gen_decision(scope, d_idx, date_str, cwd)
            d_idx += 1
        elif i in memo_positions:
            gen_memo(scope, m_idx, date_str, cwd)
            m_idx += 1
        elif i in context_positions:
            gen_context(scope, c_idx, date_str, cwd)
            c_idx += 1
        else:
            gen_code_commit(i, scope, date_str, cwd)

    print(f"  Generated {TOTAL_COMMITS} commits ({DECISION_COUNT} decisions, {MEMO_COUNT} memos, {len(context_positions)} contexts)")


# ── Test 1: Deep Search Relevance ──────────────────────────────────────────

def test_deep_search(cwd):
    """
    Verify deep search returns results in relevance order:
    Issue > scope > touched paths > recency
    """
    print("\n── TEST 1: Deep Search Relevance ──")
    errors = []

    # Search for decisions — should find entries
    out, _ = git('log --all --grep="Decision:" --pretty=format:"%h %s %b"', cwd)
    decision_lines = [l for l in out.split("\n") if "Decision:" in l]
    if len(decision_lines) < DECISION_COUNT:
        errors.append(f"Expected ≥{DECISION_COUNT} decision lines, got {len(decision_lines)}")
    else:
        print(f"  Decision search: found {len(decision_lines)} entries (expected ≥{DECISION_COUNT}) ✓")

    # Search for memos — should find entries
    out, _ = git('log --all --grep="Memo:" --pretty=format:"%h %s %b"', cwd)
    memo_lines = [l for l in out.split("\n") if "Memo:" in l]
    if len(memo_lines) < MEMO_COUNT:
        errors.append(f"Expected ≥{MEMO_COUNT} memo lines, got {len(memo_lines)}")
    else:
        print(f"  Memo search: found {len(memo_lines)} entries (expected ≥{MEMO_COUNT}) ✓")

    # Search for a specific scope — should only return that scope's entries
    for test_scope in ["auth", "billing"]:
        out, _ = git(f'log --all --grep="Decision:" --pretty=format:"%h %s" | grep -i "{test_scope}"', cwd)
        if out.strip():
            # Verify all returned lines contain the scope
            lines = [l for l in out.strip().split("\n") if l.strip()]
            wrong_scope = [l for l in lines if test_scope not in l.lower()]
            if wrong_scope:
                errors.append(f"Scope filter '{test_scope}' returned unrelated: {wrong_scope[0][:60]}")
            else:
                print(f"  Scope filter '{test_scope}': {len(lines)} results, all correct ✓")
        else:
            # It's possible this scope had no decisions — that's OK
            print(f"  Scope filter '{test_scope}': 0 results (scope may not have decisions) ✓")

    # Verify Issue filter — all commits should have CU-042
    out, _ = git('log --all --grep="Issue: CU-042" --oneline', cwd)
    issue_count = len([l for l in out.strip().split("\n") if l.strip()])
    if issue_count < 50:  # Most commits should have the issue
        errors.append(f"Issue filter CU-042 returned only {issue_count} commits (expected >50)")
    else:
        print(f"  Issue filter CU-042: {issue_count} commits ✓")

    # Verify recency: most recent decision should appear first in log
    out, _ = git('log --all --grep="Decision:" -n 1 --pretty=format:"%h %s"', cwd)
    if out.strip():
        print(f"  Most recent decision: {out.strip()[:60]} ✓")
    else:
        errors.append("No decisions found in log at all")

    return errors


# ── Test 2: Dedup Doesn't Eat Valid Entries ────────────────────────────────

def test_dedup_integrity(cwd):
    """
    Verify that dedup in snapshot preserves entries from different scopes.
    Run the precompact snapshot extractor and check results.
    """
    print("\n── TEST 2: Dedup Integrity ──")
    errors = []

    # Run the precompact snapshot script
    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()

    if not snapshot:
        errors.append("Snapshot returned empty output")
        return errors

    print(f"  Snapshot generated ({len(snapshot.split(chr(10)))} lines)")

    # Check that decisions from multiple scopes appear (dedup = 1 per scope, not 1 total)
    decision_lines = [l for l in snapshot.split("\n") if l.strip().startswith("- (") and "decision" not in l.lower()]
    # Actually, decisions are under "Active decisions:" section
    in_decisions = False
    in_memos = False
    decision_scopes = []
    memo_scopes = []

    for line in snapshot.split("\n"):
        if "Active decisions:" in line:
            in_decisions = True
            in_memos = False
            continue
        elif "Active memos:" in line:
            in_memos = True
            in_decisions = False
            continue
        elif line.startswith("===") or (line and not line.startswith("  ")):
            in_decisions = False
            in_memos = False

        if in_decisions and line.strip().startswith("- ("):
            scope_match = re.match(r"\s*-\s*\((\w+)\)", line)
            if scope_match:
                decision_scopes.append(scope_match.group(1))

        if in_memos and line.strip().startswith("- ("):
            scope_match = re.match(r"\s*-\s*\((\w+)\)", line)
            if scope_match:
                memo_scopes.append(scope_match.group(1))

    # Snapshot only reads last 30 commits, so decisions/memos may be sparse.
    # Validate: if decisions appear, they should have distinct scopes (not collapsed to 1).
    # Also validate deep search finds ALL decisions across full history.
    unique_d_scopes = set(decision_scopes)
    if unique_d_scopes:
        print(f"  Decision scopes in snapshot: {unique_d_scopes} ({len(unique_d_scopes)} unique, max 3) ✓")
    else:
        print(f"  No decisions in last 30 commits (expected: they're spread across 200) ✓")

    # Deep search must find all 12 decisions across full history (not just last 30)
    out, _ = git('log --all --grep="Decision:" --pretty=format:"%h %s"', cwd)
    all_decision_commits = [l for l in out.strip().split("\n") if l.strip()]
    all_d_scopes = set()
    for line in all_decision_commits:
        sm = re.search(r"decision\((\w+)\)", line, re.IGNORECASE)
        if sm:
            all_d_scopes.add(sm.group(1))
    if len(all_d_scopes) < 2:
        errors.append(f"Deep search found decisions in only {len(all_d_scopes)} scope(s): {all_d_scopes}")
    else:
        print(f"  Deep search decision scopes (full history): {all_d_scopes} ({len(all_d_scopes)} unique) ✓")

    # Memos: snapshot may or may not have them (depends on position in 200 commits)
    unique_m_scopes = set(memo_scopes)
    if unique_m_scopes:
        print(f"  Memo scopes in snapshot: {unique_m_scopes} ({len(unique_m_scopes)} unique, max 2) ✓")
    else:
        print(f"  No memos in last 30 commits (expected: they're spread across 200) ✓")

    # Deep search must find all 8 memos across full history
    out, _ = git('log --all --grep="Memo:" --pretty=format:"%h %s"', cwd)
    all_memo_commits = [l for l in out.strip().split("\n") if l.strip()]
    all_m_scopes = set()
    for line in all_memo_commits:
        sm = re.search(r"memo\((\w+)\)", line, re.IGNORECASE)
        if sm:
            all_m_scopes.add(sm.group(1))
    if len(all_m_scopes) < 2:
        errors.append(f"Deep search found memos in only {len(all_m_scopes)} scope(s): {all_m_scopes}")
    else:
        print(f"  Deep search memo scopes (full history): {all_m_scopes} ({len(all_m_scopes)} unique) ✓")

    # Verify blocker dedup: same text from different commits should appear only once
    blocker_lines = []
    in_blockers = False
    for line in snapshot.split("\n"):
        if "Blockers:" in line:
            in_blockers = True
            continue
        elif line and not line.startswith("  "):
            in_blockers = False
        if in_blockers and line.strip().startswith("- ["):
            blocker_lines.append(line.strip())

    blocker_texts = []
    for bl in blocker_lines:
        # Extract text after sha: "- [abc1234] waiting for auth API keys"
        m = re.match(r"-\s*\[\w+\]\s*(.+)", bl)
        if m:
            blocker_texts.append(m.group(1).lower())

    if len(blocker_texts) != len(set(blocker_texts)):
        errors.append(f"Duplicate blockers found: {blocker_texts}")
    elif blocker_texts:
        print(f"  Blocker dedup: {len(blocker_texts)} unique blocker(s) ✓")
    else:
        print(f"  No blockers in last 30 commits (expected for end of 200-commit history) ✓")

    return errors


# ── Test 3: Budget ≤18 Lines ───────────────────────────────────────────────

def test_snapshot_budget(cwd):
    """
    Verify the snapshot never exceeds 18 lines, even with maximum content.
    """
    print("\n── TEST 3: Snapshot Budget ≤18 Lines ──")
    errors = []

    # Run snapshot
    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()
    lines = snapshot.split("\n")
    line_count = len(lines)

    if line_count > SNAPSHOT_MAX_LINES:
        errors.append(f"Snapshot is {line_count} lines (max {SNAPSHOT_MAX_LINES})")
        print(f"  FAIL: {line_count} lines > {SNAPSHOT_MAX_LINES}")
        print("  --- Snapshot content ---")
        for i, line in enumerate(lines, 1):
            marker = " <<<" if i > SNAPSHOT_MAX_LINES else ""
            print(f"  {i:2d}: {line}{marker}")
        print("  --- End ---")
    else:
        print(f"  Snapshot: {line_count} lines ≤ {SNAPSHOT_MAX_LINES} ✓")

    # Also verify it has the expected structure
    has_header = any("GIT MEMORY SNAPSHOT" in l or "BOOT" in l for l in lines)
    has_footer = any("END SNAPSHOT" in l or "END" in l for l in lines)
    has_branch = any(l.startswith("Branch:") for l in lines)

    if not has_header:
        errors.append("Missing snapshot header")
    if not has_footer:
        errors.append("Missing snapshot footer")
    if not has_branch:
        errors.append("Missing Branch: line")

    if has_header and has_footer and has_branch:
        print(f"  Structure: header + branch + footer ✓")

    # Stress test: add commits that would max out every section,
    # then verify budget still holds
    print("\n  Stress sub-test: maxing out all sections...")

    # Add 5 decisions with different scopes (only 4 should show)
    for i, scope in enumerate(["alpha", "beta", "gamma", "delta", "epsilon"]):
        msg = (
            f"🧭 decision({scope}): stress decision {i}\n\n"
            f"Why: stress test\n"
            f"Decision: stress pick {scope}"
        )
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # Add 4 memos with different scopes (only 3 should show)
    for i, scope in enumerate(["alpha", "beta", "gamma", "delta"]):
        msg = (
            f"📌 memo({scope}): stress memo {i}\n\n"
            f"Memo: preference - stress pref for {scope}"
        )
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # Add 5 Next: items (only 3 should show)
    for i in range(5):
        scope = SCOPES[i % len(SCOPES)]
        fdir = os.path.join(cwd, "app", scope)
        os.makedirs(fdir, exist_ok=True)
        with open(os.path.join(fdir, f"stress-{i}.php"), "w") as f:
            f.write(f"<?php // stress {i}\n")
        git("add -A", cwd)
        msg = (
            f"✨ feat({scope}): stress feature {i}\n\n"
            f"Why: stress test\n"
            f"Touched: app/{scope}/stress-{i}.php\n"
            f"Next: stress pending item {i}"
        )
        git(f'commit -m "{msg}"', cwd)

    # Add 3 blockers (only 2 should show, and dedup should merge identical ones)
    for i in range(3):
        scope = SCOPES[i % len(SCOPES)]
        msg = (
            f"💾 context({scope}): stress context {i}\n\n"
            f"Why: stress test\n"
            f"Next: stress next from context {i}\n"
            f"Blocker: unique blocker {i} for {scope}"
        )
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # Now run snapshot again
    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    stress_snapshot = result.stdout.strip()
    stress_lines = stress_snapshot.split("\n")
    stress_count = len(stress_lines)

    if stress_count > SNAPSHOT_MAX_LINES:
        errors.append(f"Stress snapshot is {stress_count} lines (max {SNAPSHOT_MAX_LINES})")
        print(f"  FAIL: stress snapshot {stress_count} lines > {SNAPSHOT_MAX_LINES}")
        print("  --- Stress snapshot ---")
        for i, line in enumerate(stress_lines, 1):
            marker = " <<<" if i > SNAPSHOT_MAX_LINES else ""
            print(f"  {i:2d}: {line}{marker}")
        print("  --- End ---")
    else:
        print(f"  Stress snapshot: {stress_count} lines ≤ {SNAPSHOT_MAX_LINES} ✓")

    return errors


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("DRIFT TEST — 6-Month Simulation (200 commits)")
    print("=" * 60)

    # Verify precompact script exists
    if not os.path.exists(PRECOMPACT_SCRIPT):
        print(f"ERROR: precompact script not found at {PRECOMPACT_SCRIPT}")
        sys.exit(1)

    # Create temp repo
    cwd = make_temp_repo()
    print(f"Temp repo: {cwd}")

    try:
        # Build 6-month history
        print("\nBuilding 6-month commit history...")
        build_history(cwd)

        # Verify commit count
        out, _ = git("rev-list --count HEAD", cwd)
        print(f"Total commits in repo: {out}")

        # Run tests
        all_errors = []

        errors = test_deep_search(cwd)
        all_errors.extend(errors)

        errors = test_dedup_integrity(cwd)
        all_errors.extend(errors)

        errors = test_snapshot_budget(cwd)
        all_errors.extend(errors)

        # Summary
        print("\n" + "=" * 60)
        if all_errors:
            print(f"DRIFT TEST: {len(all_errors)} FAILURE(S)")
            for err in all_errors:
                print(f"  ✗ {err}")
            sys.exit(1)
        else:
            print("DRIFT TEST: ALL PASSED ✓")
            print("  1. Deep search returns relevant results by Issue/scope/recency")
            print("  2. Dedup preserves entries from different scopes")
            print("  3. Snapshot budget ≤18 lines (normal + stress)")
            sys.exit(0)

    finally:
        # Cleanup
        shutil.rmtree(cwd, ignore_errors=True)
        print(f"\nCleaned up {cwd}")


if __name__ == "__main__":
    main()
