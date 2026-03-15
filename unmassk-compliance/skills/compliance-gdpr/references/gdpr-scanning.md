# GDPR Organizational Compliance Posture Assessment

On-demand reference for assessing an organization's GDPR compliance posture at the process and governance level. This complements `gdpr-pii-detection.md` (which covers code-level PII scanning) by covering the organizational and documentation layer: data processing records, lawful basis, DPO designation, cross-border transfers, DPIA triggers, and breach notification readiness.

---

## 1. Records of Processing Activities (ROPA) — Art. 30

Controllers with 250+ employees (or who process high-risk data) must maintain a ROPA. Check for:

- A documented inventory of all data processing activities
- For each activity: purposes, categories of data subjects, PII categories, recipients, retention periods, and security measures
- Records kept in writing (electronic format acceptable)
- Records available to supervisory authority on request

**Audit check:** Ask to see the ROPA. If none exists → flag as GDPR Article 30 gap, severity High.

**Minimum required fields per record:**

| Field | Required For |
|---|---|
| Name and contact of controller | All controllers |
| Processing purposes | All |
| Categories of data subjects | All |
| Categories of personal data | All |
| Recipients / third-party processors | All |
| Cross-border transfers (Art. 46 mechanism) | Where applicable |
| Envisaged erasure timeframes | Where possible |
| Security measures (Art. 32) | All |

---

## 2. Lawful Basis Assessment — Art. 6

Every processing activity must have a documented lawful basis. The six lawful bases:

| Basis | Art. 6(1) | When to Use | Common Pitfall |
|---|---|---|---|
| Consent | (a) | Marketing, non-essential cookies | Must be freely given, specific, informed, unambiguous — pre-ticked boxes invalid |
| Contract | (b) | Delivering a service the user signed up for | Cannot stretch to cover activities beyond what the contract requires |
| Legal obligation | (c) | Tax records, employment law, AML | Applies only to obligations under EU/member state law |
| Vital interests | (d) | Medical emergencies | Narrow — last resort only |
| Public task | (e) | Government bodies, public interest research | Must be laid down in law |
| Legitimate interests | (f) | Analytics, fraud prevention, B2B marketing | Requires a Legitimate Interests Assessment (LIA); cannot override fundamental rights |

**Audit check:** For each processing activity in the ROPA, verify a lawful basis is documented. Flag activities with no documented basis as Art. 6 gap, severity Critical.

**Special category data (Art. 9)** — health, biometric, genetic, racial/ethnic origin, political opinions, religious beliefs, trade union membership, sexual orientation — requires an additional condition from Art. 9(2) (explicit consent, employment law, vital interests, public health, research/archive).

---

## 3. Consent Management Audit — Art. 7 & Recital 32

Valid GDPR consent must be:
- **Freely given** — no detriment for refusal; unbundled from other agreements
- **Specific** — separate consent per purpose
- **Informed** — identity of controller, purposes, right to withdraw
- **Unambiguous** — affirmative action required (no pre-ticked boxes, no implied consent)
- **Withdrawable** — as easy to withdraw as to give

**Audit checklist:**

- [ ] Consent request presented before or at the moment of collection (not buried in ToS)
- [ ] No pre-ticked checkboxes
- [ ] Separate consent per distinct purpose
- [ ] Plain language at the reading level of the intended audience
- [ ] Withdrawal mechanism equally prominent as consent mechanism
- [ ] Consent records stored with timestamp, version of privacy notice presented, and IP/identifier
- [ ] Consent refreshed when purpose changes

Flag each violation as Art. 7 gap. Severity: Critical (if consent is the only lawful basis and it is invalid), High (if supplementary).

---

## 4. Data Protection Officer (DPO) — Art. 37-39

DPO designation is mandatory for:
- Public authorities
- Organizations whose core activities require large-scale monitoring of individuals
- Organizations whose core activities involve large-scale processing of special category data (Art. 9)

**Audit check:**
- Is a DPO designated where required?
- Is the DPO's contact published on the website?
- Is the DPO's contact registered with the supervisory authority?
- Does the DPO have sufficient resources and organizational independence?

Flag missing mandatory DPO as Art. 37 gap, severity High.

---

## 5. Data Processing Agreements — Art. 28

Every processor must have a written contract (DPA) with the controller. Processors include: cloud hosting providers, analytics platforms, email service providers, payment processors, CRM vendors.

**Required DPA clauses:**

- Processing only on documented controller instructions
- Confidentiality obligations on authorized personnel
- Security measures per Art. 32
- No sub-processing without controller authorization
- Assistance with data subject rights requests
- Deletion or return of data on termination
- Audit rights for controller

**Audit procedure:**

1. Inventory all third-party vendors receiving personal data
2. Verify a signed DPA exists for each
3. Check DPA clauses against the required list above
4. Flag missing DPAs as Art. 28 gap, severity High
5. Flag DPAs lacking sub-processor notification clauses as severity Medium

