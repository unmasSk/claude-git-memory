# unmassk-compliance

**Regulatory compliance toolkit covering EU/Spanish data protection, cybersecurity directives, audit frameworks, and privacy implementation.**

9 skills spanning GDPR/PII detection, internationalization, OWASP application security, NIS2 directive compliance, SOC 2 and ISO 27001 program building, legal document processing, cookie consent implementation, Spain-specific data protection (LOPDGDD), and ENS (Esquema Nacional de Seguridad).

## What's included

| Skill | Covers |
|-------|--------|
| `compliance-gdpr` | PII detection in code, GDPR/CCPA/HIPAA/LGPD gap assessment, consent mechanisms, data retention, anonymization checks |
| `compliance-i18n` | Full Better i18n platform lifecycle: string discovery, key management, AI translation, GitHub sync, CDN delivery, Next.js/React SDK |
| `compliance-owasp-privacy` | OWASP Top 10:2025, ASVS 5.0.0 (~350 requirements, 3 levels), Agentic Applications Top 10:2026 (AI-specific risks) |
| `compliance-nis2` | NIS2 Directive (EU 2022/2555): scope determination, Article 21 gap assessment, incident reporting timelines, supply chain security, GDPR/ISO 27001 crosswalks |
| `compliance-soc2-iso` | SOC 2 Type I/II readiness, ISO 27001 ISMS, HIPAA, multi-framework sequencing, policy generation (17 domains), incident response playbooks, CISO advisory |
| `compliance-legal-docs` | 42 reference files: contract review and NDA triage, GDPR privacy notices, DPIA, breach notification, French litigation and employment law, vendor due diligence, document processing (PDF/DOCX/XLSX/PPTX) |
| `compliance-cookies` | Cookie audit, banner evaluation against GDPR/ePrivacy/AEPD, CMP selection, Google Consent Mode v2, cookie policy generation |
| `compliance-lopdgdd` | Spain-specific GDPR implementation (Ley Orgánica 3/2018): DPO assessment, RAT, DPIA triggers, aviso legal, ARSULIPO rights, digital rights (Title X) |
| `compliance-ens` | ENS (Esquema Nacional de Seguridad, RD 311/2022): system categorization (Basic/Medium/High), 75 security measures, audit process, CCN-STIC guides |

## Quick start

Run `/plugin` in Claude Code and install `unmassk-compliance` from the marketplace.

## Dependencies

Requires the **unmassk-toolkit** plugin (core). Install it from the marketplace before using unmassk-compliance.

## Notable features

- **compliance-gdpr** — Scans `src/`, `api/`, and `config/` first; every finding includes severity, regulation reference (GDPR Article / CCPA Section / HIPAA Rule), and CWE reference.
- **compliance-i18n** — Integrates with Better i18n MCP (12 tools: `listProjects`, `createKeys`, `publishTranslations`, etc.) and Cloudflare CDN delivery.
- **compliance-owasp-privacy** — Covers the 2025/2026 OWASP releases including the new agentic risk categories (ASI01–ASI10) for AI systems.
- **compliance-nis2** — Includes compliance crosswalks: GDPR covers ~55% of NIS2 requirements, ISO 27001 covers ~75%.
- **compliance-soc2-iso** — Policy templates ask 3–5 clarifying questions per policy domain. All generated policies are labeled `[DRAFT - Requires legal/compliance review]`.
- **compliance-legal-docs** — Multi-language: English and French (7 files). All outputs are advisory — always recommends qualified counsel review.
- **compliance-lopdgdd** — Generates compliance artifacts in `.compliance/`: RAT, DPIA, aviso legal, and status summary.
- **compliance-ens** — Covers private providers supplying services to Spanish public administration, not only public entities themselves.

## BM25 skill discovery

All 9 skills include `catalog.skillcat` files for BM25-indexed discovery by agents in unmassk-crew. The GDPR skillcat uses hyphenated Article references (Article-6, Article-7, etc.) for compound trigger matching.

## License

MIT
