---
name: scan-history
description: Key findings from Bilbo scans on unmassk-crew codebase
type: project
---

## 2026-03-14 — marketingskills ref-repo survey

Mapped 27 non-SEO skills from `.ref-repos/marketingskills/skills/`.
Produced word-count table + proposed reference grouping into 10 thematic groups for the marketing plugin.
No orphan or dead-code findings — this was an inventory scan, not a dependency trace.
No escalation needed.

## 2026-03-14 — unmassk-design plugin source survey (5 repos)

Surveyed 5 design ref-repos for unmassk-design plugin consolidation:
- **Impeccable** (~10,400 words): frontend-design SKILL.md + 7 reference files + 5 command skills. Best-in-class anti-AI-slop philosophy. 17 command skills total (audit, critique, polish, bolder, animate, etc.). No scripts/data.
- **UI/UX Pro Max** (~6,500 words SKILL.md alone): searchable CSV database (products, styles, colors, typography, ux-guidelines, charts, google-fonts, react-performance, etc.) + 3 Python scripts (search.py, core.py, design_system.py). Separate design/brand/banner-design/ui-styling/design-system skills each have their own scripts and CSVs. The only source with a working search engine.
- **bencium-controlled-ux-designer** (~10,500 words across 5 files): Deep accessible-code patterns (ARIA, shadcn/Tailwind, Phosphor icons). Unique: DESIGN-SYSTEM-TEMPLATE.md fixed/project-specific/adaptable framework. Heavy React/Tailwind specificity.
- **typography** (~3,800 words): Rooted in Butterick's Practical Typography. Unique: HTML entities table, OpenType features, JSX/React curly-quote implementation guide. CSS baseline template. Enforcement-mode design.
- **relationship-design** (~9,400 words across 4 files): Unique domain — agentic UX, memory architecture, trust evolution (3 stages), compounding value metrics. TypeScript implementation patterns. No overlap with any other source.

Key consolidation recommendation: Impeccable provides the design principles core; UI/UX Pro Max provides the data/search infrastructure; bencium provides deep accessibility + component patterns; typography provides typographic correctness layer; relationship-design is entirely orthogonal (agentic/AI UX only).

No orphans, no dead code — inventory scan only. No escalation needed.

## 2026-03-15 — unmassk-ops plugin integrity verification (all 5 skills)

Full cross-reference audit of `/unmassk-ops/skills/` against all 5 SKILL.md declarations.

**Result: ALL 5 SKILLS PASS — zero integrity failures.**

Counts confirmed:
- ops-iac: 20 scripts, 14 references — all declared, all physical, all match
- ops-containers: 22 scripts, 19 references — all declared, all physical, all match
- ops-cicd: 29 scripts (+jenkins-lib/__init__.py as undeclared but expected), 30 references — all match
- ops-observability: 10 scripts, 9 references — all declared, all physical, all match
- ops-scripting: 11 scripts, 21 references — all declared, all physical, all match

Syntax checks: all .py files compile (python3 -m py_compile), all .sh files pass (bash -n). Zero failures.
Path checks: all SKILL.md code blocks use `${CLAUDE_PLUGIN_ROOT}` — no absolute or relative paths.

Minor observations (not failures):
- `__pycache__/` dirs present in 4 skills (ops-cicd, ops-containers, ops-iac, ops-observability) — build artifacts committed to repo, not referenced in SKILL.md (expected, not a defect)
- `jenkins-lib/__init__.py` exists physically in ops-cicd but not in SKILL.md script table — correct: it's a Python package init file, not a callable script
- ops-cicd SKILL.md description says "29 scripts" but table has 30 entries (2 jenkins-lib files) — minor count discrepancy in metadata, not a structural failure

No escalation needed.

## 2026-03-15 — unmassk-db plugin integrity verification (all 7 skills)

Full cross-reference audit of `/unmassk-db/skills/` against all 7 SKILL.md declarations.

**Result: 5 SKILLS PASS, 2 SKILLS FAIL.**

Counts confirmed:
- db-postgres: 22 references — all declared, all physical, all match. No scripts. PASS.
- db-mysql: 19 references — all declared, all physical, all match. No scripts. PASS.
- db-mongodb: 10 references — all declared, all physical, all match. No scripts. PASS. (routing table uses bare filenames without references/ prefix — format difference only)
- db-redis: 35 physical files, 34 declared in routing table. `redis-overview.md` is on disk and counted in frontmatter ("35 reference files") but missing from routing table. FAIL — dead reference file.
- db-migrations: 4 references + 4 scripts — all declared, all physical, all match. PASS.
- db-vector-rag: 5 references — all declared, all physical, all match. No scripts. PASS.
- db-schema-design: 5 references + 2 scripts — all declared, all physical, all match. PASS.

Syntax checks: all 6 .py files compile (python3 -m py_compile). Zero failures.
Path checks: all SKILL.md script blocks use `${CLAUDE_PLUGIN_ROOT}` — no absolute or relative paths.

Minor observations (not failures):
- `__pycache__/` dirs present in db-migrations and db-schema-design — build artifacts, not in SKILL.md (expected)

No escalation needed.

## 2026-03-14 — cc-devops-skills ref-repo full inventory

Surveyed all 31 skills in `.ref-repos/cc-devops-skills/devops-skills-plugin/skills/`.
- 103 total script files (Python + shell), 63 reference files, 31 docs files (94 combined support docs)
- 6 skills have NO scripts: ansible-generator, azure-pipelines-generator, gitlab-ci-generator, k8s-yaml-generator, promql-generator, terragrunt-generator
- 14 script names are duplicated across skills (confirmed DIFFERENT implementations — not copies, except detect_crd.py between k8s-yaml-validator and helm-validator which diverged significantly)
- Heaviest scripts: jenkinsfile-generator (~1,900 lines + 1,014 line lib/), loki-config-generator (~1,900 lines), fluentbit-generator (~1,835 lines), terraform-validator (~1,331 lines)
- 3 skills use __pycache__/.pyc artifacts committed to repo: k8s-yaml-validator, loki-config-generator, promql-validator, terraform-validator
- fluentbit-generator has a committed output/ dir with 2 generated config files — likely stale test artifacts
- Domain grouping: IaC (terraform, terragrunt, ansible, helm, k8s-yaml, k8s-debug — 7 skills), CI/CD (github-actions, gitlab-ci, azure-pipelines, jenkins, makefile — 9 skills), Containers/K8s (dockerfile, helm, k8s-yaml, k8s-debug — 4 skills), Observability (promql, logql, loki, fluentbit — 8 skills), Scripting (bash-script, makefile — 3 skills)
- No orphan SKILL.md files found — all 31 dirs have a SKILL.md
