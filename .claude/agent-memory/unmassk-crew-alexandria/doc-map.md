---
name: doc-map
description: Inventory of CLAUDE.md files in the project — where they are, when last verified, their status
type: project
---

## Known CLAUDE.md files

| Path | Last verified | Status |
|------|--------------|--------|
| `CLAUDE.md` (root) | 2026-03-13 | Exists — not yet audited by Alexandria |

## Other documentation

| Path | Type | Status |
|------|------|--------|
| `CHANGELOG.md` | Changelog | Created 2026-03-13 — covers 1.0.0 through 3.6.0 |
| `README.md` | Project readme | Rewritten 2026-03-13 — full audit against codebase, all claims verified |

## unmassk-design docs

| Path | Type | Status |
|------|------|--------|
| `unmassk-design/README.md` | Plugin readme | Created 2026-03-14 — verified against SKILL.md, 11 references, 14 CSV databases, 17-row commands table, search.py flags, user interaction workflow, attribution |

## unmassk-design reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-design/skills/unmassk-design/references/layout-and-space.md` | Reference | Created 2026-03-14 — 4pt/8pt spacing system, modular scale, container queries, CSS Grid, visual hierarchy, z-index, optical adjustments, content density, animation timing |
| `unmassk-design/skills/unmassk-design/references/interaction.md` | Reference | Created 2026-03-14 — 8 states, focus rings, keyboard nav, native dialog, Popover API, inert, form patterns, loading/skeleton, error boundaries, touch targets, React/JSX patterns |
| `unmassk-design/skills/unmassk-design/references/responsive.md` | Reference | Created 2026-03-14 — mobile-first, clamp(), container queries, pointer/hover queries, breakpoint strategy, Tailwind patterns, safe areas, Playwright MCP testing |
| `unmassk-design/skills/unmassk-design/references/ux-writing.md` | Reference | Created 2026-03-14 — button label formula, error templates, empty states, confirmation dialogs, tooltips, onboarding, loading states, translation expansion, terminology discipline, tone calibration |
| `unmassk-design/skills/unmassk-design/references/design-principles.md` | Reference | Created 2026-03-14 — anti-AI-slop doctrine (8 tells), aesthetic direction philosophy, core philosophy, design system generation, DO/DON'T rules, all 17 commands as workflow instructions, ask-first protocol |
| `unmassk-design/skills/unmassk-design/references/color.md` | Reference | Created 2026-03-14 — OKLCH system, tinted neutrals (0.01 chroma), 60-30-10 rule, palette structure, contrast/WCAG, color semantics, dark mode, token hierarchy, palette generation process |
| `unmassk-design/skills/unmassk-design/references/typography.md` | Reference | Created 2026-03-14 — font selection, fluid type scales, CSS baseline template (full), OpenType features, typographic correctness (curly quotes, dashes, ellipsis), JSX gotcha, complete HTML entities table, print typography |
| `unmassk-design/skills/unmassk-design/references/motion.md` | Reference | Created 2026-03-14 — 80ms threshold, duration tables, easing curves with CSS values, spring easing conflict resolution, staggering, reduced-motion, Framer Motion examples, motion tokens |
| `unmassk-design/skills/unmassk-design/references/design-system-kickoff.md` | Reference | Created 2026-03-14 — 3,659 words — trifurcation framework (fixed/project-specific/adaptable), design token two-tier structure (primitive+semantic), Tailwind config integration, dark mode token pattern, filled examples (B2B SaaS, social app, healthcare), component extraction patterns, search.py generation workflow, project kickoff questionnaire, maintenance conventions |
| `unmassk-design/skills/unmassk-design/references/accessibility.md` | Reference | Created 2026-03-14 — 3,785 words — WCAG 2.1 AA full coverage, color contrast ratios (4.5:1/3:1), semantic HTML, keyboard nav, skip links, focus indicators, ARIA roles/states/properties/live regions, sr-only CSS, images+icons alt text, forms (labels/errors/fieldset), modal with full focus trap (React), tabs with roving tabIndex, accessible tooltip, touch targets (44px), hover-only anti-pattern, pointer media query, color independence patterns, data tables, loading/progress states, dynamic content announcements, prefers-reduced-motion, prefers-color-scheme, axe-core integration, testing checklist |
| `unmassk-design/skills/unmassk-design/references/agentic-ux.md` | Reference | Created 2026-03-14 — 3,917 words — screen-centric vs relationship-centric paradigm shift table, behavioral event streaming, contextual memory graph TypeScript, hot/warm/cold tiered memory, privacy-preserving with Laplace noise + PII scrubbing, trust 3 stages (transparency/selective/autonomous) with TypeScript render patterns, trust level detection from behavior, trust recovery protocol + user-facing template, goal-aware state machine, proactive suggestion engine (frustration detection), human-AI co-creation pattern, relationship metrics (quality/compounding/context accuracy/democratic alignment) with full TypeScript implementations, domain examples (automotive B2B, streaming, project management, finance, healthcare with concrete metrics), 3-day sprint worksheet, common mistakes, red flags table, minimum viable relationship roadmap |

