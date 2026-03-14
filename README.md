<p align="center">
  <img src="logo.png" alt="unmassk-gitmemory" width="180">
</p>

<h1 align="center">unmassk-gitmemory</h1>

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
  <a href="#agents">Agents</a> &nbsp;·&nbsp;
  <a href="#faq">FAQ</a> &nbsp;·&nbsp;
  <a href="#updating--troubleshooting">Troubleshooting</a>
</p>

---

## The problem

Every time Claude starts a new session, it forgets everything:

- *Who decided to use dayjs instead of moment?*
- *What's the user's preference for arrow functions?*
- *What's blocking the deployment right now?*

You end up repeating yourself, re-explaining decisions, and watching Claude reinvent wheels.

**unmassk-gitmemory fixes this.** After installing it, Claude remembers everything -- across sessions, machines, and context resets. You don't need to do anything special. Just talk to Claude like you always do.

---

## How it works

**Git = Memory.** Every commit carries structured metadata (called "trailers") that Claude reads automatically when a session starts. No external files, no databases, no cloud services -- everything lives in your git history.

Here's what a commit looks like with memory:

```
✨ feat(frontend/forms): add date range validation

Issue: CU-042
Why: users submit impossible date ranges crashing the report engine
Touched: src/forms/DateFilter.vue, tests/forms/dateFilter.test.ts
Decision: use dayjs over moment — moment is deprecated and 10x heavier
Next: wire validation into the API layer
```

**You don't write any of that.** Claude writes the trailers automatically from your conversation. When you say "let's go with dayjs", Claude creates a decision commit. When you say "never use sync fs", Claude creates a memo. You just talk.

### What Claude sees when it starts a new session

```
[git-memory-boot] v3.7.0 | ~/.claude/plugins/cache/.../unmassk-gitmemory

STATUS: ok

BRANCH: feat/CU-042-filters [0/2 vs upstream]
  PULL RECOMMENDED: remote is 2 ahead

SCOPES:
  frontend: UI components — forms, filters, date pickers [frontend/forms, frontend/ux]
  backend: API and auth — rate limiting, OAuth, JWT [backend/api, backend/auth]
  infra: CI/CD and deployment [infra/ci, infra/deploy]

RESUME:
  Last: a3f2b1c 💾 context(forms): pause forms refactor | 2h ago
  Issue (from branch): #42
  Next: a3f2b1c: wire validation into API layer
  Blocker: none

REMEMBER:
  (user) gets frustrated when assumptions are made — ask first
  (claude) prefers direct answers, no filler

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
```

No questions. It knows where you left off, what scopes exist, and what matters. One tool call (loading the skill), zero bash commands.

---

## Quick start

**Step 1:** Add the repository as a marketplace source:

```
/plugin marketplace add https://github.com/unmasSk/claude-toolkit
```

**Step 2:** Install the plugin (use the interactive menu, NOT the URL):

```
/plugin
```

Then select `unmassk-gitmemory` from the list. Choose your scope:
- **User** (default): for yourself across all projects
- **Project**: for all collaborators on this repository (saved in `.claude/settings.json`)
- **Local**: for yourself in this repo only

> **Important:** `/plugin install` does NOT accept URLs. You must add the marketplace first, then install by name from the interactive menu.

### What happens after installing

That's it. **No configuration needed.** When Claude starts a session in your project, the plugin activates automatically:

1. **Hooks register** -- pre-commit validation, post-commit safety net, session start, user message, session exit, context compression
2. **Skills load** -- core memory rules + lifecycle management + issues/milestones (3 skills)
3. **Agents available** -- Gitto (memory oracle) + Alexandria (documentation agent)
4. **Auto-boot runs** -- silent health check + memory summary + scope map + full glossary
5. **CLAUDE.md updated** -- a minimal managed block pointing to the skills
6. **Scope map generated** -- if missing, boot instructs Claude to generate it via Explore agent

**Nothing gets copied to your project root** except `CLAUDE.md` and `.claude/git-memory-manifest.json`. The plugin runs entirely from the plugin cache at `~/.claude/plugins/cache/`.

### Requirements

- Python 3.10+
- Git
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v1.0.33+ (plugin support)

---

## You never run commands

This is the most important thing to understand:

**You never run CLI commands for the memory system. Claude handles everything.**

- Session start? Claude runs the health check and shows a memory resume.
- Need to search old decisions? Just ask: "what did we decide about auth?"
- Memory system broken? Claude detects and repairs it.
- Want to clean stale items? Say "clean up old blockers".
- Want to uninstall? Say "remove git-memory".

The CLI commands exist, but they're for Claude to use internally -- not for you. You just talk.

---

## What you say vs. what Claude does

You don't need to learn any syntax. Claude detects intent from natural language:

| You say | Claude does |
|---------|-------------|
| "let's go with X" | Saves the decision immediately, tells you in one line |
| "always use X" / "never use Y" | Saves your preference immediately |
| "the client requires X" | Saves the requirement immediately |
| "don't ever do X again" | Saves the anti-pattern immediately |
| "remember that I prefer short answers" | Saves a personality note that future sessions will read |
| "I need to stop here" / "pause" | Bookmarks your progress so the next session picks up where you left off |
| "what did we decide about auth?" | Searches memory before asking you |
| "create an issue for X" | Creates a GitHub issue with full template |

Decisions, memos, and remembers are captured **without asking** -- Claude commits immediately and tells you what it saved in one line. No friction, no "ok?" prompts. Context bookmarks show the message before committing.

---

## What gets remembered

### Code commits (`feat`, `fix`, `refactor`, `perf`, `chore`, `ci`, `test`, `docs`)

Normal development work. Claude adds trailers automatically:

```
✨ feat(backend/auth): add OAuth2 login flow

Why: users need to sign in with Google accounts
Touched: src/auth/oauth.ts, src/routes/login.ts
Issue: CU-101
```

Required trailers: `Why:` + `Touched:` (+ `Issue:` if the branch name has one)

### Context bookmarks -- `context(scope)`

Created when you pause work or end a session:

```
💾 context(backend/api): pause — switching to urgent bugfix

Why: need to handle prod incident before continuing API refactor
Next: finish rate limiting middleware after bugfix
```

Required: `Why:` + `Next:`

### Decisions -- `decision(scope)`

```
🧭 decision(backend/auth): use JWT over session cookies

Why: API needs to be stateless for horizontal scaling
Decision: JWT with 15min access + 7d refresh tokens
```

Required: `Why:` + `Decision:`

### Memos -- `memo(scope)`

```
📌 memo(backend/api): preference — always use async/await over .then() chains

Memo: preference - async/await is more readable, team standard
```

Required: `Memo:` with category (`preference`, `requirement`, `antipattern`, or `stack`)

### Remembers -- `remember(scope)`

Personality and working-style notes between sessions. Two subtypes:

- **User remembers** -- explicit notes from you about yourself: `remember(user)`
- **Claude remembers** -- observations Claude makes about how you work: `remember(claude)`

Remembers are NOT about the project -- they're about the person. "Always use async/await" is a memo. "This user gets frustrated when I assume things" is a remember.

### WIP checkpoints

Temporary saves during work. Claude creates these automatically. No trailers required. Feature branches only. Squashed before merge.

---

## Hierarchical scopes

Commit scopes use a hierarchical format separated by `/`, max 2 levels:

```
feat(backend/api): add rate limiting
decision(frontend/ux): use glassmorphic style
memo(backend/auth): preference - JWT over sessions
```

On first install, Claude automatically analyzes your project structure and generates a scope map. The SCOPES section in the boot output shows these scopes every session, so Claude always knows the structure of your project.

---

## The six hooks

The memory system protects itself with six automatic hooks. You don't configure them -- they activate on install.

| Hook | Nickname | When it runs | What it does |
|------|----------|-------------|--------------|
| **PreToolUse** (Bash) | Belt | Before `git commit` | Blocks Claude's commits if trailers are missing. Blocks direct `git commit`/`git log` -- Claude must use wrapper scripts. Human commits get a warning only, never blocked. |
| **PostToolUse** (Bash) | Suspenders | After `git commit` | Safety net. If a bad commit slips through and hasn't been pushed, rolls it back safely (`reset --soft`). |
| **SessionStart** | Boot | When Claude starts a session | Complete structured briefing -- silent health check + memory extraction + glossary (cached) + branch context + scopes. Outputs: STATUS, BRANCH, SCOPES, RESUME, REMEMBER, DECISIONS, MEMOS, TIMELINE. |
| **UserPromptSubmit** | Radar | Every time you send a message | Injects `[memory-check]` reminder so Claude evaluates if your message contains a decision, preference, or requirement worth saving. Also handles context-window warnings. |
| **Stop** | DoD | When Claude ends a session | Never blocks. Creates silent wip commits for uncommitted changes. Mandates a `context()` commit before session end. Checks if decisions were discussed but not captured. |
| **PreCompact** | Hippocampus | Before Claude compresses context | Extracts a compact memory snapshot (~18 lines) and re-injects it so decisions, memos, and pending items survive compression. |

### How Belt + Suspenders work together

**Belt** (PreToolUse) catches problems before the commit happens. But some commit formats can't be parsed in advance (heredocs, `-F` flag). For those cases, **Suspenders** (PostToolUse) reads the actual commit after it lands and rolls it back if invalid.

- If HEAD hasn't been pushed: safe rollback with `reset --soft HEAD~1` (changes stay staged)
- If HEAD has been pushed: suggests a correction commit (never force-pushes)

---

## Garbage collector

Stale `Next:` and `Blocker:` items accumulate over time. Say "clean up stale items" or "run gc" and Claude handles it.

