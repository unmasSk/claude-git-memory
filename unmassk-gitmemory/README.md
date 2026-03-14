# unmassk-gitmemory

**Persistent memory for Claude Code, stored in git.**

Decisions, preferences, blockers, and pending work survive across sessions, machines, and context resets. You don't need to do anything special -- just talk to Claude like you always do.

## How it works

**Git = Memory.** Every commit carries structured metadata (called "trailers") that Claude reads automatically when a session starts. No external files, no databases, no cloud services -- everything lives in your git history.

Here's what a commit looks like with memory:

```
feat(frontend/forms): add date range validation

Issue: CU-042
Why: users submit impossible date ranges crashing the report engine
Touched: src/forms/DateFilter.vue, tests/forms/dateFilter.test.ts
Decision: use dayjs over moment -- moment is deprecated and 10x heavier
Next: wire validation into the API layer
```

**You don't write any of that.** Claude writes the trailers automatically from your conversation. When you say "let's go with dayjs", Claude creates a decision commit. When you say "never use sync fs", Claude creates a memo. You just talk.

### What Claude sees on session start

```
[git-memory-boot] v3.7.0

STATUS: ok
BRANCH: feat/CU-042-filters [0/2 vs upstream]
SCOPES:
  frontend: UI components -- forms, filters, date pickers
  backend: API and auth -- rate limiting, OAuth, JWT
RESUME:
  Last: a3f2b1c context(forms): pause forms refactor | 2h ago
  Next: wire validation into API layer
  Blocker: none
REMEMBER:
  (user) gets frustrated when assumptions are made -- ask first
DECISIONS:
  (forms) use dayjs over moment
MEMOS:
  (api) preference - never use sync fs operations
TIMELINE (last 5):
  a3f2b1c context(forms): pause forms refactor | 2h ago
  b4c3d2e memo(api): async preference | 3h ago
  ...
```

No questions. It knows where you left off, what scopes exist, and what matters.

## You never run commands

**Claude handles everything.** You just talk.

- Session start? Claude runs the health check and shows a memory resume.
- Need to search old decisions? Just ask: "what did we decide about auth?"
- Memory system broken? Claude detects and repairs it.
- Want to clean stale items? Say "clean up old blockers".
- Want to uninstall? Say "remove git-memory".

## Conversational capture

You don't need to learn any syntax. Claude detects intent from natural language:

| You say | Claude does |
|---------|-------------|
| "let's go with X" | Saves the decision immediately |
| "always use X" / "never use Y" | Saves your preference immediately |
| "the client requires X" | Saves the requirement immediately |
| "don't ever do X again" | Saves the anti-pattern immediately |
| "remember that I prefer short answers" | Saves a personality note for future sessions |
| "I need to stop here" / "pause" | Bookmarks progress for the next session |
| "what did we decide about auth?" | Searches memory before asking you |

Decisions, memos, and remembers are captured **without asking** -- Claude commits immediately and tells you what it saved in one line. No friction, no confirmation prompts.

## What gets remembered

### Code commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `ci`, `test`, `docs`)

Normal development work. Claude adds trailers automatically:

```
feat(backend/auth): add OAuth2 login flow

Why: users need to sign in with Google accounts
Touched: src/auth/oauth.ts, src/routes/login.ts
Issue: CU-101
```

Required trailers: `Why:` + `Touched:` (+ `Issue:` if the branch name has one)

### Context bookmarks -- `context(scope)`

Created when you pause work or end a session:

```
context(backend/api): pause -- switching to urgent bugfix

Why: need to handle prod incident before continuing API refactor
Next: finish rate limiting middleware after bugfix
```

### Decisions -- `decision(scope)`

```
decision(backend/auth): use JWT over session cookies

Why: API needs to be stateless for horizontal scaling
Decision: JWT with 15min access + 7d refresh tokens
```

### Memos -- `memo(scope)`

```
memo(backend/api): preference -- always use async/await over .then() chains

Memo: preference - async/await is more readable, team standard
```

Categories: `preference`, `requirement`, `antipattern`, `stack`

### Remembers -- `remember(scope)`

Personality and working-style notes between sessions:

- **User remembers** -- explicit notes from you about yourself: `remember(user)`
- **Claude remembers** -- observations Claude makes about how you work: `remember(claude)`

Remembers are about the person, not the project.

### WIP checkpoints

Temporary saves during work. Created automatically. Feature branches only. Squashed before merge.

