# Boot Briefing v2 — Design Doc

**Date:** 2026-03-13
**Status:** Draft
**Scope:** session-start-boot.py, user-prompt-memory-check.py, git-memory-commit.py, skills

## Problem

The current boot wastes context window. Claude executes 3 tool calls:

1. `Skill("git-memory")` — loads rules (necessary)
2. `Bash("python3 doctor.py --json")` — redundant, SessionStart hook already ran it
3. `Bash("python3 git-memory-log.py 20")` — redundant, SessionStart hook already extracted this

Tool calls 2 and 3 are mechanical work the script can do. Every boot burns ~1500-3000 tokens on redundant bash commands + output.

Additionally:
- `Next:` trailers are disconnected from GitHub issues — pending work gets lost outside the 30-commit scan window
- Boot output is flat and unstructured — no clear sections, no priority ordering
- No branch-aware context — same output whether on `main` or `feat/issue-42-auth`
- No temporal context — no "last session was 2 days ago"
- No plugin version check
- Core skill doesn't reference the issues skill

## Design

### Boot Flow (new)

```
SessionStart hook fires:
  ├─ git fetch --quiet (already exists)
  ├─ doctor silently (already exists)
  ├─ extract memory + glossary (already exists)
  ├─ NEW: detect branch + issue from branch name
  ├─ NEW: prioritize branch-scoped items
  ├─ NEW: calculate time since last session
  ├─ NEW: check plugin version vs manifest
  ├─ NEW: format as structured sections
  └─ output everything to stdout → Claude receives in system-reminder

UserPromptSubmit hook fires (first message):
  └─ "Load skill git-memory + show boot summary from SessionStart output"
     (NO doctor, NO log — removed)

Claude does:
  └─ Tool call 1: Skill("git-memory") → rules loaded
     (reads SessionStart output already in context, zero bash needed)
```

**Result: 3 tool calls → 1 tool call. ~1500-3000 tokens saved per session.**

### Boot Output Format

```
[git-memory-boot] v{VERSION} | {plugin_root}

STATUS: {ok | warn | error} {optional one-liner if not ok}
{if version mismatch: "⚠️ Plugin v{new} available (installed: v{old}). Suggest /plugin update"}

BRANCH: {branch_name} [{ahead}/{behind} vs {upstream}]
{if uncommitted: "DIRTY: {N} files"}
{if remote ahead: "PULL RECOMMENDED: remote is {N} ahead"}

RESUME:
  Last: {sha} {subject} | {time_ago}
  {if branch has issue: "🔵 Issue actual: #{num} — {title} (branch: {branch})"}
  Next: {branch-scoped items first, with #issue refs}
  Next: {other items}
  Blocker: {if any}

REMEMBER:
  (user) {text}
  (claude) {text}

DECISIONS:
  {branch-scoped first}
  {then rest, sorted alphabetically by scope}

MEMOS:
  {branch-scoped first}
  {then rest}

TIMELINE (last 10):
  {sha} {emoji} {subject} | {time_ago}
  ...

---
BOOT COMPLETE. Do NOT run doctor or git-memory-log. All context is above.
Commit: python3 "{plugin_root}/bin/git-memory-commit.py"
Log: python3 "{plugin_root}/bin/git-memory-log.py"
```

### Section Ordering Rationale

1. **STATUS** — is the system healthy? Affects everything else.
2. **BRANCH** — where am I? Do I need to pull?
3. **RESUME** — what was I doing? What's next? Branch-scoped Next: items first.
4. **REMEMBER** — how should I behave? (user personality + claude errors to avoid)
5. **DECISIONS** — what's been decided? (constraints on what to do)
6. **MEMOS** — preferences, requirements, antipatterns
7. **TIMELINE** — recent history for broader context
8. **BOOT COMPLETE** — signal + script paths for the rest of the session

### Branch-Aware Prioritization

When on a branch like `feat/issue-42-auth-refactor`:

