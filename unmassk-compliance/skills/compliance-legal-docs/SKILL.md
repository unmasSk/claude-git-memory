---
name: compliance-legal-docs
description: >
  Use when the user asks to "review a contract", "review an NDA", "triage this NDA",
  "analyze this NDA", "redline this agreement", "negotiate contract terms",
  "review this tech contract", "NIL contract review", "analyze contract risk",
  "legal risk assessment", "assess legal exposure", "risk matrix",
  "GDPR privacy notice", "draft privacy policy", "politique de confidentialité",
  "DPIA", "data protection impact assessment", "GDPR breach", "data breach notification",
  "breach sentinel", "assess data breach", "72 hour notification",
  "vendor due diligence", "third-party risk", "supplier assessment",
  "mediation analysis", "dispute analysis", "settlement strategy",
  "legal simulation", "mock trial", "litigation strategy",
  "statute analysis", "analyze legislation",
  "assignation en référé", "recouvrement de créance", "communication de documents sociaux",
  "requête CPH", "licenciement pour faute grave", "conseil de prud'hommes",
  "notification de licenciement", "politique lanceur d'alerte", "whistleblower policy",
  "tabular review", "review multiple contracts", "extract from contracts",
  "canned responses", "legal response templates", "litigation hold",
  "meeting briefing", "legal meeting prep",
  "legal red team", "adversarial legal review",
  "process PDF", "extract from PDF", "process Word document", "edit DOCX",
  "process Excel", "create spreadsheet", "process PowerPoint",
  "outlook legal emails", "email templates legal",
  "security review legal", "vscode legal extension",
  "skill creator", "skill optimizer",
  or mentions any of: NDA, contract, indemnification, liability cap, IP clause,
  DPA, GDPR, CCPA, DPIA, data breach, supervisory authority, ENISA, EDPB,
  vendor risk, due diligence, DORA, NIS2, mediation, BATNA, ZOPA,
  référé, assignation, CPH, prud'hommes, licenciement, lanceur d'alerte,
  politique de confidentialité, cookies CNIL, RGPD, faute grave,
  tabular review, legal hold, canned response.
  Covers 42 reference files across contract review and negotiation, GDPR compliance,
  legal risk assessment, litigation support, French employment law, vendor due diligence,
  document processing (PDF/DOCX/XLSX/PPTX), and legal operations.
  Multi-language: English, French (7 files), German (within EU GDPR files).
  All outputs are advisory — not legal advice. Always recommend qualified counsel review.
version: 1.0.0
---

# Legal Docs -- Legal Practice Toolkit

42 reference files covering contract review, GDPR compliance, litigation support,
French law, and document processing. Load references on demand — never all at startup.

## Request Routing

### Contract Review & Negotiation

| User Request | Load Reference |
|---|---|
| Review any contract | `legal-contract-review-anthropic` |
| Review or analyze an NDA | `legal-nda-review-jamie-tso` |
| Triage NDA (GREEN/YELLOW/RED) | `legal-nda-triage-anthropic` |
| Tech services contract negotiation | `legal-tech-contract-negotiation-patrick-munro` |
| NIL contract review (student athletes) | `legal-nil-contract-analysis-samir-patel` |

### Privacy & GDPR

| User Request | Load Reference |
|---|---|
| Draft GDPR privacy notice (EU/DE/FR) | `legal-gdpr-privacy-notice-eu-oliver-schmidt-prietz` |
| Draft French privacy policy (politique de confidentialité) | `legal-politique-confidentialite-malik-taiar` |
| DPIA / data protection impact assessment | `legal-dpia-sentinel-oliver-schmidt-prietz` |
| GDPR data breach / 72h notification | `legal-gdpr-breach-sentinel-oliver-schmidt-prietz` |
| Cookie policy (France) | `legal-politique-cookies-malik-taiar` |
| General GDPR / DPA review / data subject rights | `legal-compliance-anthropic` |

### Legal Risk Assessment