## Hierarchical scopes

Commit scopes use a hierarchical format separated by `/`, max 2 levels:

```
feat(backend/api): add rate limiting
decision(frontend/ux): use glassmorphic style
```

On first install, Claude analyzes your project structure and generates a scope map. The SCOPES section in the boot output shows these every session.

## The six hooks

| Hook | Nickname | When it runs | What it does |
|------|----------|-------------|--------------|
| **PreToolUse** (Bash) | Belt | Before `git commit` | Blocks commits with missing trailers. Human commits get warnings only. |
| **PostToolUse** (Bash) | Suspenders | After `git commit` | Safety net. Rolls back bad commits that slipped through Belt (reset --soft if unpushed). |
| **SessionStart** | Boot | Session start | Complete structured briefing -- health check + memory extraction + branch context + scopes. |
| **UserPromptSubmit** | Radar | Every message | Injects `[memory-check]` so Claude evaluates if your message contains something worth saving. |
| **Stop** | DoD | Session end | Creates WIP commits for uncommitted changes. Mandates a `context()` commit. |
| **PreCompact** | Hippocampus | Before context compression | Extracts a compact memory snapshot and re-injects it so decisions survive compression. |

### Belt + Suspenders

**Belt** catches problems before the commit. **Suspenders** catches what Belt misses (heredocs, `-F` flag). If HEAD hasn't been pushed: safe rollback with `reset --soft HEAD~1`. If pushed: suggests a correction commit (never force-pushes).

## Garbage collector

Stale `Next:` and `Blocker:` items accumulate over time. Say "clean up stale items" or "run gc" and Claude handles it.

| Heuristic | What it detects |
|-----------|----------------|
| **H1** -- keyword overlap | `Next:` items already done (newer commits share 2+ keywords) |
| **H2** -- TTL expiry | `Blocker:` items older than 30 days with no recent mention |
| **H3** -- explicit resolution | Items resolved by a `Resolution:` trailer |

The GC **never deletes commits**. It creates tombstone trailers (`Resolved-Next:`, `Stale-Blocker:`) that hide cleaned items from future snapshots. Fully reversible with `git revert`.

## Context awareness

The plugin monitors Claude's context window usage and warns before auto-compaction:

| Context used | Behavior |
|-------------|----------|
| < 60% | `[CTX: N%]` shown every message |
| 60-75% | `[context-warning]` -- advisory to consider a context() checkpoint |
| 75%+ | `[CONTEXT CRITICAL]` -- advisory to preserve session state |

Warnings at 60%+ use debounce: after the first warning, the next 5 messages show only `[CTX: N%]`. Severity escalation bypasses debounce.

## Runtime modes

| Mode | When | What happens |
|------|------|-------------|
| **Normal** | Standard git repo | Full system: hooks + trailers + wrappers |
| **Compatible** | CI or commitlint rejects trailers | Uses git notes instead of commit trailers |
| **Read-only** | No write permissions | Reads existing memory, doesn't create commits |

## Trailer reference

| Trailer | Format | Used in |
|---------|--------|---------|
| `Why:` | Free text | All commits (except `wip`) |
| `Touched:` | `path1, path2` or `glob/*` | Code commits |
| `Decision:` | Free text | `decision()` commits |
| `Memo:` | `category - description` | `memo()` commits |
| `Remember:` | `category - description` | `remember()` commits |
| `Next:` | Free text | Pending work items |
| `Blocker:` | Free text | What blocks progress |
| `Issue:` | `CU-xxx` or `#xxx` | Auto-extracted from branch name |
| `Risk:` | `low` / `medium` / `high` | Dangerous operations |
| `Conflict:` | Free text | Merge conflict context |
| `Resolution:` | Free text | How a conflict was resolved |
| `Resolved-Next:` | (GC tombstone) | Marks a Next: as done |
| `Stale-Blocker:` | (GC tombstone) | Marks a Blocker: as stale |

Rules: case-sensitive keys, single-line values, contiguous block at the end of the commit body.

## Skills

| Skill | What it does |
|-------|-------------|
| **unmassk-gitmemory** | Core memory rules -- commit formats, trailer validation, boot protocol, capture behavior |
| **unmassk-gitmemory-lifecycle** | Install, repair, uninstall, doctor, status commands |
| **unmassk-gitmemory-issues** | GitHub issue creation and milestone tracking |

## License

MIT
