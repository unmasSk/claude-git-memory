---
name: unmassk-gitmemory-issues
description: Use when user explicitly asks to create a GitHub issue, manage milestones, or says "note this for later" / "create an issue" / "add to backlog". Also when Claude detects a bug or improvement while working on something else and needs to park it as an issue. Do not trigger on general mentions of bugs, features, or tasks in conversation.
---

# Git Memory — Issues & Milestones

GitHub Issues as **shared memory** — nothing is lost between sessions, subagents work without previous context, the repo has full traceability.

## Rules

1. 1 issue = 1 unit of work. No vague issues.
2. Every issue MUST include: context + checklist + DoD + how to validate
3. If you detect improvements while working on something else → **create issue, DON'T fix it** (unless critical/security)
4. Before creating: search existing issues to avoid duplicates (`gh issue list --state open`)
5. Claude creates issues from conversation — the user never has to go to GitHub manually
6. All issues use the template in TEMPLATE.md

## When to Create Issues

**User triggers:**
- "note this", "create issue", "do this later", "add to backlog"
- "we need to...", "eventually we should..."
- "this is a bug", "found a bug"

**Claude-detected (propose before creating):**
- Bug or improvement spotted while working on something else
- Technical debt identified during code review
- Security vulnerability found
- Performance bottleneck detected

For Claude-detected issues: propose in one line, create if user confirms. Don't interrupt flow.

## Milestones

Milestones group related issues into a body of work:

```bash
# Create milestone
gh api repos/{owner}/{repo}/milestones -f title="Audit backend" -f description="Enterprise audit of all backend modules" -f due_on="2026-04-01T00:00:00Z"

# Create issue linked to milestone
gh issue create --title "[REFACTOR] Split user.service.ts" --body-file ... --milestone "Audit backend"
```

**When to suggest milestones:**
- User mentions a multi-issue initiative ("audit backend", "migrate to v2", "redesign auth")
- 3+ related issues share a common goal

## Issue Lifecycle

```
User describes work → Claude creates issue with template
        ↓
Claude creates branch: feat/issue-42-slug (or fix/issue-42-slug)
        ↓
During work: wip commits reference the issue
        ↓
Checklist items update as work progresses
        ↓
Merge to dev → issue auto-closes (Closes #42 in commit)
```

## Branch Linking

When starting work on an issue:

```bash
# Extract issue number, create branch
gh issue view 42 --json title,labels -q '.title'
git checkout dev && git pull origin dev
git checkout -b feat/issue-42-<slug>
```

Branch naming:
- `feat/issue-42-<slug>` for features/enhancements
- `fix/issue-42-<slug>` for bugs
- `chore/issue-42-<slug>` for refactors/tech-debt

The `Issue:` trailer in commits links back: `Issue: #42`

## Checklist Updates

On each wip or real commit, compare changed files with the issue checklist. If a checklist item matches completed work, update it:

```bash
# Read current issue body
gh issue view 42 --json body -q .body

# Update checklist (mark completed items)
gh issue edit 42 --body "<updated body with [x] marks>"
```

Don't update on every tiny change — only when a checklist item is clearly done.

## Labels

Don't hardcode labels. Detect what the repo uses:

```bash
gh label list --json name -q '.[].name'
```

If the repo has labels, use them. If not, suggest creating a minimal set:
- **Type**: `bug`, `feature`, `enhancement`, `refactor`, `security`, `docs`
- **Priority**: `urgent`, `medium`, `low`

## GH Commands Reference

```bash
# Create issue
gh issue create --title "<title>" --body "<body>" --label "<labels>" [--milestone "<name>"]

# List open issues
gh issue list --state open [--milestone "<name>"] [--label "<label>"]

# View issue
gh issue view <number>

# Close issue
gh issue close <number> --comment "Completed and merged to dev"

# Create milestone
gh api repos/{owner}/{repo}/milestones -f title="<name>" -f description="<desc>"

# List milestones
gh api repos/{owner}/{repo}/milestones --jq '.[].title'
```

## Confirmation Rules

- **Always confirm** before: closing an issue, labeling as urgent, creating a milestone
- **Never confirm** for: creating a standard issue, updating checklist, adding labels

## Template

**See TEMPLATE.md for the complete issue body template.**