| User Request | Load Reference |
|---|---|
| Legal risk assessment (Anthropic framework) | `legal-legal-risk-assessment-anthropic` |
| Legal risk assessment (Zacharie Laik variant) | `legal-legal-risk-assessment-zacharie-laik` |
| Adversarial legal review / red team | `legal-red-team-verifier-patrick-munro` |

### Litigation & Disputes

| User Request | Load Reference |
|---|---|
| Mediation preparation / dispute analysis | `legal-mediation-dispute-analysis-jinzhe-tan` |
| Legal simulation / mock trial | `legal-legal-simulation-patrick-munro` |
| Statute / legislation analysis | `legal-statute-analysis-rafal-fryc` |
| Assignation en référé — communication de documents sociaux (Art. L. 238-1) | `legal-assignation-refere-communication-associe-selim-brihi` |
| Assignation en référé — recouvrement de créance (Art. 873 al. 2 CPC) | `legal-assignation-refere-recouvrement-creance-selim-brihi` |
| Requête CPH — licenciement pour faute grave | `legal-requete-cph-licenciement-faute-grave-selim-brihi` |

### Employment Law (French)

| User Request | Load Reference |
|---|---|
| Notification de licenciement (French dismissal letter) | `legal-notification-licenciement-selim-brihi` |
| Whistleblower policy / politique lanceur d'alerte | `legal-politique-lanceur-alerte-malik-taiar` |

### Vendor & Procurement

| User Request | Load Reference |
|---|---|
| Vendor due diligence / third-party risk | `legal-vendor-due-diligence-patrick-munro` |
| Tabular review of multiple contracts | `legal-tabular-review-lawvable` |

### Document Processing

| User Request | Load Reference |
|---|---|
| Process / extract from PDF | `legal-pdf-processing-anthropic` or `legal-pdf-processing-openai` |
| Create / edit DOCX | `legal-docx-processing-anthropic` |
| Analyze DOCX (Lawvable approach) | `legal-docx-processing-lawvable` |
| Analyze DOCX (OpenAI approach) | `legal-docx-processing-openai` |
| Create DOCX (Superdoc approach) | `legal-docx-processing-superdoc` |
| Create / edit XLSX / spreadsheet | `legal-xlsx-processing-anthropic` |
| Analyze XLSX (Manus approach) | `legal-xlsx-processing-manus` |
| Analyze XLSX (OpenAI approach) | `legal-xlsx-processing-openai` |
| Create / edit PPTX | `legal-pptx-processing-anthropic` |

### Legal Operations

| User Request | Load Reference |
|---|---|
| Canned responses / response templates / litigation hold | `legal-canned-responses-anthropic` |
| Meeting briefing / legal meeting prep | `legal-meeting-briefing-anthropic` |
| Outlook email templates for legal | `legal-outlook-emails-lawvable` |
| Security review | `legal-security-review-openai` |
| Create a skill | `legal-skill-creator-anthropic` or `legal-skill-creator-openai` |
| Optimize a skill | `legal-skill-optimizer-lawvable` |
| VS Code extension builder | `legal-vscode-extension-builder-lawvable` |

---

## Workflows

### Contract Review Workflow

1. Load `legal-contract-review-anthropic`
2. Identify contract type and the user's side (vendor/customer/licensor/licensee)
3. Read the full contract before flagging issues
4. Analyze material clauses against the playbook
5. Classify each finding: GREEN (acceptable) / YELLOW (negotiate) / RED (escalate)
6. Generate redlines for YELLOW and RED items in the standard format
7. Prioritize: Tier 1 (must-have) → Tier 2 (should-have) → Tier 3 (nice-to-have)

### NDA Workflow

1. Confirm NDA type (unilateral/mutual) and user's role (Recipient/Discloser)
2. If mutual → use `legal-nda-review-jamie-tso`; if triage only → use `legal-nda-triage-anthropic`
3. Run 5-step workflow: identify stance → triage → clause-by-clause → draft redlines → finalize
4. Deliver: executive summary + clause-by-clause issue log table

### GDPR Privacy Notice Workflow