---

## 6. Cross-Border Transfer Assessment — Art. 44-49

Personal data may only transfer outside the EEA where:

| Transfer Mechanism | Status (as of 2026) |
|---|---|
| Adequacy decision (Art. 45) | Valid for: UK, Switzerland, Japan, South Korea, Canada (commercial), New Zealand, Israel, Uruguay, Andorra, Faroe Islands, Guernsey, Isle of Man, Jersey, Argentina; US via EU-US Data Privacy Framework (since Jul 2023) |
| Standard Contractual Clauses (SCCs) (Art. 46(2)(c)) | Valid — use June 2021 EU Commission SCCs |
| Binding Corporate Rules (BCR) (Art. 47) | Valid where approved by lead DPA |
| Derogations (Art. 49) | Narrow exceptions only: explicit consent, contract performance, public interest, legal claims, vital interests |

**Audit checklist:**

- [ ] Inventory all third countries receiving personal data
- [ ] Verify transfer mechanism for each
- [ ] Confirm SCCs are the June 2021 version (pre-Schrems II SCCs are invalid)
- [ ] Transfer Impact Assessment (TIA) conducted for high-risk destinations
- [ ] Sub-processor chain maintains the same transfer safeguards

Flag transfers with no valid mechanism as Art. 44 gap, severity Critical.

---

## 7. Data Protection Impact Assessment (DPIA) Triggers — Art. 35

A DPIA is mandatory before processing that is "likely to result in a high risk." Mandatory triggers:

- **Systematic profiling** that significantly affects individuals
- **Large-scale processing** of special category data (Art. 9) or criminal conviction data (Art. 10)
- **Systematic monitoring** of a publicly accessible area at large scale (e.g., CCTV)
- **New technologies** with high privacy risk
- **Automated decision-making** with legal or similarly significant effects
- Any processing appearing on the supervisory authority's mandatory DPIA list

**DPIA minimum content (Art. 35(7)):**

1. Systematic description of the processing and its purposes
2. Assessment of necessity and proportionality
3. Risk assessment for data subjects
4. Measures to address the risks, including safeguards and security measures

**Audit check:** Identify any processing matching a trigger above. Verify a DPIA was conducted and documented before the processing began. Flag missing DPIAs as Art. 35 gap, severity High.

---

## 8. Data Breach Notification Readiness — Art. 33-34

**Supervisory authority notification (Art. 33):** Required within 72 hours of becoming aware of a breach (where feasible). Required content:
- Nature of the breach (categories and approximate number of data subjects and records)
- DPO or other contact point details
- Likely consequences of the breach
- Measures taken or proposed to address the breach

**Individual notification (Art. 34):** Required when the breach is "likely to result in a high risk" to individuals. Must be communicated without undue delay.

**Audit checklist:**

- [ ] Incident response plan documents the 72-hour notification window
- [ ] Roles assigned for breach detection, assessment, and notification
- [ ] Supervisory authority contact details and notification portal known
- [ ] Breach register maintained (even for non-notifiable breaches)
- [ ] Processor contracts require breach notification to controller within agreed SLA (typically 24-48 hours to give controller time to meet the 72-hour window)

Flag absence of a documented breach response procedure as Art. 33 gap, severity High.

---

## 9. Compliance Posture Report Format

### GDPR Compliance Posture Assessment

**Scope:** [Organization / System / Processing Activity]
**Assessment Date:** YYYY-MM-DD
**Assessor:** [Name / Agent]

### Findings Table

| # | Severity | Article | Area | Gap | Recommended Action |
|---|---|---|---|---|---|
| 1 | Critical | Art. 6 | Lawful basis | Marketing emails lack documented lawful basis | Document legitimate interests basis + LIA, or obtain valid consent |
| 2 | High | Art. 30 | ROPA | No ROPA maintained | Create ROPA covering all processing activities |

### Compliance Gap Matrix

| GDPR Requirement | Article | Status | Notes |
|---|---|---|---|
| Records of Processing Activities | Art. 30 | Gap / Compliant / Partial | |
| Documented lawful basis per activity | Art. 6 | Gap / Compliant / Partial | |
| Valid consent mechanism | Art. 7 | Gap / Compliant / N/A | |
| DPA with all processors | Art. 28 | Gap / Compliant / Partial | |
| DPO designated (if required) | Art. 37 | Gap / Compliant / N/A | |
| Valid cross-border transfer mechanism | Art. 44-46 | Gap / Compliant / N/A | |
| DPIA for high-risk processing | Art. 35 | Gap / Compliant / N/A | |
| Breach notification procedure | Art. 33 | Gap / Compliant / Partial | |

### Severity Summary

| Severity | Count |
|---|---|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |

### Prioritized Remediation Plan

List findings in order: Critical → High → Medium → Low. For each:
1. Action required
2. Responsible role
3. Estimated effort
4. Target completion
