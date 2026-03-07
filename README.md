<p align="center">
  <img src="logo.png" alt="claude-git-memory" width="180">
</p>

<h1 align="center">claude-git-memory</h1>

<p align="center">
  <strong>Persistent memory for Claude Code, stored in git.</strong><br>
  <em>Decisions, preferences, blockers, and pending work survive across sessions, machines, and context resets.</em>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> &nbsp;·&nbsp;
  <a href="#how-it-works">How it works</a> &nbsp;·&nbsp;
  <a href="#quick-start">Quick start</a> &nbsp;·&nbsp;
  <a href="#what-you-say-vs-what-claude-does">Conversational capture</a> &nbsp;·&nbsp;
  <a href="#dashboard">Dashboard</a> &nbsp;·&nbsp;
  <a href="#the-four-hooks">Hooks</a>
</p>

---

## The problem

Every time Claude starts a new session, it forgets everything:

- *Who decided to use dayjs instead of moment?*
- *What's the user's preference for arrow functions?*
- *What's blocking the deployment right now?*

You end up repeating yourself, re-explaining decisions, and watching Claude reinvent wheels.

**claude-git-memory fixes this.** After installing it, Claude remembers everything — across sessions, machines, and context resets. You don't need to do anything special. Just talk to Claude like you always do.

---

## How it works

**Git = Memory.** Every commit carries structured metadata (called "trailers") that Claude reads automatically when a session starts. No external files, no databases, no cloud services — everything lives in your git history.

Here's what a commit looks like with memory:

```
✨ feat(forms): add date range validation

Issue: CU-042
Why: users submit impossible date ranges crashing the report engine
Touched: src/forms/DateFilter.vue, tests/forms/dateFilter.test.ts
Decision: use dayjs over moment — moment is deprecated and 10x heavier
Next: wire validation into the API layer
```

**You don't write any of that.** Claude writes the trailers automatically from your conversation. When you say "let's go with dayjs", Claude creates a decision commit. When you say "never use sync fs", Claude creates a memo. You just talk.

### What Claude sees when it starts a new session

```
┌──────────────────────────────────────────────────────────┐
│  Branch: feat/CU-042-filters                             │
│  Last session: "pause forms refactor" (2h ago)           │
│  Pending: wire validation into API layer                 │
│  Decision: (forms) use dayjs over moment                 │
│  Memo: (api) never use sync fs operations                │
└──────────────────────────────────────────────────────────┘
```

No questions. It knows where you left off.

---

## Quick start

### 1. Clone this repo

```bash
git clone https://github.com/unmasSk/claude-git-memory.git
```

### 2. Tell Claude to install it

Open Claude Code in your project and say:

> "Install git-memory from /path/to/claude-git-memory"

That's it. **Claude does the rest.** You never need to run a single command.

Claude will:
1. **Inspect** your project (detect stack, check for CI/commitlint conflicts)
2. **Show you a plan** (what it will copy, where, and why)
3. **Apply** the installation (hooks, skills, CLI, CLAUDE.md block)
4. **Verify** everything works (runs a health check automatically)
5. **Show proof** that the system is healthy

If something breaks later, Claude detects it on session start and fixes it automatically.

### Requirements

- Python 3.10+
- Git
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with hooks support

---

## You never run commands

This is the most important thing to understand:

**You never run CLI commands for the memory system. Claude handles everything.**

- Session start? Claude runs the health check and shows a memory resume.
- Need to search old decisions? Just ask: "what did we decide about auth?"
- Memory system broken? Claude detects and repairs it.
- Want to clean stale items? Say "clean up old blockers".
- Want a dashboard? Say "show me the dashboard".
- Want to uninstall? Say "remove git-memory".

The CLI commands exist, but they're for Claude to use internally — not for you. You just talk.

---

## What you say vs. what Claude does

You don't need to learn any syntax. Claude detects intent from natural language:

| You say | Claude does |
|---------|-------------|
| "let's go with X" | Creates a `decision()` commit |
| "always use X" / "never use Y" | Creates a `memo(preference)` |
| "the client requires X" | Creates a `memo(requirement)` |
| "don't ever do X again" | Creates a `memo(antipattern)` |
| "I need to stop here" / "pause" | Creates a `context()` bookmark with Next: |
| "what did we decide about X?" | Searches memory before asking you |

Claude always shows you the proposed commit message and waits for your "ok" before committing decisions, memos, and context bookmarks.

---

## What gets remembered

### Code commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `ci`, `test`, `docs`)

Normal development work. Claude adds trailers automatically:

```
✨ feat(auth): add OAuth2 login flow

Why: users need to sign in with Google accounts
Touched: src/auth/oauth.ts, src/routes/login.ts
Issue: CU-101
```

Required trailers: `Why:` + `Touched:` (+ `Issue:` if the branch name has one)

### Context bookmarks — `context(scope)`

Created when you pause work or end a session:

```
💾 context(api): pause — switching to urgent bugfix

Why: need to handle prod incident before continuing API refactor
Next: finish rate limiting middleware after bugfix
```

Required: `Why:` + `Next:`

### Decisions — `decision(scope)`

Created when you make an architecture or design choice:

```
🧭 decision(auth): use JWT over session cookies

Why: API needs to be stateless for horizontal scaling
Decision: JWT with 15min access + 7d refresh tokens
```

Required: `Why:` + `Decision:`

### Memos — `memo(scope)`

Created when you state a preference, requirement, or antipattern:

```
📌 memo(api): preference — always use async/await over .then() chains

Memo: preference - async/await is more readable, team standard
```

Required: `Memo:` with category (`preference`, `requirement`, `antipattern`, or `stack`)

### WIP checkpoints

Temporary saves during work. Claude creates these automatically:

```
🚧 wip: half-done login form
```

No trailers required. Feature branches only. Squashed before merge.

---

## The four hooks

The memory system protects itself with four automatic hooks. You don't configure them — they activate on install.

| Hook | Nickname | When it runs | What it does |
|------|----------|-------------|--------------|
| **Pre-commit** | Belt | Before `git commit` | Blocks Claude's commits if trailers are missing. Human commits get a warning only — never blocked. |
| **Post-commit** | Suspenders | After `git commit` | Safety net. If a bad commit slips through and hasn't been pushed, rolls it back safely (`reset --soft`). Also regenerates the dashboard in the background. |
| **Session exit** | DoD | When Claude ends a session | If there are uncommitted changes, blocks exit and offers options: wip commit, context bookmark, stash, or discard. |
| **Context compression** | Hippocampus | Before Claude compresses context | Extracts a compact snapshot (branch, pending items, decisions, memos) and re-injects it so memory survives compression. |

### How Belt + Suspenders work together

**Belt** (pre-commit) catches problems before the commit happens. But some commit formats can't be parsed in advance (heredocs, `-F` flag). For those cases, **Suspenders** (post-commit) reads the actual commit after it lands and rolls it back if invalid.

- If HEAD hasn't been pushed → safe rollback with `reset --soft HEAD~1` (changes stay staged)
- If HEAD has been pushed → suggests a correction commit (never force-pushes)

### How Hippocampus works

When Claude's context window fills up, it compresses old messages. Before that happens, this hook extracts the most important memory from the last 30 commits:

- Branch name
- Last session bookmark
- Pending items (max 2)
- Blockers (max 2)
- Active decisions (max 3, one per scope)
- Active memos (max 2, one per scope)

This compact snapshot (~18 lines) gets re-injected into Claude's context, so it remembers what matters even after compression.

### GC tombstones

The hooks respect garbage collector tombstones. If an item has been cleaned by the GC (`Resolved-Next:`, `Stale-Blocker:`), hooks will skip it — no zombie items resurface.

---

## Automatic session boot

Every time Claude starts a session in your project, it automatically:

1. Runs a silent health check (doctor). If anything is broken, repairs it.
2. Reads the last 30 commits and extracts memory trailers.
3. Checks for uncommitted changes.
4. Shows you a compact summary:

```
=== BOOT — Memory Summary ===
Branch: feat/CU-042-filters
Last session: pause forms refactor (2h ago)
Pending: wire validation into API layer
Active decisions: (forms) use dayjs over moment
Active memos: (api) preference - never use sync fs operations
```

If there's nothing relevant, Claude just says: "Repo up to date. What are we working on?"

You don't ask for this. It happens automatically.

---

## Dashboard

A self-contained static HTML dashboard using the GitHub Primer dark theme. No server, no dependencies — just one file.

Say "show me the dashboard" and Claude generates it.

<p align="center">
  <img src="dashboard-screenshot.png" alt="git-memory dashboard" width="800">
</p>

**7 sections:** pending tasks, active blockers with age, decisions by scope, memos by category, compliance health (% of commits with proper trailers), GC status, and commit timeline.

**Auto-updates:** After every valid commit, the post-hook regenerates the dashboard in the background. The HTML auto-reloads every 10 seconds. Open it once and forget about it.

**State preserved:** Search queries, scroll position, and collapsed sections persist across reloads.

---

## Garbage collector

Stale `Next:` and `Blocker:` items accumulate over time. The GC cleans them using three heuristics:

| Heuristic | What it detects | How |
|-----------|----------------|-----|
| **H1** — keyword overlap | `Next:` items already done | If newer commits in the same scope share 2+ keywords with the Next: text, it's likely resolved |
| **H2** — TTL expiry | `Blocker:` items gone stale | Blockers older than 30 days with no recent mention |
| **H3** — explicit resolution | Items resolved by a `Resolution:` trailer | Paired with `Conflict:` in merge conflict commits |

The GC **never deletes commits**. It creates a new commit with tombstone trailers (`Resolved-Next:`, `Stale-Blocker:`) that hide cleaned items from future snapshots and the dashboard. Fully reversible with `git revert`.

Say "clean up stale items" or "run gc" and Claude handles it.

---

## Trailer reference

Full list of trailers the system understands:

| Trailer | Format | Used in |
|---------|--------|---------|
| `Why:` | Free text | All commits (except `wip`) |
| `Touched:` | `path1, path2` or `glob/*` | Code commits |
| `Decision:` | Free text | `decision()` commits |
| `Memo:` | `category - description` | `memo()` commits |
| `Next:` | Free text | Pending work items |
| `Blocker:` | Free text | What blocks progress |
| `Issue:` | `CU-xxx` or `#xxx` | Auto-extracted from branch name |
| `Risk:` | `low` / `medium` / `high` | Dangerous operations |
| `Conflict:` | Free text | Merge conflict context |
| `Resolution:` | Free text | How a conflict was resolved |
| `Refs:` | URLs, doc links | External references |
| `Resolved-Next:` | (GC tombstone) | Marks a Next: as done |
| `Stale-Blocker:` | (GC tombstone) | Marks a Blocker: as stale |

**Rules:** case-sensitive keys, single-line values, contiguous block at the end of the commit body.

---

## Installation modes

The installer detects your project's setup and chooses the best mode:

| Mode | When | What happens |
|------|------|-------------|
| **Normal** | Standard git repo | Full system: hooks + trailers + CLI |
| **Compatible** | CI or commitlint rejects trailers | Uses git notes instead of commit trailers |
| **Read-only** | No write permissions | Reads existing memory, doesn't create commits |

If Claude detects a commitlint config or strict CI pipeline, it automatically suggests compatible mode. You can also force a mode during install.

---

## Self-healing

Claude doesn't just install the system — it maintains it:

| Situation | What Claude does |
|-----------|-----------------|
| Hooks missing after a rebase | Detects on session start, re-registers |
| `.claude/` directory deleted | Reinstalls runtime from manifest |
| `settings.json` corrupted | Reconstructs hook registrations |
| Partial install (interrupted) | Completes missing pieces |
| After force push / history rewrite | Detects amnesia, rebuilds conservatively from current state, warns about gaps |

All of this happens automatically. Claude tells you what it fixed, but you don't need to do anything.

---

## Authority hierarchy

When there's a conflict between memory sources, Claude follows this priority:

1. **What you say in the conversation** (highest — always wins)
2. **Confirmed memory** (decisions and memos in commits)
3. **CLAUDE.md** of the project
4. **Code inferences** (lowest)

If Claude finds a contradiction (e.g., a new decision conflicts with an old memo), it warns you before creating the new commit.

---

## Branch and release workflow

- **Base branch:** `dev`. Work happens in `feat/*`, `fix/*`, `chore/*`.
- **One issue = one branch.** Branch names like `feat/CU-042-filters` auto-extract the issue reference.
- **Default merge** (not rebase). Rebase only with explicit user request.
- **PR mandatory** for `dev → staging` and `staging → main`.
- **No `Next:` on main.** Main branch must be clean.
- **Force push to main: forbidden.** Always.
- **Hotfix flow:** branch from main → fix → PR to main → back-merge to dev.

---

## Undo safety

| Operation | Risk | Claude asks first? |
|-----------|------|--------------------|
| `reset --soft HEAD~1` | Low | No |
| `stash push/pop` | Low | No |
| `revert <sha>` | Low | No (creates new commit) |
| `amend` (before push) | Low | No |
| `amend` (after push) | **High** | Yes |
| `reset --hard` | **High** | Yes — shows what will be lost |
| `push --force-with-lease` | **High** | Yes — feature branches only |
| `push --force` main/staging | **Forbidden** | N/A |

---

## Memory policy

> "Write little, read often, confirm when it hurts to be wrong."

Claude only creates memory commits when:
- You asked explicitly
- It affects future sessions
- It prevents real loss
- It's a confirmed decision

Claude does **not** save:
- Provisional observations
- Weak inferences
- Session-only context that won't matter tomorrow

Before asking you something, Claude searches existing memory first:
1. Search decisions and memos in git log
2. Check CLAUDE.md
3. Only if no match: ask you

---

## CLI reference

These commands exist for Claude to use internally. You don't need to run them — just ask Claude in natural language. Listed here for transparency and debugging.

| Command | What it does |
|---------|-------------|
| `git memory boot` | Show compact memory summary (branch, pending, decisions, memos) |
| `git memory decisions` | List all architecture decisions |
| `git memory memos` | List all memos (preferences, requirements, antipatterns) |
| `git memory pending` | List all pending Next: items |
| `git memory blockers` | List all active blockers |
| `git memory search <term>` | Full-text search across all memory |
| `git memory doctor` | Health check (hooks, skills, CLI, manifest, GC status) |
| `git memory install` | Transactional installer (5 phases) |
| `git memory repair` | Fix broken components using manifest |
| `git memory uninstall` | Remove runtime (keeps git history) |
| `git memory upgrade` | Safe version migration with backup |
| `git memory bootstrap` | Scout project structure (stack, monorepo, CI) |
| `git memory gc` | Garbage collect stale Next/Blocker items |
| `git memory dashboard` | Generate static HTML dashboard |

All commands support `--json` for machine-readable output, `--auto` for non-interactive mode, and `--dry-run` where applicable.

---

## Project scout (bootstrap)

On first contact with a repo, Claude can scan its structure without writing anything. It detects:

- **Languages:** JavaScript/TypeScript, Python, Rust, Go, Java, Ruby, PHP, Elixir, .NET
- **Frameworks:** Next.js, React, Vue, Svelte, Angular, Flask, Django, Rails, Laravel, and 40+ others
- **Monorepo tools:** Turborepo, Nx, Lerna, pnpm workspaces, Rush, Moon
- **Infrastructure:** Docker, CI pipelines, commitlint configs
- **Existing memory:** prior installations, trailers in history

Findings are classified as **facts** (high confidence) or **hypotheses** (needs confirmation). Claude shows results and asks before saving anything.

For monorepos, the scout builds a **scope map** — mapping directories like `apps/web` or `packages/ui` to scopes like `web` and `ui`. This helps Claude choose the right scope for commits automatically.

---

## Project structure