## unmassk-ops reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-ops/skills/ops-iac/SKILL.md` | Skill definition | Created 2026-03-14 — canonical frontmatter, routing table, mandatory workflows for Terraform/Terragrunt/Ansible, 20-script reference table, done criteria |
| `unmassk-ops/skills/ops-iac/references/ansible-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/ansible-common-errors.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/ansible-module-alternatives.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/ansible-module-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/ansible-security-checklist.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/terraform-best-practices.md` | Reference | Rewritten 2026-03-14 — added feature version gate table for 1.10/1.11/1.14 |
| `unmassk-ops/skills/ops-iac/references/terraform-common-errors.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/terraform-common-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/terraform-provider-examples.md` | Reference | Rewritten 2026-03-14 — added S3 public access block (security fix) |
| `unmassk-ops/skills/ops-iac/references/terraform-security-checklist.md` | Reference | Rewritten 2026-03-14 — noted Terrascan archived Nov 2025, Trivy v0.60.0 regression, tfsec deprecated |
| `unmassk-ops/skills/ops-iac/references/terraform-advanced-features.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/terraform-validation-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-iac/references/terragrunt-best-practices.md` | Reference | Rewritten 2026-03-14 — corrected DynamoDB deprecated in TF 1.11+, run-all→run --all |
| `unmassk-ops/skills/ops-iac/references/terragrunt-common-patterns.md` | Reference | Rewritten 2026-03-14 — stacks, feature flags, exclude, errors blocks, OpenTofu engine, provider cache |
| `unmassk-ops/skills/ops-observability/SKILL.md` | Skill definition | Created 2026-03-14 — frontmatter, routing table, 10-script reference, mandatory rules for PromQL/LogQL/Loki/Fluent Bit, done criteria |
| `unmassk-ops/skills/ops-observability/references/promql-metric-types.md` | Reference | Rewritten 2026-03-14 — Counter/Gauge/Histogram/Summary rules, native histograms (Prom 3.x), naming conventions |
| `unmassk-ops/skills/ops-observability/references/promql-functions.md` | Reference | Rewritten 2026-03-14 — rate/irate/increase, aggregation operators, *_over_time, histogram functions, prediction, label manipulation, time, utility, experimental (Prom 3.5+/3.7+) |
| `unmassk-ops/skills/ops-observability/references/promql-anti-patterns.md` | Reference | Rewritten 2026-03-14 — cardinality, incorrect function usage, histogram misuse, performance, mathematical errors |
| `unmassk-ops/skills/ops-observability/references/promql-best-practices.md` | Reference | Rewritten 2026-03-14 — label filtering, metric type rules, aggregation, time range selection, recording rules, alerting |
| `unmassk-ops/skills/ops-observability/references/promql-patterns.md` | Reference | Rewritten 2026-03-14 — RED/USE methods, SLO compliance, historical comparison, alerting patterns, vector matching |
| `unmassk-ops/skills/ops-observability/references/promql-validator-best-practices.md` | Reference | Rewritten 2026-03-14 — what validators check, test structure, severity levels, common fixes |
| `unmassk-ops/skills/ops-observability/references/logql-best-practices.md` | Reference | Rewritten 2026-03-14 — pipeline order, stream selectors, line filters, parsers, aggregation, structured metadata, bloom filters, non-existent features |
| `unmassk-ops/skills/ops-observability/references/loki-best-practices.md` | Reference | Rewritten 2026-03-14 — schema, deployment modes, storage, replication, cardinality, OTLP, bloom filters, Thanos storage, deprecated tools (Promtail EOL 2026-02-28) |
| `unmassk-ops/skills/ops-observability/references/loki-config-reference.md` | Reference | Rewritten 2026-03-14 — Loki 3.6.2, all config blocks with defaults: server, common, schema_config, storage_config (legacy + Thanos), ingester, distributor, querier, frontend, query_range, compactor, limits_config, ruler, pattern_ingester, bloom, memberlist, caching |
| `unmassk-ops/skills/ops-scripting/SKILL.md` | Skill definition | Created 2026-03-14 — frontmatter, routing table by tool, mandatory script commands with full paths, script reference table, Bash+Makefile mandatory rules, done criteria |
| `unmassk-ops/skills/ops-scripting/references/bash-scripting-guide.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-shell-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-script-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-generation-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-common-mistakes.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-shellcheck-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-text-processing.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-awk-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-sed-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-grep-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/bash-regex-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-structure.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-targets.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-variables.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-common-mistakes.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-security.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-optimization.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-scripting/references/make-bake-tool.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/SKILL.md` | Skill definition | Created 2026-03-14 — frontmatter, platform routing table, 29-script reference, mandatory rules, done criteria |
| `unmassk-ops/skills/ops-cicd/references/github-actions-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-common-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-expressions.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-modern-features.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-reusable-workflows.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-runners.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/github-actions-security.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/gitlab-ci-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/gitlab-best-practices.md` | Reference | Rewritten 2026-03-14 — consolidated validator variant |
| `unmassk-ops/skills/ops-cicd/references/gitlab-validator-best-practices.md` | Reference | Redirect stub — consolidated into gitlab-best-practices.md |
| `unmassk-ops/skills/ops-cicd/references/gitlab-validator-ci-reference.md` | Reference | Redirect stub — consolidated into gitlab-ci-reference.md |
| `unmassk-ops/skills/ops-cicd/references/gitlab-common-issues.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/gitlab-common-patterns.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/gitlab-security-guidelines.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/azure-pipelines-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/azure-best-practices.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/azure-tasks-reference.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/azure-templates-guide.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/azure-yaml-schema.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/jenkins-declarative-syntax.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/jenkins-scripted-syntax.md` | Reference | Rewritten 2026-03-14 |
| `unmassk-ops/skills/ops-cicd/references/jenkins-best-practices.md` | Reference | Rewritten 2026-03-14 — consolidated validator variant |
| `unmassk-ops/skills/ops-cicd/references/jenkins-common-plugins.md` | Reference | Rewritten 2026-03-14 — consolidated validator variant |
| `unmassk-ops/skills/ops-cicd/references/jenkins-validator-best-practices.md` | Reference | Redirect stub — consolidated into jenkins-best-practices.md |
| `unmassk-ops/skills/ops-cicd/references/jenkins-validator-plugins.md` | Reference | Redirect stub — consolidated into jenkins-common-plugins.md |

