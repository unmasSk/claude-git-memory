# Boot Briefing v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the boot system so Claude receives a complete, structured briefing from the SessionStart hook with zero redundant bash calls — from 3 tool calls to 1.

**Architecture:** The SessionStart hook does all extraction (fetch, doctor, memory, glossary, branch-awareness, time-ago, version check). The UserPromptSubmit hook stops telling Claude to run doctor/log. Claude only loads the skill and reads what's already in context.

**Tech Stack:** Python 3.10+, git CLI, gh CLI (optional, for issues)

---

## Chunk 0: Preparation — shared trailer scanning in `lib/parsing.py`

Before touching boot output, extract duplicated trailer scanning into the shared library. This unblocks all subsequent chunks.

### 0.1 Add `scan_trailers_memory()` to `lib/parsing.py`

- [ ] **0.1.1** Open `C:\Users\fix.workshop\claude-git-memory\lib\parsing.py` (line 7). Add import for `MEMORY_KEYS` set from constants or define inline. Add this function after `parse_trailers_full()` (after line 104):

```python
# Memory-relevant trailer keys (used by scan_trailers_memory)
MEMORY_KEYS = {"Decision", "Memo", "Next", "Blocker", "Remember", "Resolved-Next", "Stale-Blocker"}

def scan_trailers_memory(body: str) -> dict[str, str]:
    """Scan entire body for memory-relevant trailers (full-body, not bottom-up).

    Unlike parse_trailers() which stops at the first non-trailer line
    from the bottom, this scans all lines. Needed because Co-Authored-By
    at the end breaks bottom-up parsing.

    Returns first occurrence of each memory key found.
    """
    found: dict[str, str] = {}
    for line in body.splitlines():
        match = re.match(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$", line.strip())
        if match:
            key, value = match.group(1), match.group(2).strip()
            if key in MEMORY_KEYS and key not in found:
                found[key] = value
    return found
```

- [ ] **0.1.2** Add `MEMORY_KEYS` to `C:\Users\fix.workshop\claude-git-memory\lib\constants.py` (after line 14):

```python
# Memory-relevant trailer keys for scan_trailers_memory
MEMORY_KEYS: set[str] = {
    "Decision", "Memo", "Next", "Blocker", "Remember",
    "Resolved-Next", "Stale-Blocker",
}
```

- [ ] **0.1.3** Update the import in `lib/parsing.py` (line 3) to also import `MEMORY_KEYS`:

```python
from constants import VALID_KEYS, MEMORY_KEYS
```

### 0.2 Replace duplicated `scan_trailers` in `session-start-boot.py`

- [ ] **0.2.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`. Add shared lib path setup at line 17 (before the MEMORY_KEYS definition):

```python
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib"))
```

- [ ] **0.2.2** Remove the local `MEMORY_KEYS`, `TRAILER_RE`, and `scan_trailers()` definitions (lines 21-39). Replace with:

```python
from parsing import scan_trailers_memory as scan_trailers, normalize
```

- [ ] **0.2.3** Remove the local `normalize()` function (lines 42-44) — it's now imported from `parsing.py`.

### 0.3 Replace duplicated trailer scanning in `precompact-snapshot.py`

- [ ] **0.3.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\precompact-snapshot.py`. Add the shared lib path setup and import at the top of the file (near existing imports), NOT inside a function:

```python
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib"))
from parsing import scan_trailers_memory
```

Then replace the inline regex-based trailer extraction (lines 96-151) in `extract_memory_from_log()` with:

```python
        # Extract trailers from body using shared parser
        trailers = scan_trailers_memory(body)

        if "Next" in trailers:
            next_text = trailers["Next"]
            if normalize(next_text) not in tombstones:
                memory["pending"].append({
                    "sha": sha, "subject": subject, "next": next_text,
                })

        if "Blocker" in trailers:
            blocker_text = trailers["Blocker"]
            if normalize(blocker_text) not in tombstones:
                existing = [b["blocker"].lower() for b in memory["blockers"]]
                if blocker_text.lower() not in existing:
                    memory["blockers"].append({
                        "sha": sha, "blocker": blocker_text,
                    })

        if "Decision" in trailers:
            if scope not in memory["decisions"]:
                memory["decisions"][scope] = {
                    "sha": sha, "subject": subject,
                    "decision": trailers["Decision"],
                }

        if "Memo" in trailers:
            if scope not in memory["memos"]:
                memory["memos"][scope] = {
                    "sha": sha, "memo": trailers["Memo"],
                }

        if "Remember" in trailers:
            text = trailers["Remember"]
            if "remembers" not in memory:
                memory["remembers"] = {}
            if text.lower() not in {r["remember"].lower() for r in memory.get("remembers", {}).values()}:
                memory["remembers"][f"{scope}:{text[:20]}"] = {
                    "sha": sha, "remember": text,
                }
```

- [ ] **0.3.2** Also refactor the tombstone extraction (lines 57-67) to use `scan_trailers_memory`:

```python
    for commit in commits:
        parts = commit.strip().split("\x1f", 2)
        if len(parts) < 3:
            continue
        body = parts[2].strip()
        trailers = scan_trailers_memory(body)
        for key in ("Resolved-Next", "Stale-Blocker"):
            if key in trailers:
                tombstones.add(normalize(trailers[key]))
```