1. Determine jurisdiction (DE/FR/other EU) and notice type
2. Load `legal-gdpr-privacy-notice-eu-oliver-schmidt-prietz`
3. Follow 5 steps: Scope → Intake → Draft → Verify → Deliver as .docx
4. For French-specific notices: also load `legal-politique-confidentialite-malik-taiar`
5. For docx generation: use instructions in `legal-docx-processing-anthropic`

### GDPR Breach Workflow

1. Load `legal-gdpr-breach-sentinel-oliver-schmidt-prietz`
2. Display disclaimer → check emergency status → select mode (Guided/Fast Path)
3. Collect 11 data points → ENISA risk assessment → EDPB case matching
4. Determine notification requirements (SA / data subjects / Art. 36)
5. Generate audit-ready documents

### DPIA Workflow

1. Load `legal-dpia-sentinel-oliver-schmidt-prietz`
2. Run threshold assessment → description → necessity/proportionality → risks → mitigations
3. Check against jurisdiction blacklists (load relevant jurisdiction file from reference)
4. Determine residual risk → Art. 36 consultation if high
5. Generate .docx documentation

### French Litigation Workflow (Assignations, CPH)

1. Identify the type: communication de documents (L. 238-1) OR recouvrement de créance (Art. 873) OR CPH requête
2. Load the corresponding reference
3. Collect all required information before drafting (the reference lists exactly what to ask)
4. Draft following the 5-part structure embedded in the reference
5. Verify — then create the .docx using `legal-docx-processing-anthropic`

### Tabular Review Workflow

1. Load `legal-tabular-review-lawvable`
2. Ask: document folder path, output filename, columns to extract
3. Discover documents (PDF + DOCX) using Glob
4. Process documents (parallel if subagents available, sequential otherwise)
5. Generate Excel output using `legal-xlsx-processing-anthropic`

---

## Reference Files

All paths relative to `references/`. Load on demand — not at startup.