## unmassk-marketing reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-marketing/skills/unmassk-marketing/references/foundations.md` | Reference | Created 2026-03-14 — 4,116 words, covers product context, 72 mental models, 139 marketing ideas |
| `unmassk-marketing/skills/unmassk-marketing/references/copy.md` | Reference | Updated 2026-03-14 — expanded to full A-Z plain-english table (150+ entries), full Seven Sweeps with process steps and checklists, all natural transitions sections, platform anti-patterns + algorithm tips, Voice and Tone guidance, headless CMS editorial workflows, content strategy Before Planning section |
| `unmassk-marketing/skills/unmassk-marketing/references/cro.md` | Reference | Created 2026-03-14 — 3,641 words, covers page CRO, form CRO, popup CRO, signup flow CRO, experiments |
| `unmassk-marketing/skills/unmassk-marketing/references/product-context-template.md` | Reference | Pre-existing |
| `unmassk-marketing/skills/unmassk-marketing/references/email.md` | Reference | Updated 2026-03-14 — fixed CLI paths, added Vanilla Ice Cream + PASTOR frameworks, Top 15 Mistakes list, Internal Camouflage Principle |
| `unmassk-marketing/skills/unmassk-marketing/references/ads.md` | Reference | Updated 2026-03-14 — fixed CLI paths, added Composio .mcp.json prerequisite note, weekly review checklist, RSA description mix recommendation |
| `unmassk-marketing/skills/unmassk-marketing/references/analytics.md` | Reference | Updated 2026-03-14 — added Errors & Support events, subscription management events, e-commerce browsing/post-purchase events, integration events (full B2B/SaaS set), FB Pixel GTM config, e-commerce dataLayer patterns, A/B test templates (5 templates) |
| `unmassk-marketing/skills/unmassk-marketing/references/growth.md` | Reference | Updated 2026-03-14 — added industry conversion benchmarks, video mini-courses, evergreen webinars, Finance tool concepts, affiliate outreach template, affiliate tool platforms table |
| `unmassk-marketing/skills/unmassk-marketing/references/sales.md` | Reference | Updated 2026-03-14 — expanded HubSpot recipes (auto-MQL, lead activity digest), full Salesforce Flow equivalents, Zapier cross-tool patterns, Actions on entry per lifecycle stage, SQL-to-Opportunity and Opportunity-to-Close SLAs |

