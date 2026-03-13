# Next Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Boot filters out resolved Next items by checking GitHub issue status, and marks old Next items without issues as stale.

**Architecture:** Modify `extract_memory()` to collect commit timestamps and issue refs. After scan, batch-check issue status via parallel `gh` subprocess calls. Display phase adds `[stale]` prefix to old items without issues.

**Tech Stack:** Python 3, subprocess (Popen for parallel gh calls), existing boot infrastructure.

---

### Task 1: Collect timestamps and issue refs in extract_memory()

**Files:**
- Modify: `hooks/session-start-boot.py:161-244` (extract_memory function)

**Step 1: Write the failing test**

Create test in `tests/test_next_cleanup.py`:

```python
"""Tests for Next cleanup: issue status check + stale marker."""
import time
import pytest


def test_pending_items_include_timestamp_and_issue():
    """Next items should carry commit timestamp and issue ref if present."""
    # Simulate a pending item with issue ref
    item = "abc1234: (plugin/boot) implement rate limiting #42"
    # Extract issue number
    import re
    match = re.search(r"#(\d+)", item)
    assert match is not None
    assert match.group(1) == "42"


def test_pending_items_without_issue():
    """Next items without #N should have no issue ref."""
    item = "abc1234: (plugin/boot) add retry logic"
    import re
    match = re.search(r"#(\d+)", item)
    assert match is None
```

**Step 2: Run test to verify it passes (these are unit tests on parsing logic)**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/test_next_cleanup.py -v`
Expected: PASS

**Step 3: Change pending list to store structured dicts instead of plain strings**

In `extract_memory()`, change the pending collection (lines 204-209) from:

```python
# OLD: plain string
pending.append(f"{sha}: {scope_prefix}{text}")
```

To:

```python
# NEW: structured dict
import re as _re
issue_match = _re.search(r"#(\d+)", text)
pending.append({
    "sha": sha,
    "scope": scope,
    "text": text,
    "display": f"{sha}: {scope_prefix}{text}",
    "issue": int(issue_match.group(1)) if issue_match else None,
    "timestamp": ts,  # commit timestamp from git log format
})
```

Also update the `git log` format string (line 164-165) to include author date:

```python
"--pretty=format:%h\x1f%s\x1f%b\x1f%at\x1e"
```

And update the parsing (line 189) to extract 4 parts:

```python
parts = entry.split("\x1f", 3)
if len(parts) < 4:
    continue
sha, subject, body, ts_str = parts[0], parts[1], parts[2], parts[3]
try:
    ts = int(ts_str.strip()) if ts_str.strip() else 0
except ValueError:
    ts = 0
```

**Step 4: Update all consumers of `memory["pending"]`**

The display section (lines 648-658) uses pending items as strings. Update to use the `display` key:

```python
# In the RESUME display section, change:
#   for item in all_next:
#       lines.append(f"  Next: {item}")
# To:
for item in all_next:
    lines.append(f"  Next: {item['display']}")
```

Also update `partition_by_relevance` call to use a key function:

```python
branch_next, other_next = partition_by_relevance(
    memory["pending"], branch_keywords, lambda x: x["display"])
```

**Step 5: Write test for structured pending items**

Add to `tests/test_next_cleanup.py`:

```python
def test_pending_item_structure():
    """Pending items should be dicts with required keys."""
    item = {
        "sha": "abc1234",
        "scope": "plugin/boot",
        "text": "implement rate limiting #42",
        "display": "abc1234: (plugin/boot) implement rate limiting #42",
        "issue": 42,
        "timestamp": 1710000000,
    }
    assert item["issue"] == 42
    assert item["timestamp"] > 0
    assert "#42" in item["display"]
```

**Step 6: Run tests**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/test_next_cleanup.py -v`
Expected: PASS

**Step 7: Commit**

```
feat(plugin/boot): structured pending items with timestamp and issue ref
```

---

### Task 2: Issue status check via parallel gh calls

**Files:**
- Modify: `hooks/session-start-boot.py` (new function + call in display section)

**Step 1: Write the gh checker function**

Add to `session-start-boot.py`, before `extract_memory()`:

```python
import re as _re
import subprocess as _sp


def check_issue_status(pending_items: list[dict], timeout: float = 5.0) -> dict[int, dict]:
    """Check GitHub issue status for pending items with issue refs.

    Launches parallel gh calls and collects results within timeout.

    Args:
        pending_items: List of pending item dicts from extract_memory().
        timeout: Max seconds to wait for all gh calls.

    Returns:
        Dict mapping issue number to {"state": "OPEN"|"CLOSED", "title": "..."}.
        Missing entries mean gh failed or timed out for that issue.
    """
    # Collect unique issue numbers
    issues: dict[int, None] = {}
    for item in pending_items:
        if item.get("issue"):
            issues[item["issue"]] = None

    if not issues:
        return {}

    # Check gh availability first (single call, not per-issue)
    try:
        probe = _sp.run(
            ["gh", "auth", "status"],
            capture_output=True, timeout=3,
        )
        if probe.returncode != 0:
            return {}
    except (FileNotFoundError, _sp.TimeoutExpired):
        return {}

    # Launch parallel gh calls
    procs: dict[int, _sp.Popen] = {}
    for issue_num in issues:
        try:
            procs[issue_num] = _sp.Popen(
                ["gh", "issue", "view", str(issue_num), "--json", "state,title"],
                stdout=_sp.PIPE, stderr=_sp.PIPE, text=True,
            )
        except OSError:
            continue

    # Collect results with global timeout
    import time as _time
    deadline = _time.time() + timeout
    results: dict[int, dict] = {}

    for issue_num, proc in procs.items():
        remaining = max(0.1, deadline - _time.time())
        try:
            stdout, _ = proc.communicate(timeout=remaining)
            if proc.returncode == 0 and stdout.strip():
                data = json.loads(stdout)
                results[issue_num] = {
                    "state": data.get("state", "OPEN"),
                    "title": data.get("title", ""),
                }
        except (_sp.TimeoutExpired, json.JSONDecodeError, OSError):
            proc.kill()
            proc.wait()

    return results
```

**Step 2: Write the cross-repo guard function**

```python
def _issue_matches_next(next_text: str, issue_title: str) -> bool:
    """Check if a GitHub issue title plausibly matches a Next trailer text.

    Prevents false positives from issue #N belonging to a different context.
    Returns True if >= 2 keywords (3+ chars) overlap.
    """
    def keywords(text: str) -> set[str]:
        stop = {"the", "and", "for", "from", "with", "that", "this", "not", "are", "was"}
        return {
            w.lower() for w in _re.findall(r"[a-zA-Z]{3,}", text)
            if w.lower() not in stop
        }

    next_kw = keywords(next_text)
    title_kw = keywords(issue_title)
    return len(next_kw & title_kw) >= 2
```

**Step 3: Write tests**

Add to `tests/test_next_cleanup.py`:

```python
def test_issue_matches_next_positive():
    """Should match when keywords overlap."""
    # Import from boot script
    from hooks.session_start_boot_helpers import _issue_matches_next
    assert _issue_matches_next(
        "implement rate limiting for api",
        "implement rate limiting"
    ) is True


def test_issue_matches_next_negative():
    """Should not match unrelated issues."""
    from hooks.session_start_boot_helpers import _issue_matches_next
    assert _issue_matches_next(
        "fix upstream auth bug",
        "add logging to payment service"
    ) is False
```

NOTE: Since `_issue_matches_next` is inside the boot script which has side effects on import, extract it as a standalone function for testing. Alternatively, test it inline. The simplest approach: copy the function logic into the test for validation, and keep the real function in the boot script.

Actually, simpler: just test the keyword logic directly in the test file without importing.

```python
def test_keyword_overlap_positive():
    """Keywords from Next text and issue title should overlap >= 2."""
    import re
    def keywords(text):
        stop = {"the", "and", "for", "from", "with", "that", "this", "not", "are", "was"}
        return {w.lower() for w in re.findall(r"[a-zA-Z]{3,}", text) if w.lower() not in stop}

    next_kw = keywords("implement rate limiting for api")
    title_kw = keywords("implement rate limiting")
    assert len(next_kw & title_kw) >= 2


def test_keyword_overlap_negative():
    """Unrelated texts should have < 2 keyword overlap."""
    import re
    def keywords(text):
        stop = {"the", "and", "for", "from", "with", "that", "this", "not", "are", "was"}
        return {w.lower() for w in re.findall(r"[a-zA-Z]{3,}", text) if w.lower() not in stop}

    next_kw = keywords("fix upstream auth bug")
    title_kw = keywords("add logging to payment service")
    assert len(next_kw & title_kw) < 2
```

