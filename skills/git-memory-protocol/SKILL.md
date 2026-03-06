---
name: git-memory-protocol
description: Use when dealing with releases, promotions (dev→staging→main), merge conflicts, undo operations, or when questions about authority/priority between memory sources arise.
---

# Git Memory — Protocol

## Authority Hierarchy

1. User instruction in conversation (highest)
2. Confirmed memory (decisions/memos with commit)
3. CLAUDE.md of the project
4. Other context files (.cursorrules, docs)
5. Code inferences (lowest)

If conflict between sources: acknowledge openly, defer to most recent user confirmation.

## Noise Levels

| Level | When | Action |
|-------|------|--------|
| **silent** | All OK | Zero output |
| **inline** | Warning, not blocking | Mention only if asked or relevant to current task |
| **interrupt** | Capacity loss (hooks broken, runtime absent) | Warn before working |

## Confidence Levels

| Level | Example | Action |
|-------|---------|--------|
| Fact | "Uses TypeScript 5.3" | `memo(stack)` |
| Hypothesis | "Seems like monorepo" | Do NOT save without confirmation |
| Decision | "Use dayjs" | `decision()` only if user confirms |
| Preference | "Always async/await" | `memo(preference)` |

## Releases

- PR mandatory: `dev → staging`. Production: `staging → main` with release protocol.
- No `Next:` on main commits. `Risk:` always required on hotfixes.
- PR body auto-generated from trailers: changelog from subjects, `Decision:` aggregated, `Next:` as pending.
- Hotfix flow: branch from main → fix → PR to main → back-merge to dev immediately.

## Conflict Resolution

- Default: merge, not rebase. If conflict: **stop**, don't improvise.
- Resolution commits MUST include: `Conflict:` + `Resolution:` + `Why:` + `Touched:` + `Risk:`
- Force push to `main`: **FORBIDDEN**.
- Force push to `staging`: only with explicit approval + documented reason + `Risk: high`.
- Rebase: only with explicit user request and risk acceptance.

## Undo Operations

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

Decision tree: Pushed to main/staging → `revert` (safe). Not pushed, keep changes → `reset --soft`. Discard → `reset --hard` (confirm + backup branch first).

## Dangerous Operations

Any `rebase`, `push --force`, `reset --hard` → **STOP**. Show: command, branch, risk, consequences. Require explicit "I understand the risk, proceed".

Emergency recovery: `git reflog` → find SHA before reset → `git reset --hard <sha>`. Reflog keeps ~30 days.