1. Extract keywords from branch name: `auth`, `refactor`, `42`
2. If branch contains issue number (`#42` or `issue-42`), extract it
3. Score decisions/memos/next items by scope overlap with branch keywords
4. Branch-matching items appear first in their section
5. Non-matching items still appear (they're still binding) but lower

### Next ↔ Issues Connection

#### In `git-memory-commit.py`:

When the script sees a `Next=` trailer without a `#` issue reference:

1. Check if `gh` CLI is available
2. If yes: `gh issue create --title "<Next text>" --label "next"` → get issue number
3. Append `#number` to the trailer value: `Next: implement X #42`
4. If `gh` unavailable or fails: silently degrade, commit without issue number

When the script sees a `Resolved-Next=` trailer with `#number`:

1. Attempt `gh issue close <number> --comment "Resolved"`
2. Silent failure if `gh` unavailable

#### In core skill (`git-memory/SKILL.md`):

Add 5-8 lines to the Auto-Git Triggers / Trailer Spec section:

```
## Next ↔ Issues

Next: trailers auto-create GitHub issues via git-memory-commit.py.
Format: `Next: description #issue-number`
The commit script handles issue creation — Claude doesn't need to call gh manually.
For advanced issue management (milestones, templates, checklists) → skill `git-memory-issues`.
```

### Glossary Caching

The full-history scan (`git log --all`) is expensive on large repos.

**Solution:** cache in `.claude/.glossary-cache.json`:

```json
{
  "head_sha": "abc1234",
  "generated_at": "2026-03-13T10:00:00Z",
  "decisions": [["(auth)", "JWT over sessions"], ...],
  "memos": [["(capture)", "no pedir confirmación"], ...],
  "remembers": [["(user)", "prefiere español"], ...]
}
```

- Refresh if: `head_sha` differs from current HEAD, or cache is >24h old
- Otherwise: read from cache (instant)

### Scaling Limits

| Category | Branch-scoped max | Other max | Hard cap |
|----------|-------------------|-----------|----------|
| Decisions | 10 | 10 | 20 |
| Memos | 10 | 10 | 20 |
| Remembers | all | all | 30 |
| Next | all branch-scoped | 5 other | 10 |
| Timeline | 10 | — | 10 |

If more exist than the cap, append:
```
({N} more decisions in history. Use git-memory-log --type decision)
```

### Token Budget

| Section | Typical | Max |
|---------|---------|-----|
| Header + status | 30 | 60 |
| Branch + git state | 30 | 50 |
| Resume | 60 | 150 |
| Remember | 50 | 200 |
| Decisions | 100 | 500 |
| Memos | 80 | 500 |
| Timeline | 150 | 300 |
| Terminator | 50 | 50 |
| **Total** | **~550** | **~1810** |

Net savings vs current: 1000-2500 tokens per boot (eliminates 2 bash round-trips).

## Files to Modify

| Priority | File | Change |
|----------|------|--------|
| 1 | `hooks/session-start-boot.py` | Restructure output format, add branch-awareness, time-ago, version check, glossary cache, issue-from-branch detection |
| 2 | `hooks/user-prompt-memory-check.py` | Remove doctor + log from boot steps. Keep only: load skill + show summary |
| 3 | `bin/git-memory-commit.py` | Auto-create issue from Next: trailer, auto-close from Resolved-Next: |
| 4 | `skills/git-memory/SKILL.md` | Add Next↔Issues bridge section (5-8 lines), update boot protocol |
| 5 | `CLAUDE.md` managed block | Update boot instructions (remove "run doctor/log") |

## Bonus Fixes (while we're in there)

| Fix | File | Issue |
|-----|------|-------|
| Extract shared trailer parsing to `lib/parsing.py` | `lib/parsing.py`, 3 hooks | Duplicated in session-start-boot, precompact-snapshot, doctor |
| Stop hook uses raw `git commit` instead of wrapper | `hooks/stop-dod-check.py` | Bypasses commit script |
| PreCompact hook uses raw `git commit` | `hooks/precompact-snapshot.py` | Same issue |

## Not Doing

- **`gh issue list` in boot** — network call, slow, noisy. Issue refs in Next: trailers + branch name parsing are enough.
- **Project context in boot** — CLAUDE.md already covers "what is this project"
- **Condensed vs full mode toggle** — tiered limits auto-scale, no config needed
- **Merging the 3 skills** — core is ~264 lines loaded every session. Merging would add ~276 lines of lifecycle+issues to every session for no gain.
