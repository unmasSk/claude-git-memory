---
name: compliance-nis2
description: >
  Use when the user asks about "NIS2", "NIS 2", "NIS2 directive", "directiva NIS2",
  "Network and Information Security", "NIS2 compliance", "cumplimiento NIS2",
  "NIS2 requirements", "requisitos NIS2", "essential entity", "important entity",
  "entidad esencial", "entidad importante", "Article 21", "Artículo 21 NIS2",
  "incident reporting 24 hours", "notificación de incidentes 72 horas",
  "supply chain security NIS2", "NIS2 risk management", "gestión de riesgos NIS2",
  "NIS2 audit", "NIS2 gap assessment", "Article 23 notification", "EU cybersecurity
  directive", "NIS2 applicability", "cybersecurity policy template", "NIS2 crosswalk",
  "ISO 27001 to NIS2 mapping", "GDPR crosswalk NIS2", "ENISA", "CCN NIS2",
  "management accountability NIS2", "12-month roadmap NIS2", "CCB NIS2", "NCSC-NL NIS2",
  or when working on systems for EU public administration, healthcare, energy, transport,
  digital infrastructure, cloud providers, DNS providers, managed service providers,
  or any organization potentially in scope of the NIS2 Directive (Directive EU 2022/2555).
  Covers scope determination (Annex I/II sectors, size thresholds, NCA directory),
  Article 21(2) gap assessment (10 measures with maturity scoring 0-3 and implementation
  priority), Article 23 incident reporting (24h/72h/1-month timelines with templates),
  supply chain security requirements, compliance crosswalks (GDPR ~55%, ISO 27001 ~75%),
  12-month implementation roadmap, executive briefing content, and regional guidance for
  Belgium, Netherlands, and Spain. Based on NIS2 SMB package by Paolo Carner, BARE
  Consulting (CC BY 4.0).
version: 1.0.0
---

# NIS2 — EU Cybersecurity Directive Compliance Toolkit

Assess and implement NIS2 Directive (EU 2022/2555) compliance for essential and important
entities. Gap assessment, incident response procedures, supply chain security, policy
templates, and crosswalks with GDPR and ISO 27001.

Based on NIS2 SMB package by Paolo Carner, BARE Consulting (CC BY 4.0).

## Request Routing

Load reference files on demand. Do NOT load all at startup.

| User Request | Load Reference |
|---|---|
| Is my organization in scope? Entity classification, sectors, NCA directory | `references/nis2-scope.md` |
| Article 21 requirements, gap assessment, maturity scoring, policy templates | `references/nis2-article21.md` |
| Incident reporting, 24h/72h/1-month timelines, notification templates | `references/nis2-incidents.md` |
| Supply chain security, vendor assessment, supplier contracts | `references/nis2-supply-chain.md` |
| GDPR crosswalk, ISO 27001 crosswalk, 12-month roadmap, executive briefing, regional guidance | `references/nis2-governance.md` |

## NIS2 Quick Reference

| Classification | Employees | Fine |
|---|---|---|
| Essential Entity | 250+ (or Annex I override) | Up to €10M or 2% global turnover |
| Important Entity | 50–249 | Up to €7M or 1.4% global turnover |
| Out of scope | < 50 | — |

**Article 23 notification deadlines** (for significant incidents):

| Deadline | Action | Recipient |
|---|---|---|
| T+24h | Early warning (malicious? cross-border impact?) | National CSIRT / NCA |
| T+72h | Full notification (severity, impact, IoCs, measures) | National CSIRT / NCA |
| T+1 month | Final report (root cause, remediation, lessons learned) | National CSIRT / NCA |

**Parallel GDPR obligation**: If personal data is involved, also notify the data
protection authority within 72h per GDPR Article 33 — separate notification, same deadline.

## Audit Workflow

### Step 1 — Determine Applicability

