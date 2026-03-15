# LOPDGDD — Protection of Minors' Data

Reference for Spain-specific obligations regarding the processing of personal data of minors. Load when the project involves services directed at or likely to be used by individuals under 18.

Source: Ley Orgánica 3/2018, Article 7 and related provisions. Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673

---

## Age of Consent — Spain Sets 14 (Article 7 LOPDGDD)

The GDPR (Article 8) permits member states to lower the minimum age for valid consent from 16 to 13. Spain chose **14 years**.

| Age | Rule |
|-----|------|
| Under 14 | Parental or legal guardian consent required |
| 14–17 | May consent on their own to processing of their personal data |
| 18+ | Full capacity to consent |

**Parental consent verification obligation:** Controllers must make **reasonable efforts** to verify that parental consent has actually been given. A simple checkbox declaring parental consent has been obtained is not sufficient if the service is directed at minors. The verification mechanism must be proportionate to the risk.

---

## Services Directed at Children

A service is considered "directed at minors" when:
- It is explicitly marketed to or designed for users under 14
- The content, features, or imagery are primarily aimed at children
- User data shows a significant proportion of users are under 14
- The service relates to toys, games, educational content for children, or similar categories

For such services, the controller must:
1. Implement an age verification mechanism before collecting any personal data
2. Obtain verifiable parental consent before processing data of users under 14
3. Limit data collection to what is strictly necessary for the service (data minimization)
4. Not use manipulative design patterns (dark patterns) to extract consent from minors

---

## Age Verification Mechanisms

The AEPD does not mandate a specific technical method but requires verification to be **reasonable and proportionate** to the risk. Options used in practice:

| Method | Risk level it addresses | Notes |
|--------|------------------------|-------|
| Self-declaration of age | Low risk only | Not sufficient alone for services directed at children |
| Credit/debit card payment | Medium | Proxy for adulthood; not reliable for free services |
| Parental email confirmation | Medium | AEPD-accepted for many consumer services |
| Official ID verification | High risk | Required for high-risk or sensitive services |
| Digital identity systems (Cl@ve) | High risk | Preferred for public administration services |

The AEPD guide on minors and digital services provides practical criteria: https://www.aepd.es/es/areas-de-actuacion/menores

---

## Special Obligations for Services Directed at Children

### Data Minimization

Collect only data that is strictly necessary. Minors' data must not be used for:
- Behavioral advertising
- Profiling that could harm the minor
- Commercial communications without parental consent
- Sharing with third parties for purposes unrelated to the core service

### Right to Be Forgotten (Erasure on Request)

**Article 93 LOPDGDD** grants minors (or their parents on their behalf) the right to request erasure of data processed during minority, even after the minor reaches adulthood. This applies specifically to:
- Social networks and social media platforms
- Online services that collected data when the individual was a minor
- Any digital service that retained data from the period of minority

Controllers must process such requests without undue delay and must not require justification beyond proof of the original collection occurring during minority.

### Parental Access Rights

Parents and legal guardians may exercise, on behalf of minors under 14, all ARSULIPO rights (Access, Rectification, Erasure, Restriction, Restriction of automated processing, Right to lodge a complaint, Portability, Objection). For minors aged 14–17, parents may exercise these rights only if the minor consents or if there is a conflict of interest.

---

## Educational Context Processing

Schools and educational institutions frequently process student data. Key rules:

### Lawful Bases for Schools
- **Public schools:** Legal obligation (Art. 6(1)(c) GDPR) for core administrative processing; legitimate interest or parental consent for optional activities
- **Private schools:** Contractual necessity (Art. 6(1)(b)) for enrollment-related processing; consent for optional processing

### What Schools May Process Without Separate Parental Consent
- Student enrollment and administrative records
- Academic performance records
- Attendance records
- Communication with parents/guardians about the student

### What Requires Specific Consent
- Publication of photographs of minors (school events, websites, yearbooks)
- Use of student data for marketing or research purposes
- Sharing data with third-party educational technology providers beyond what is strictly necessary
- Biometric systems (e.g., facial recognition for access control) — DPA consultation recommended

### Educational Technology (EdTech) Providers

When schools use third-party digital platforms (Google Workspace for Education, Microsoft Teams for Education, learning management systems), the school acts as data controller and the platform as data processor. Required:
- Data processing agreement (DPA / encargo de tratamiento) signed before deployment
- DPIA for platforms that process special categories or carry out large-scale profiling
- Parental information notice describing which platforms are used and for what purpose

---

## AEPD Guidance on Minors

| Resource | URL |
|----------|-----|
| AEPD minors area | https://www.aepd.es/es/areas-de-actuacion/menores |
| Guide: Privacy and minors in the digital age | https://www.aepd.es/guias/guia-menores.pdf |
| Age verification recommendations | https://www.aepd.es/es/areas-de-actuacion/menores/verificacion-de-edad |

---

## Checklist for Services Likely Used by Minors

- [ ] Age of consent threshold assessed (14 in Spain)
- [ ] Age verification mechanism implemented proportionate to risk
- [ ] Parental consent flow tested and documented
- [ ] Data minimization applied — no behavioral advertising for users under 14
- [ ] Erasure mechanism for data collected during minority implemented
- [ ] Privacy notice written in age-appropriate language accessible to minors
- [ ] DPO notified of processing directed at minors (if DPO designated)
- [ ] DPIA conducted if service processes data of minors at scale or in sensitive categories
- [ ] Educational technology providers assessed and processing agreements signed (if applicable)

---

## Cross-references

- For the general age of consent provision in context of Spanish GDPR specificities: `references/lopdgdd-especificidades.md`
- For the right to be forgotten on social networks (Article 93) in detail: `references/lopdgdd-derechos-digitales.md`
- For cookie consent rules affecting minors: compliance-cookies skill
