---
name: unmassk-gitmemory
description: Use this skill when user mentions memory, resume, context, decision, memo, remember, or when starting a new session in a git repository. Also when user says "what did we decide", "what's pending", or discusses preferences/requirements worth saving.
---

# Git Memory — Core

Git is the memory. Every commit is resumable. Claude handles git — the user focuses on work.

## Rules

1. Never commit to `main` directly
2. Never commit without trailers (hooks enforce it for Claude; humans get warnings only)
3. `context()`, `decision()`, `memo()`, `remember()` always use `--allow-empty`
4. If conflict/risky op → stop (see Safety section below)
5. Claude writes trailers automatically — never ask the user to write them

## Two Modes: Capture vs Safety

This skill has two distinct behaviors. They are NOT contradictory — they apply to different situations:

**Capture mode** (memory commits) → **silent, automatic, no confirmation**:
- `wip:` — silent checkpoint
- `decision()` — architecture choice detected → commit immediately, inform in one line
- `memo()` — preference/requirement detected → commit immediately, inform in one line
- `remember()` — personality note → commit immediately, inform in one line

**Safety mode** (dangerous git ops) → **always confirm before acting**:
- `squash` / `reset --soft HEAD~N` — show what will be squashed, wait for "ok"
- `context()` — show the message, wait for "ok"
- `reset --hard` — show what will be lost, require explicit confirmation
- `push --force` — feature branches only, require explicit confirmation
- `rebase` — require explicit "I understand the risk"

Capture never asks. Safety always asks. No exceptions.

## Memory Policy

> "Write little, read often, confirm when it hurts to be wrong."

Write ONLY if: user asked explicitly, affects future sessions, prevents real loss, or is a confirmed decision.
Do NOT write: provisional observations, weak inferences, session-only context.

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

## Hierarchical Scopes

Use **hierarchical scopes** separated by `/` in commit subjects. Max 2 levels deep.

Examples:
- `feat(backend/api): add rate limiting`
- `decision(frontend/ux): usar glassmorphic style`
- `memo(backend/auth): preference - JWT over sessions`

**Scope map:** read `.claude/git-memory-scopes.json` if it exists. To generate or update scopes, use an Explore agent to analyze the project structure and write the JSON. You can use unlisted scopes — the map is a guide, not a constraint.

## Commit Types

| Emoji | Type | When |
|-------|------|------|
| ✨ | `feat` | New functionality |
| 🐛 | `fix` | Bug fix |
| ♻️ | `refactor` | Restructure, no behavior change |
| ⚡ | `perf` | Performance |
| 🧪 | `test` | Tests only |
| 📝 | `docs` | Docs only |
| 🔧 | `chore` | Maintenance |
| 👷 | `ci` | Pipeline |
| 🚧 | `wip` | Silent checkpoint (auto-created, no trailers needed, squash before merge) |
| 💾 | `context` | Session bookmark (--allow-empty) |
| 🧭 | `decision` | Architecture/design choice (--allow-empty) |
| 📌 | `memo` | Soft knowledge (--allow-empty) |
| 🧠 | `remember` | Personality/working-style note between sessions (--allow-empty) |

Format: `<emoji> type(scope): description`. Emoji mandatory.

## Trailer Spec

Every non-wip commit. Trailers at end of body, contiguous block, no blank lines between them.

| Key | Format | Required for |
|-----|--------|-------------|
| `Issue:` | CU-xxx or #xxx | All if branch has issue ref |
| `Why:` | 1 line | code/context/decision commits |
| `Touched:` | paths from real diff | code commits |
| `Decision:` | 1 line | decision() |
| `Next:` | 1 line | context() + if work remains |
| `Blocker:` | 1 line | if blocked |
| `Risk:` | low/medium/high | if applicable |
| `Memo:` | category - desc | memo() (preference/requirement/antipattern) |
| `Remember:` | category - desc | remember() (user/claude personality note) |
| `Conflict:` + `Resolution:` | 1 line each | merge conflict resolution |

Keys are case-sensitive, max once per commit, single-line values.

## Auto-Git Triggers

| Situation | Action |
|-----------|--------|
| Code changes + stop hook fires | `wip:` silent auto-commit (NEVER ask the user) |
| 3+ consecutive wips accumulated | Evaluate: suggest squash or proper commit at natural milestones |
| Task complete | Squash WIPs + final commit + merge to dev |
| "I'm done" / "tomorrow" | `context()` with Next/Blocker |
| Design choice made | `decision()` |
| Preference/requirement stated | `memo()` |
| "remember that I..." / personality note | `remember()` |
| Claude notices working-style pattern | `remember(claude)` — sparingly |
| Dev advanced | Merge dev into current branch |

## Next <-> Issues

Next: trailers auto-create GitHub issues via git-memory-commit.py.
Format: `Next: description #issue-number`
The commit script handles issue creation — Claude doesn't need to call gh manually.
Resolved-Next: trailers auto-close the referenced issue.
For advanced issue management (milestones, templates, checklists) -> skill `unmassk-gitmemory-issues`.

## Wip Strategy

wip commits are silent checkpoints. The stop hook creates them automatically when it detects uncommitted changes. Rules:
- Use descriptive subjects: `wip: refactor auth middleware` not just `wip`
- Never ask the user before creating a wip — they are noise-free by design
- After 3+ consecutive wips, the stop hook suggests a checkpoint. Evaluate with judgement:
  - If you just completed a feature/fix/refactor → suggest squashing into a real commit with trailers
  - If the user is mid-flow → let the wips accumulate, don't interrupt
  - Squashing means: `git reset --soft HEAD~N` + proper commit with Why/Touched/etc. trailers
- wip commits NEVER have trailers. They are temporary by definition.

