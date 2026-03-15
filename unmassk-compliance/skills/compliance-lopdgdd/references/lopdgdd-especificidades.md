# LOPDGDD — Spanish Specificities vs. General GDPR

Reference for LOPDGDD provisions that go beyond the GDPR or develop it with Spanish specificity. Load when you need to distinguish what applies only in Spain.

Source: Ley Orgánica 3/2018, de 5 de diciembre (BOE-A-2018-16673). Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673

---

## Age of Consent for Minors' Data

**GDPR** (Article 8): Sets 16 as the general minimum age, allowing member states to lower it to 13.

**LOPDGDD** (Article 7): Spain sets the age of consent at **14 years**.

- Under 14: requires consent from parents or legal guardians
- 14–17: may consent on their own to the processing of their personal data
- **Obligation**: Controllers must make reasonable efforts to verify parental consent (a checkbox alone is not sufficient)
- AEPD recommends age verification by reasonable and proportionate means

**Project impact:** Every service directed at minors or likely to be used by minors must implement age verification and a parental consent mechanism.

For full minors' data obligations see `references/lopdgdd-menores.md`.

---

## Data Protection Officer (DPO) — Additional Mandatory Cases

**GDPR** (Article 37): DPO mandatory for public authorities, large-scale processing of special categories, or systematic large-scale monitoring.

**LOPDGDD** (Article 34): Extends mandatory designation to specific Spanish sectors:

| Sector | Mandatory |
|--------|-----------|
| Professional associations (colegios profesionales) and General Councils | Yes |
| Educational centers (all levels) | Yes |
| Healthcare establishments | Yes |
| Insurance companies and brokers | Yes |
| Financial entities (banking, investment, pensions) | Yes |
| Electricity and gas distributors and retailers | Yes |
| Telecommunications operators | Yes |
| Public administrations | Yes (see Art. 77) |
| Political parties, trade unions, business organizations | Yes |
| Copyright management entities | Yes |
| Casinos and online gambling operators | Yes |
| Private security companies | Yes |
| Advertising and marketing companies processing data at large scale | Yes |

The DPO may be an individual or legal entity, internal or external. Must be registered with the AEPD: https://sedeagpd.gob.es/sede-electronica-web/

---

## Ideology, Trade Union Membership, Religion, and Beliefs Data

**Article 9 LOPDGDD** develops Article 9 GDPR for these specific categories:

> "In order to break the link between these data and the holder, when the person providing the data is not obliged to do so, consent to the processing of data revealing ideology, trade union membership, religion and beliefs shall only be valid if given expressly."

**Practical implication:** For ideology, religion, trade union membership, or beliefs data:
- Tacit or implied consent is not valid
- Consent must be **explicit** and **specific**
- The default legal basis is explicit consent
- Silence or omission of a response cannot be interpreted as consent

---

## Processing of Data by Political Parties (Article 58bis)

Spanish specificity with no direct equivalent in the GDPR:

Political parties, coalitions, and political groupings may collect data about individuals' political opinions based on lawful political activities, provided adequate safeguards are offered.

**Limit:** They may not process special category data except with explicit consent.

---

## ARSULIPO Rights vs. ARCO Rights

The GDPR expanded the classic ARCO rights. In Spain these are known as **ARSULIPO**:

| Letter | Right | GDPR Article |
|--------|-------|--------------|
| **A**ccess | Know what data is processed | Art. 15 |
| **R**ectification | Correct inaccurate data | Art. 16 |
| **S**upresión (Erasure) | "Right to be forgotten" | Art. 17 |
| Limitación — s**U**ppression of processing (Restriction) | Restrict processing | Art. 18 |
| **L**imitación de tratamiento automatizado | Object to automated decisions | Art. 22 |
| **I**nterposición (Lodge complaint) | Complain to the AEPD | Art. 77 GDPR |
| **P**ortabilidad (Portability) | Receive data in structured format | Art. 20 |
| **O**posición (Objection) | Object to processing | Art. 21 |

**Response deadline:** 1 month (extendable by 2 months in complex cases, notifying the data subject).
**AEPD:** If the controller fails to respond or denies the request, the data subject may file a complaint at https://www.aepd.es

---

## Complaints to the AEPD

**Article 64 LOPDGDD:** The AEPD holds sanctioning powers in Spain.

**Sanctions** (aligned with GDPR):
- Very serious infringements: up to €20M or 4% of global annual turnover
- Serious infringements: up to €10M or 2% of global annual turnover
- Minor infringements: reprimand (no direct financial penalty for many cases)

**Spanish particularity:** For micro-enterprises, SMEs, and sole traders, the AEPD frequently issues a reprimand rather than a financial penalty for a first minor infringement, provided the non-compliance is corrected.

**Infringement register:** https://www.aepd.es/es/prensa-y-comunicacion/resoluciones

---

## Law 34/2002 LSSI (Legal Notice / Aviso Legal)

The LOPDGDD does not replace the legal notice obligation established by the Law on Information Society Services (LSSI).

**Article 10 LSSI** — Mandatory information in the legal notice:
- Name or company name
- Registered address (or address of authorized agent in Spain if headquarters is outside the EU)
- Contact details: email address and at least one other direct contact method
- Tax identification number (NIF/CIF)
- Commercial registry or other registration details
- For regulated professions: professional association, membership number, academic qualification, EU member state where issued
- Service pricing information (if applicable)
- Any applicable codes of conduct

---

## Key AEPD Official Guides

Free official AEPD documents for practical implementation:

| Guide | URL |
|-------|-----|
| Cookie Guide (2023) | https://www.aepd.es/guias/guia-cookies.pdf |
| GDPR Guide for Data Controllers | https://www.aepd.es/guias/guia-responsables.pdf |
| Practical Risk Analysis Guide | https://www.aepd.es/guias/guia-analisis-riesgo.pdf |
| DPIA Guide | https://www.aepd.es/guias/guia-evaluaciones-de-impacto-rgpd.pdf |
| FACILITA Tool (for low-risk activities) | https://www.aepd.es/herramientas/facilita |
| EVALÚA Tool (risk analysis) | https://www.aepd.es/herramientas/evalua |

---

## LOPDGDD — ENS Relationship

For organizations in the public sector, the LOPDGDD and the ENS (Esquema Nacional de Seguridad / National Security Framework) are complementary:

- ENS establishes technical and organizational security measures
- LOPDGDD establishes data subjects' rights and information obligations
- Both apply simultaneously to data processing in the public sector
- ENS compliance contributes to compliance with Article 32 GDPR (security measures)

See skill compliance-ens for ENS requirements.
