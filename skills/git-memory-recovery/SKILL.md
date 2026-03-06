---
name: git-memory-recovery
description: Use when dealing with rebase, reset --hard, force push, lost commits, CI rejecting trailers, history rewrite, amnesia detection, or cross-branch decision conflicts.
---

# Git Memory — Recovery

## Modes of Operation

| Mode | When | Does | Doesn't |
|------|------|------|---------|
| **Normal** | Standard git repo | Full runtime: hooks + trailers + CLI | — |
| **Compatible** | CI/commitlint rejects trailers | git notes or local store instead | Touch commit messages |
| **Read-only** | No write perms, external repo | Read existing memory | Create commits |
| **Abort** | No git | Explain why and stop | Force anything |

Detected during install inspection. Stored in manifest. If uncertain, ask.

## Self-Healing (rebase/reset detection)

On boot, compare known commit hashes with current tree.
If amnesia detected (memory commits missing):

```
"Seems like a rebase happened. I've rebuilt memory
from current state, but prior design context may be missing."
```

Don't dramatize. Don't fake normalcy. Rebuild conservatively, be honest about gaps.

## Force Push Handling

- Detect history rewrite (known SHAs missing from tree)
- Don't assume "most recent = best"
- Conservative resolution — never invent missing context
- Log what was lost if detectable

## Branch-Aware Decisions

Decisions have scope: repo / branch / path / environment.
Don't deduplicate across branches.

```
"This branch has a different decision than main.
 Treating it as branch-specific context."
```

## CI Rejects Trailers

Check compatibility BEFORE activating writes:
- commitlint active → compatible mode or allowed namespace
- Alternative: git notes for local memory

```
"This repo restricts commit formats.
 Not forcing it — using compatible mode."
```

## Contradiction Detection

Before creating a new decision/memo, search existing:

1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<topic>"`
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<topic>"`

- Memo (antipattern) vs new Decision using that thing → warn: "Contradicts memo [sha]. Confirm override?"
- Decision vs new Decision (same scope) → warn: "Overrides decision [sha]. Confirm?"
- If confirmed → create. Most recent always wins.
- False positives OK — better to warn than miss.

## Emergency: Lost Commits

```bash
git reflog                    # find SHA before the reset
git reset --hard <sha>        # recover (reflog keeps ~30 days)
```

Document recovery with `Risk: high` + `Why:` trailers.
Create backup branch before any destructive recovery: `git branch backup-before-recovery`
