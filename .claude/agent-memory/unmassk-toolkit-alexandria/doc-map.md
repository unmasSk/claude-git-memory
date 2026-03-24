---
name: doc-map
description: Inventory of CLAUDE.md files in the project — where they are, when last verified, their status
type: project
---

## Known CLAUDE.md files

| Path | Last verified | Status |
|------|--------------|--------|
| `CLAUDE.md` (root) | 2026-03-24 | Managed block only — no drift possible |
| `chatroom/CLAUDE.md` | 2026-03-24 | Updated — added brainstorm mode pattern |
| `chatroom/apps/backend/CLAUDE.md` | 2026-03-24 | Updated — added WS message types table, brainstorm mode section |
| `chatroom/apps/frontend/CLAUDE.md` | 2026-03-24 | Verified current — no changes needed |

## Other documentation

| Path | Type | Status |
|------|------|--------|
| `CHANGELOG.md` (root) | Changelog | Audited 2026-03-24 — latest: [1.1.1], [Unreleased] added, duplicate [1.1.0] disambiguated |
| `chatroom/CHANGELOG.md` | Changelog | Audited 2026-03-24 — [Unreleased] Removed section corrected (V2 files all deleted) |
| `README.md` (root) | Project readme | Verified 2026-03-24 — accurate |
| `chatroom/README.md` | Project readme | Updated 2026-03-24 — test count corrected 535+ → 1200+ |

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
| `unmassk-compliance/skills/compliance-soc2-iso/references/ciso-advisor-overview.md` | Reference | Fixed 2026-03-15 — stripped YAML frontmatter, removed non-existent script references |
| `unmassk-compliance/skills/compliance-soc2-iso/references/compliance_roadmap.md` | Reference | Verified 2026-03-15 — clean |
| `unmassk-compliance/skills/compliance-soc2-iso/references/incident_response.md` | Reference | Verified 2026-03-15 — clean |
| `unmassk-compliance/skills/compliance-soc2-iso/references/security_strategy.md` | Reference | Verified 2026-03-15 — clean |

## unmassk-ops error-tracking skill