### 0.4 Fix precompact hook: use commit wrapper instead of raw `git commit`

- [ ] **0.4.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\precompact-snapshot.py`. Lines 266-276 tell Claude to use raw `git commit --allow-empty`. Replace with the wrapper script reference:

```python
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    commit_script = os.path.join(plugin_root, "bin", "git-memory-commit.py")
    print(
        "CRITICAL — CONTEXT CHECKPOINT REQUIRED: "
        "Your context was just compacted. "
        "IMMEDIATELY create a context() commit capturing what you worked on this session. "
        f'Use: python3 "{commit_script}" context <scope> "<summary>" '
        '--trailer "Next=<what to do next>" '
        '--trailer "Decision=<any decisions made>" '
        '--trailer "Memo=<any preferences or patterns learned>" '
        '--trailer "Blocker=<any blockers>" '
        "Include ALL relevant trailers. This is how the next session picks up your work. "
        "Do this BEFORE responding to the user."
    )
```

### 0.5 Fix stop hook: use commit wrapper instead of raw `git commit`

- [ ] **0.5.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\stop-dod-check.py`. Lines 207-209 tell Claude to use raw `git add -A && git commit`. Replace with:

```python
        plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        commit_script = os.path.join(plugin_root, "bin", "git-memory-commit.py")
        msg = f"\n[auto-wip] Uncommitted changes detected:\n{changes}\n"
        msg += f'Create a wip commit NOW: git add -A && python3 "{commit_script}" wip auto "<brief description of changes>"\n'
        msg += "Do this silently — do NOT ask the user."
```

### 0.6 Test shared parsing

- [ ] **0.6.1** Run existing tests to confirm nothing broke:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/ -v --tb=short 2>&1 | head -80
```

All existing tests should pass. No new tests needed yet — the refactor is behavior-preserving.

- [ ] **0.6.2** Commit:

```
♻️ refactor(lib/parsing): extract shared scan_trailers_memory, fix hook wrappers

Why: trailer scanning was duplicated in session-start-boot.py and precompact-snapshot.py
Touched: lib/parsing.py, lib/constants.py, hooks/session-start-boot.py, hooks/precompact-snapshot.py, hooks/stop-dod-check.py
```

---

## Chunk 1: Branch-awareness helpers

Add the branch parsing and time-ago functions that the new boot output needs.

### 1.1 Add branch parsing to `session-start-boot.py`

- [ ] **1.1.1** Add these helper functions after the imports in `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`:

```python
import re
from datetime import datetime, timezone

def parse_branch_keywords(branch: str) -> tuple[list[str], str | None]:
    """Extract keywords and issue number from branch name.

    'feat/issue-42-auth-refactor' → (['auth', 'refactor', '42'], '#42')
    'main' → ([], None)
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

    '2026-03-13T08:00:00+00:00' → '2h ago'
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
```

- [ ] **1.1.2** Commit:

```
✨ feat(hooks/boot): add branch-awareness helpers — parse_branch_keywords, time_ago, score_branch_relevance

Why: boot briefing v2 needs branch-scoped prioritization and temporal context
Touched: hooks/session-start-boot.py
```

---

## Chunk 2: Glossary caching

### 2.1 Implement glossary cache read/write

- [ ] **2.1.1** Add these functions to `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`, after the `extract_glossary()` function (after line 265):

```python
import time as _time

GLOSSARY_CACHE_TTL = 86400  # 24 hours

def _glossary_cache_path() -> str | None:
    """Return path to .claude/.glossary-cache.json, or None if no project root."""
    code, root = run_git(["rev-parse", "--show-toplevel"])
    if code != 0 or not root:
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
```

- [ ] **2.1.2** In the `main()` function, replace the call to `extract_glossary()` (line 416) with `extract_glossary_cached()`.

- [ ] **2.1.3** Commit:

```
⚡ perf(hooks/boot): add glossary caching — .claude/.glossary-cache.json with 24h TTL + HEAD match

Why: full-history git log --all is expensive on large repos, cache avoids redundant scans
Touched: hooks/session-start-boot.py
```

---

## Chunk 3: Version check helper

### 3.1 Add version comparison

- [ ] **3.1.1** Add this constant and function to `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`, near the top after imports:

```python
# Current plugin version — must match bin/git-memory-install.py VERSION
PLUGIN_VERSION = "3.6.0"

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
```

- [ ] **3.1.2** Commit:

```
✨ feat(hooks/boot): add version check — compare manifest vs plugin VERSION

Why: users should know when a newer plugin version is available
Touched: hooks/session-start-boot.py
```

---

## Chunk 4: Restructure boot output — the main change

### 4.1 Write test first (TDD)

- [ ] **4.1.1** Create a new test file `C:\Users\fix.workshop\claude-git-memory\tests\test_boot_output.py`:

```python
"""
Tests for the structured boot briefing v2 output.