## unmassk-compliance legal-docs skill

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-legal-docs/SKILL.md` | Skill definition | Created 2026-03-15 — 42-reference routing table, 7 workflows, done criteria, all 42 filenames verified against disk |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-assignation-refere-communication-associe-selim-brihi.md` | Reference | Fixed 2026-03-15 — removed broken sub-file refs (workflow-informations.md, structure-assignation.md); workflow now self-contained |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-assignation-refere-recouvrement-creance-selim-brihi.md` | Reference | Fixed 2026-03-15 — removed 4 broken sub-file refs; workflow now self-contained with inline strategy notes |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-gdpr-privacy-notice-eu-oliver-schmidt-prietz.md` | Reference | Fixed 2026-03-15 — removed /mnt/skills/public/docx/SKILL.md path |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-dpia-sentinel-oliver-schmidt-prietz.md` | Reference | Fixed 2026-03-15 — removed /mnt/skills/public/docx/SKILL.md path (2 occurrences) |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-gdpr-breach-sentinel-oliver-schmidt-prietz.md` | Reference | Fixed 2026-03-15 — removed /mnt/skills/public/docx/SKILL.md path |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-politique-confidentialite-malik-taiar.md` | Reference | Fixed 2026-03-15 — removed assets/ template path, removed broken knowledge base refs (BASES_LEGALES.md etc.), updated Step 1 |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-docx-processing-anthropic.md` | Reference | Fixed 2026-03-15 — replaced scripts/office/unpack.py, scripts/comment.py, scripts/accept_changes.py, scripts/office/validate.py with standard system commands (unzip/zip/libreoffice) |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-pptx-processing-anthropic.md` | Reference | Fixed 2026-03-15 — removed editing.md/pptxgenjs.md/scripts/thumbnail.py refs; replaced with inline instructions |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-xlsx-processing-anthropic.md` | Reference | Fixed 2026-03-15 — removed scripts/recalc.py ref; replaced with LibreOffice --headless commands |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-pdf-processing-anthropic.md` | Reference | Fixed 2026-03-15 — removed REFERENCE.md/FORMS.md companion file refs |
| `unmassk-compliance/skills/compliance-legal-docs/references/legal-tabular-review-lawvable.md` | Reference | Fixed 2026-03-15 — removed AskUserQuestion/Task tool calls; replaced skill refs with reference file names |

**Stale-zone note:** The 42 reference files in compliance-legal-docs are NOT all audited. The above 12 files were fixed. The remaining 30 files were sampled (contract-review, nda-review, nda-triage, compliance, legal-risk-assessment-anthropic, mediation, gdpr-breach-sentinel, tech-contract-negotiation, vendor-due-diligence, canned-responses, politique-lanceur-alerte, requete-cph) — all clean, no broken paths.

## unmassk-compliance gdpr reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-gdpr/SKILL.md` | Skill definition | Fixed 2026-03-15 — routing table updated (4 rows, correct split between code-scanning and organizational posture), reference files table descriptions rewritten to match actual content |
| `unmassk-compliance/skills/compliance-gdpr/references/gdpr-pii-detection.md` | Reference | Rewritten 2026-03-15 — removed `${CLAUDE_SKILL_DIR}/` broken paths and README.md reference; restructured as 7-section reference: PII category table, regex patterns per type, 10-step scanning procedure, CWE reference table, regulation article cross-reference, output format templates, error handling table |
| `unmassk-compliance/skills/compliance-gdpr/references/gdpr-scanning.md` | Reference | Rewritten 2026-03-15 — complete rewrite from non-existent `gdpr-compliance-scanner` plugin boilerplate to GDPR organizational posture assessment: ROPA (Art. 30), lawful basis 6-basis table (Art. 6), special category data (Art. 9), consent checklist (Art. 7), DPO designation rules (Art. 37), DPA required clauses (Art. 28), cross-border transfer mechanisms including EU-US DPF (Art. 44-46), DPIA triggers and required content (Art. 35), breach notification (Art. 33), compliance gap matrix format |

