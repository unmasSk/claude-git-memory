# unmassk-flow

**8-step creative pipeline -- from idea to shipped code. 2 skills.**

A structured workflow for building features, fixes, and refactors. Combines gray-area brainstorming, TDD-based planning, and evidence-first agent execution. All decisions persist in git-memory. The plan file is the single source of truth.

## When to use

- Building new features
- Non-trivial bug fixes (trivial = 1 file, obvious cause)
- Refactors that touch 3+ files
- Any task where "just do it" could go wrong

Do NOT use for: trivial 1-file fixes, documentation-only changes, config tweaks, or enterprise audits (use unmassk-audit instead).

## The pipeline

### Step 0 -- Triage (Orchestrator)

Classify the work before anything else:

| Size | Criteria | Pipeline |
|------|----------|----------|
| Quick | 1-2 files, obvious fix, no design decisions | Lightweight plan, Cerberus-only verify |
| Standard | Normal feature, clear scope | Full pipeline (steps 1-7) |
| Big | 3+ new files, 5+ modified, or touches auth/data/permissions | Full pipeline + mandatory Argus + Moriarty + Yoda |

### Step 1 -- Brainstorm (Orchestrator + User)

Identify gray areas -- decisions that change the outcome -- and resolve them before planning. Each decision is captured as a `decision()` commit immediately.

### Step 2 -- Research (Bilbo)

Investigate how to implement, guided by decisions from Step 1. Depth scales with triage size (quick/standard/deep). Permanent findings become `memo()` or `decision()` commits.

### Step 3 -- Plan (Orchestrator)

Write a plan file at `docs/plan/<type>-<name>.md` with tasks, dependencies, verification steps, and a wave map for parallel execution. The plan is the single source of truth.

### Step 4 -- Execute (Ultron + Dante)

Wave-based parallel implementation. One Ultron agent per task, no overlap on the same file. If Ultron fails a task 3 times, House diagnoses root cause before retrying. Deviations that invalidate future tasks stop execution and amend the plan.

### Step 5 -- Verify (Cerberus + conditionals)

Quality gate. Cerberus verifies the code delivers the goal (not just completes tasks). Dante adds coverage for uncovered changes. For Big features: Argus (security), Moriarty (adversarial), and Yoda (senior verdict) are mandatory. If issues found, return to Step 4.

### Step 6 -- Document (Alexandria)

Update module CLAUDE.md if patterns changed. Update CHANGELOG.md under [Unreleased]. Cross-check documentation against current code state.

### Step 7 -- Close (Orchestrator)

Full test suite must pass. Merge to dev, push, close issue, delete branch, mark plan as completed.

## Quick reference

| Step | Agent | Parallel? | Gate |
|------|-------|-----------|------|
| 0 | Orchestrator | - | Triage classification |
| 1 | Orchestrator + User | No | Gray areas resolved |
| 2 | Bilbo | No | Research complete |
| 3 | Orchestrator | No | Plan written + checked |
| 4 | Ultron (+ Dante) | Waves | All tasks complete |
| 5 | Cerberus (+ conditionals) | Depends | Verify passes |
| 6 | Alexandria | No | Docs updated |
| 7 | Orchestrator | - | Merged + closed |

## Recovery paths

| Situation | Action |
|-----------|--------|
| Feature infeasible (brainstorm) | Close issue with rationale, stop |
| Approach fails (research) | Pivot or close issue |
| Plan has gaps | Amend before executing |
| Ultron stuck (3 fails) | House diagnoses, amend plan |
| Deviation invalidates future task | Stop, amend plan |
| User abandons mid-feature | WIP commit + context commit with Next trailer |
| Verify finds issues | Return to Execute |
| Merge conflict | Resolve or escalate, re-run Verify |

## Skills

| Skill | What It Does |
|-------|-------------|
| **unmassk-flow** | 8-step creative pipeline -- from idea to shipped code |
| **flow-stack-selection** | IDE-grade project scaffolding wizard -- 70+ project types (HTML/CSS, React, Next.js, Vue, Astro, Expo, FastAPI, NestJS, Go/Gin, Rust/Axum, Chrome Extensions, Tauri, and more) with interactive SDK selection, framework configuration, database setup, and DevOps tooling |

## Dependencies

- **unmassk-crew** -- provides the agents (Bilbo, Ultron, Dante, Cerberus, Argus, Moriarty, Yoda, House, Alexandria)
- **unmassk-gitmemory** -- persists decisions and context across steps

## License

MIT