Validates section ordering, branch-awareness, scaling limits,
and the BOOT COMPLETE terminator.
"""

import json
import os
import re
import subprocess
import sys

import pytest

from conftest import (
    SOURCE_ROOT, HOOKS_DIR, INSTALL,
    run_cmd, git_cmd, write_file, run_script,
)

BOOT_HOOK = os.path.join(HOOKS_DIR, "session-start-boot.py")


def make_repo_with_memory(tmp_path, name="repo"):
    """Create a repo with install + some memory commits."""
    repo = str(tmp_path / name)
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
    run_script(INSTALL, repo, ["--auto"])

    # Add memory commits
    git_cmd(["commit", "--allow-empty", "-m",
             "🧭 decision(auth): use JWT\n\nDecision: JWT over sessions\nWhy: stateless API"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "📌 memo(api): preference - async/await\n\nMemo: preference - async/await everywhere"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "🧠 remember(user): prefers Spanish\n\nRemember: user - prefiere respuestas en español"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "💾 context(auth): pause JWT implementation\n\nWhy: switching to urgent bugfix\nNext: finish JWT refresh token flow"], repo)
    return repo


def run_boot(repo):
    """Run the session-start-boot hook and return stdout."""
    rc, stdout, stderr = run_cmd([sys.executable, BOOT_HOOK], repo)
    return stdout


class TestBootSections:
    """Boot output has all required sections in correct order."""

    def test_has_status_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "STATUS:" in output

    def test_has_branch_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "BRANCH:" in output

    def test_has_resume_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "RESUME:" in output

    def test_has_remember_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "REMEMBER:" in output

    def test_has_decisions_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "DECISIONS:" in output

    def test_has_timeline_section(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "TIMELINE" in output

    def test_has_boot_complete_terminator(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "BOOT COMPLETE" in output
        assert "Do NOT run doctor or git-memory-log" in output

    def test_has_script_paths_in_terminator(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "git-memory-commit.py" in output
        assert "git-memory-log.py" in output

    def test_section_order(self, tmp_path):
        """Sections appear in the designed order: STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, TIMELINE, BOOT COMPLETE."""
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        positions = []
        for marker in ["STATUS:", "BRANCH:", "RESUME:", "REMEMBER:", "DECISIONS:", "TIMELINE", "BOOT COMPLETE"]:
            pos = output.find(marker)
            assert pos != -1, f"Missing section: {marker}"
            positions.append(pos)
        assert positions == sorted(positions), f"Sections out of order: {positions}"

    def test_header_has_version(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "[git-memory-boot]" in output
        # Version should be in the first line
        first_line = output.split("\n")[0]
        assert re.search(r"v\d+\.\d+\.\d+", first_line)

    def test_resume_shows_next(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "finish JWT refresh token flow" in output

    def test_resume_shows_last_context(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        assert "pause JWT implementation" in output


class TestBootTimeAgo:
    """Boot shows time since last session."""

    def test_last_commit_has_time_ago(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        # The RESUME section should show a time-ago like "Xm ago" or "just now"
        assert re.search(r"\d+[mhdw] ago|just now", output)


class TestBootBranchAwareness:
    """Branch-scoped items appear first in their sections."""

    def test_branch_scoped_next_first(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        # Create a branch with auth keyword
        git_cmd(["checkout", "-b", "feat/issue-42-auth-refactor"], repo)
        git_cmd(["commit", "--allow-empty", "-m",
                 "💾 context(api): pause API work\n\nWhy: context switch\nNext: add rate limiting to API"], repo)
        output = run_boot(repo)
        # The auth-related Next should appear BEFORE the API Next
        # because branch name contains "auth"
        auth_pos = output.find("JWT refresh token")
        api_pos = output.find("rate limiting")
        # Both should exist
        assert auth_pos != -1, "Branch-matching 'JWT refresh token' item missing from output"
        assert api_pos != -1, "Non-matching 'rate limiting' item missing from output"
        # Branch-matching items must appear before non-matching items
        assert auth_pos < api_pos, (
            f"Branch-matching item should appear before non-matching item: "
            f"auth_pos={auth_pos}, api_pos={api_pos}"
        )


class TestBootEmpty:
    """Boot handles empty repos gracefully."""

    def test_empty_repo(self, tmp_path):
        repo = str(tmp_path / "empty")
        os.makedirs(repo)
        git_cmd(["init"], repo)
        git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
        output = run_boot(repo)
        assert "BOOT COMPLETE" in output
        assert "STATUS:" in output


class TestGlossaryCache:
    """Glossary caching creates, reads, and invalidates correctly."""

    def test_cache_created_on_first_boot(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)
        cache_path = os.path.join(repo, ".claude", ".glossary-cache.json")
        assert os.path.isfile(cache_path), "Glossary cache file should be created on first boot"
        with open(cache_path) as f:
            cache = json.load(f)
        assert "head_sha" in cache
        assert "generated_at" in cache

    def test_cache_invalidated_on_head_change(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)  # creates cache
        cache_path = os.path.join(repo, ".claude", ".glossary-cache.json")
        with open(cache_path) as f:
            cache_before = json.load(f)
        # Make a new commit to change HEAD
        git_cmd(["commit", "--allow-empty", "-m", "🧭 decision(db): use postgres\n\nDecision: postgres over mysql"], repo)
        run_boot(repo)  # should regenerate cache
        with open(cache_path) as f:
            cache_after = json.load(f)
        assert cache_before["head_sha"] != cache_after["head_sha"]

    def test_cache_invalidated_on_ttl_expiry(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        run_boot(repo)  # creates cache
        cache_path = os.path.join(repo, ".claude", ".glossary-cache.json")
        # Backdate the generated_at to simulate TTL expiry
        with open(cache_path) as f:
            cache = json.load(f)
        from datetime import timedelta
        old_time = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
        cache["generated_at"] = old_time
        with open(cache_path, "w") as f:
            json.dump(cache, f)
        run_boot(repo)  # should regenerate
        with open(cache_path) as f:
            refreshed = json.load(f)
        # generated_at should be recent, not the backdated time
        assert refreshed["generated_at"] != old_time


class TestVersionCheck:
    """Version mismatch detection works correctly."""

    def test_no_warning_when_versions_match(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        output = run_boot(repo)
        # STATUS should be ok with no version warning
        assert "Plugin v" not in output or "available" not in output

    def test_warning_when_versions_mismatch(self, tmp_path):
        repo = make_repo_with_memory(tmp_path)
        # Tamper the manifest to have an old version
        manifest_path = os.path.join(repo, ".claude", "git-memory-manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        manifest["version"] = "1.0.0"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f)
        output = run_boot(repo)
        assert "Plugin v" in output
        assert "installed: v1.0.0" in output
```

- [ ] **4.1.2** Run the test — it should fail since the boot output doesn't have sections yet:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/test_boot_output.py -v --tb=short 2>&1 | head -60
```

- [ ] **4.1.3** Commit the test:

```
🧪 test(boot): add test_boot_output.py — TDD tests for structured boot briefing v2

Why: define expected output format before implementation
Touched: tests/test_boot_output.py
```

### 4.2 Update `extract_memory()` limits for boot v2

The current limits (lines 48-51) are too restrictive for the new boot output design:

- [ ] **4.2.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`. Update the constants at lines 48-51:

```python
MAX_PENDING = 10
MAX_BLOCKERS = 20
MAX_DECISIONS = 20
MAX_MEMOS = 10
```

- [ ] **4.2.2** Update the corresponding limit checks in `extract_memory()`:
  - Line 156: `if "Next" in trailers and len(pending) < MAX_PENDING:` (already uses the constant — no change needed, just verify)
  - Line 168: `if "Decision" in trailers and len(decisions) < MAX_DECISIONS:` (same)
  - Line 178: `if "Memo" in trailers and len(memos) < MAX_MEMOS:` (same)
  - Line 162: `if "Blocker" in trailers and len(blockers) < MAX_BLOCKERS:` (same)

Since all four checks already reference the constants, updating the constants above is sufficient. Verify no hardcoded numbers bypass these constants.

### 4.3 Rewrite `main()` in `session-start-boot.py`

- [ ] **4.3.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`. Replace the entire `main()` function (lines 331-455) with the new structured output. The new `main()`:

```python
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

    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lines: list[str] = []

    # 0. Clean session-booted flag (new session = fresh boot)
    code_root, project_root = run_git(["rev-parse", "--show-toplevel"])
    if code_root == 0 and project_root:
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
    commit_script = os.path.join(plugin_root, "bin", "git-memory-commit.py")
    log_script = os.path.join(plugin_root, "bin", "git-memory-log.py")
    lines.append("---")
    lines.append("BOOT COMPLETE. Do NOT run doctor or git-memory-log. All context is above.")
    lines.append(f'Commit: python3 "{commit_script}"')
    lines.append(f'Log: python3 "{log_script}"')

    print("\n".join(lines))
    sys.exit(0)
```

- [ ] **4.3.2** Run the boot output tests:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/test_boot_output.py -v --tb=short
```

All tests should pass now.

- [ ] **4.3.3** Run full test suite to check for regressions:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/ -v --tb=short
```

- [ ] **4.3.4** Commit:

```
✨ feat(hooks/boot): restructure boot output — sectioned format with STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, MEMOS, TIMELINE, BOOT COMPLETE

Why: eliminates 2 redundant tool calls per session, gives Claude all context in one structured block
Touched: hooks/session-start-boot.py
```

---

## Chunk 5: Simplify UserPromptSubmit boot instructions

### 5.1 Remove doctor + log from boot steps

- [ ] **5.1.1** Open `C:\Users\fix.workshop\claude-git-memory\hooks\user-prompt-memory-check.py`. Replace lines 104-115 (the `if not session_booted:` block) with:

```python
    if not session_booted:
        # First message — boot instructions (SessionStart already provided all context)
        lines.append(
            f"[git-memory-boot] Plugin root: {PLUGIN_ROOT}\n"
            "Do these steps NOW before responding to the user:\n"
            '  Step 1: Use the Skill tool with skill="git-memory" '
            "(this is a TOOL CALL, not a bash command)\n"
            "  Step 2: Show the user a boot summary from the SessionStart output above\n"
            f'After booting, run: touch "{booted_flag}"'
        )
```

- [ ] **5.1.2** Also simplify the install case (lines 76-87). Replace with:

```python
        print(
            "[git-memory-bootstrap] Git-memory plugin is active but NOT configured. "
            "BEFORE doing anything else:\n"
            f'1. Run: python3 "{PLUGIN_ROOT}/bin/git-memory-install.py" --auto\n'
            '2. Use the Skill tool with skill="git-memory" to load the memory rules\n'
            "3. Show the user a boot summary from the SessionStart output above.\n"
            "Do NOT greet the user first. Install and boot FIRST.\n"
            "CRITICAL: Step 2 means calling the Skill tool — "
            "this is a tool call, not a bash command."
        )
```

- [ ] **5.1.3** Commit:

```
♻️ refactor(hooks/user-prompt): remove doctor + log from boot steps — SessionStart now provides all context

Why: boot briefing v2 eliminates redundant bash calls, UserPromptSubmit only needs skill load + summary
Touched: hooks/user-prompt-memory-check.py
```

---

## Chunk 6: Next → Issue auto-creation in `git-memory-commit.py`

### 6.1 Add `gh` CLI integration

- [ ] **6.1.1** Open `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-commit.py`. Add a helper function after the `EMOJIS` dict (after line 36):

```python
_gh_available_cache: bool | None = None

def _gh_available() -> bool:
    """Check if gh CLI is installed and authenticated. Result is cached for the process."""
    global _gh_available_cache
    if _gh_available_cache is not None:
        return _gh_available_cache
    try:
        result = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True, text=True, timeout=5,
        )
        _gh_available_cache = result.returncode == 0
    except (FileNotFoundError, OSError):
        _gh_available_cache = False
    return _gh_available_cache


def _auto_create_issue(next_text: str) -> str | None:
    """Try to create a GitHub issue from a Next: trailer text.

    Returns '#N' issue reference if successful, None otherwise.
    Only runs if gh CLI is available and the text has no existing #ref.
    """
    if "#" in next_text:
        return None  # Already has an issue reference
    if not _gh_available():
        return None
    try:
        result = subprocess.run(
            ["gh", "issue", "create", "--title", next_text, "--label", "next", "--body",
             f"Auto-created from git-memory Next: trailer.\n\nSource: `Next: {next_text}`"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            # gh issue create prints the URL, extract issue number
            url = result.stdout.strip()
            # URL format: https://github.com/owner/repo/issues/42
            match = re.search(r"/issues/(\d+)", url)
            if match:
                return f"#{match.group(1)}"
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass
    return None


def _auto_close_issue(issue_ref: str) -> None:
    """Try to close a GitHub issue referenced in a Resolved-Next: trailer.

    Silently degrades if gh CLI is unavailable.
    """
    match = re.search(r"#(\d+)", issue_ref)
    if not match:
        return
    if not _gh_available():
        return
    try:
        subprocess.run(
            ["gh", "issue", "close", match.group(1), "--comment",
             "Resolved via git-memory Resolved-Next: trailer"],
            capture_output=True, text=True, timeout=15,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass
```

- [ ] **6.1.2** Add the `import re` at the top of the file (line 17, if not already present):

```python
import re
```

- [ ] **6.1.3** In `build_commit_message()`, replace the original trailer rendering loop (lines 79-81):
```python
        for t in trailers:
            key, _, value = t.partition("=")
            parts.append(f"{key}: {value}")
```
with the version that auto-creates/closes issues:
```python
        # Process trailers with auto-issue creation
        for t in trailers:
            key, _, value = t.partition("=")
            if key == "Next":
                issue_ref = _auto_create_issue(value)
                if issue_ref:
                    value = f"{value} {issue_ref}"
            elif key == "Resolved-Next":
                _auto_close_issue(value)
            parts.append(f"{key}: {value}")
```

### 6.2 Tests for Next→Issue

- [ ] **6.2.1** Add a test class to `C:\Users\fix.workshop\claude-git-memory\tests\test_boot_output.py` (or a new file `tests/test_next_issue.py`):

```python
import subprocess
from unittest.mock import patch, MagicMock

# Import the functions under test
sys.path.insert(0, os.path.join(SOURCE_ROOT, "bin"))

class TestNextToIssue:
    """Next→Issue auto-creation and gh availability."""

    def test_gh_unavailable_returns_none(self):
        """When gh CLI is not available, _auto_create_issue returns None."""
        with patch("subprocess.run", side_effect=FileNotFoundError):
            from importlib import import_module
            commit_mod = import_module("git-memory-commit")
            commit_mod._gh_available_cache = None  # reset cache
            result = commit_mod._auto_create_issue("implement auth flow")
            assert result is None

    def test_already_has_issue_ref_skips(self):
        """If the Next text already contains #N, skip issue creation."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        result = commit_mod._auto_create_issue("implement auth flow #42")
        assert result is None

    def test_gh_available_creates_issue(self):
        """When gh is available, _auto_create_issue creates an issue and returns #N."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        commit_mod._gh_available_cache = True  # skip auth check
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "https://github.com/owner/repo/issues/99\n"
        with patch("subprocess.run", return_value=mock_result):
            result = commit_mod._auto_create_issue("implement auth flow")
            assert result == "#99"

    def test_gh_available_cache_persists(self):
        """_gh_available() result is cached across calls."""
        from importlib import import_module
        commit_mod = import_module("git-memory-commit")
        commit_mod._gh_available_cache = None  # reset
        mock_result = MagicMock()
        mock_result.returncode = 0
        with patch("subprocess.run", return_value=mock_result) as mock_run:
            commit_mod._gh_available()
            commit_mod._gh_available()
            # Should only call subprocess.run once due to caching
            assert mock_run.call_count == 1
```

- [ ] **6.2.2** Commit:

```
✨ feat(bin/commit): Next→Issue auto-creation — gh issue create from Next: trailer, auto-close from Resolved-Next:

Why: pending work items now persist as GitHub issues, surviving beyond the 30-commit scan window
Touched: bin/git-memory-commit.py
```

---

## Chunk 7: Update core skill — Next ↔ Issues bridge + boot protocol

### 7.1 Add Next ↔ Issues bridge to SKILL.md

- [ ] **7.1.1** Open `C:\Users\fix.workshop\claude-git-memory\skills\git-memory\SKILL.md`. After the `## Auto-Git Triggers` table (after line 117), add:

```markdown
## Next <-> Issues

Next: trailers auto-create GitHub issues via git-memory-commit.py.
Format: `Next: description #issue-number`
The commit script handles issue creation — Claude doesn't need to call gh manually.
Resolved-Next: trailers auto-close the referenced issue.
For advanced issue management (milestones, templates, checklists) -> skill `git-memory-issues`.
```

### 7.2 Update boot protocol in SKILL.md

- [ ] **7.2.1** In the same file, find the `## Wrapper Scripts` section (lines 46-52). After the line about `[git-memory-boot]` hook output (line 48), add a note about the new boot format:

Replace lines 46-52 with:

```markdown
## Boot Protocol

The `[git-memory-boot]` SessionStart hook provides ALL context pre-extracted: STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, MEMOS, TIMELINE, and script paths. Claude does NOT need to run doctor or git-memory-log on boot — everything is already in context.

On boot, Claude only needs to:
1. Load this skill (Skill tool call)
2. Read the SessionStart output already in context
3. Show a summary to the user

## Wrapper Scripts

**NEVER use `git commit` or `git log` directly.** A PreToolUse hook will BLOCK them.

The boot output terminator provides the plugin root path. Use it:

**For commits**: `python3 <plugin-root>/bin/git-memory-commit.py <type> <scope> <message> [--body TEXT] [--trailer KEY=VALUE]... [--push]`

**For logs**: `python3 <plugin-root>/bin/git-memory-log.py [N] [--all] [--type TYPE]`
```

- [ ] **7.2.2** Commit:

```
📝 docs(skill): add Next↔Issues bridge section + update boot protocol for v2

Why: core skill must document the new boot flow and issue auto-creation
Touched: skills/git-memory/SKILL.md
```

---

## Chunk 8: Update CLAUDE.md managed block + install script

### 8.1 Update the managed block template

- [ ] **8.1.1** Open `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-install.py`. Replace the `MANAGED_BLOCK_CONTENT` constant (lines 43-58) with:

```python
MANAGED_BLOCK_CONTENT = """## Git Memory Active

