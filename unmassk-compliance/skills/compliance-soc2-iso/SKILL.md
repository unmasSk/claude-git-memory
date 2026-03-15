---
name: compliance-soc2-iso
description: >
  Use when the user asks to "get SOC 2 certified", "SOC 2 readiness",
  "SOC 2 Type I", "SOC 2 Type II", "ISO 27001 certification",
  "ISO 27001 gap analysis", "ISMS implementation", "ISO 27001 Annex A",
  "HIPAA compliance", "HIPAA risk analysis", "GDPR compliance program",
  "compliance roadmap", "which compliance framework first",
  "multi-framework strategy", "generate compliance policy",
  "create security policy", "compliance documentation", "audit evidence",
  "trust service criteria", "information security policy",
  "security program for startup", "build a security program",
  "security budget justification", "board security reporting",
  "CISO advisory", "fractional CISO", "vCISO",
  "security strategy", "zero trust", "defense in depth",
  "security maturity model", "risk quantification", "ALE", "FAIR model",
  "incident response plan", "IR playbook", "severity classification",
  "breach notification", "tabletop exercise", "post-incident review",
  "cyber insurance", "vendor risk assessment", "security questionnaire",
  or mentions any of: SOC 2, SOC2, ISO 27001, ISO27001, HIPAA, GDPR,
  Trust Service Criteria, TSC, AICPA, ISMS, Annex A,
  Statement of Applicability, SoA, Business Associate Agreement, BAA,
  PHI, ePHI, CISO, security posture, risk register, ALE, SLE, ARO,
  ROSI, MTTD, MTTR, zero trust, ZTNA, defense in depth,
  security maturity, board security report, Vanta, Drata, Secureframe,
  IR playbook, SEV-1, SEV-2, ransomware response, data breach,
  audit readiness, access control policy, incident response policy,
  change management policy, vendor management policy, data retention
  policy, business continuity, disaster recovery, risk management,
  evidence collection, control mapping, gap analysis.
  Covers: SOC 2 Type I/II readiness, timeline, cost, and TSC control
  mapping; ISO 27001 certification program and full Annex A (93 controls);
  HIPAA compliance for health tech; GDPR compliance programs;
  multi-framework sequencing and control overlap analysis;
  GRC platform selection; 17 policy domains with templates and
  clarifying questions; audit evidence collection patterns;
  risk quantification using ALE/FAIR; zero trust maturity model
  (4 stages); defense-in-depth for startups; security maturity model
  (5 levels); board-level security reporting; security as revenue enabler;
  executive IR playbook (5 phases); severity classification (SEV-1 to SEV-4);
  communication templates (board, customer, regulator, media); tabletop
  exercise design; post-incident review framework; cyber insurance guidance;
  vendor security tiering; and CISO advisory for growth-stage companies.
  Based on comply by Alireza Rezvani (MIT License).
version: 1.0.0
---

# SOC 2 / ISO 27001 / Security Program Toolkit

Compliance planning, security strategy, policy generation, and incident
response leadership for growth-stage companies. Covers SOC 2, ISO 27001,
HIPAA, GDPR, and security program building from first principles.

Based on comply by Alireza Rezvani (MIT License).

## Request Routing

| User Request | Load Reference |
|---|---|
| SOC 2 readiness, timeline, cost, Type I vs II, trust service criteria | `references/compliance_roadmap.md` |
| ISO 27001 certification, ISMS, Annex A scope decision | `references/compliance_roadmap.md` |
| HIPAA compliance, BAA, PHI, health tech | `references/compliance_roadmap.md` |
| GDPR compliance program, legal basis, RoPA, DPIA | `references/compliance_roadmap.md` |
| Which framework first, compliance sequencing, multi-framework efficiency | `references/compliance_roadmap.md` |
| GRC platform comparison (Vanta, Drata, Secureframe) | `references/compliance_roadmap.md` |
| SOC 2 TSC control mapping (CC1–CC9, A, C, P) | `references/soc2-controls.md` |
| ISO 27001 Annex A control mapping (all 93 controls) | `references/iso27001-controls.md` |
| Policy templates, clarifying questions, policy generation | `references/policies.md` |
| Audit evidence planning, what auditors expect, evidence by control | `references/evidence-patterns.md` |
| Security strategy, risk-based approach, zero trust, defense in depth | `references/security_strategy.md` |
| Risk quantification, ALE, FAIR model, security ROI, budget justification | `references/security_strategy.md` |
| Security maturity model, maturity assessment | `references/security_strategy.md` |
| Board security reporting, quarterly security report | `references/security_strategy.md` |
| Security as revenue enabler, sales questionnaires, trust narrative | `references/security_strategy.md` |
| Incident response, IR playbook, severity classification (SEV-1–4) | `references/incident_response.md` |
| Breach notification, GDPR 72-hour, HIPAA notification | `references/incident_response.md` |
| Communication templates (board, customer, regulator, media) | `references/incident_response.md` |
| Tabletop exercise, post-incident review, blameless post-mortem | `references/incident_response.md` |
| Cyber insurance, legal counsel, law enforcement engagement | `references/incident_response.md` |
| CISO advisory, security leadership, board reporting, vCISO | `references/ciso-advisor-overview.md` |
| Vendor security assessment, vendor tiering | `references/ciso-advisor-overview.md` |
| Security metrics (MTTD, MTTR, phishing click rate) | `references/ciso-advisor-overview.md` |