```
claude-git-memory/
├── .claude/
│   ├── hooks/                              # Symlinks to hooks/
│   │   ├── pre-validate-commit-trailers.py   # Belt
│   │   ├── post-validate-commit-trailers.py  # Suspenders
│   │   ├── precompact-snapshot.py            # Hippocampus
│   │   └── stop-dod-check.py                # DoD
│   └── skills/                             # Symlinks to skills/
│       ├── git-memory/                       # Core: boot, search, trailers, workflow
│       ├── git-memory-lifecycle/             # Install, doctor, repair, uninstall
│       ├── git-memory-protocol/              # Authority, releases, conflicts, undo
│       └── git-memory-recovery/              # Rebase, reset, force-push, CI issues
├── .claude-plugin/
│   ├── plugin.json                         # Plugin manifest
│   └── marketplace.json                    # Marketplace config
├── bin/
│   ├── git-memory                          # CLI router (bash)
│   ├── git-memory-install.py               # Transactional installer
│   ├── git-memory-doctor.py                # Health check
│   ├── git-memory-repair.py                # Runtime repair
│   ├── git-memory-uninstall.py             # Clean removal
│   ├── git-memory-upgrade.py               # Safe version migration
│   ├── git-memory-bootstrap.py             # Project scout
│   ├── git-memory-gc.py                    # Garbage collector
│   └── git-memory-dashboard.py             # Dashboard generator
├── lib/
│   ├── constants.py                        # Trailer keys, commit types, risk levels
│   ├── git_helpers.py                      # Git subprocess wrappers
│   ├── parsing.py                          # Commit parsing, trailer extraction
│   └── colors.py                           # ANSI terminal colors
├── hooks/                                  # Source hooks (copied by installer)
├── skills/                                 # Source skills (copied by installer)
├── hooks.json                              # Hook registration for Claude Code
├── dashboard-preview.html                  # HTML template (Primer dark theme)
└── tests/
    ├── conftest.py                         # Shared fixtures and helpers
    ├── test_bootstrap.py                   # Scout detection tests
    ├── test_drift.py                       # 200-commit stress test
    ├── test_integration.py                 # End-to-end scenarios
    ├── test_lifecycle.py                   # Install/doctor/repair/uninstall cycle
    └── test_upgrade.py                     # Version migration tests
```

---

## Testing

47 tests across 5 suites:

| Suite | What it covers |
|-------|---------------|
| `test_bootstrap` | Empty projects, Node.js/TS, Python, monorepo detection, commitlint, scope mapping |
| `test_drift` | 200 commits over 6 months: search, dedup, snapshots, truncation, hooks, GC tombstones |
| `test_integration` | Real-world scenarios: install, sessions, compaction, GC, branches, uninstall+reinstall |
| `test_lifecycle` | Full cycle: install → doctor → break → repair → uninstall |
| `test_upgrade` | Version checks, dry-run, real upgrade, manifest updates |

```bash
python3 -m pytest tests/ -v
```

Type checking with mypy strict mode:

```bash
python3 -m mypy bin/ hooks/
```

---

## FAQ

**Q: Does this work with GitHub/GitLab/Bitbucket?**
A: Yes. Trailers are standard git metadata — they work with any git host.

**Q: Does this work with commitlint or strict CI?**
A: Yes. The installer detects commitlint and switches to compatible mode (git notes instead of trailers).

**Q: Will this mess up my existing commits?**
A: No. The system only adds trailers to new commits. Existing history is never modified.

**Q: Can I uninstall it?**
A: Yes. Say "remove git-memory" to Claude. It removes the runtime but keeps your git history — commits with trailers stay intact forever.

**Q: Does it work with monorepos?**
A: Yes. The scout detects Turborepo, Nx, Lerna, pnpm workspaces, Rush, and Moon. It builds a scope map so Claude knows which package a commit belongs to.

**Q: What if Claude's context gets compressed?**
A: The Hippocampus hook extracts critical memory before compression and re-injects it. Decisions, memos, and pending items survive.

**Q: What if I rebase or force-push?**
A: Claude detects the amnesia on next session start, rebuilds memory from current state, and warns about any gaps.

---

<p align="center">
  <strong>MIT License</strong><br>
  <em>Built for Claude Code.</em>
</p>