This project uses **claude-git-memory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="git-memory"` (TOOL CALL, not bash)
2. Read the `[git-memory-boot]` SessionStart output already in your context (do NOT run doctor or git-memory-log)
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" -> use skill `git-memory-lifecycle`.
Never ask the user to run commands -- run them yourself."""
```

### 8.2 Update the project's own CLAUDE.md

- [ ] **8.2.1** Open `C:\Users\fix.workshop\claude-git-memory\CLAUDE.md`. Replace the managed block content (lines 3-19) to match the new template:

```markdown
<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

This project uses **claude-git-memory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="git-memory"` (TOOL CALL, not bash)
2. Read the `[git-memory-boot]` SessionStart output already in your context (do NOT run doctor or git-memory-log)
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" -> use skill `git-memory-lifecycle`.
Never ask the user to run commands -- run them yourself.
<!-- END claude-git-memory -->
```

- [ ] **8.2.2** Commit:

```
📝 docs(install): update CLAUDE.md managed block — remove doctor/log steps, reference SessionStart output

Why: boot briefing v2 provides all context in SessionStart, no bash calls needed
Touched: bin/git-memory-install.py, CLAUDE.md
```

---

## Chunk 9: Update lifecycle skill

### 9.1 Update boot reference in lifecycle skill

- [ ] **9.1.1** Open `C:\Users\fix.workshop\claude-git-memory\skills\git-memory-lifecycle\SKILL.md`. In the `## Doctor` section (around line 47), update the sentence "Run silently on session start. Only report if problems found." to:

```
Run silently by the SessionStart hook on every boot. STATUS section in boot output shows the result. Only report details to the user if problems found.
```

- [ ] **9.1.2** In the `## Maintenance: Opportunistic` table (line 89), update the "Session start" row:

```
| Session start | STATUS in boot output | SessionStart hook runs doctor silently → shows result in STATUS section |
```

- [ ] **9.1.3** Commit:

```
📝 docs(lifecycle-skill): update boot references for v2 — doctor runs in SessionStart, result in STATUS section

Why: lifecycle skill must reflect that doctor is no longer a separate Claude bash call
Touched: skills/git-memory-lifecycle/SKILL.md
```

---

## Chunk 10: Update README.md

### 10.1 Update boot section

- [ ] **10.1.1** Open `C:\Users\fix.workshop\claude-git-memory\README.md`. Replace the "What Claude sees when it starts a new session" block (lines 58-68) with:

```markdown
### What Claude sees when it starts a new session

```
[git-memory-boot] v3.6.0 | ~/.claude/plugins/cache/.../claude-git-memory

STATUS: ok

BRANCH: feat/CU-042-filters [0/2 vs upstream]
  PULL RECOMMENDED: remote is 2 ahead

RESUME:
  Last: a3f2b1c 💾 context(forms): pause forms refactor | 2h ago
  Issue (from branch): #42
  Next: a3f2b1c: wire validation into API layer
  Blocker: none

