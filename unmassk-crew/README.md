# unmassk-crew

**10 specialized agents for software engineering.**

A collection of Claude Code subagents, each with a distinct role and expertise. Claude delegates tasks to the right agent automatically, or workflows like Flow and Audit orchestrate them through structured pipelines.

## Agents

| Agent | Role | Model | What it does |
|-------|------|-------|-------------|
| **Bilbo** | Explorer | Sonnet | Deep codebase exploration -- maps imports/exports, traces dependencies, detects orphaned code, finds structural anomalies |
| **Ultron** | Implementer | Inherited | Production code changes -- implements, refactors, fixes, and extends code with pattern consistency and test-backed delivery |
| **Dante** | Tester | Inherited | Test engineering -- creates regression tests, coverage expansion, edge cases, adversarial tests, golden tests |
| **Cerberus** | Reviewer | Sonnet | Code review -- checks correctness, maintainability, performance, and engineering quality with evidence |
| **Argus** | Security analyst | Inherited | Security auditing -- vulnerability analysis, auth flaws, injection risks, secrets handling, OWASP patterns |
| **Moriarty** | Adversarial | Inherited | Adversarial validation -- actively tries to break, abuse, and exploit code to prove failure modes before release |
| **House** | Diagnostician | Inherited | Root cause analysis -- diagnoses bugs, test failures, and unexpected behavior through systematic evidence gathering |
| **Yoda** | Senior verdict | Inherited | Final judgment -- production-readiness evaluation with weighted scoring and honest professional sentiment |
| **Alexandria** | Documenter | Inherited | Documentation maintenance -- CLAUDE.md sync, staleness detection, changelog updates, project docs |
| **Gitto** | Memory oracle | Haiku | Read-only queries against git-memory history -- searches past decisions, memos, preferences, blockers |

## How agents work

Each agent has:

- A **defined scope** -- agents never duplicate each other's role
- **Evidence-first discipline** -- no evidence, no claim
- **Escalation over overlap** -- if something falls outside their scope, they escalate rather than improvise
- **Consistent severity levels** -- Critical / Warning / Suggestion
- **Background execution** -- agents run as background subagents and report back

### Agent boundaries

| Need | Agent | NOT |
|------|-------|-----|
| Explore unknown code | Bilbo | Ultron, Cerberus |
| Implement changes | Ultron | Cerberus, Dante |
| Write tests | Dante | Ultron |
| Review code quality | Cerberus | Argus, Yoda |
| Audit security | Argus | Cerberus, Moriarty |
| Break things on purpose | Moriarty | Argus |
| Diagnose failures | House | Ultron |
| Final go/no-go | Yoda | Cerberus |
| Update documentation | Alexandria | Any other agent |
| Query past decisions | Gitto | Any other agent |

## Used by

- **unmassk-flow** -- orchestrates agents through an 8-step creative pipeline
- **unmassk-audit** -- orchestrates agents through a 14-step enterprise audit
- **Standalone** -- invoke any agent directly for one-off tasks

## License

MIT
