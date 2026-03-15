# ENS — System Categorization

Reference for determining the security category of an information system under Annex I of Real Decreto 311/2022.

Source: RD 311/2022, Annex I. Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191

---

## The 5 Security Dimensions

Categorization is performed by assessing the impact of an incident on each dimension:

### Availability (D)
Impact if the service or information is not accessible when needed.

| Level | Impact | Examples |
|-------|--------|----------|
| Low (1) | Limited harm to primary functions | Auxiliary service unavailable for hours |
| Medium (2) | Serious harm to primary functions | Critical public administration services down for hours |
| High (3) | Very serious harm; cessation of primary activities | Emergency, health, or defense systems |

### Authenticity (A)
Impact if the identity of users, processes, or information origin cannot be verified.

| Level | Impact |
|-------|--------|
| Low (1) | Limited consequences from identity impersonation |
| Medium (2) | Serious damage to citizen trust or service effectiveness |
| High (3) | Severe consequences for security, international relations, or public image |

### Integrity (I)
Impact if information or services are modified without authorization.

| Level | Impact |
|-------|--------|
| Low (1) | Errors with limited, correctable consequences |
| Medium (2) | Serious harm to individuals, organizations, or the entity itself |
| High (3) | Very serious harm: loss of life, national security compromise, economic collapse |

### Traceability (T)
Impact if it cannot be determined who performed actions on information or services.

| Level | Impact |
|-------|--------|
| Low (1) | Difficulty investigating incidents with limited consequences |
| Medium (2) | Inability to establish accountability for serious incidents |
| High (3) | Inability to prove authorship of actions with very serious consequences |

### Confidentiality (C)
Impact if information is accessed by unauthorized persons.

| Level | Impact |
|-------|--------|
| Low (1) | Would slightly affect individuals or the entity |
| Medium (2) | Serious harm to individuals, unfair competitive advantage, breach of trust |
| High (3) | National security, data of minors, victims of gender violence, bulk medical data |

---

## Determining the Category

**Rule**: The system category is the **maximum level** obtained across any dimension.

```
BASIC Category:   All dimensions ≤ Level 1
MEDIUM Category:  At least one dimension = Level 2, none = Level 3
HIGH Category:    At least one dimension = Level 3
```

**Example — Municipal case management system**:
- D (Availability): Level 2 (important but not 24/7 critical services)
- A (Authenticity): Level 2 (official identification of civil servants is relevant)
- I (Integrity): Level 2 (errors in case files have legal consequences)
- T (Traceability): Level 2 (accountability for administrative decisions)
- C (Confidentiality): Level 1 (general administrative information, not especially sensitive)

→ **MEDIUM Category** (maximum = Level 2)

---

## Categorization Template

Use in `.compliance/ens-categorizacion.md`:

```markdown
# ENS System Categorization

**System**: [name]
**System owner**: [role/entity]
**Date**: [date]
**Version**: [number]

## System Description
[Brief functional description]

## Primary Assets
[List of primary information assets and services]

## Dimension Assessment

| Dimension | Level | Justification |
|-----------|-------|---------------|
| Availability | [1/2/3] | [reasoning] |
| Authenticity | [1/2/3] | [reasoning] |
| Integrity | [1/2/3] | [reasoning] |
| Traceability | [1/2/3] | [reasoning] |
| Confidentiality | [1/2/3] | [reasoning] |

## System Category
**CATEGORY: [BASIC / MEDIUM / HIGH]**

Maximum level obtained: [number] in dimension [name]

## Approval
Approved by: [role]
Approval date: [date]
Next review: [date — maximum 2 years]
```

---

## Special Considerations

### Personal Data
Systems processing personal data under the LOPDGDD must consider the risk level to data subjects' rights:
- Basic personal data → does not automatically raise the category
- Special category data (health, ideology, etc.) → generally implies Medium or High in Confidentiality
- Data of minors → generally implies Medium or High

### Interconnected Systems
When the system exchanges information with other systems:
- The lower-category system inherits the security requirements of the higher-category system at the points of interchange
- Document interconnections and their controls

### Third-Party Services (Cloud/SaaS)
When the system relies on third-party services (cloud, SaaS, MSP):
- The provider must hold ENS Certification or equivalent (for Medium and High systems)
- Document external services and their certifications
- Include ENS clauses in contracts with providers

---

## CISE — National Electronic Administration Services Catalog

Services provided by the central State Administration that municipalities and other local entities can use with their ENS certifications:

| Service | Description | URL |
|---------|-------------|-----|
| Cl@ve | Identification and authentication system | https://clave.gob.es |
| @firma | Signature validation platform | https://administracionelectronica.gob.es/ctt/afirma |
| ARCHIVE | Electronic archive | https://administracionelectronica.gob.es/ctt/archive |
| GEISER | Integrated registry services management | https://administracionelectronica.gob.es/ctt/geiser |

Using CISE catalog services can reduce the scope of the entity's own ENS certification.
