---
name: unmassk-audit
description: Use when the user asks to "audit a module", "enterprise review", "auditar modulo", "revisar contra estandares", "launch audit", or mentions auditing a backend module against enterprise standards. Also use when resuming an audit in progress.
---

# Enterprise Audit

## Overview

Structured 14-step workflow for auditing backend modules against enterprise quality standards. Each step assigns a specific agent role (orchestrator, explorer, implementer, tester, reviewer, documenter). The process produces a weighted score out of 110 and a final senior verdict.

## When to Use

- User requests auditing a backend module
- User says "audit", "enterprise review", "auditar", "revisar contra estandares"
- Resuming an in-progress audit (check TodoWrite for current step)

Do NOT use for: frontend audits, one-off code reviews, or quick linting checks.

## Workflow

### Initialization

Before step 0, create a TodoWrite with one item per step (steps 0-13). Update status after completing each step. Issue a WIP commit after every step. Only two real commits: step 0 (context) and step 13 (closure).

### Step 0 -- Preparation (ORCHESTRATOR (Claude + User))

1. Select or create a GitHub issue for the audit target.
2. Create branch from dev: `git checkout -b chore/audit-<module> dev`
3. Context commit: `context(audit-<module>): start enterprise audit -- issue #N`
4. Read mandatory docs: `references/standards.md`, `backend/CLAUDE.md`

### Step 1 -- Scan (Bilbo Agent)

1. List ALL .ts files in the module (including subfolders), not just those in the issue.
2. Count LOC per file (`wc -l`).
3. List existing tests in `__tests__/`.
4. Map imports/exports and inter-module dependencies.
5. Run existing tests: `cd backend && npx vitest run src/<module>/`
6. Produce summary table: file | LOC | existing tests | visible problems.
7. Flag files >500 LOC, missing tests, or visible anti-patterns.

Prompt template: see `prompts/bilbo.md`

### Step 2 -- Fix Critical Blockers (Ultron)

Only if step 1 reported broken tests or critical blockers preventing further work.

1. Fix broken tests BEFORE touching source code.
2. Run tests twice to confirm stability.
3. If nothing is broken, skip to step 3.

### Step 3 -- Golden Tests (Dante -- parallel)

Characterization testing -- capture current behavior BEFORE any code changes. Run in parallel with step 4.

1. One Dante agent per source file (no overlap).
2. Target: 97%+ coverage with REAL assertions (no tautologies).
3. Include unit tests and integration tests with supertest for route-level files.
4. Each agent runs tests twice for stability.

Gate: all golden tests pass at 97%+ coverage before proceeding past step 4.

Prompt template: see `prompts/dante.md` (Template 1: Golden Tests)

### Step 4 -- Enterprise Audit (Cerberus + Argus -- parallel)

Run in parallel with step 3 (independent work). Cerberus and Argus run simultaneously.

**Cerberus** (quality audit):
1. One Cerberus agent per file (or group of 2-3 small files <100 LOC).
2. Evaluate ONLY against the closed checklist in `references/standards.md` (Security x3, Error handling x3, Structure x2, Testing x2, Maintainability x1).
3. Classify every finding by tier (T1/T2/T3).
4. Produce weighted score out of 110.
5. Agents ONLY report -- never fix.

**Argus** (deep security audit):
1. Full security analysis of the module: OWASP patterns, auth design, secrets, data flow.
2. Threat modeling for the module's attack surface.
3. Classify findings by tier (T1/T2/T3).
4. ONLY report -- never fix. Do not duplicate Cerberus surface-level security checks.

ORCHESTRATOR (Claude + User) compiles findings from both Cerberus and Argus into a single findings table.

Prompt templates: see `prompts/cerberus.md` (Template 1) and `prompts/argus.md`

### Step 5 -- Tier Fixes (Ultron)

Order: T1 first, then T2, then T3. 1 agent per finding or group of findings in the same file.