Load references on-demand. Do not load all at startup.

## Workflows

### Compliance Roadmap Workflow

1. **Determine the correct framework** — Load `references/compliance_roadmap.md`, Section "Decision Framework: Which Framework First?". Match company profile to sequencing recommendation.
2. **Scope the engagement** — For SOC 2: identify Trust Service Criteria. For ISO 27001: define ISMS scope. For HIPAA: confirm Covered Entity or Business Associate status.
3. **Assess readiness gaps** — Work through the relevant timeline table. Identify which phases have gaps.
4. **Map control overlap** — Check the Multi-Framework Efficiency section. Do not rebuild controls that already exist — extend them.
5. **Produce roadmap** — Deliver: framework sequence, phase timeline, cost estimate, GRC platform recommendation, quick wins.

### Policy Generation Workflow

1. **Gather context** — Load `references/policies.md`. Collect: organization type, industry, data types handled, target framework, team size, existing tools. Save to `.compliance/config.json`.
2. **Select applicable policies** — For SOC 2: policies 1–10. For ISO 27001: all 17. For both: all 17. Use the policy list in `references/policies.md`.
3. **Generate each policy** — Ask the 3–5 clarifying questions per policy. Save answers. Generate draft following the standard policy structure. Label every draft `[DRAFT - Requires legal/compliance review]`.
4. **Map controls** — Load `references/soc2-controls.md` and `references/iso27001-controls.md`. Generate a control matrix: `policy → SOC 2 TSC → ISO 27001 Annex A`. Flag gaps.
5. **Plan evidence** — Load `references/evidence-patterns.md`. For each policy, list auditor-expected evidence, collection source, and frequency.
6. **Save session state** — After each session, save progress to `.compliance/status.md`.

### Security Strategy Workflow

1. **Asset classification** — Load `references/security_strategy.md`, Section 1. Classify assets into Tier 1 (crown jewels), Tier 2 (business critical), Tier 3 (operational).
2. **Threat actor profiling** — Identify the most likely threat actors for the company's profile.
3. **Risk quantification** — Calculate ALE for the top 5 risk scenarios using `ALE = SLE × ARO`. Express in dollars.
4. **Maturity assessment** — Score against the 5 maturity questions in Section 4. Map to Level 1–5.
5. **Zero trust sequencing** — Map current state to the 4-stage zero trust maturity model. Recommend next stage with cost and timeline.
6. **Produce report** — Risk register with ALE, maturity level, zero trust roadmap, budget allocation table.

### Incident Response Workflow

1. **Classify severity** — Load `references/incident_response.md`, Section 1. Assign SEV-1 through SEV-4.
2. **Activate executive IR plan** — Follow the phase structure: Detection (0–2h) → Containment (2–24h) → Notification (24–72h) → Recovery → Post-Incident Review.
3. **Determine notification obligations** — Identify applicable regulatory timelines: GDPR (72h), HIPAA (60 days), state breach notification (30–90 days). Document clock start time.
4. **Prepare communications** — Use the templates in Section 3: board notification (hour 1), customer notification (after legal review), regulator notification, media statement.
5. **Post-incident review** — Conduct within 30 days. Use the 6-part structure: timeline, root cause (5 Whys), what went well, what needs improvement, action items, metrics review.

### CISO Advisory Workflow

