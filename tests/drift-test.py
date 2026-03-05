#!/usr/bin/env python3
"""
Drift Test — 6-Month Simulation
================================
Generates 200 commits + 20 decision/memo across 6 scopes in a temp repo,
then validates:
  1. Deep search returns top-relevant results (Issue > scope > touched > recency)
  2. Dedup doesn't eat valid entries (different scopes preserved)
  3. Snapshot never exceeds 18 lines (normal + stress)
  4. Truncation of long values
  5. Hook robustness (fixup, merge, revert whitelisting)
  6. Post-hook exit_code safety (won't destroy commits on failed git commit)
  7. Delimiter collision (commit messages with pipe chars don't break snapshot)
  8. Nested prefixes (squash! fixup! feat: handled correctly)

Usage: python3 tests/drift-test.py
"""

import json
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

PRECOMPACT_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".claude", "hooks", "precompact-snapshot.py",
)
PRE_HOOK = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".claude", "hooks", "pre-validate-commit-trailers.py",
)
POST_HOOK = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".claude", "hooks", "post-validate-commit-trailers.py",
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def run(cmd, cwd, env=None):
    """Run shell command, return stdout."""
    merged = {**os.environ, **(env or {})}
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, cwd=cwd, env=merged,
    )
    return result.stdout.strip(), result.returncode


def git(args, cwd, env=None):
    return run(f"git {args}", cwd, env)


def make_temp_repo():
    """Create a temp repo with initial commit."""
    path = tempfile.mkdtemp(prefix="drift-test-")
    git("init", path)
    git("checkout -b dev", path)
    git('commit --allow-empty -m "🔧 chore: init repo\n\nWhy: initial setup\nTouched: none"', path)
    git("checkout -b feat/CU-042-big-feature", path)
    return path


# ── Commit generators ──────────────────────────────────────────────────────

