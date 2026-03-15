# ENS — Audit and Certification Process

Reference for the ENS audit process and conformity certification under RD 311/2022.

Source: RD 311/2022, articles 31-37. CCN-STIC-802 (ENS Audit). Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191

---

## Audit Requirements by Category

### Basic Category — Self-Assessment

Systems classified as Basic category must conduct a **self-assessment** using the verification checklist provided by the CCN.

- Performed by the entity's own personnel
- Uses the CCN verification checklist (CCN-STIC-808)
- Does not require an external auditor
- Result: self-assessment report documenting compliance status per measure

Download CCN-STIC-808: https://www.ccn-cert.cni.es/es/series-ccn-stic.html

### Medium and High Category — Formal Security Audit

Systems classified as Medium or High category require a **formal security audit** conducted by a qualified audit team.

The audit team may be:
- **Internal**: organization's own personnel, provided they have the required competencies and independence from the audited system
- **External**: third-party firm accredited by ENAC for ENS certification audits

The audit evaluates compliance with all applicable Annex II measures for the system's category.

---

## Audit Frequency

| Type | Trigger | Applicable to |
|------|---------|---------------|
| Ordinary audit | Every 2 years | All categories |
| Extraordinary audit | After substantial modifications to the system | All categories |

**Substantial modifications** requiring an extraordinary audit include: changes in system architecture, changes in the category of information processed, significant security incidents, or changes in the legal or contractual environment.

---

## Audit Process (Medium/High)

### Phase 1 — Planning

1. Define audit scope: systems, components, organizational units in scope
2. Obtain current system documentation (categorization, Statement of Applicability, security policy, risk analysis)
3. Review previous audit report and open findings (if applicable)
4. Schedule interviews with system owner, security officer, and technical staff

### Phase 2 — Evidence Collection

For each applicable Annex II measure, collect evidence of:
- Existence: the measure is documented (policy, procedure, or technical configuration)
- Implementation: the measure is actually in place (system screenshots, configuration exports, interview records)
- Effectiveness: the measure functions as intended (test results, logs, incident records)

### Phase 3 — Gap Analysis

Classify each measure as:
- **Compliant**: fully implemented with sufficient evidence
- **Partially compliant**: implemented but with gaps or deficiencies
- **Non-compliant**: not implemented or evidence insufficient

### Phase 4 — Audit Report

The audit report must include:
- Scope and methodology
- Compliance status per measure (with evidence references)
- List of non-conformities classified by severity
- Recommendations for remediation
- Auditor's overall opinion

---

## ENS Conformity Certification

ENS certification is issued by **certification bodies accredited by ENAC** (Entidad Nacional de Acreditación). The system owner cannot self-certify.

### Who Issues Certification

ENAC-accredited certification bodies for ENS. Current list: https://www.enac.es

### Certification Scope

Certification covers a specific system within a defined scope. It does not certify the entire organization unless all systems are included in scope.

### Certification Levels

Certificates are issued per system category:
- ENS Basic conformity certificate
- ENS Medium conformity certificate
- ENS High conformity certificate

### Certification Process

1. **Pre-audit**: organization conducts internal readiness assessment
2. **Stage 1 audit**: documentation review (off-site, typically 2-4 weeks)
3. **Stage 2 audit**: on-site audit of implementation and effectiveness
4. **Corrective actions**: organization addresses non-conformities identified
5. **Certification decision**: certification body issues or denies certificate
6. **Surveillance audits**: periodic audits during the 2-year certification cycle to maintain validity

### Certification Validity

ENS certificates are valid for **2 years**, subject to satisfactory surveillance audits. Renewal requires a full re-audit.

---

## Key Documents for Audit Preparation

| Document | Location | Purpose |
|----------|----------|---------|
| System categorization | `.compliance/ens-categorizacion.md` | Establishes which measures apply |
| Statement of Applicability | `.compliance/ens-declaracion-aplicabilidad.md` | Maps all 75 measures to implementation status |
| Security policy | `.compliance/ens-politica-seguridad.md` | Demonstrates org.1 compliance |
| Risk analysis | `.compliance/ens-analisis-riesgos.md` | Required for Medium and High |
| Remediation plan | `.compliance/ens-plan-adecuacion.md` | Shows active management of gaps |

---

## Audit Outcome — Non-Conformities

The auditor classifies non-conformities as:

| Classification | Definition | Implication |
|---------------|------------|-------------|
| Major non-conformity | Absence or complete failure of a required measure | Blocks certification until resolved |
| Minor non-conformity | Partial implementation or effectiveness deficiency | Must be resolved within agreed timeframe |
| Observation | Area for improvement, not a compliance failure | Optional to address |

---

## CCN Resources for Audit

| Resource | URL | Purpose |
|----------|-----|---------|
| CCN-STIC-802 | https://www.ccn-cert.cni.es/es/series-ccn-stic.html | ENS audit methodology guide |
| CCN-STIC-808 | https://www.ccn-cert.cni.es/es/series-ccn-stic.html | Verification checklist (Basic self-assessment) |
| PILAR tool | https://www.ccn-cert.cni.es/es/herramientas-de-ciberseguridad/pilar.html | Risk analysis tool |
| CCN consultation service | https://www.ccn-cert.cni.es | Technical queries to CCN |
| ENAC accredited bodies | https://www.enac.es | List of accredited certification bodies |