Load `references/nis2-scope.md`. Identify:
- Employee count, annual turnover, balance sheet
- Sector (Annex I = Essential, Annex II = Important)
- Override rules (DNS providers, TLD registries, trust services are always in scope regardless of size)
- Entity type: Essential / Important / Out of scope

If out of scope, document determination and stop. If in scope, proceed.

### Step 2 — Registration Check

NIS2 requires registration with the national competent authority (NCA). Check:
- Has the organization registered with the relevant NCA?
- If not registered: this is the first action to take.

NCA contacts in `references/nis2-scope.md`.

### Step 3 — Article 21 Gap Assessment

Load `references/nis2-article21.md`. Work through all 10 measures. For each:
1. Score maturity 0–3 (0 = not implemented, 3 = fully implemented and documented)
2. Document current evidence for scores 2–3
3. Document gap for scores 0–1
4. Assign owner and target date

Record results in the gap assessment summary template (end of reference file).

### Step 4 — Map Existing Controls (Crosswalk)

Load `references/nis2-governance.md`. Before creating new policies or controls:
1. Check GDPR crosswalk — identify what GDPR evidence satisfies NIS2
2. Check ISO 27001 crosswalk — identify what ISMS documentation satisfies NIS2
3. Reduce implementation scope to genuine gaps only

### Step 5 — Incident Response Readiness

Load `references/nis2-incidents.md`. Verify:
- Incident classification criteria (significant vs. non-significant) defined
- 24h/72h/1-month notification workflow documented and assigned
- National CSIRT/NCA contact is on file and tested
- Designated incident contact point exists
- Post-incident review process exists

If gaps found, generate incident response procedure addendum using the templates in the reference file.

### Step 6 — Supply Chain Security

Load `references/nis2-supply-chain.md`. For each critical supplier verify:
- Security certification (SOC 2 / ISO 27001 / equivalent) or compensating controls
- Contractual security clause covering incident notification
- Supply chain risk assessment documented

### Step 7 — Management Accountability

NIS2 Article 20 establishes personal liability for management body members.

Verify:
1. Management formally approved cybersecurity risk management measures
2. Annual management review of security posture documented
3. Management members receiving NIS2 awareness training
4. Documented escalation path from CISO/IT to management

### Step 8 — Produce Report

Deliver compliance assessment covering:
1. Applicability determination (essential / important / not applicable)
2. Maturity score per Article 21(2) measure (0–3 scale, 0–30 total)
3. Critical measures status (a, b, c, i — highest liability exposure)
4. Crosswalk reuse opportunities (GDPR / ISO 27001)
5. Incident response readiness against 24h/72h/1-month framework
6. Supply chain gaps
7. 12-month roadmap from `references/nis2-governance.md`

## Mandatory Rules

- Always determine applicability before assessing controls.
- Never skip incident notification timeline assessment — it is the most time-critical NIS2 requirement and carries personal liability for management.
- Always check GDPR and ISO 27001 crosswalks before drafting new controls — reuse existing evidence to reduce implementation effort.
- Management accountability is mandatory under NIS2 Article 20 — always flag if board-level awareness and formal approval is missing.
- Never state that an organization "complies with NIS2" — use "has implemented measures aligned with" or "addresses the requirements of".
- All legal determinations (entity classification, national law interpretation) require verification with legal counsel in the relevant Member State.
- Policy templates contain `[ORGANIZATION NAME]` and similar placeholders — always replace before delivering.
- NIS2 is transposed differently by each Member State — note when national law may add requirements beyond the directive.

## Done Criteria

A task is complete when:
- Applicability determined and documented (essential / important / not applicable)
- All 10 Article 21(2) measures assessed with maturity scores (0–3)
- Incident response timeline validated against 24h/72h/1-month framework
- GDPR and ISO 27001 crosswalk reuse opportunities identified
- Supply chain risk assessment status confirmed
- Management accountability status confirmed
- Report delivered with 12-month roadmap recommendation