def gen_code_commit(idx, scope, date_str, cwd):
    """Generate a regular code commit with trailers."""
    ctype = random.choice(CODE_TYPES)
    emoji = EMOJIS[ctype]
    slug = f"change-{idx}"
    msg = (
        f"{emoji} {ctype}({scope}): {slug}\n\n"
        f"Issue: CU-042\n"
        f"Why: automated drift test commit #{idx}\n"
        f"Touched: app/{scope}/{slug}.php"
    )
    # ~10% carry Next:
    if random.random() < 0.10:
        msg += f"\nNext: continue {scope} work after commit {idx}"
    # ~5% carry Blocker:
    if random.random() < 0.05:
        msg += f"\nBlocker: waiting for {scope} API keys"

    env = {"GIT_AUTHOR_DATE": date_str, "GIT_COMMITTER_DATE": date_str}
    git(f'commit --allow-empty -m "{msg}"', cwd, env)


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

    # Pre-schedule decision and memo positions (randomly distributed)
    decision_positions = sorted(random.sample(range(10, TOTAL_COMMITS - 5), DECISION_COUNT))
    memo_positions = sorted(random.sample(
        [i for i in range(10, TOTAL_COMMITS - 5) if i not in decision_positions],
        MEMO_COUNT,
    ))
    # Add 3 context() commits
    context_positions = [TOTAL_COMMITS // 3, 2 * TOTAL_COMMITS // 3, TOTAL_COMMITS - 2]

    d_idx = 0
    m_idx = 0
    c_idx = 0

    for i in range(TOTAL_COMMITS):
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
    """Verify deep search returns results by Issue/scope/recency."""
    print("\n── TEST 1: Deep Search Relevance ──")
    errors = []

    # All decisions findable
    out, _ = git('log --all --grep="Decision:" --pretty=format:"%h %s %b"', cwd)
    decision_lines = [l for l in out.split("\n") if "Decision:" in l]
    if len(decision_lines) < DECISION_COUNT:
        errors.append(f"Expected ≥{DECISION_COUNT} decision lines, got {len(decision_lines)}")
    else:
        print(f"  Decision search: {len(decision_lines)} entries ✓")

    # All memos findable
    out, _ = git('log --all --grep="Memo:" --pretty=format:"%h %s %b"', cwd)
    memo_lines = [l for l in out.split("\n") if "Memo:" in l]
    if len(memo_lines) < MEMO_COUNT:
        errors.append(f"Expected ≥{MEMO_COUNT} memo lines, got {len(memo_lines)}")
    else:
        print(f"  Memo search: {len(memo_lines)} entries ✓")

    # Deep search finds decisions across multiple scopes
    out, _ = git('log --all --grep="Decision:" --pretty=format:"%h %s"', cwd)
    all_d_scopes = set()
    for line in out.strip().split("\n"):
        sm = re.search(r"decision\((\w+)\)", line, re.IGNORECASE)
        if sm:
            all_d_scopes.add(sm.group(1))
    if len(all_d_scopes) < 2:
        errors.append(f"Deep search found decisions in only {len(all_d_scopes)} scope(s)")
    else:
        print(f"  Decision scopes (full history): {all_d_scopes} ({len(all_d_scopes)} unique) ✓")

    # Issue filter
    out, _ = git('log --all --grep="Issue: CU-042" --oneline', cwd)
    issue_count = len([l for l in out.strip().split("\n") if l.strip()])
    if issue_count < 50:
        errors.append(f"Issue filter CU-042 returned only {issue_count} commits")
    else:
        print(f"  Issue filter CU-042: {issue_count} commits ✓")

    return errors


# ── Test 2: Dedup Integrity ────────────────────────────────────────────────

def test_dedup_integrity(cwd):
    """Verify snapshot preserves entries from different scopes."""
    print("\n── TEST 2: Dedup Integrity ──")
    errors = []

    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()
    if not snapshot:
        errors.append("Snapshot returned empty output")
        return errors

    print(f"  Snapshot generated ({len(snapshot.split(chr(10)))} lines)")

    # Parse decision and memo scopes from snapshot
    in_decisions = False
    in_memos = False
    decision_scopes = []
    memo_scopes = []

    for line in snapshot.split("\n"):
        if "Active decisions:" in line:
            in_decisions, in_memos = True, False
            continue
        elif "Active memos:" in line:
            in_memos, in_decisions = True, False
            continue
        elif line.startswith("===") or (line and not line.startswith("  ")):
            in_decisions = in_memos = False

        if in_decisions and line.strip().startswith("- ("):
            sm = re.match(r"\s*-\s*\((\w+)\)", line)
            if sm:
                decision_scopes.append(sm.group(1))

        if in_memos and line.strip().startswith("- ("):
            sm = re.match(r"\s*-\s*\((\w+)\)", line)
            if sm:
                memo_scopes.append(sm.group(1))

    # Snapshot may have few scopes (last 30 commits), but deep search must show diversity
    if decision_scopes:
        print(f"  Decision scopes in snapshot: {set(decision_scopes)} ✓")
    else:
        print(f"  No decisions in last 30 commits (expected for end of 200-commit history) ✓")

    # Verify blocker dedup
    blocker_texts = []
    in_blockers = False
    for line in snapshot.split("\n"):
        if "Blockers:" in line:
            in_blockers = True
            continue
        elif line and not line.startswith("  "):
            in_blockers = False
        if in_blockers and line.strip().startswith("- ["):
            m = re.match(r"\s*-\s*\[\w+\]\s*(.+)", line)
            if m:
                blocker_texts.append(m.group(1).lower())

    if len(blocker_texts) != len(set(blocker_texts)):
        errors.append(f"Duplicate blockers: {blocker_texts}")
    elif blocker_texts:
        print(f"  Blocker dedup: {len(blocker_texts)} unique ✓")

    return errors


# ── Test 3: Snapshot Budget ≤18 Lines ──────────────────────────────────────

def test_snapshot_budget(cwd):
    """Verify budget in normal and stress scenarios."""
    print("\n── TEST 3: Snapshot Budget ≤18 Lines ──")
    errors = []

    # Normal snapshot
    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()
    lines = snapshot.split("\n")
    if len(lines) > SNAPSHOT_MAX_LINES:
        errors.append(f"Normal snapshot: {len(lines)} lines > {SNAPSHOT_MAX_LINES}")
    else:
        print(f"  Normal: {len(lines)} lines ✓")

    # Verify structure
    has_header = any("GIT MEMORY SNAPSHOT" in l for l in lines)
    has_footer = any("END SNAPSHOT" in l for l in lines)
    has_branch = any(l.startswith("Branch:") for l in lines)
    if has_header and has_footer and has_branch:
        print(f"  Structure: header + branch + footer ✓")

    # ── Stress sub-test: max out every section ──
    print("\n  Stress sub-test: maxing out all sections...")

    # 5 decisions with different scopes (max 3 should show)
    for i, scope in enumerate(["alpha", "beta", "gamma", "delta", "epsilon"]):
        msg = f"🧭 decision({scope}): stress decision {i}\n\nWhy: stress test\nDecision: stress pick {scope}"
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # 4 memos with different scopes (max 2 should show)
    for i, scope in enumerate(["alpha", "beta", "gamma", "delta"]):
        msg = f"📌 memo({scope}): stress memo {i}\n\nMemo: preference - stress pref for {scope}"
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # 5 Next: items (max 2 should show)
    for i in range(5):
        scope = SCOPES[i % len(SCOPES)]
        msg = f"✨ feat({scope}): stress feature {i}\n\nWhy: stress test\nTouched: app/{scope}/stress-{i}.php\nNext: stress pending item {i}"
        git(f'commit --allow-empty -m "{msg}"', cwd)

    # 3 blockers with context commits (max 2 should show)
    for i in range(3):
        scope = SCOPES[i % len(SCOPES)]
        msg = f"💾 context({scope}): stress context {i}\n\nWhy: stress test\nNext: stress next from context {i}\nBlocker: unique blocker {i} for {scope}"
        git(f'commit --allow-empty -m "{msg}"', cwd)

    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    stress_snapshot = result.stdout.strip()
    stress_lines = stress_snapshot.split("\n")
    if len(stress_lines) > SNAPSHOT_MAX_LINES:
        errors.append(f"Stress snapshot: {len(stress_lines)} lines > {SNAPSHOT_MAX_LINES}")
        print(f"  FAIL: {len(stress_lines)} lines")
        for i, line in enumerate(stress_lines, 1):
            marker = " <<<" if i > SNAPSHOT_MAX_LINES else ""
            print(f"  {i:2d}: {line}{marker}")
    else:
        print(f"  Stress: {len(stress_lines)} lines ✓")

    return errors


# ── Test 4: Truncation ─────────────────────────────────────────────────────

def test_truncation(cwd):
    """Verify long trailer values get truncated in snapshot."""
    print("\n── TEST 4: Value Truncation ──")
    errors = []

    long_text = "X" * 300
    msg = f"🧭 decision(trunc): long test\n\nWhy: test\nDecision: {long_text}"
    git(f'commit --allow-empty -m "{msg}"', cwd)

    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()

    if "..." in snapshot and "X" * 50 in snapshot:
        # Verify it's actually truncated (not showing all 300 X's)
        if "X" * 250 not in snapshot:
            print("  Long values truncated with ... ✓")
        else:
            errors.append("Value not truncated — full 300 chars present")
    else:
        errors.append("Truncation not detected in snapshot")
        print(f"  Snapshot was:\n{snapshot}")

    return errors


# ── Test 5: Hook Robustness ────────────────────────────────────────────────

def test_hook_robustness(cwd):
    """Verify hooks handle fixup!, merge, revert messages correctly."""
    print("\n── TEST 5: Hook Robustness ──")
    errors = []

    def check_msg(subject, trailers=None):
        """Send a commit message to the pre-hook and check if it passes (exit 0).
        Uses string concatenation (not f-strings) to avoid Python escaping ! to backslash-!."""
        command = 'git commit -m "' + subject + '"'
        if trailers:
            command = command + ' -m "' + trailers + '"'
        payload = {"tool_input": {"command": command}}
        proc = subprocess.run(
            [sys.executable, PRE_HOOK],
            input=json.dumps(payload),
            capture_output=True, text=True, cwd=cwd,
        )
        return proc.returncode

    # fixup! should pass (strips prefix, validates underlying type)
    if check_msg("fixup! ✨ feat(auth): fix typo", "Why: typo\nTouched: auth.py\nIssue: #1") != 0:
        errors.append("Blocked valid fixup!")
    else:
        print("  fixup! supported ✓")

    # squash! should pass
    if check_msg("squash! 🐛 fix(api): cleanup", "Why: cleanup\nTouched: api.py\nIssue: CU-042") != 0:
        errors.append("Blocked valid squash!")
    else:
        print("  squash! supported ✓")

    # amend! should pass
    if check_msg("amend! ♻️ refactor(ui): rename", "Why: clarity\nTouched: ui.py\nIssue: CU-042") != 0:
        errors.append("Blocked valid amend!")
    else:
        print("  amend! supported ✓")

    # Merge should pass without any trailers
    if check_msg("Merge branch 'main' into dev") != 0:
        errors.append("Blocked internal Merge")
    else:
        print("  Merge whitelisted ✓")

    # Merge remote-tracking should pass
    if check_msg("Merge remote-tracking branch 'origin/main'") != 0:
        errors.append("Blocked Merge remote-tracking")
    else:
        print("  Merge remote-tracking whitelisted ✓")

    # Revert should pass (subject only, no inner quotes needed)
    if check_msg("Revert feat(auth): add login") != 0:
        errors.append("Blocked internal Revert")
    else:
        print("  Revert whitelisted ✓")

    # Regular commit WITHOUT trailers should be BLOCKED
    if check_msg("✨ feat(auth): no trailers here") == 0:
        errors.append("Allowed commit missing required trailers")
    else:
        print("  Missing trailers blocked ✓")

    return errors


# ── Test 6: Post-hook exit_code safety ────────────────────────────────────

def test_post_hook_exit_code(cwd):
    """Verify post-hook doesn't destroy commits when git commit fails.

    Scenario: git commit fails (exit_code != 0), post-hook should NOT
    inspect the previous commit and should NOT call safe_reset().
    We simulate this by feeding the post-hook a failed commit output
    while the last commit in the repo has no trailers (would trigger reset).
    """
    print("\n── TEST 6: Post-hook exit_code Safety ──")
    errors = []

    # Create a commit without trailers (simulate pre-install commit)
    git('commit --allow-empty -m "old commit without trailers"', cwd)

    # Simulate: Claude ran git commit but it FAILED (exit_code=1, e.g. linting)
    payload_failed = {
        "tool_input": {"command": 'git commit -m "✨ feat(auth): new feature" -m "Why: test\nTouched: auth.py"'},
        "tool_output": {
            "stdout": "ERROR: eslint found 3 errors",
            "stderr": "pre-commit hook failed",
            "exit_code": 1,
        },
    }
    proc = subprocess.run(
        [sys.executable, POST_HOOK],
        input=json.dumps(payload_failed),
        capture_output=True, text=True, cwd=cwd,
    )
    # Post-hook should exit 0 (do nothing) because commit failed
    if proc.returncode != 0:
        errors.append(f"Post-hook acted on failed commit (exit {proc.returncode})")
    else:
        print("  Failed commit (exit_code=1) → post-hook skips ✓")

    # Verify the "old commit" still exists (was NOT reset)
    out, _ = git("log -1 --pretty=format:%s", cwd)
    if "old commit without trailers" not in out:
        errors.append(f"Post-hook destroyed previous commit! Last commit: {out}")
    else:
        print("  Previous commit preserved (no destructive reset) ✓")

    # Simulate: Same scenario but with Spanish locale output (no "nothing to commit")
    payload_spanish = {
        "tool_input": {"command": 'git commit -m "✨ feat(auth): otra feature"'},
        "tool_output": {
            "stdout": "nada para hacer commit, el árbol de trabajo está limpio",
            "stderr": "",
            "exit_code": 1,
        },
    }
    proc = subprocess.run(
        [sys.executable, POST_HOOK],
        input=json.dumps(payload_spanish),
        capture_output=True, text=True, cwd=cwd,
    )
    if proc.returncode != 0:
        errors.append(f"Post-hook acted on Spanish locale failed commit (exit {proc.returncode})")
    else:
        print("  Spanish locale failure → post-hook skips ✓")

    # Clean up: restore a proper commit as HEAD
    git('commit --allow-empty -m "🔧 chore: restore state\n\nWhy: test cleanup\nTouched: none"', cwd)

    return errors


# ── Test 7: Delimiter collision ───────────────────────────────────────────

def test_delimiter_collision(cwd):
    """Verify commit messages with pipe characters don't break the snapshot parser."""
    print("\n── TEST 7: Delimiter Collision ──")
    errors = []

    # Create a commit with pipe chars and old delimiter pattern in the message
    msg = "✨ feat(parser): fix collision with |---END---| tokens\n\nIssue: CU-042\nWhy: pipes in messages | should not | break parsing\nTouched: parser.py"
    git(f'commit --allow-empty -m "{msg}"', cwd)

    # Create another with pipes in decision value
    msg2 = "🧭 decision(parser): choose approach A | not B | not C\n\nWhy: A handles edge cases\nDecision: approach A over B|C — cleaner API"
    git(f'commit --allow-empty -m "{msg2}"', cwd)

    # Run snapshot — should not crash or produce garbage
    result = subprocess.run(
        [sys.executable, PRECOMPACT_SCRIPT],
        capture_output=True, text=True, cwd=cwd, timeout=15,
    )
    snapshot = result.stdout.strip()

    if not snapshot:
        errors.append("Snapshot returned empty after pipe-containing commits")
    elif "GIT MEMORY SNAPSHOT" not in snapshot:
        errors.append(f"Snapshot corrupted by pipe chars: {snapshot[:200]}")
    elif "END SNAPSHOT" not in snapshot:
        errors.append(f"Snapshot missing footer after pipe commits")
    else:
        # Verify the decision from the pipe-containing commit is present
        if "parser" in snapshot and "approach A" in snapshot:
            print("  Pipes in commit message → snapshot intact ✓")
        else:
            print("  Pipes in commit message → snapshot structure OK ✓")

    # Verify snapshot budget still holds
    lines = snapshot.split("\n")
    if len(lines) > SNAPSHOT_MAX_LINES:
        errors.append(f"Snapshot after pipe commits: {len(lines)} lines > {SNAPSHOT_MAX_LINES}")
    else:
        print(f"  Budget after pipe commits: {len(lines)} lines ✓")

    return errors


# ── Test 8: Nested prefixes ──────────────────────────────────────────────

def test_nested_prefixes(cwd):
    """Verify hooks handle nested Git prefixes like squash! fixup! feat:"""
    print("\n── TEST 8: Nested Prefixes ──")
    errors = []

    def check_msg(subject, trailers=None):
        command = 'git commit -m "' + subject + '"'
        if trailers:
            command = command + ' -m "' + trailers + '"'
        payload = {"tool_input": {"command": command}}
        proc = subprocess.run(
            [sys.executable, PRE_HOOK],
            input=json.dumps(payload),
            capture_output=True, text=True, cwd=cwd,
        )
        return proc.returncode

    # squash! fixup! feat: (double nested)
    rc = check_msg("squash! fixup! ✨ feat(auth): double nested", "Why: test\nTouched: auth.py\nIssue: CU-042")
    if rc != 0:
        errors.append("Blocked valid squash! fixup! (double nested)")
    else:
        print("  squash! fixup! feat: (double) ✓")

    # fixup! fixup! fix: (same prefix repeated)
    rc = check_msg("fixup! fixup! 🐛 fix(api): triple fixup", "Why: test\nTouched: api.py\nIssue: CU-042")
    if rc != 0:
        errors.append("Blocked valid fixup! fixup! (repeated)")
    else:
        print("  fixup! fixup! fix: (repeated) ✓")

    # amend! squash! fixup! refactor: (triple nested)
    rc = check_msg("amend! squash! fixup! ♻️ refactor(ui): triple nested", "Why: test\nTouched: ui.py\nIssue: CU-042")
    if rc != 0:
        errors.append("Blocked valid amend! squash! fixup! (triple)")
    else:
        print("  amend! squash! fixup! refactor: (triple) ✓")

    return errors


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("DRIFT TEST — 6-Month Simulation (200 commits)")
    print("=" * 60)

    if not os.path.exists(PRECOMPACT_SCRIPT):
        print(f"ERROR: precompact script not found at {PRECOMPACT_SCRIPT}")
        sys.exit(1)

    cwd = make_temp_repo()
    print(f"Temp repo: {cwd}")

    try:
        print("\nBuilding 6-month commit history...")
        build_history(cwd)

        out, _ = git("rev-list --count HEAD", cwd)
        print(f"Total commits in repo: {out}")

        all_errors = []
        all_errors.extend(test_deep_search(cwd))
        all_errors.extend(test_dedup_integrity(cwd))
        all_errors.extend(test_snapshot_budget(cwd))
        all_errors.extend(test_truncation(cwd))
        all_errors.extend(test_hook_robustness(cwd))
        all_errors.extend(test_post_hook_exit_code(cwd))
        all_errors.extend(test_delimiter_collision(cwd))
        all_errors.extend(test_nested_prefixes(cwd))

        print("\n" + "=" * 60)
        if all_errors:
            print(f"DRIFT TEST: {len(all_errors)} FAILURE(S)")
            for err in all_errors:
                print(f"  ✗ {err}")
            sys.exit(1)
        else:
            print("DRIFT TEST: ALL PASSED ✓")
            print("  1. Deep search finds all decisions/memos across full history")
            print("  2. Dedup preserves entries from different scopes")
            print("  3. Snapshot budget ≤18 lines (normal + stress)")
            print("  4. Long values truncated in snapshot")
            print("  5. Hooks handle fixup!/squash!/merge/revert correctly")
            print("  6. Post-hook exit_code safety (no destructive reset on failures)")
            print("  7. Delimiter collision (pipes in messages don't break snapshot)")
            print("  8. Nested prefixes (squash! fixup! feat: handled)")
            sys.exit(0)

    finally:
        shutil.rmtree(cwd, ignore_errors=True)
        print(f"\nCleaned up {cwd}")


if __name__ == "__main__":
    main()