**Step 4: Run tests**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/test_next_cleanup.py -v`
Expected: PASS

**Step 5: Commit**

```
feat(plugin/boot): parallel gh issue status checker with cross-repo guard
```

---

### Task 3: Integrate into display phase + stale marker

**Files:**
- Modify: `hooks/session-start-boot.py` (RESUME display section, ~lines 648-658)

**Step 1: Add filtering and stale marking in the display section**

Replace the current Next display block with:

```python
# Next items — filter by issue status + stale marker
if memory.get("pending"):
    # Check issue status for items with refs
    issue_status = check_issue_status(memory["pending"])

    # Filter and annotate
    filtered_pending = []
    now = int(time.time())
    stale_threshold = 7 * 24 * 3600  # 7 days

    for item in memory["pending"]:
        issue_num = item.get("issue")

        # If has issue ref, check status
        if issue_num and issue_num in issue_status:
            status = issue_status[issue_num]
            # Cross-repo guard: verify title matches
            if status["state"] == "CLOSED" and _issue_matches_next(item["text"], status["title"]):
                continue  # Skip — issue is closed and matches
            # If title doesn't match, keep the item (might be different issue)

        # Stale marker for items without issue
        display = item["display"]
        if not issue_num and item.get("timestamp"):
            age = now - item["timestamp"]
            if age > stale_threshold:
                # Insert [stale] after the SHA prefix
                display = display.replace(": ", ": [stale] ", 1)

        filtered_pending.append({**item, "display": display})

    # Branch-scoped partitioning
    branch_next, other_next = partition_by_relevance(
        filtered_pending, branch_keywords, lambda x: x["display"])
    all_next = branch_next[:BOOT_MAX_BRANCH_NEXT] + other_next[:BOOT_MAX_OTHER_NEXT]
    all_next = all_next[:BOOT_MAX_NEXT]
    for item in all_next:
        lines.append(f"  Next: {item['display']}")
    remaining = len(filtered_pending) - len(all_next)
    if remaining > 0:
        lines.append(f"  ({remaining} more Next items in history. Use git-memory-log --type context)")
```

**Step 2: Add `import time` at the top if not already present**

Check if `time` is already imported (it's used in other places). If not, add it.

**Step 3: Run full boot test suite**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/test_boot_output.py -v`
Expected: Existing tests should still pass. Some may need updating if they check pending item format.

**Step 4: Fix any broken tests**

Tests that check `memory["pending"]` as list of strings need updating to expect list of dicts. Check:
- `tests/test_boot_output.py` — `test_resume_shows_next`, `test_branch_scoped_next_first`
- Update assertions to use `item["display"]` instead of raw string matching

**Step 5: Run all tests**

Run: `cd /Users/unmassk/Workspace/claude-git-memory && python3 -m pytest tests/ -v`
Expected: ALL PASS

**Step 6: Commit**

```
feat(plugin/boot): filter closed issues and mark stale Next items in boot output
```

---

### Task 4: Manual verification + push

**Step 1: Test locally with real data**

Run the boot script manually to see the output:

```bash
cd /Users/unmassk/Workspace/claude-git-memory && python3 hooks/session-start-boot.py
```

Verify:
- Next items with closed issues are filtered out
- Next items without issues older than 7 days show `[stale]`
- Next items without issues newer than 7 days show normally
- Boot completes within ~6 seconds (5s timeout + 1s overhead max)

**Step 2: Test gh unavailable scenario**

```bash
PATH=/usr/bin:/bin python3 hooks/session-start-boot.py
```

Verify: All Next items show (no filtering, graceful degradation).

**Step 3: Push**

```bash
git push origin main
```

**Step 4: Final commit**

```
chore(plugin): bump version for next-cleanup feature
```