REMEMBER:
  (user) se frustra si asumes cosas — preguntar antes
  (claude) trabaja en español, respuestas directas

DECISIONS:
  (forms) use dayjs over moment
  (backend/auth) JWT with refresh tokens

MEMOS:
  (api) preference - never use sync fs operations

TIMELINE (last 5):
  a3f2b1c 💾 context(forms): pause forms refactor | 2h ago
  b4c3d2e 📌 memo(api): async preference | 3h ago
  c5d4e3f ✨ feat(forms): add date picker | 3h ago
  d6e5f4g 🧭 decision(forms): use dayjs | 1d ago
  e7f6g5h 🐛 fix(auth): token expiry | 2d ago

---
BOOT COMPLETE. Do NOT run doctor or git-memory-log. All context is above.
Commit: python3 "~/.claude/plugins/cache/.../bin/git-memory-commit.py"
Log: python3 "~/.claude/plugins/cache/.../bin/git-memory-log.py"
```

No questions. It knows where you left off. One tool call (loading the skill), zero bash commands.
```

### 10.2 Update hooks table

- [ ] **10.2.1** In the hooks table (lines 376-383), update the Session start row:

Replace:
```
| **Session start** | Boot | When Claude starts a session | Silent health check + memory extraction from last 30 commits + **full glossary scan** of all decisions and memos across entire git history. Shows a compact summary with recent memory and a grouped glossary. |
```

