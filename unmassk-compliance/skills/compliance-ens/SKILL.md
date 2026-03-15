---
name: compliance-ens
description: Use when the user asks about "ENS", "Esquema Nacional de Seguridad", "National Security Framework Spain", "seguridad administración pública España", "CCN-CERT", "CCN-STIC", "categorización sistemas ENS", "medidas de seguridad ENS", "auditoría ENS", "certificación ENS", "conformidad ENS", "Real Decreto 311/2022", "RD 311/2022", "entidades del sector público España", "administración local ENS", "ayuntamiento seguridad", "municipios sistemas información", "proveedores sector público España", "licitación pública seguridad", or when building systems for Spanish public administration (central government, regional government, local government, public companies, universities), or when acting as a technology provider supplying services to Spanish public entities.
version: 1.0.0
---

# ENS — Esquema Nacional de Seguridad

## Overview

The ENS (Esquema Nacional de Seguridad — National Security Framework) establishes minimum security requirements for information systems of Spanish public administrations and the private providers that supply them with services. Compliance is mandatory.

**Legal basis**: Real Decreto 311/2022, de 3 de mayo (supersedes RD 3/2010).
**Full text**: https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191
**Responsible body**: CCN (Centro Criptológico Nacional). Technical guides: https://www.ccn-cert.cni.es/es/series-ccn-stic.html

**Scope** (article 2, RD 311/2022):
- Central State Administration (Administración General del Estado)
- Regional governments (Comunidades Autónomas)
- Local government entities (ayuntamientos, diputaciones, cabildos)
- Public-law entities linked to or dependent on public administrations
- Public universities
- **Private providers** supplying services to public administrations with access to their systems

## Routing Table

| Task | Reference |
|------|-----------|
| System categorization (Basic/Medium/High) | `references/ens-categorizacion.md` |
| Security measures by category | `references/ens-medidas.md` |
| Audit and certification process | `references/ens-auditoria.md` |
| Applicable CCN-STIC technical guides | `references/ens-ccn-stic.md` |

## Workflow

### Step 0 — Determine Applicability

Confirm ENS applies by answering:

1. Does the system process information belonging to a Spanish public administration?
2. Does the system provide services to a Spanish public administration with access to its data or systems?
3. Does the tender or contract require ENS conformity or certification?

If the answer to any of these is Yes → ENS applies. Continue.

### Step 1 — System Categorization

Load `references/ens-categorizacion.md`.

The system category (Basic / Medium / High) determines which security measures are mandatory.

**Security dimensions to assess**:
- **Confidentiality** (C): impact if information is accessed by unauthorized parties
- **Integrity** (I): impact if information is modified without authorization
- **Traceability** (T): impact if it cannot be determined who accessed or modified information
- **Authenticity** (A): impact if the identity of users or systems cannot be verified
- **Availability** (D): impact if the system is not accessible when needed

For each dimension, assess the impact of an incident:
- **Low** (level 1): limited harm
- **Medium** (level 2): serious harm
- **High** (level 3): very serious harm

**System category** = maximum level obtained across any dimension:
- Level 1 in all → **BASIC Category**
- Level 2 in any → **MEDIUM Category**
- Level 3 in any → **HIGH Category**

Document the assessment in `.compliance/ens-categorizacion.md`.

### Step 2 — Risk Analysis

**Mandatory for Medium and High categories.** Recommended for Basic.

CCN provides the PILAR tool for ENS risk analysis:
https://www.ccn-cert.cni.es/es/herramientas-de-ciberseguridad/pilar.html

The analysis must:
1. Identify system assets (information, services, hardware, software, communications, facilities, personnel)
2. Identify threats applicable to each asset (MAGERIT catalog)
3. Evaluate vulnerabilities
4. Calculate risk (impact × probability)
5. Identify safeguard measures to apply

Official methodology: MAGERIT v3. Download: https://administracionelectronica.gob.es/pae_Home/pae_Metodologias/pae_Magerit.html

### Step 3 — Security Measures

Load `references/ens-medidas.md`.

Annex II of RD 311/2022 defines 75 security measures organized into:
- **Organizational framework** (org): 4 measures
- **Operational framework** (op): 33 measures (planning, access control, operations, external services, continuity, monitoring)
- **Protection measures** (mp): 39 measures (facilities, personnel, equipment, communications, media, applications, information)

For each measure applicable to the system category:
- Verify whether it is implemented
- Document the implementation (policy, procedure, or technical configuration)
- Identify gaps

### Step 4 — Statement of Applicability

Generate the **Declaración de Aplicabilidad (Statement of Applicability)** in `.compliance/ens-declaracion-aplicabilidad.md`:

For each measure in Annex II:
- Does it apply to this system? (Yes / No / Partially)
- If not applicable: justification
- If applicable: status (Implemented / In progress / Pending)
- Reference to implementation evidence

### Step 5 — Security Policy

ENS requires a formally approved **Security Policy**.

**Minimum content** (article 12, RD 311/2022):
- Organizational objectives and mission
- Legal and regulatory framework
- Security organization (roles and responsibilities)
- Structure of bodies and procedures for managing security
- Guidelines for structuring security documentation
- Risks arising from processing personal data

**Review**: At least every 2 years or when significant changes occur.

Draft in `.compliance/ens-politica-seguridad.md`.

### Step 6 — Audit and Certification

Load `references/ens-auditoria.md`.

**Basic Category systems**: Self-assessment using the CCN checklist.
**Medium and High Category systems**: Security audit by an audit team (internal if requirements met, or externally accredited).

Frequency:
- Ordinary audit: every 2 years
- Extraordinary audit: when substantial modifications occur

**ENS conformity certification**: Issued by certification bodies accredited by ENAC.
List of accredited bodies: https://www.enac.es

### Step 7 — Remediation Plan

If gaps are identified in Step 3, generate a **Plan de Adecuación (Remediation Plan)** in `.compliance/ens-plan-adecuacion.md`:

```markdown
# ENS Remediation Plan

**System**: [name]
**Category**: Basic / Medium / High
**Date**: [date]

## Measures Pending Implementation

| Measure | Gap Description | Priority | Owner | Target Date |
|---------|-----------------|----------|-------|-------------|

## Measures In Progress

[list]

## Plan Milestones

[timeline]
```

## Output Standards

- Always cite the specific article of RD 311/2022 and the Annex II measure ID (e.g., "op.acc.1", "mp.if.7")
- CCN-STIC guides are recommended compliance (not mandatory) unless the contract with the public administration expressly requires them
- Never state that a system "is ENS certified" — certification is issued by an ENAC-accredited body, not by the system owner
- For specific technical queries: CCN provides a consultation service at https://www.ccn-cert.cni.es