| File | Domain | Load When |
|---|---|---|
| `legal-contract-review-anthropic` | Contract review, clause analysis, redlines, GREEN/YELLOW/RED classification | Contract review request |
| `legal-nda-review-jamie-tso` | NDA review (unilateral), 5-step workflow, Recipient/Discloser perspective | NDA review with full analysis |
| `legal-nda-triage-anthropic` | NDA triage, fast screening, GREEN/YELLOW/RED routing | NDA triage or quick screening |
| `legal-tech-contract-negotiation-patrick-munro` | Tech services negotiation, 3-position framework, concession roadmap | Contract negotiation strategy |
| `legal-nil-contract-analysis-samir-patel` | NIL contracts, NCAA student-athlete representation, state compliance | NIL deal review |
| `legal-gdpr-privacy-notice-eu-oliver-schmidt-prietz` | Pan-EU privacy notice generation, DE/FR/EU, Art. 13/14, .docx output | GDPR privacy notice drafting |
| `legal-politique-confidentialite-malik-taiar` | French privacy policy (politique de confidentialité), CNIL standards | French privacy policy request |
| `legal-dpia-sentinel-oliver-schmidt-prietz` | DPIA (Art. 35 GDPR), EDPB nine-criteria, jurisdiction blacklists, risk scoring | DPIA assessment |
| `legal-gdpr-breach-sentinel-oliver-schmidt-prietz` | Breach response (Art. 33/34), ENISA methodology, 72h clock, .docx docs | Data breach notification |
| `legal-politique-cookies-malik-taiar` | Cookie policy (France), CNIL recommendations | French cookie policy |
| `legal-compliance-anthropic` | GDPR overview, DPA review, data subject rights, regulatory monitoring | General GDPR compliance questions |
| `legal-legal-risk-assessment-anthropic` | Risk matrix (Severity × Likelihood), GREEN/YELLOW/ORANGE/RED, risk register | Legal risk assessment |
| `legal-legal-risk-assessment-zacharie-laik` | Alternative risk assessment framework | Second opinion or variant approach |
| `legal-red-team-verifier-patrick-munro` | Adversarial legal review, stress-testing legal positions | Red team or adversarial review |
| `legal-mediation-dispute-analysis-jinzhe-tan` | Mediation prep, BATNA/WATNA, ZOPA, settlement directions, Mode A/B | Mediation preparation |
| `legal-legal-simulation-patrick-munro` | Mock trial / legal simulation | Litigation strategy or simulation |
| `legal-statute-analysis-rafal-fryc` | Statute and legislation analysis | Analyzing a law or regulation |
| `legal-assignation-refere-communication-associe-selim-brihi` | French référé: associate requesting corporate documents (Art. L. 238-1) | Assignation for document communication |
| `legal-assignation-refere-recouvrement-creance-selim-brihi` | French référé: debt collection (Art. 873 al. 2 CPC) | Assignation for debt recovery |
| `legal-requete-cph-licenciement-faute-grave-selim-brihi` | French CPH claim: wrongful dismissal for serious misconduct | CPH complaint drafting |
| `legal-notification-licenciement-selim-brihi` | French dismissal notification letter | Drafting a dismissal letter |
| `legal-politique-lanceur-alerte-malik-taiar` | French whistleblower policy, EU Directive 2019/1937, Sapin II | Whistleblower system assessment or drafting |
| `legal-vendor-due-diligence-patrick-munro` | Vendor risk, 3-phase assessment, DORA/NIS2/GDPR, onboarding | Vendor due diligence |
| `legal-tabular-review-lawvable` | Multi-document extraction into Excel matrix with citations | Tabular review of contract set |
| `legal-pdf-processing-anthropic` | PDF processing: pypdf, pdfplumber, reportlab, OCR | PDF extraction or creation |
| `legal-pdf-processing-openai` | PDF processing (OpenAI variant) | Alternative PDF approach |
| `legal-docx-processing-anthropic` | DOCX creation (docx-js), editing (XML), tracked changes, tables | Create or edit Word documents |
| `legal-docx-processing-lawvable` | DOCX analysis (Lawvable approach) | Analyzing existing Word documents |
| `legal-docx-processing-openai` | DOCX processing (OpenAI approach) | Alternative DOCX approach |
| `legal-docx-processing-superdoc` | DOCX creation (Superdoc approach) | Alternative DOCX creation |
| `legal-xlsx-processing-anthropic` | Excel creation/editing (openpyxl, pandas), formula standards | Create or edit Excel files |
| `legal-xlsx-processing-manus` | Excel analysis (Manus approach) | Analyzing existing spreadsheets |
| `legal-xlsx-processing-openai` | Excel processing (OpenAI approach) | Alternative Excel approach |
| `legal-pptx-processing-anthropic` | PPTX creation (pptxgenjs), editing, design guidelines, QA | Create or edit PowerPoint files |
| `legal-canned-responses-anthropic` | Response templates: DSRs, litigation holds, NDAs, subpoenas | Templated legal responses |
| `legal-meeting-briefing-anthropic` | Legal meeting preparation and briefing | Preparing for legal meetings |
| `legal-outlook-emails-lawvable` | Outlook email templates for legal teams | Legal email drafting |
| `legal-security-review-openai` | Security review framework | Security review request |
| `legal-skill-creator-anthropic` | Skill creation guidance (Anthropic approach) | Creating a new skill |
| `legal-skill-creator-openai` | Skill creation guidance (OpenAI approach) | Creating a new skill (variant) |
| `legal-skill-optimizer-lawvable` | Skill optimization guidance | Optimizing an existing skill |
| `legal-vscode-extension-builder-lawvable` | VS Code extension building | Building a VS Code extension |

---

## Mandatory Rules

- Load references on demand only — never all at startup
- All outputs are advisory only — always recommend qualified legal counsel review
- Never provide jurisdiction-specific legal conclusions without clearly flagging limitations
- For French legal documents (assignations, CPH): keep documents in French — they are jurisdiction-specific
- For docx generation: always read `legal-docx-processing-anthropic` before generating a .docx file
- For multi-document tabular review: load both `legal-tabular-review-lawvable` and the relevant document processing reference

---

## Done Criteria

A task is complete when:
- The relevant reference was loaded before producing output
- Legal disclaimer is included where required
- Output matches the deliverable format defined in the reference (table, report, .docx, etc.)
- Escalation triggers were checked and flagged if present
- User was advised to have qualified legal counsel review the output