| Path | Type | Status |
|------|------|--------|
| `unmassk-ops/skills/ops-error-tracking/SKILL.md` | Skill definition | Created 2026-03-15 — frontmatter, 7-row routing table, framework disambiguation, 4-step workflow, 8 mandatory rules, done criteria |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-python-sdk.md` | Reference | Stripped frontmatter 2026-03-15 — Python SDK setup for Django/Flask/FastAPI/Celery, OTel path detection |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-node-sdk.md` | Reference | Stripped frontmatter 2026-03-15 — Node.js/Bun/Deno SDK, framework error handlers, ESM/CJS patterns |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-nextjs-sdk.md` | Reference | Stripped frontmatter 2026-03-15 — Next.js 3-runtime setup (browser/server/edge), App Router, source maps |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-react-sdk.md` | Reference | Stripped frontmatter 2026-03-15 — React 16-19 support, router integrations, Redux, source maps |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-fix-issues.md` | Reference | Stripped frontmatter 2026-03-15 — 7-phase MCP issue fixing workflow with security constraints |
| `unmassk-ops/skills/ops-error-tracking/references/sentry-create-alert.md` | Reference | Stripped frontmatter 2026-03-15 — Sentry workflow engine API, polymorphic comparison field, all action types |
| `unmassk-ops/skills/ops-error-tracking/references/otel-backends.md` | Reference | Created 2026-03-15 — OTel JS/Python instrumentation, 3 backend setups (Honeycomb/Datadog/SigNoz), custom spans, sampling |

## unmassk-crew agent system prompts

| Path | Type | Status |
|------|------|--------|
| `unmassk-crew/agents/cerberus.md` | Agent system prompt | Restructured 2026-03-15 — sections reordered to canonical template: Identity, When Invoked, Shared Discipline, Core Principles (Review Boundaries + Goal-Backward Verification + Approval Logic + Anti-Patch Detection), Workflow, Output Format, Noise Control, Memory |
| `unmassk-crew/agents/dante.md` | Agent system prompt | Restructured 2026-03-15 — sections reordered to canonical template: Identity, When Invoked, Shared Discipline, Core Principles (Test Selection Mode + Coverage Boundaries + Flaky Test Discipline + No Hardcoded Values + Manifesto + Philosophy), Workflow, Output Format, Noise Control, Quality Gates, Configuration, Integration Points, Memory, Remember. Broken `## ()` section deleted. |
| `unmassk-crew/agents/gitto.md` | Agent system prompt | Restructured 2026-03-15 — created Identity and When Invoked sections (Boot was orphaned ### with no parent). Added Shared Discipline. No Memory section (Gitto is read-only, no memory). |
| `unmassk-crew/agents/alexandria.md` | Agent system prompt | Restructured 2026-03-15 — moved Shared Discipline after Identity; merged duplicate "On Startup" + "Boot" sections into single "When Invoked" at position 2 with git root resolution; Responsibilities → Core Principles; Anti-Patterns → Noise Control; Output → Output Format; Memory section at end. |
| `unmassk-crew/agents/argus.md` | Agent system prompt | Restructured 2026-03-15 — moved Identity before Shared Discipline; Boot (was line 647) moved to "When Invoked" at position 2; Threat Modeling Mode + Findings Discipline + Escalation to Moriarty moved into Core Principles; deleted broken `## ()` section; Communication Guidelines → Noise Control; Best Practices moved into Workflow. |
| `unmassk-crew/agents/bilbo.md` | Agent system prompt | Restructured 2026-03-15 — moved Shared Discipline after Identity; Boot (was inside Memory at line 209) moved to "When Invoked" at position 2 with correct `$GIT_ROOT` path; What You Investigate + Evidence Standard → Core Principles; Memory section at end with Shutdown only. |
| `unmassk-crew/agents/house.md` | Agent system prompt | Restructured 2026-03-15 — moved Identity before Shared Discipline; "When to Invoke" renamed to "Trigger Conditions" inside "When Invoked" section; Boot (was inside Memory at line 345) moved to "When Invoked" at position 2; Bug Classification + Iron Law + 3-Hypothesis Rule + Scope Limits → Core Principles; Memory section at end. |
| `unmassk-crew/agents/moriarty.md` | Agent system prompt | Restructured 2026-03-15 — added H1 `# Moriarty — Adversarial Validation Agent`; moved Identity before Shared Discipline; Boot (was orphaned at line 561) moved to "When Invoked" at position 2; Attack Rules + Proof Standard + Termination Rules/Stop Conditions consolidated into Core Principles; Workflow section contains all 7 attack phases + pipeline info. |
| `unmassk-crew/agents/ultron.md` | Agent system prompt | Restructured 2026-03-15 — H1 changed from "Coder" to `# Ultron — Implementation Agent`; added Identity section; Boot (was inside Memory at line 134) moved to "When Invoked" at position 2; TodoWrite + Deviation Rules + Escalation Boundaries + Safety → Core Principles; Implementation/Fix/Refactoring/Validation Modes moved from after Memory into Workflow section. |
| `unmassk-crew/agents/yoda.md` | Agent system prompt | Restructured 2026-03-15 — added H1 `# Yoda — Senior Review Agent`; moved Identity before Shared Discipline; Boot (was orphaned at line 496) moved to "When Invoked" at position 2; Judgment Mode + Synthesis Rules + Non-Duplication Rule + Emotional Register → Core Principles; no Memory section (Yoda has no memory frontmatter). |

## Plugin README.md files — BM25 skill routing update

All 10 plugin README.md files updated 2026-03-15 to document BM25 skill routing system:

| Path | Update |
|------|--------|
| `unmassk-crew/README.md` | New "BM25 skill routing" section — describes skill-search.py, skillcat format, confidence threshold, flags |
| `unmassk-compliance/README.md` | New "BM25 skill discovery" section — 9 skillcats, hyphenated Article refs |
| `unmassk-db/README.md` | New "BM25 skill discovery" section — 7 skillcats (db-postgres pre-existing) |
| `unmassk-design/README.md` | New "BM25 skill discovery" section |
| `unmassk-flow/README.md` | New "BM25 skill discovery" section — 2 skillcats |
| `unmassk-marketing/README.md` | New "BM25 skill discovery" section |
| `unmassk-media/README.md` | New "BM25 skill discovery" section — 8 skillcats |
| `unmassk-ops/README.md` | New "BM25 skill discovery" section — 7 skillcats (ops-deploy pre-existing) |
| `unmassk-seo/README.md` | New "BM25 skill discovery" section — hyphenated compound triggers |
| `unmassk-gitmemory/README.md` | Note after Skills table — bin/skill-map-generator.py removed, internal skillcats removed |

## chatroom/docs — backend documentation (created 2026-03-19)

| Path | Type | Status |
|------|------|--------|
| `chatroom/docs/index.md` | Index | Created 2026-03-19 — table of contents for all 11 docs |
| `chatroom/docs/architecture-overview.md` | Reference | Created 2026-03-19 — request flow, module map, concurrency model, security perimeter |
| `chatroom/docs/module-reference.md` | Reference | Created 2026-03-19 — all 14 modules documented: exports, patterns, gotchas |
| `chatroom/docs/rest-api-reference.md` | Reference | Created 2026-03-19 — 6 HTTP endpoints with request/response shapes and error codes |
| `chatroom/docs/websocket-protocol.md` | Reference | Created 2026-03-19 — WS connection, 3 client messages, 7 server events, @everyone |
| `chatroom/docs/auth-flow.md` | Reference | Created 2026-03-19 — token issuance, WS auth, constant-time comparison, brute-force |
| `chatroom/docs/agent-invocation-pipeline.md` | Reference | Created 2026-03-19 — scheduling, semaphore, subprocess spawn, post-invocation paths |
| `chatroom/docs/prompt-injection-defense.md` | Reference | Created 2026-03-19 — 6 defense layers, sanitizePromptContent(), known limits |
| `chatroom/docs/rate-limiting.md` | Reference | Created 2026-03-19 — token bucket algorithm, all 4 deployed limiters |
| `chatroom/docs/database-schema.md` | Reference | Created 2026-03-19 — 3 tables, indexes, pagination pattern, concurrency notes |
| `chatroom/docs/configuration.md` | Reference | Created 2026-03-19 — all env vars, fixed constants, examples |
| `chatroom/docs/security.md` | Reference | Created 2026-03-19 — threat model, controls by category, known limitations |
| `chatroom/docs/testing-guide.md` | Reference | Created 2026-03-19 — test runner, DB strategy, file inventory, patterns |

## chatroom/apps/backend/src — JSDoc pass (2026-03-19)

All 15 target source files documented with enterprise JSDoc on 2026-03-19:

| File | Status |
|------|--------|
| `db/connection.ts` | Updated — `getDb` @summary + WAL/busy_timeout rationale |
| `db/schema.ts` | Updated — `initializeSchema` @summary + @throws |
| `db/queries.ts` | Updated — all 13 exported functions fully documented |
| `types.ts` | Updated — interface-level JSDoc on all 3 interfaces |
| `utils.ts` | Updated — all 5 exports: generateId, nowIso, mapMessageRow, mapAgentSessionRow, mapRoomRow, safeMessage (SEC-FIX 5 WHY in safeMessage) |
| `logger.ts` | Updated — `createLogger` @param + @returns; rootLogger one-liner |
| `config.ts` | Updated — NODE_ENV one-liner; WS_ALLOWED_ORIGINS doc with SEC-CONFIG-001 rationale |
| `services/auth-tokens.ts` | Updated — all exports: getReservedAgentNames, validateName, issueToken, peekToken, validateToken; constants explain SEC-AUTH codes |
| `services/stream-parser.ts` | Updated — exported interfaces (TextEvent, ToolUseEvent, ResultEvent); parseStreamLine @param + @returns |
| `services/agent-registry.ts` | Updated — BANNED_TOOLS explains SEC-FIX 3; loadAgentRegistry, getAgentConfig, getAllAgents |
| `services/mention-parser.ts` | Updated — NEVER_INVOKE explains T1-02 loop prevention; extractMentions full rules |
| `services/message-bus.ts` | Updated — broadcast @param + @returns; broadcastSync with hot-path note; stripSessionId SEC-FIX 5 |
| `services/rate-limiter.ts` | Updated — createTokenBucket @param + @returns |
| `routes/api.ts` | Updated — apiRoutes export doc with route list; checkApiRateLimit explains global-key rationale |
| `index.ts` | Updated — app singleton doc (FIX 3 + SEC-FIX 2); gracefulShutdown @param + shutdown order |

Style: no `@module`/`@file`/`@description`; no `{Type}` in `@param`; security constants explain WHY not just WHAT.
Verified: tsc --noEmit clean, 789 bun tests pass.

**How to apply:** On each launch, check git commits since last verified date for each CLAUDE.md. If stale, update.