## Conversational Capture

A `UserPromptSubmit` hook fires on EVERY user message and injects a `[memory-check]` reminder. When you see it, evaluate the user's message:

**Decision signals** → `decision()` immediately:
- "let's go with X", "decided", "we'll use Y", "go with Z"
- "the approach is X", "final answer: Y"

**Memo signals** → `memo()` with category:
- "always X" / "never Y" / "from now on" → `memo(preference)`
- "client wants X" / "it must" / "mandatory" → `memo(requirement)`
- "don't ever do X again" / "that broke because" → `memo(antipattern)`

**Remember signals** → `remember()` personality/working-style notes:
- "remember that I X", "recuerda que yo X", "don't forget I X" → `remember(user)`
- If the content is about the project ("remember we decided X") → use `decision()` instead
- If the content is about a project preference ("remember to always use X") → use `memo()` instead
- Default to `remember()` when it's about the person, not the project

**Claude-initiated remembers** → `remember(claude)`:
- ONLY after seeing the **same pattern at least 2 times** in the current session
- ONLY for patterns that caused friction or miscommunication (e.g., you assumed something and the user corrected you twice)
- NEVER from a single observation. One correction is feedback, not a pattern.
- Examples that warrant it: "user corrected me 3 times for assuming X", "user always responds in Spanish even when I write in English"
- Examples that do NOT: "user seems tired today", "user typed fast", "user used an emoji once"

**Not memory-worthy** (ignore silently):
- Questions, brainstorming, "what if", "maybe", "let's explore"
- Temporary debugging, one-off instructions
- Already captured in an existing decision/memo/remember

**When detected**:
1. Create the commit immediately with `--allow-empty`
2. Inform the user in ONE line: "📌 memo saved: ..." or "🧭 decision saved: ..." or "🧠 remember saved: ..."
3. Do NOT ask for confirmation. Do NOT propose. Just do it.

**Uncertain cases**: if the user clearly made a statement but you're unsure whether it's a decision, memo, or remember — pick the closest type and commit. Miscategorized > lost. But if you can't tell whether the user is stating something or just thinking out loud — **don't commit**. When in doubt about intent, silence beats noise.

## Memory Search (before asking the user)

1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
3. `git log --all --grep="Remember:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
4. Check CLAUDE.md and `~/.claude/MEMORY.md`
5. Only if no match: ask the user

**Contradiction detection**: before creating decision/memo, search same scope. Warn if conflict exists. Most recent always wins.

## Protocol

### Authority Hierarchy

1. User instruction in conversation (highest)
2. Confirmed memory (decisions/memos with commit)
3. CLAUDE.md of the project
4. Other context files (.cursorrules, docs)
5. Code inferences (lowest)

If conflict between sources: acknowledge openly, defer to most recent user confirmation.

### Noise Levels

| Level | When | Action |
|-------|------|--------|
| **silent** | All OK | Zero output |
| **inline** | Warning, not blocking | Mention only if asked or relevant |
| **interrupt** | Capacity loss (hooks broken, runtime absent) | Warn before working |

### Confidence Levels

| Level | Example | Action |
|-------|---------|--------|
| Fact | "Uses TypeScript 5.3" | `memo(stack)` — commit immediately |
| Decision | "let's go with dayjs" | `decision()` — commit immediately |
| Preference | "Always async/await" | `memo(preference)` — commit immediately |
| Hypothesis | "Seems like monorepo" | Do NOT save. Investigate first. |

## Safety

### Branches

Base: `dev`. Work in `feat/*`, `fix/*`, `chore/*`. 1 issue = 1 branch. Default merge (not rebase).

### Conflict Resolution

- Default: merge, not rebase. If conflict: **stop**, don't improvise.
- Resolution commits MUST include: `Conflict:` + `Resolution:` + `Why:` + `Touched:` + `Risk:`
- Force push to `main`: **FORBIDDEN**.
- Force push to `staging`: only with explicit approval + documented reason + `Risk: high`.
- Rebase: only with explicit user request and risk acceptance.

### Undo Operations

| Operation | Risk | Confirm? |
|-----------|------|----------|
| `reset --soft HEAD~1` | low | No |
| `stash push/pop` | low | No |
| `revert <sha>` | low | No (creates new commit) |
| `amend` (before push) | low | No |
| `amend` (after push) | **high** | YES |
| `reset --hard` | **high** | YES — show what will be lost first |
| `push --force-with-lease` | **high** | YES — feature branches only |
| `push --force` main/staging | **FORBIDDEN** | N/A |

Any `rebase`, `push --force`, `reset --hard` → **STOP**. Use this confirmation format:

```
⚠️ DANGEROUS OPERATION: <command>
Branch: <branch-name>
Risk: <high>

This can cause:
- <consequence 1>
- <consequence 2>

Type "I understand the risk, proceed" to continue.
```

### Merge Rules

- **Always `--no-ff`** when merging to dev: `git merge --no-ff <branch>`. This preserves the branch history and creates a merge commit that hooks can detect.
- **Pre-merge checklist** (before any merge to dev):
  1. Run lint/format/tests if the project has them
  2. Verify no debug code left (`console.log`, `dd`, `dump`)
  3. Check for uncommitted changes on target branch

### Releases

- PR mandatory: `dev → staging`. Production: `staging → main` with release protocol.
- No `Next:` on main commits. `Risk:` always required on hotfixes.
- PR body auto-generated from trailers.
- Hotfix flow: branch from main → fix → PR to main → **back-merge to dev IMMEDIATELY** (same session, no delay). If you skip this, the bug reappears next time dev merges to staging.

## Routing

- Install, doctor, repair, uninstall, recovery, modes of operation → `unmassk-gitmemory-lifecycle` skill
