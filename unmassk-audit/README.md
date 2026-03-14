# unmassk-audit

**14-step enterprise audit for backend modules.**

A structured workflow for auditing backend modules against enterprise quality standards. Each step assigns a specific agent role. The process produces a weighted score out of 110 and a final senior verdict.

## When to use

- Auditing a backend module against quality standards
- Systematic quality assessment with scoring
- Pre-release quality gates

Do NOT use for: frontend audits, one-off code reviews, or quick linting checks.

## The workflow

### Step 0 -- Preparation (Orchestrator)

Select or create a GitHub issue. Create audit branch. Read mandatory reference docs.

### Step 1 -- Scan (Bilbo)

List all files in the module. Count LOC per file. Map imports/exports and dependencies. Run existing tests. Flag files >500 LOC, missing tests, or anti-patterns.

### Step 2 -- Fix critical blockers (Ultron)

Only if Step 1 found broken tests or critical blockers. Fix and verify stability before proceeding.

### Step 3 -- Golden tests (Dante) [parallel with Step 4]

Characterization testing -- capture current behavior BEFORE any code changes. Target: 97%+ coverage with real assertions.

### Step 4 -- Enterprise audit (Cerberus + Argus) [parallel with Step 3]

**Cerberus** evaluates against enterprise standards checklist. Classifies findings by tier (T1/T2/T3). Produces weighted score.

**Argus** performs deep security analysis -- OWASP patterns, auth design, secrets, data flow, threat modeling.

Both agents report only -- they never fix.

### Step 5 -- Tier fixes (Ultron)

Fix findings in order: T1 first, then T2, then T3. If Ultron fails a fix 3 times, House diagnoses root cause.

### Step 6 -- Review fixes (Cerberus)

Re-read all module files. Verify each original finding is closed. Check for new findings introduced by fixes. Compare score before/after.

### Step 7 -- Test fixed code (Dante)

Write tests for code changed in Step 5. Update golden tests if behavior changed. Maintain 97%+ coverage.

### Step 8 -- Adversarial validation (Moriarty)

Attack the full module. Document each break with tier classification. Report only -- never fix.

### Step 9 -- Adversarial tests (Dante)

Write regression tests for confirmed breaks. Write confirmation tests for attacks the module withstood. Gate: 0 T1/T2 bugs unresolved.

### Step 10 -- Re-audit (Cerberus)

Full re-audit using the same checklist. If score decreased or new T1/T2 findings exist, return to Step 5.

### Step 11 -- Senior review (Yoda)

Prose evaluation per dimension. Weighted score out of 110. Verdict: APPROVED / APPROVED WITH RESERVATIONS / NOT READY.

### Step 12 -- Documentation (Alexandria)

Update module CLAUDE.md with patterns learned. Update CHANGELOG.md under [Unreleased].

### Step 13 -- Closure (Orchestrator)

Full test suite must pass. Final commit with score. Merge to dev, push, close issue, delete branch.

## Scoring

| Dimension | Weight | Max |
|-----------|--------|-----|
| Security | x3 | 30 |
| Error handling | x3 | 30 |
| Structure | x2 | 20 |
| Testing | x2 | 20 |
| Maintainability | x1 | 10 |
| **Total** | | **110** |

## Loop conditions

| Trigger | Action |
|---------|--------|
| Steps 8-9 find T1/T2 bugs | Return to Step 5 |
| Step 6 or 10: REQUIRES ANOTHER ROUND | Return to Step 5 |
| Step 11: NOT READY | Return to Step 5 |
| Step 11: APPROVED or APPROVED WITH RESERVATIONS | Continue to Step 12 |

## Quick reference

| Step | Agent | Parallel? | Gate |
|------|-------|-----------|------|
| 0 | Orchestrator | - | Branch + context commit |
| 1 | Bilbo | No | Summary table |
| 2 | Ultron | No | Tests pass (if needed) |
| 3 | Dante | Yes | 97%+ coverage |
| 4 | Cerberus + Argus | Yes | Score + security findings |
| 5 | Ultron | Depends | Tests pass after each fix |
| 6 | Cerberus | No | APPROVED or loop |
| 7 | Dante | No | Tests pass |
| 8 | Moriarty | No | Breaks documented |
| 9 | Dante | No | Adversarial tests pass |
| 10 | Cerberus | No | APPROVED or loop |
| 11 | Yoda | No | Verdict |
| 12 | Alexandria | No | Docs updated |
| 13 | Orchestrator | - | Merged + closed |

## Dependencies

- **unmassk-crew** -- provides the agents

## License

MIT