With:
```
| **Session start** | Boot | When Claude starts a session | **Complete structured briefing** — silent health check + memory extraction + full glossary (cached) + branch-awareness + time-ago + version check. Outputs sectioned format: STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, MEMOS, TIMELINE, BOOT COMPLETE. Claude receives everything in context — zero bash calls needed. |
```

### 10.3 Update the User message hook row

- [ ] **10.3.1** In the same hooks table, update the User message row:

Replace:
```
| **User message** | Radar | Every time you send a message | Injects a `[memory-check]` reminder so Claude evaluates if your message contains a decision, preference, or requirement worth saving. |
```

With:
```
| **User message** | Radar | Every time you send a message | On first message: tells Claude to load the skill and show boot summary (no doctor/log). On every message: injects `[memory-check]` reminder so Claude evaluates if your message contains a decision, preference, or requirement worth saving. |
```

### 10.4 Update Automatic session boot section

- [ ] **10.4.1** Replace the automatic session boot section (lines 410-438) with:

```markdown
## Automatic session boot

Every time Claude starts a session in your project, it automatically:

1. Fetches remote refs silently (detects if remote is ahead and suggests pulling).
2. Runs a silent health check (doctor). If anything is broken, repairs it.
3. Checks plugin version against manifest.
4. Reads the last 30 commits and extracts memory trailers (pending, blockers, decisions, memos, remembers).
5. Scans the **full git history** for a glossary of all decisions and memos by scope (cached with 24h TTL).
6. Detects branch context — extracts keywords and issue references from branch name.
7. Prioritizes branch-relevant items in each section.
8. Calculates time since last context commit.
9. Outputs a complete structured briefing with sections: STATUS, BRANCH, RESUME, REMEMBER, DECISIONS, MEMOS, TIMELINE, BOOT COMPLETE.

Claude receives all of this in context from the SessionStart hook. It only needs to load the skill (one tool call) — no bash commands required. This saves ~1500-3000 tokens per boot compared to the previous 3-tool-call flow.
```

- [ ] **10.4.2** Commit:

```
📝 docs(readme): update boot section, hooks table, and example output for boot briefing v2

Why: README must reflect the new structured boot output and zero-bash-call flow
Touched: README.md
```

---

## Chunk 11: Update tests — version assertions + integration

### 11.1 Update version assertions

- [ ] **11.1.1** Open `C:\Users\fix.workshop\claude-git-memory\tests\test_integration.py`. Line 87: change `assert manifest["version"] == "3.5.1"` to `assert manifest["version"] == "3.6.0"`.

- [ ] **11.1.2** Open `C:\Users\fix.workshop\claude-git-memory\tests\test_lifecycle.py`. Line 84: change `assert manifest["version"] == "3.5.1"` to `assert manifest["version"] == "3.6.0"`.

- [ ] **11.1.3** Open `C:\Users\fix.workshop\claude-git-memory\tests\test_upgrade.py`. Line 155: change `assert manifest["version"] == "3.5.1"` to `assert manifest["version"] == "3.6.0"`.

### 11.2 Update compaction test expectations