1. Apply fix addressing root cause.
2. Clean JSDoc per section 5 of standards if touching the area (zero extra cost).
3. Verify LOC stays under 500 after fix.
4. If fix requires file split (>500 LOC), use architect-then-implementer pattern.
5. Run tests TWICE after each fix round.

Gate: tests pass after each round.

House circuit breaker: if Ultron fails the same fix 3 times, launch House (agent: `house`) to diagnose root cause before retrying.

Prompt templates: see `prompts/ultron.md` and `prompts/house.md`

### Step 6 -- Review Fixes (Cerberus)

1. Re-read ALL module files (not just touched ones).
2. Verify each original finding: closed? Root cause resolved?
3. Check for NEW findings introduced by fixes.
4. Verify LOC < 500 and no anti-patterns from section 11 of standards.
5. Compare score before/after.
6. Run tests TWICE.

Verdict: APPROVED or REQUIRES ANOTHER ROUND. If another round needed, return to step 5.

### Step 7 -- Test Fixed Code (Dante)

1. Write tests for code Ultron changed in step 5 that lacks coverage.
2. Update golden tests if function signatures or behavior changed.
3. Run full module suite TWICE.

Gate: coverage maintained at 97%+.

### Step 8 -- Adversarial Validation (Moriarty)

1. Moriarty attacks the full module across all attack phases.
2. Document each break with tier classification. Do NOT fix.
3. Output: attack report with confirmed breaks and per-phase summary.

Prompt template: see `prompts/moriarty.md`

### Step 9 -- Adversarial Tests (Dante)

1. Write regression tests for every confirmed break from step 8.
2. Write confirmation tests for attacks the module withstood.
3. Create `<module>.adversarial.test.ts`.

Gate: 0 T1 bugs, 0 T2 bugs unresolved. If T1/T2 bugs found, return to step 5.

Prompt template: see `prompts/dante.md` (Template 2: Adversarial Tests)

### Step 10 -- Re-Audit (Cerberus)

Full re-audit using the same closed checklist. Same process as step 6.

If score decreased or new T1/T2 findings exist, return to step 5. Repeat until APPROVED.

Prompt template: see `prompts/cerberus.md` (Template 2: Re-Audit)

### Step 11 -- Senior Review (Yoda)

1. Read ALL source files (not tests).
2. Run tests TWICE.
3. Write prose evaluation per dimension (2-4 sentences each).
4. Provide honest professional sentiment (one paragraph, no bullets).
5. Score on weighted table out of 110.
6. Verdict: APPROVED / APPROVED WITH RESERVATIONS / NOT READY.

If NOT READY, return to step 5 with Yoda's concerns. If Moriarty gave FAIL verdict, Yoda cannot give APPROVED (only RESERVATIONS if orchestrator accepted the risk).

Prompt template: see `prompts/yoda.md`

### Step 12 -- Documentation (Alexandria)

1. Read ALL WIP commits and changes accumulated during the audit.
2. Create or update module CLAUDE.md with patterns learned.
3. Update CHANGELOG.md under [Unreleased] with meaningful descriptions.
4. Cross-check documentation against current code state.
5. Update Alexandria memory.

Prompt template: see `prompts/alexandria.md`

### Step 13 -- Closure (ORCHESTRATOR (Claude + User))

1. Delete temporary files (`AUDIT-<module>.tmp.md`).
2. **MANDATORY: Run FULL test suite** (`cd backend && npx vitest run`) — not just the module tests. If any test fails that was passing before the audit started, the audit introduced a regression. Fix before merging.
3. Final commit with score and closed findings.
4. Merge to dev: `git checkout dev && git merge --no-ff chore/audit-<module>`
5. Push: `git push origin dev`
6. Close issue: `gh issue close N --comment "Enterprise audit complete -- YY/110"`
7. Delete branch (local and remote).
8. Context commit: `context(audit-<module>): issue #N CLOSED`

## Loop Conditions

