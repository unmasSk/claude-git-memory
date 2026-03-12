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
  <a href="#the-six-hooks">Hooks</a> &nbsp;·&nbsp;
  <a href="#gitto---memory-oracle-agent">Gitto agent</a> &nbsp;·&nbsp;
  <a href="#context-awareness">Context awareness</a> &nbsp;·&nbsp;
  <a href="#updating--troubleshooting">Updating</a>
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

### Option A: Install from GitHub (recommended)

**Step 1:** Add the repository as a marketplace source:

```
/plugin marketplace add https://github.com/unmasSk/claude-git-memory
```

**Step 2:** Install the plugin (use the interactive menu, NOT the URL):

```
/plugin install
```

Then select `claude-git-memory` from the list. Choose your scope:
- **User** (default): for yourself across all projects
- **Project**: for all collaborators on this repository (saved in `.claude/settings.json`)
- **Local**: for yourself in this repo only

> **Important:** `/plugin install` does NOT accept URLs. You must add the marketplace first, then install by name from the interactive menu.

### Option B: Install from the official marketplace

If the plugin is published to the [official Anthropic marketplace](https://github.com/anthropics/claude-plugins-official):

```
/plugin install claude-git-memory@claude-plugins-official
```

### Option C: Local development / testing

Load the plugin directly from a local directory without installing:

```bash
claude --plugin-dir /path/to/claude-git-memory
```

This uses the plugin in-place (no cache copy). Useful for development and testing. Restart Claude Code to pick up changes.

### What happens after installing

That's it. **No configuration needed.** When Claude starts a session in your project, the plugin activates automatically:

1. **Hooks register** — pre-commit, post-commit, session start, user message, session exit, context compression
2. **Skills load** — core memory rules + lifecycle management (2 skills)
3. **Auto-boot runs** — silent health check + memory summary
4. **CLAUDE.md updated** — a managed block is added with memory system instructions

**Nothing gets copied to your project root** except `CLAUDE.md` and `.claude/git-memory-manifest.json`. The plugin runs entirely from the plugin cache at `~/.claude/plugins/cache/`. No `bin/`, `hooks/`, `skills/`, or `lib/` directories clutter your project.

The plugin uses `${CLAUDE_PLUGIN_ROOT}` internally to locate its own hooks and scripts. Claude Code discovers hooks from `hooks/hooks.json` automatically.

### Requirements

- Python 3.10+
- Git
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v1.0.33+ (plugin support)

---

## Updating & troubleshooting

### For developers: releasing a new version

When you make changes to the plugin code, **you MUST bump the version** or the changes won't reach users. Claude Code caches plugins keyed by `name + version` — same version = same cache, no matter what changed in the code.

**Version bump checklist (ALL of these, every time):**

| File | What to change |
|------|---------------|
| `.claude-plugin/plugin.json` | `"version": "X.Y.Z"` |
| `.claude-plugin/marketplace.json` | `"version": "X.Y.Z"` (MUST match plugin.json) |
| `bin/git-memory-install.py` | `VERSION = "X.Y.Z"` |
| `bin/git-memory-doctor.py` | `VERSION = "X.Y.Z"` |
| `bin/git-memory-bootstrap.py` | `VERSION = "X.Y.Z"` |
| `bin/git-memory-upgrade.py` | `VERSION = "X.Y.Z"` |
| `skills/git-memory-lifecycle/SKILL.md` | version in example manifest |
| `tests/*.py` | version assertions (3 files) |

**Semver rules:** PATCH (3.1.0 → 3.1.1) for bugfixes. MINOR (3.1.0 → 3.2.0) for new features. MAJOR (3.x → 4.0.0) for breaking changes.

After pushing, users need to refresh their plugin cache (see below).

### Updating the plugin (for users)

> **Known issue (as of March 2026):** `/plugin update` does NOT invalidate the plugin cache. This is a [confirmed Claude Code bug](https://github.com/anthropics/claude-code/issues/14061). Running `/plugin update claude-git-memory` will say "already at latest version" even when a new version exists.

**To update, you must do all 5 steps in order:**

```bash
# Step 1: Delete the stale cache (run in your terminal, NOT in Claude Code)
rm -rf ~/.claude/plugins/cache/unmassk-claude-git-memory/

# Step 2: Uninstall (in Claude Code)
/plugin uninstall claude-git-memory

# Step 3: Remove the marketplace
/plugin marketplace remove unmassk-claude-git-memory

# Step 4: Re-add the marketplace (fetches fresh from GitHub)
/plugin marketplace add https://github.com/unmasSk/claude-git-memory

# Step 5: Reinstall (use the interactive menu)
/plugin install
# Select claude-git-memory from the list
```

**Why all these steps?** Claude Code caches plugin files keyed by name + version. Even after uninstall, the cache directory persists. And even after re-adding the marketplace, the old cache is reused if the directory still exists. The only reliable way is: delete cache → uninstall → remove marketplace → re-add → reinstall.

**Important:** Until you refresh the cache, your projects will keep using the OLD version. The CLAUDE.md managed block, hooks, and skills all run from the cache, not from the source repo.

### The marketplace.json matters

The version in `.claude-plugin/marketplace.json` is what Claude Code uses to determine whether an update is available. If `marketplace.json` says `2.0.0` but `plugin.json` says `3.0.0`, Claude Code will think the plugin is at `2.0.0`. **Both files must have the same version.**

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `/plugin update` says "already at latest" | Cache not invalidated (known bug) | Follow the 5-step update process above |
| `/plugin install <URL>` says "Marketplace not found" | `/plugin install` doesn't accept URLs | Use `/plugin marketplace add <URL>` first, then `/plugin install` from menu |
| Hooks error "can't open file" after update | Stale cache pointing to old version directory | Delete `~/.claude/plugins/cache/unmassk-claude-git-memory/` and reinstall |
| Stop hook blocks in infinite loop | Cache was deleted but plugin still registered | Ctrl+C to kill, then restore cache manually or reinstall |
| All Bash commands blocked | PreToolUse hook references deleted cache path | Kill session (Ctrl+C), restore cache or reinstall in a new terminal |

### Deadlock recovery

If you delete the plugin cache while a session is running, you'll enter a deadlock: hooks can't find their scripts, and you can't use Bash to fix it because the PreToolUse hook blocks every command.

**To recover:**

1. Kill the Claude Code session (Ctrl+C or close terminal)
2. In a normal terminal, either:
   - Restore the cache: `mkdir -p ~/.claude/plugins/cache/unmassk-claude-git-memory/claude-git-memory/<version>/ && cp -R <plugin-source>/* <that-dir>/`
   - Or reinstall cleanly: follow the 5-step update process above
3. Start a new Claude Code session

---

## You never run commands

This is the most important thing to understand:

**You never run CLI commands for the memory system. Claude handles everything.**

- Session start? Claude runs the health check and shows a memory resume.
- Need to search old decisions? Just ask: "what did we decide about auth?"
- Memory system broken? Claude detects and repairs it.
- Want to clean stale items? Say "clean up old blockers".
- Want to uninstall? Say "remove git-memory".

The CLI commands exist, but they're for Claude to use internally — not for you. You just talk.

---

## Hierarchical scopes

Commit scopes use a hierarchical format separated by `/`, max 2 levels:

```
feat(backend/api): add rate limiting
decision(frontend/ux): use glassmorphic style
memo(backend/auth): preference - JWT over sessions
```

On first install, Claude launches a **scope scout agent** that inspects your project structure and generates a scope map at `.claude/git-memory-scopes.json`. You can also say "scan scopes" at any time to regenerate it.

The scope map is a guide, not a constraint — Claude can use unlisted scopes when they make sense.

---

## What you say vs. what Claude does

You don't need to learn any syntax. Claude detects intent from natural language:

| You say | Claude does |
|---------|-------------|
| "let's go with X" | Creates a `decision()` commit immediately, informs you in one line |
| "always use X" / "never use Y" | Creates a `memo(preference)` immediately, informs you in one line |
| "the client requires X" | Creates a `memo(requirement)` immediately, informs you in one line |
| "don't ever do X again" | Creates a `memo(antipattern)` immediately, informs you in one line |
| "I need to stop here" / "pause" | Creates a `context()` bookmark with Next: |
| "what did we decide about X?" | Searches memory before asking you |

Decisions and memos are captured without asking — Claude commits immediately and tells you what it saved in one line. No friction, no "ok?" prompts. Context bookmarks still show the message before committing.

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

## The six hooks

The memory system protects itself with six automatic hooks. You don't configure them — they activate on install.

| Hook | Nickname | When it runs | What it does |
|------|----------|-------------|--------------|
| **Pre-commit** | Belt | Before `git commit` | Blocks Claude's commits if trailers are missing. Human commits get a warning only — never blocked. |
| **Post-commit** | Suspenders | After `git commit` | Safety net. If a bad commit slips through and hasn't been pushed, rolls it back safely (`reset --soft`). |
| **Session start** | Boot | When Claude starts a session | Silent health check + memory extraction from last 30 commits. Shows a compact summary. |
| **User message** | Radar | Every time you send a message | Injects a `[memory-check]` reminder so Claude evaluates if your message contains a decision, preference, or requirement worth saving. |
| **Session exit** | DoD | When Claude ends a session | Never blocks. If there are uncommitted changes, instructs Claude to create a silent wip commit. If wips accumulate (3+), suggests squashing into a proper commit at natural milestones. Also checks if decisions were discussed but not captured. |
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

## Garbage collector

Stale `Next:` and `Blocker:` items accumulate over time. The GC cleans them using three heuristics:

| Heuristic | What it detects | How |
|-----------|----------------|-----|
| **H1** — keyword overlap | `Next:` items already done | If newer commits in the same scope share 2+ keywords with the Next: text, it's likely resolved |
| **H2** — TTL expiry | `Blocker:` items gone stale | Blockers older than 30 days with no recent mention |
| **H3** — explicit resolution | Items resolved by a `Resolution:` trailer | Paired with `Conflict:` in merge conflict commits |

The GC **never deletes commits**. It creates a new commit with tombstone trailers (`Resolved-Next:`, `Stale-Blocker:`) that hide cleaned items from future snapshots. Fully reversible with `git revert`.

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

## Runtime modes

The plugin adapts to your project's constraints automatically:

| Mode | When | What happens |
|------|------|-------------|
| **Normal** | Standard git repo | Full system: hooks + trailers + CLI |
| **Compatible** | CI or commitlint rejects trailers | Uses git notes instead of commit trailers |
| **Read-only** | No write permissions | Reads existing memory, doesn't create commits |

If Claude detects a commitlint config or strict CI pipeline, it switches to compatible mode automatically. No action needed from you.

---

## Self-healing

Claude doesn't just install the system — it maintains it:

| Situation | What Claude does |
|-----------|-----------------|
| CLAUDE.md block missing | Recreates the managed block on next session |
| Manifest missing/corrupt | Regenerates from install script |
| Old-style install files at root | Cleans up on next install |
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

The memory system has a full CLI. **Claude runs all of these automatically — you never need to type them.** They're documented here so you know what's happening under the hood.

### What you say → what Claude runs

| You say | Claude runs | What happens |
|---------|------------|--------------|
| *(start a session)* | `git memory boot` | Shows memory summary: branch, pending items, decisions, memos |
| "what did we decide about auth?" | `git memory search "auth"` | Searches all decisions, memos, and pending items |
| "show me all decisions" | `git memory decisions` | Lists every architecture decision in the project |
| "any pending work?" | `git memory pending` | Shows all unfinished Next: items |
| "what memos do we have?" | `git memory memos` | Lists all preferences, requirements, and antipatterns |
| "anything blocking us?" | `git memory blockers` | Shows all active blockers |
| "is the memory system healthy?" | `git memory doctor` | Full diagnostic: plugin cache, CLAUDE.md, manifest, GC status, version |
| "something's broken" | `git memory repair` | Checks CLAUDE.md and manifest, fixes what's broken |
| "clean up old stuff" | `git memory gc` | Garbage collects stale Next/Blocker items with tombstones |
| "scan this project" | `git memory bootstrap` | Scouts stack, frameworks, monorepo patterns, CI config |
| "install memory system" | `git memory install` | Writes CLAUDE.md block + manifest (plugin runs from cache, nothing copied to root) |
| "upgrade memory system" | `git memory upgrade` | Safe version migration with backup |
| "remove memory system" | `git memory uninstall` | Removes CLAUDE.md block + manifest, keeps git history intact |

All commands support `--json` for machine-readable output and `--auto` for non-interactive mode.

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

Everything below lives in the plugin cache (`~/.claude/plugins/cache/`), **not** in your project. The only files written to your project are `CLAUDE.md` and `.claude/git-memory-manifest.json`.

```
claude-git-memory/
├── .claude-plugin/
│   ├── plugin.json                         # Plugin manifest (name, version, entry points)
│   └── marketplace.json                    # Marketplace metadata (version MUST match plugin.json)
├── agents/
│   └── gitto.md                            # Memory oracle subagent (read-only)
├── hooks/
│   ├── hooks.json                          # Hook registration (Claude Code reads this)
│   ├── pre-validate-commit-trailers.py     # Belt — blocks bad commits
│   ├── post-validate-commit-trailers.py    # Suspenders — safety net
│   ├── session-start-boot.py              # Boot — auto-boot + memory summary
│   ├── user-prompt-memory-check.py        # Radar — memory signal reminder
│   ├── precompact-snapshot.py              # Hippocampus — memory before compression
│   └── stop-dod-check.py                  # DoD — silent wip + checkpoint suggestions
├── skills/
│   ├── git-memory/                         # Core: boot, search, trailers, workflow, protocol, recovery
│   └── git-memory-lifecycle/               # Doctor, repair, install, uninstall
├── bin/
│   ├── git-memory                          # CLI router (bash)
│   ├── context-writer.py                   # Statusline wrapper — context window tracking
│   ├── git-memory-install.py               # Transactional installer
│   ├── git-memory-doctor.py                # Health check
│   ├── git-memory-repair.py                # Runtime repair
│   ├── git-memory-uninstall.py             # Clean removal
│   ├── git-memory-upgrade.py               # Safe version migration
│   ├── git-memory-bootstrap.py             # Project scout
│   └── git-memory-gc.py                    # Garbage collector
├── archived/
│   └── dashboard/                          # Dashboard generator (deactivated, preserved for future use)
├── lib/
│   ├── constants.py                        # Trailer keys, commit types, risk levels
│   ├── git_helpers.py                      # Git subprocess wrappers
│   ├── parsing.py                          # Commit parsing, trailer extraction
│   └── colors.py                           # ANSI terminal colors
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

49 tests across 5 suites:

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

## Gitto - Memory oracle agent

Gitto is a read-only subagent that answers questions about past decisions, preferences, requirements, and pending work. Claude delegates to Gitto automatically when you ask about the project's memory.

| You ask | Gitto does |
|---------|-----------|
| "what did we decide about auth?" | Searches all `Decision:` trailers across the full git history |
| "any pending tasks?" | Finds all unresolved `Next:` trailers |
| "what preferences do we have?" | Lists all `Memo:` trailers by scope |
| "what's blocking us?" | Shows all active `Blocker:` trailers |

Gitto uses `git log --all --grep` to search the entire history, not just the last 30 commits. Results are formatted as structured markdown, grouped by scope, sorted newest first.

**Key properties:**
- **Read-only.** No commits, no file writes, no edits.
- **Deep search.** Queries full git history, not just recent commits.
- **Contradiction detection.** If two decisions in the same scope contradict, shows both with the most recent marked as active.
- **Result limits.** Maximum 10 results per query, with a count of older results.
- **Fallback.** If the `git memory` CLI is not available, falls back to raw `git log --grep`.

Gitto is auto-discovered by Claude Code from the plugin's `agents/` directory. No configuration needed.

---

## Context awareness

The plugin monitors Claude's context window usage and warns before auto-compaction hits. This prevents losing session state when context fills up (~80% threshold).

### How it works

Claude Code sends JSON session data (including `context_window.used_percentage`) to the statusline command after every message. A **statusline wrapper** (`context-writer.py` in `bin/`) intercepts this data:

1. Writes context stats to `<project>/.claude/.context-status.json`
2. Passes the JSON through to your original statusline (so it still works normally)

The stop hook reads this file and shows warnings:

| Context used | Warning |
|-------------|---------|
| < 60% | No warning |
| 60-75% | Yellow: "Consider creating a context() commit" |
| 75%+ | Red: "CONTEXT CRITICAL. Auto-compact imminent. Create context() commit NOW" |

The install script configures the wrapper automatically, backing up your original statusline. Uninstall restores it.

---

## Silent wip strategy

The stop hook never blocks the session. Instead, it uses a silent wip strategy:

1. **Uncommitted changes?** Claude creates a `wip:` commit automatically, without asking.
2. **3+ consecutive wips?** Claude evaluates if it's a good time to suggest squashing them into a proper commit with trailers.
3. **Natural milestones** (feature complete, bug fixed, refactor done) trigger the suggestion. Trivial wips accumulate silently.

This means you never get interrupted by "choose an option" dialogs, and your work is always saved.

---

## Roadmap

### v5.0 — VS Code Extension (`claude-git-memory-vscode`)

> **Status: Parked.** Research and design complete. Implementation not started.

A VS Code extension that shows a real-time timeline of git-memory activity in the sidebar: wips, decisions, memos, context commits, code commits — all visible as Claude works.

**What's been decided:**

| Decision | Detail |
|----------|--------|
| Repo | Separate: `claude-git-memory-vscode` |
| Visual style | Style E (Glassmorphic) — dual gradients + glow + dark inner details |
| Icon reference | Flow Icons (thang-nm.flow-icons) — rounded-square pastel backgrounds, simple centered symbols |
| Icons | Custom SVG, not emojis. 12 types: feat, fix, refactor, docs, test, chore, perf, ci, wip, context, decision, memo |
| Panel | WebviewView in Activity Bar (not TreeView — too limited for rich cards) |
| Data source | Git native API (`onDidCommit` + trailer parsing). No custom bridge needed |
| Tech stack | TypeScript + esbuild |
| Ask Claude | Copies formatted reference to clipboard (`@git-memory decision <sha> — <text>`) |
| Distribution | Local `.vsix` first, marketplace after validation |

**MVP scope (v0.1):**
- Sidebar panel with custom Activity Bar icon
- Vertical timeline with colored SVG icons per commit type
- Expandable items showing full trailers
- Real-time commit detection via `onDidCommit`
- Text search (local filter, no AI)
- "Ask Claude" button (copies reference to clipboard)

**Future (v0.2+):**
- Gitto-powered semantic search
- AST / RAG search over git history
- Squash group visualization
- Session info (time, counters)

**Research artifacts:** `extension/IDEAS.md`, `extension/mockups/` (5 visual style comparisons, D vs E timeline mockups)

---

## FAQ

**Q: Does this work with GitHub/GitLab/Bitbucket?**
A: Yes. Trailers are standard git metadata — they work with any git host.

**Q: Does this work with commitlint or strict CI?**
A: Yes. The plugin detects commitlint and switches to compatible mode (git notes instead of trailers).

**Q: Will this mess up my existing commits?**
A: No. The system only adds trailers to new commits. Existing history is never modified.

**Q: Does it put files in my project?**
A: Only `CLAUDE.md` (with a managed block) and `.claude/git-memory-manifest.json`. The plugin itself runs entirely from the plugin cache. No `bin/`, `hooks/`, `skills/`, or `lib/` directories are created in your project.

**Q: Can I uninstall it?**
A: Yes. Run `/plugin uninstall claude-git-memory` in Claude Code. The CLAUDE.md block and manifest are removed. Commits with trailers stay intact forever — they're just normal git metadata.

**Q: Does it work with monorepos?**
A: Yes. The scout detects Turborepo, Nx, Lerna, pnpm workspaces, Rush, and Moon. It builds a scope map so Claude knows which package a commit belongs to.

**Q: What if Claude's context gets compressed?**
A: The Hippocampus hook extracts critical memory before compression and re-injects it. Decisions, memos, and pending items survive.

**Q: What if I rebase or force-push?**
A: Claude detects the amnesia on next session start, rebuilds memory from current state, and warns about any gaps.

**Q: `/plugin update` doesn't work?**
A: This is a [known Claude Code bug](https://github.com/anthropics/claude-code/issues/14061). See the [Updating section](#updating--troubleshooting) for the workaround.

---

<p align="center">
  <strong>MIT License</strong><br>
  <em>Built for Claude Code.</em>
</p>