| Heuristic | What it detects | How |
|-----------|----------------|-----|
| **H1** -- keyword overlap | `Next:` items already done | Newer commits in the same scope share 2+ keywords with the Next: text |
| **H2** -- TTL expiry | `Blocker:` items gone stale | Blockers older than 30 days with no recent mention |
| **H3** -- explicit resolution | Items resolved by a `Resolution:` trailer | Paired with `Conflict:` in merge conflict commits |

The GC **never deletes commits**. It creates tombstone trailers (`Resolved-Next:`, `Stale-Blocker:`) that hide cleaned items from future snapshots. Fully reversible with `git revert`.

---

## Agents

### Gitto -- Memory oracle

Gitto is a read-only subagent that answers questions about past decisions, preferences, requirements, and pending work. Claude delegates to Gitto automatically when you ask about the project's memory.

**Key properties:**
- **Read-only.** No commits, no file writes, no edits.
- **Deep search.** Queries full git history, not just recent commits.
- **Contradiction detection.** If two decisions in the same scope contradict, shows both with the most recent marked as active.
- **Result limits.** Maximum 10 results per query, with a count of older results.

### Scope generation

On first session (or when `git-memory-scopes.json` is missing), boot detects the absence and instructs Claude to launch an Explore agent that analyzes your project structure and generates a hierarchical scope map at `.claude/git-memory-scopes.json`. This replaces the former Scout agent -- no dedicated agent needed for a one-time task.

### Alexandria -- Documentation agent

Alexandria is a **project-level agent** that lives in your project's `.claude/agents/alexandria.md`. She maintains CLAUDE.md files, detects documentation staleness, and manages the CHANGELOG in Keep a Changelog format.

### Roadmap

**VS Code Extension** (`unmassk-gitmemory-vscode`) -- Real-time timeline of git-memory activity in the VS Code sidebar. Research and design complete, implementation not started.

---

## Context awareness

The plugin monitors Claude's context window usage and warns before auto-compaction hits.

A **statusline wrapper** (`context-writer.py`) intercepts Claude Code's session data and writes context stats to `<project>/.claude/.context-status.json`. The UserPromptSubmit hook reads this file and warns Claude in real-time:

| Context used | Output |
|-------------|---------|
| < 60% | `[CTX: N%]` shown every message (informational, no debounce) |
| 60-75% | `[context-warning]` -- advisory to consider a context() checkpoint |
| 75%+ | `[CONTEXT CRITICAL]` -- advisory to preserve session state before auto-compact |

Warnings at 60%+ use **debounce**: after the first full warning, the next 5 messages show only `[CTX: N%]` instead of repeating the same message. Severity escalation (warning to critical) bypasses the debounce and fires immediately. If context drops back below 60%, debounce state resets so warnings fire fresh if usage climbs again.

The statusline wrapper is configured automatically on first session start.

---

## Runtime modes

The plugin adapts to your project's constraints automatically:

| Mode | When | What happens |
|------|------|-------------|
| **Normal** | Standard git repo | Full system: hooks + trailers + wrappers |
| **Compatible** | CI or commitlint rejects trailers | Uses git notes instead of commit trailers |
| **Read-only** | No write permissions | Reads existing memory, doesn't create commits |

---

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

---

## FAQ

**Q: Does this work with GitHub/GitLab/Bitbucket?**
A: Yes. Trailers are standard git metadata -- they work with any git host.

**Q: Does this work with commitlint or strict CI?**
A: Yes. The plugin detects commitlint and switches to compatible mode (git notes instead of trailers).

**Q: Will this mess up my existing commits?**
A: No. The system only adds trailers to new commits. Existing history is never modified.

**Q: Does it put files in my project?**
A: Only `CLAUDE.md` (with a managed block) and `.claude/git-memory-manifest.json`. The plugin itself runs entirely from the plugin cache.

**Q: Can I uninstall it?**
A: Yes. Run `/plugin uninstall unmassk-gitmemory` in Claude Code. The CLAUDE.md block and manifest are removed. Commits with trailers stay intact forever.

**Q: Does it work with monorepos?**
A: Yes. On install, the project structure is analyzed to detect Turborepo, Nx, Lerna, pnpm workspaces, Rush, and Moon. A scope map is built so Claude knows which package a commit belongs to.

**Q: What if Claude's context gets compressed?**
A: The Hippocampus hook extracts critical memory before compression and re-injects it.

**Q: What if I rebase or force-push?**
A: Claude detects the amnesia on next session start, rebuilds from current state, and warns about gaps.

**Q: `/plugin update` doesn't work?**
A: Use the interactive menu instead: `/plugin` > marketplace > update.

---

## Updating

To update, run `/plugin` in Claude Code, go to **marketplace**, and select **update**. Your next session uses the new version automatically.

If something breaks after updating, delete `~/.claude/plugins/cache/unmassk-claude-toolkit/` and reinstall.


---

<p align="center">
  <strong>MIT License</strong><br>
  <em>Built for Claude Code.</em>
</p>