| Trigger | Action |
|---------|--------|
| Steps 8-9 find T1/T2 bugs | Return to step 5 |
| Step 6 or 10 gives REQUIRES ANOTHER ROUND | Return to step 5 |
| Step 11 gives NOT READY | Return to step 5 |
| Step 11 gives APPROVED or APPROVED WITH RESERVATIONS | Continue to step 12 |

## Commit Policy

| When | Commit type |
|------|-------------|
| Step 0 | `context(audit-<module>): start` -- real commit |
| Steps 1-12 | WIP commits only (`/cu-wip`) |
| Step 13 | `chore(<module>): enterprise audit complete` -- real commit |

## ORCHESTRATOR (Claude + User) Rules

- Never edit code directly -- everything through agents.
- Never accept first re-audit as definitive after significant changes. Historical data: one module required 6 re-audit rounds.
- Always verify agent claims independently (run tests, check LOC).
- Distrust "all clean" reports without evidence. Agents tend to report "clean" without verifying all tiers.
- Never send 2 agents to the same file simultaneously.
- Never say "move code AS-IS" if it has anti-patterns from `references/standards.md` section 11.
- Never accept "executable LOC" excuses -- the limit is 500 total lines.

## Agent Dispatch Rules

Each agent receives ONLY context and data, NOT instructions on how to work (agent system prompts handle that). Provide:

- Module path and file list
- Relevant findings or reports from previous steps
- Reference to `references/standards.md` for quality criteria
- Verification block (test commands, run twice)

Never send two agents to the same file simultaneously.

## Findings Report Format

ORCHESTRATOR (Claude + User) compiles agent outputs into `AUDIT-<module>.tmp.md`:

```markdown
## Audit: <module-name>

### Summary
- Files: X
- Total LOC: Y
- Existing tests: Z

### Findings
| ID | Tier | Severity | File:line | Description | Action |
|----|------|----------|-----------|-------------|--------|

### Score
| Dimension | Score | Weight | Total |
|-----------|-------|--------|-------|
| Security | X/10 | x3 | XX |
| Error handling | X/10 | x3 | XX |
| Structure | X/10 | x2 | XX |
| Testing | X/10 | x2 | XX |
| Maintainability | X/10 | x1 | XX |
| **Total** | | | **XX/110** |
```

## Quick Reference

| Step | Agent | Parallel? | Gate |
|------|-------|-----------|------|
| 0 | ORCHESTRATOR (Claude + User) | - | Branch + context commit |
| 1 | Bilbo | No | Summary table |
| 2 | Ultron | No | Tests pass (if needed) |
| 3 | Dante | Yes | 97%+ coverage, tests pass x2 |
| 4 | Cerberus + Argus | Yes | Score + security findings |
| 5 | Ultron | Depends | Tests pass after each fix |
| 6 | Cerberus | No | APPROVED or loop |
| 7 | Dante | No | Tests pass x2 |
| 8 | Moriarty | No | Breaks documented |
| 9 | Dante | No | Adversarial tests pass x2 |
| 10 | Cerberus | No | APPROVED or loop |
| 11 | Yoda | No | Verdict |
| 12 | Alexandria | No | Docs updated |
| 13 | ORCHESTRATOR (Claude + User) | - | Merged + closed |

## Additional Resources

### Reference Files

- **`references/standards.md`** -- Complete enterprise quality standards (tiers, checklists, SOLID/DRY/KISS/YAGNI, OWASP, anti-patterns, scoring)

### Prompt Templates

- **`prompts/bilbo.md`** -- Module scan prompt template
- **`prompts/ultron.md`** -- Fix findings prompt template
- **`prompts/house.md`** -- Diagnostic prompt templates (new investigation, continue, re-diagnose)
- **`prompts/dante.md`** -- Golden tests + adversarial tests prompt templates
- **`prompts/cerberus.md`** -- Enterprise audit + re-audit prompt templates
- **`prompts/argus.md`** -- Deep security audit prompt template
- **`prompts/moriarty.md`** -- Adversarial validation prompt template
- **`prompts/yoda.md`** -- Senior review prompt template
- **`prompts/alexandria.md`** -- Documentation prompt template