- [ ] **11.2.1** Open `C:\Users\fix.workshop\claude-git-memory\tests\test_integration.py`. The `test_compaction_snapshot` test (line 147) asserts `<= 18 lines`. After refactoring precompact to use shared `scan_trailers_memory` (Chunk 0.3) and the commit wrapper script (Chunk 0.4):
  1. Run the precompact hook in a test repo and count the output lines.
  2. Update the `<= 18` assertion to match the new output line count.
  3. If the output now includes the wrapper script path instead of raw `git commit --allow-empty`, update any `assert "git commit" in output` to assert the wrapper script path instead (e.g., `assert "git-memory-commit.py" in output`).
  4. Verify the test still checks that memory trailers (Decision, Memo, Next, Blocker) appear in the compaction output.

### 11.3 Run full test suite

- [ ] **11.3.1** Run all tests:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/ -v --tb=short
```

Fix any failures before proceeding.

- [ ] **11.3.2** Commit:

```
🧪 test: update version assertions to 3.6.0 + verify boot output tests pass

Why: version bump requires updating all test assertions
Touched: tests/test_integration.py, tests/test_lifecycle.py, tests/test_upgrade.py
```

---

## Chunk 12: Version bump

### 12.1 Bump all VERSION constants

- [ ] **12.1.1** `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-install.py` line 38: `VERSION = "3.5.1"` → `VERSION = "3.6.0"`

- [ ] **12.1.2** `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-doctor.py`: find `VERSION = "3.5.1"` → `VERSION = "3.6.0"`

- [ ] **12.1.3** `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-bootstrap.py`: find `VERSION = "3.5.1"` → `VERSION = "3.6.0"`

- [ ] **12.1.4** `C:\Users\fix.workshop\claude-git-memory\bin\git-memory-upgrade.py`: find `VERSION = "3.5.1"` → `VERSION = "3.6.0"`

- [ ] **12.1.5** `C:\Users\fix.workshop\claude-git-memory\hooks\session-start-boot.py`: confirm `PLUGIN_VERSION = "3.6.0"` (added in Chunk 3).

### 12.2 Bump plugin.json and marketplace.json

- [ ] **12.2.1** `C:\Users\fix.workshop\claude-git-memory\.claude-plugin\plugin.json` line 3: `"version": "3.5.1"` → `"version": "3.6.0"`

- [ ] **12.2.2** `C:\Users\fix.workshop\claude-git-memory\.claude-plugin\marketplace.json` line 8: `"version": "3.5.1"` → `"version": "3.6.0"`

### 12.3 Update lifecycle skill version reference

- [ ] **12.3.1** `C:\Users\fix.workshop\claude-git-memory\skills\git-memory-lifecycle\SKILL.md` line 73: update the manifest example version from `"3.5.1"` to `"3.6.0"`.

### 12.4 Final test run

- [ ] **12.4.1** Run the full test suite one final time:

```bash
cd C:\Users\fix.workshop\claude-git-memory && python -m pytest tests/ -v --tb=short
```

All 49+ tests must pass (existing 49 + new boot output tests).

- [ ] **12.4.2** Commit:

```
🔖 release: bump version to 3.6.0 — boot briefing v2

Why: new structured boot output, glossary caching, branch-awareness, Next→Issue auto-creation, shared trailer parsing
Touched: bin/git-memory-install.py, bin/git-memory-doctor.py, bin/git-memory-bootstrap.py, bin/git-memory-upgrade.py, hooks/session-start-boot.py, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, skills/git-memory-lifecycle/SKILL.md
```

---

## Summary of all files modified

| File | Chunk | Change |
|------|-------|--------|
| `lib/constants.py` | 0 | Add `MEMORY_KEYS` set |
| `lib/parsing.py` | 0 | Add `scan_trailers_memory()` function |
| `hooks/session-start-boot.py` | 0,1,2,3,4 | Remove local scan_trailers, add branch helpers, glossary cache, version check, rewrite main() for structured output |
| `hooks/precompact-snapshot.py` | 0 | Use shared `scan_trailers_memory`, fix raw git commit → wrapper |
| `hooks/stop-dod-check.py` | 0 | Fix raw git commit → wrapper |
| `hooks/user-prompt-memory-check.py` | 5 | Remove doctor + log from boot steps |
| `bin/git-memory-commit.py` | 6 | Add Next→Issue auto-creation, Resolved-Next→Issue auto-close |
| `skills/git-memory/SKILL.md` | 7 | Add Next↔Issues bridge, update boot protocol |
| `bin/git-memory-install.py` | 8,12 | Update managed block template, bump VERSION |
| `CLAUDE.md` | 8 | Update managed block to match new template |
| `skills/git-memory-lifecycle/SKILL.md` | 9,12 | Update boot references, bump version |
| `README.md` | 10 | Update boot section, hooks table, example output |
| `tests/test_boot_output.py` | 4 | New test file for structured boot output |
| `tests/test_integration.py` | 11 | Update version assertion |
| `tests/test_lifecycle.py` | 11 | Update version assertion |
| `tests/test_upgrade.py` | 11 | Update version assertion |
| `bin/git-memory-doctor.py` | 12 | Bump VERSION |
| `bin/git-memory-bootstrap.py` | 12 | Bump VERSION |
| `bin/git-memory-upgrade.py` | 12 | Bump VERSION |
| `.claude-plugin/plugin.json` | 12 | Bump version |
| `.claude-plugin/marketplace.json` | 12 | Bump version |

**Total: 21 files, 13 chunks, ~55 steps.**
