<h1 align="center">unmassk-claude-toolkit</h1>

<p align="center">
  <strong>A suite of Claude Code plugins for the full web project lifecycle.</strong><br>
  <em>11 plugins covering memory, agents, workflows, audits, SEO, marketing, design, DevOps, databases, compliance, and media.</em>
</p>

<p align="center">
  <a href="#plugins">Plugins</a> &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick start</a> &nbsp;&middot;&nbsp;
  <a href="#core-plugins">Core</a> &nbsp;&middot;&nbsp;
  <a href="#domain-plugins">Domain</a> &nbsp;&middot;&nbsp;
  <a href="#how-they-work-together">Synergies</a> &nbsp;&middot;&nbsp;
  <a href="#faq">FAQ</a>
</p>

---

## Plugins

### Core plugins

| Plugin | Version | What it does |
|--------|---------|-------------|
| [unmassk-gitmemory](#unmassk-gitmemory) | 3.7.1 | Persistent memory for Claude Code via git commit trailers |
| [unmassk-crew](#unmassk-crew) | 1.0.0 | 10 specialized agents for software engineering |
| [unmassk-flow](#unmassk-flow) | 1.1.0 | 8-step creative pipeline + project scaffolding wizard (70+ project types) |
| [unmassk-audit](#unmassk-audit) | 1.0.0 | 14-step enterprise audit for backend modules |

### Domain plugins

| Plugin | Version | What it does |
|--------|---------|-------------|
| [unmassk-seo](./unmassk-seo/README.md) | 1.0.0 | Technical SEO -- crawling, schema, Core Web Vitals, GEO/AEO, site audits |
| [unmassk-marketing](./unmassk-marketing/README.md) | 1.0.0 | Strategic marketing -- CRO, copywriting, email, ads, pricing, growth |
| [unmassk-design](./unmassk-design/README.md) | 1.0.0 | Frontend design -- design systems, typography, color, motion, accessibility |
| [unmassk-ops](./unmassk-ops/README.md) | 1.1.0 | DevOps -- IaC, containers, CI/CD, observability, scripting, Vercel/Railway deployments, Sentry + OTel error tracking (7 skills) |
| [unmassk-db](./unmassk-db/README.md) | 1.0.0 | Database -- PostgreSQL, MySQL, MongoDB, Redis, migrations, vector/RAG |
| [unmassk-compliance](./unmassk-compliance/README.md) | 1.0.0 | Compliance -- GDPR, OWASP, NIS2, SOC 2, ISO 27001, ENS, LOPDGDD, cookies, i18n, legal docs (9 skills) |
| [unmassk-media](./unmassk-media/README.md) | 1.1.0 | Media -- Remotion video, AI image gen/edit, Mermaid diagrams, FFmpeg, screenshots, transcription, react-pdf (8 skills) |

Each plugin is independent. Install only what you need, or install the full toolkit.

---

## Quick start

**Step 1:** Add the repository as a marketplace source:

```
/plugin marketplace add https://github.com/unmasSk/claude-toolkit
```

**Step 2:** Install plugins from the interactive menu:

```
/plugin
```

Select any plugin from the list. Choose your scope:
- **User** (default): for yourself across all projects
- **Project**: for all collaborators on this repository (saved in `.claude/settings.json`)
- **Local**: for yourself in this repo only

> **Important:** `/plugin install` does NOT accept URLs. You must add the marketplace first, then install by name from the interactive menu.

### Requirements

- Python 3.10+
- Git
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v1.0.33+ (plugin support)

---

## unmassk-gitmemory

**Persistent memory for Claude Code, stored in git.**

Every time Claude starts a new session, it forgets everything. unmassk-gitmemory fixes this. After installing, Claude remembers decisions, preferences, blockers, and pending work across sessions, machines, and context resets. You don't need to do anything special -- just talk to Claude like you always do.

**How it works:** Every commit carries structured metadata (called "trailers") that Claude reads automatically when a session starts. No external files, no databases, no cloud services.

### Key features

- **Conversational capture** -- Say "let's go with X" and Claude saves the decision. Say "never use Y" and Claude saves the preference. No syntax to learn.
- **6 automatic hooks** -- Pre-commit validation, post-commit safety net, session boot, message radar, session exit, and context compression survival.
- **Hierarchical scopes** -- Commits are organized by scope (`backend/api`, `frontend/ux`) so Claude always knows the structure of your project.
- **Context awareness** -- Monitors Claude's context window and warns before auto-compaction, with debounced severity levels.
- **Garbage collector** -- Cleans stale `Next:` and `Blocker:` items using keyword overlap, TTL expiry, and explicit resolution heuristics. Never deletes commits -- uses tombstone trailers.
- **3 runtime modes** -- Normal (full trailers), Compatible (git notes for commitlint), Read-only (no write permissions).
- **3 skills** -- Core memory, lifecycle management (install/repair/uninstall), and issues/milestones.

### What gets remembered

| Type | Example | Auto-captured? |
|------|---------|---------------|
| Decisions | "use dayjs over moment" | Yes -- from conversation |
| Memos | preferences, requirements, anti-patterns, stack choices | Yes -- from conversation |
| Remembers | personality and working-style notes | Yes -- from conversation |
| Context bookmarks | where you left off, what's next | Yes -- on session end |
| Code commits | feat, fix, refactor with Why/Touched/Issue trailers | Yes -- on every commit |

### Dependencies

None. This is the foundational plugin.

> Full documentation: [unmassk-gitmemory/README.md](./unmassk-gitmemory/README.md)

---

## unmassk-crew

**10 specialized agents for software engineering.**

A collection of subagents, each with a distinct role and expertise. Claude delegates tasks to the right agent automatically based on context -- or you can invoke them directly through workflows like Flow and Audit.

### The agents

| Agent | Role | Specialty |
|-------|------|-----------|
| **Bilbo** | Explorer | Deep codebase exploration, dependency mapping, structural analysis |
| **Ultron** | Implementer | Production code changes, pattern-consistent execution, test-backed delivery |
| **Dante** | Tester | Test creation, coverage expansion, regression and adversarial tests |
| **Cerberus** | Reviewer | Code review for correctness, maintainability, performance, quality |
| **Argus** | Security analyst | Vulnerability analysis, auth flaws, injection risks, secrets handling |
| **Moriarty** | Adversarial | Actively tries to break code -- proves failure modes before release |
| **House** | Diagnostician | Root cause analysis for bugs, test failures, and unexpected behavior |
| **Yoda** | Senior verdict | Final production-readiness judgment with weighted scoring |
| **Alexandria** | Documenter | CLAUDE.md maintenance, changelog updates, staleness detection |
| **Gitto** | Memory oracle | Read-only queries against git-memory history (decisions, memos, blockers) |

### Dependencies

None. Works standalone or with Flow and Audit.

> Full documentation: [unmassk-crew/README.md](./unmassk-crew/README.md)

---

## unmassk-flow

**8-step creative pipeline -- from idea to shipped code. 2 skills.**

A structured workflow for building features, fixes, and refactors. Combines brainstorming, TDD-based planning, and evidence-first agent execution. All decisions persist in git-memory. The plan file is the single source of truth.

Includes **flow-stack-selection**: an IDE-grade project scaffolding wizard supporting 70+ project types (HTML/CSS, React, Next.js, Vue, Astro, Remix, React Native, Flutter, Expo, FastAPI, Django, Express, NestJS, Go/Gin, Rust/Axum, Spring Boot, Chrome Extensions, Tauri, and more). Invoked automatically when the user says "scaffold project", "create new project", or "what tech stack".

### The pipeline

| Step | Name | Agent | What happens |
|------|------|-------|-------------|
| 0 | Triage | Orchestrator | Classify as Quick / Standard / Big |
| 1 | Brainstorm | Orchestrator + User | Identify and resolve gray areas |
| 2 | Research | Bilbo | Investigate implementation approaches |
| 3 | Plan | Orchestrator | Write the plan file with tasks and waves |
| 4 | Execute | Ultron + Dante | Wave-based parallel implementation |
| 5 | Verify | Cerberus + conditionals | Quality gate (+ Argus, Moriarty, Yoda for Big features) |
| 6 | Document | Alexandria | Update CLAUDE.md and CHANGELOG |
| 7 | Close | Orchestrator | Merge, push, close issue, clean up |

### Dependencies

- **unmassk-crew** -- provides the agents
- **unmassk-gitmemory** -- persists decisions and context across steps

> Full documentation: [unmassk-flow/README.md](./unmassk-flow/README.md)

---

## unmassk-audit

**14-step enterprise audit for backend modules.**

A structured workflow for auditing backend modules against enterprise quality standards. Each step assigns a specific agent. The process produces a weighted score out of 110 and a final senior verdict.

### The workflow

| Step | Name | Agent |
|------|------|-------|
| 0 | Preparation | Orchestrator |
| 1 | Scan | Bilbo |
| 2 | Fix critical blockers | Ultron |
| 3 | Golden tests | Dante |
| 4 | Enterprise audit | Cerberus + Argus |
| 5 | Tier fixes | Ultron |
| 6 | Review fixes | Cerberus |
| 7 | Test fixed code | Dante |
| 8 | Adversarial validation | Moriarty |
| 9 | Adversarial tests | Dante |
| 10 | Re-audit | Cerberus |
| 11 | Senior review | Yoda |
| 12 | Documentation | Alexandria |
| 13 | Closure | Orchestrator |

Scoring dimensions: Security (x3), Error handling (x3), Structure (x2), Testing (x2), Maintainability (x1) = max 110 points.

### Dependencies

- **unmassk-crew** -- provides the agents

> Full documentation: [unmassk-audit/README.md](./unmassk-audit/README.md)

---

## How they work together

The plugins form a layered system:

```
Domain plugins (seo, marketing, design, ops, db, compliance) ──> unmassk-crew (agents execute domain work)
unmassk-audit ──> unmassk-crew
unmassk-flow ──> unmassk-crew + unmassk-gitmemory
```

- **gitmemory** is the foundation. Persistent memory regardless of which other plugins are installed.
- **crew** provides 10 agents. Works standalone or consumed by Flow, Audit, and all domain plugins.
- **flow** orchestrates agents through an 8-step pipeline, with decisions persisted by gitmemory.
- **audit** orchestrates agents through a 14-step audit workflow.
- **Domain plugins** (seo, marketing, design, ops, db, compliance) provide skills and references. Agents from crew execute the domain work.

### Recommended setups

| Use case | Install |
|----------|---------|
| Just persistent memory | gitmemory |
| Memory + agents | gitmemory + crew |
| Full development workflow | gitmemory + crew + flow |
| Full development + auditing | gitmemory + crew + flow + audit |
| Web project (frontend) | + seo + marketing + design |
| Web project (backend) | + ops + db |
| Everything | all 11 |

---

## FAQ

**Q: Does this work with GitHub/GitLab/Bitbucket?**
A: Yes. All plugins work with any git host. Trailers are standard git metadata.

**Q: Does gitmemory work with commitlint or strict CI?**
A: Yes. It detects commitlint and switches to compatible mode (git notes instead of trailers).

**Q: Will this mess up my existing commits?**
A: No. The memory system only adds trailers to new commits. Existing history is never modified.

**Q: Does gitmemory put files in my project?**
A: Only `CLAUDE.md` (with a managed block) and `.claude/git-memory-manifest.json`. The plugin itself runs from the plugin cache.

**Q: Can I uninstall a plugin?**
A: Yes. Run `/plugin` in Claude Code and uninstall from the interactive menu.

**Q: Does gitmemory work with monorepos?**
A: Yes. It detects Turborepo, Nx, Lerna, pnpm workspaces, Rush, and Moon automatically.

**Q: What if Claude's context gets compressed?**
A: The Hippocampus hook extracts critical memory before compression and re-injects it.

**Q: How do I update plugins?**
A: Run `/plugin` in Claude Code, go to **marketplace**, and select **update**.

**Q: What if something breaks after updating?**
A: Delete `~/.claude/plugins/cache/unmassk-claude-toolkit/` and reinstall from the marketplace.

---

## Updating

Run `/plugin` in Claude Code, go to **marketplace**, and select **update**. Your next session uses the new version automatically.

If something breaks after updating, delete `~/.claude/plugins/cache/unmassk-claude-toolkit/` and reinstall.

---

<p align="center">
  <strong>MIT License</strong><br>
  <em>Built for Claude Code.</em>
</p>