1. **Load** `references/ciso-advisor-overview.md`.
2. **Surface red flags** — Check the Red Flags list against the company's current state.
3. **Identify proactive triggers** — Check the Proactive Triggers section for issues to raise without being asked.
4. **Quantify risk** — Use the ALE formula. Express findings in business terms (dollars, regulatory exposure, deal impact).
5. **Produce artifact** — Match the user's request to the Output Artifacts table. Deliver in the format: Bottom Line → What → Why → How to Act → Decision required.

## Reference Files

| File | Contents | Load When |
|---|---|---|
| `references/compliance_roadmap.md` | SOC 2 Type I/II timelines and costs, ISO 27001 certification timeline, HIPAA compliance program, GDPR compliance checklist, multi-framework sequencing by company profile, control overlap analysis, GRC platform comparison | Compliance planning or framework selection |
| `references/soc2-controls.md` | SOC 2 TSC control-by-control reference (CC1–CC9, Availability, Confidentiality, Privacy), required evidence per control, policy-to-TSC mapping | SOC 2 control mapping, gap analysis, or audit prep |
| `references/iso27001-controls.md` | ISO 27001:2022 Annex A all 93 controls across 4 themes, applicability notes per control, new 2022 controls flagged, policy-to-Annex-A mapping | ISO 27001 control mapping or ISMS design |
| `references/policies.md` | 17 policy domains: clarifying questions per policy, required commitments, SOC 2 TSC and ISO 27001 Annex A cross-references | Policy generation or audit preparation |
| `references/evidence-patterns.md` | Auditor-expected evidence by control area, collection source, frequency; timing guidance for SOC 2 Type I vs Type II | Audit evidence planning |
| `references/security_strategy.md` | Risk-based security approach, asset classification, threat actor profiling, ALE/FAIR risk quantification, zero trust maturity model (4 stages), defense-in-depth layers, startup security budget allocation, security maturity model (5 levels), board security reporting structure | Security strategy, risk quantification, maturity assessment, board reporting |
| `references/incident_response.md` | Severity classification (SEV-1–4), executive IR plan (5 phases), notification decision matrix, communication templates (board, customer, regulator, media), tabletop exercise design (ransomware + insider threat scenarios), post-incident review framework, cyber insurance guidance, legal counsel guidance | Incident response, breach notification, tabletop design, post-incident review |
| `references/ciso-advisor-overview.md` | CISO responsibilities, risk quantification approach, vendor security tiering, security metrics targets, red flags, C-suite integration points, proactive triggers, output artifacts by request type | CISO advisory, security leadership, vendor risk, security metrics |

## Mandatory Rules

- Never recommend a compliance framework before identifying what customers actually require. Framework selection is a business decision, not a security decision.
- Always calculate ALE in dollars before recommending security investments. "It's important" is not justification — expected annual loss is.
- For incident response: document the exact time of discovery on the first call. Regulatory notification timelines (GDPR 72h, HIPAA 60d) start from when you had awareness, not when you confirmed the breach.
- Multi-framework work: always check control overlap before recommending new controls. SOC 2 → ISO 27001 is ~65–75% reuse. Don't rebuild.
- SOC 2 observation period: controls must operate consistently for the full period. One admin account without MFA during observation = finding. No exceptions.
- HIPAA: encryption at rest is "addressable" by the standard but expected by regulators. Treat it as required.
- Board reporting: express risks in dollars and business impact, not CVE counts or firewall rules.
- All generated policies are drafts — label every file with `[DRAFT - Requires legal/compliance review]`. Never assert a policy "satisfies" or "passes" an audit requirement — use "addresses", "supports", "is designed to meet".
- Flag all placeholder values in generated policies with `[REPLACE: description]`.
- The `.compliance/` directory may contain sensitive organizational data (framework choices, data types, team size). Add it to `.gitignore` before committing.
- FedRAMP, CMMC, and PCI DSS are out of scope for this skill. If the user asks about these frameworks, inform them that this skill covers SOC 2 and ISO 27001 only.

## Done Criteria

A task is complete when:
- Framework selected with business justification (customer demand, market expansion, legal requirement)
- Compliance roadmap delivered with phase timeline, cost range, and GRC platform recommendation
- Security risks quantified in dollars (ALE) — not just labeled by severity
- For policy generation: all applicable policies drafted, control matrix produced, gaps flagged, evidence plan created
- For incidents: severity classified, notification obligations identified with timelines, communication templates prepared
- For board reporting: risk posture in dollars, compliance status, incident summary, 4–6 key metrics
- All recommendations grounded in the reference files — no invented frameworks or unverified claims
