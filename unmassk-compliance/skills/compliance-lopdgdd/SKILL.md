---
name: compliance-lopdgdd
description: >
  Use when the user asks about "LOPDGDD", "Ley Orgánica de Protección de Datos",
  "Ley Orgánica 3/2018", "protección de datos España", "RGPD España",
  "derechos digitales", "AEPD", "Agencia Española de Protección de Datos",
  "aviso legal España", "política de privacidad España", "delegado de protección de datos",
  "DPD España", "registro de actividades de tratamiento", "RAT", "evaluación de impacto",
  "EIPD", "datos personales España", "ley de protección de datos española",
  "Spanish data protection law", "Spanish GDPR implementation", "data protection Spain",
  "derechos ARCO", "derechos ARSULIPO", "reclamación AEPD", "datos de menores España",
  "datos sensibles España", "legitimación tratamiento España",
  or when working on projects for the Spanish market, Spanish users, or Spanish public administration.
version: 1.0.0
---

# LOPDGDD — Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales

Spain's organic data protection law (Ley Orgánica 3/2018, 5 December) adapts the GDPR to the Spanish legal order and adds Spain-specific obligations. It supplements the GDPR — it does not replace it.

**Official sources:**
- Full LOPDGDD text: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- GDPR: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- AEPD (guides and tools): https://www.aepd.es
- AEPD FACILITA tool: https://www.aepd.es/herramientas/facilita

**Scope:** This skill covers the Spanish specificities of the LOPDGDD. For general GDPR implementation, use the compliance-gdpr skill.

## Routing Table

| Task | Reference |
|------|-----------|
| Spanish specificities vs. general GDPR | `references/lopdgdd-especificidades.md` |
| Records of Processing Activities (RAT/ROPA) | `references/lopdgdd-rat.md` |
| Digital rights — Title X LOPDGDD | `references/lopdgdd-derechos-digitales.md` |
| Public administration obligations | `references/lopdgdd-admin-publica.md` |
| Minors' data and age of consent | `references/lopdgdd-menores.md` |

## Workflow

### Step 0 — Processing Context

Before evaluating obligations, collect:

1. **Organization type**: private company / SME / sole trader / public administration / non-profit
2. **Data volume**: how many users/customers with personal data?
3. **Type of data processed**: basic (name, email) / special categories / minors' data
4. **Large-scale processing**: is data processing the core activity or done at large scale?
5. **Data Protection Officer (DPO)**: has one already been designated?

### Step 1 — DPO Assessment (Article 37 GDPR + LOPDGDD)

The LOPDGDD extends DPO mandatory designation beyond the base GDPR.

**DPO mandatory** under LOPDGDD (Article 34):
- Professional associations (colegios profesionales) and their General Councils
- Educational centers offering courses at any level defined in education legislation
- Healthcare establishments and insurance companies
- Credit institutions, financial investment firms, pension funds, insurance entities
- Electricity and natural gas distributors and retailers
- Electronic communications network and service operators
- Public administrations (see `references/lopdgdd-admin-publica.md`)
- Political parties, trade unions, and business organizations
- Copyright management entities
- Casinos and online gambling operators
- Private security companies
- Advertising and marketing companies processing data at large scale

**Output**: Is designation mandatory? Voluntary but recommended?

If mandatory → generate DPO obligations checklist.

### Step 2 — Records of Processing Activities (RAT)

Load `references/lopdgdd-rat.md`.

Every data controller must maintain a RAT (Article 30 GDPR).

**SME exemption**: Organizations with fewer than 250 employees may be exempt if processing:
- Is not carried out on a regular basis
- Is unlikely to result in a risk to the rights and freedoms of data subjects
- Does not include special categories or criminal conviction data

For each processing activity identify:
1. Name of the activity
2. Controller and contact details (and DPO if applicable)
3. Purposes of processing
4. Legal basis (Article 6 GDPR)
5. Categories of data subjects
6. Categories of personal data
7. Recipients (processors, third countries)
8. Retention period or criteria for determining it
9. Security measures (general description)

Generate RAT in `.compliance/lopdgdd-rat.md`.

### Step 3 — Special Category Data Assessment

The LOPDGDD regulates special category data with greater specificity than the GDPR.