## unmassk-compliance nis2 reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-nis2/SKILL.md` | Skill definition | Rewritten 2026-03-15 — routing table maps to 10 sections within nis2-overview.md, tightened workflow steps, added 11-control table with critical flags, corrected done criteria |
| `unmassk-compliance/skills/compliance-nis2/references/nis2-overview.md` | Reference | Rewritten 2026-03-15 — complete rewrite from upstream README (described non-existent .xlsx/.rtf files) to self-contained 9-section actionable reference: applicability table with override rules, 11-control gap assessment with maturity checklists, 12-month roadmap, 7-phase incident response procedure, 3 policy templates, GDPR crosswalk, ISO 27001 Annex A crosswalk, executive briefing content, Belgium/Netherlands regional guidance |

## unmassk-compliance owasp-privacy reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-owasp-privacy/SKILL.md` | Skill definition | Fixed 2026-03-15 — corrected A04-A06 ranking (Crypto/Injection/Insecure Design), fixed ASI01/ASI06 names to match reference headings, fixed description frontmatter category list, routing Focus Section matches exact reference heading |
| `unmassk-compliance/skills/compliance-owasp-privacy/references/owasp-2025-2026-report.md` | Reference | Fixed 2026-03-15 — stripped subtitle line and stale timestamp footer; no broken paths, no frontmatter, content solid |

## unmassk-compliance i18n reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-i18n/SKILL.md` | Skill definition | Verified 2026-03-15 — frontmatter canonical, routing table correct, 10 references all exist |
| `unmassk-compliance/skills/compliance-i18n/references/i18n-best-practices.md` | Reference | Fixed 2026-03-15 — removed all `./resources/` broken link prefixes (9 links in Quick Reference table + 8 links in Start Here section) |
| `unmassk-compliance/skills/compliance-i18n/references/getting-started.md` | Reference | Verified 2026-03-15 — correct relative links, no frontmatter |
| `unmassk-compliance/skills/compliance-i18n/references/cli-usage.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/key-management.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/ai-translation.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/github-sync.md` | Reference | Verified 2026-03-15 — `---` on line 180 is HR separator not frontmatter |
| `unmassk-compliance/skills/compliance-i18n/references/cdn-delivery.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/mcp-integration.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/sdk-integration.md` | Reference | Verified 2026-03-15 — no issues |
| `unmassk-compliance/skills/compliance-i18n/references/best-practices.md` | Reference | Verified 2026-03-15 — no issues |

## unmassk-compliance soc2-iso reference files

| Path | Type | Status |
|------|------|--------|
| `unmassk-compliance/skills/compliance-soc2-iso/SKILL.md` | Skill definition | Created 2026-03-15 — frontmatter, routing table (15 rows), 4 workflows, mandatory rules, done criteria |
| `unmassk-compliance/skills/compliance-soc2-iso/references/ciso-advisor-overview.md` | Reference | Fixed 2026-03-15 — stripped YAML frontmatter, removed non-existent script references (risk_quantifier.py, compliance_tracker.py), removed agent-protocol/SKILL.md reference, removed company-context.md reference |
| `unmassk-compliance/skills/compliance-soc2-iso/references/compliance_roadmap.md` | Reference | Verified 2026-03-15 — clean, no issues |
| `unmassk-compliance/skills/compliance-soc2-iso/references/incident_response.md` | Reference | Verified 2026-03-15 — clean, no issues |
| `unmassk-compliance/skills/compliance-soc2-iso/references/security_strategy.md` | Reference | Verified 2026-03-15 — clean, no issues |

**How to apply:** On each launch, check git commits since last verified date for each CLAUDE.md. If stale, update.