**Special categories** (Article 9 GDPR + LOPDGDD):
- Racial or ethnic origin
- Political opinions, religious or philosophical beliefs
- Trade union membership
- Genetic data
- Biometric data used to uniquely identify a natural person
- Data concerning health
- Data concerning sex life or sexual orientation

**Reinforced protection under LOPDGDD:**
- Ideology, trade union membership, religion, beliefs (Article 9 LOPDGDD) — PROHIBITED except with explicit consent. Tacit consent is not valid.
- Health data — strict legal basis required
- Data relating to criminal offences and convictions (Article 10 LOPDGDD) — only processable by lawyers and court agents under professional secrecy

If the project processes these categories → DPIA mandatory (see Step 4).

### Step 4 — Data Protection Impact Assessment (DPIA / EIPD)

A DPIA is mandatory when processing is likely to result in high risk.

**Mandatory triggers in Spain** (AEPD list + Article 35 GDPR):
- Large-scale processing of special category data
- Systematic and extensive evaluation of personal aspects (profiling)
- Systematic large-scale monitoring of publicly accessible areas
- International transfers of special category data
- Processing using innovative technologies or uses (AI, facial recognition)
- Combining or merging datasets beyond data subjects' reasonable expectations

**AEPD negative list** (processing always requiring a DPIA):
https://www.aepd.es/es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/evaluaciones-de-impacto-sobre-la-privacidad

If a DPIA is required → generate DPIA template in `.compliance/lopdgdd-eipd.md` with:
1. Systematic description of the processing
2. Assessment of necessity and proportionality
3. Assessment of risks to the rights and freedoms of data subjects
4. Measures envisaged to address the risks

### Step 5 — Mandatory Legal Documentation

Generate or review legal documentation adapted to Spain:

**1. Legal Notice (Aviso Legal)** (mandatory for websites — Law 34/2002 LSSI):
- Full company name
- Tax identification number (NIF/CIF)
- Registered address
- Commercial registry registration details
- Contact email
- If applicable: professional association name, membership number, academic qualification, EU member state of issue

**2. Privacy Policy** (mandatory — Articles 13/14 GDPR):
- Adapted to Spanish terminology
- ARSULIPO rights: Access, Rectification, Erasure (Supresión), Restriction (Limitación), Restriction of automated processing (Limitación de tratamiento automatizado), Right to lodge a complaint (Interposición), Portability, Objection (Oposición)
- Right to lodge a complaint with the AEPD: https://www.aepd.es/es/derechos-y-deberes/conoce-tus-derechos
- Spanish as primary language

**3. Cookie Policy** (mandatory — LSSI + GDPR):
See skill compliance-cookies for technical implementation.
The policy must comply with the AEPD Cookie Guide (latest version).

**4. Informative clauses** (on forms, contracts, etc.):
Informative text at every data collection touchpoint.

### Step 6 — Digital Rights (Title X LOPDGDD)

The LOPDGDD adds digital rights not covered by the GDPR. Load `references/lopdgdd-derechos-digitales.md`.

Most relevant for digital projects:
- Right to be forgotten on social networks (Article 93)
- Right to portability on social networks (Article 94)
- Right to digital will/testament (Article 96)

### Step 7 — Compliance Status Summary

Generate `.compliance/lopdgdd-estado.md`:

```markdown
# LOPDGDD Compliance Status

**Organization**: [name]
**Assessment date**: [date]
**Assessor**: [role]

## Identified Obligations
- DPO mandatory: Yes / No / Voluntary
- RAT required: Yes / SME exemption
- DPIA required: Yes / No / Pending assessment
- Special category data: Yes / No

## Legal Documentation
- Legal Notice (Aviso Legal): Complete / Pending / Requires review
- Privacy Policy: Complete / Pending / Requires review
- Cookie Policy: Complete / Pending / Requires review

## Identified Gaps
[list]

## Next Actions
[prioritized list]
```

## Output Standards

- All generated legal content must be marked **[DRAFT — Requires review by legal counsel]**
- Never state that a document "complies with LOPDGDD" — use "is designed to address the requirements of" or "addresses the obligations under"
- Cite specific articles of the LOPDGDD and GDPR when referencing legal obligations
- When there is ambiguity about an obligation, flag it and recommend consulting the AEPD or legal counsel
- For small SMEs: prioritize the AEPD FACILITA tool as a starting point
