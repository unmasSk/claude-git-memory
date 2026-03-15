# NIS2 Article 21 — 10 Mandatory Security Measures

Reference for implementing the 10 cybersecurity risk management measures required by
Article 21 of Directive EU 2022/2555. Includes maturity scoring (0–3) and implementation
guidance for each measure.

Source: Article 21, Directive EU 2022/2555. Technical guidance: ENISA "Technical
Guidelines for the Implementation of Minimum Security Measures for Digital Service
Providers" and Commission Implementing Regulation EU 2024/2690.

---

## Maturity Scale

Score each measure 0–3:

| Score | Meaning |
|---|---|
| 0 | Not implemented — no controls or documentation exist |
| 1 | Partially implemented — informal practices, not documented |
| 2 | Implemented but not documented — controls exist, no evidence |
| 3 | Fully implemented and documented — controls exist with audit evidence |

**Maximum score**: 30 (10 measures × 3)

---

## Measure (a) — Risk Analysis and Information System Security Policies

**What NIS2 requires**: Documented policies for risk analysis and information security.

Baseline (score 2):
- [ ] Information assets (systems, data, processes) identified
- [ ] Known risks documented informally

Enhanced (score 3):
- [ ] Formal risk register with likelihood and impact ratings
- [ ] Information Security Policy approved by management body
- [ ] Policy reviewed annually or after significant changes
- [ ] Risk assessment methodology documented
- [ ] Risk treatment plan with owners and timelines

**Evidence for supervisory review**: Current IS Policy (signed, dated, version-controlled),
last completed risk assessment report, risk register with owner assignments, management approval.

**Overlap**: SOC 2 CC3, ISO 27001 Clause 6 and Annex A 5.1/8.2/8.3, ENS Categorización.

---

## Measure (b) — Incident Handling

**What NIS2 requires**: Procedures for detecting, classifying, responding to, and
reporting incidents.

Baseline (score 2):
- [ ] Someone is responsible for handling incidents
- [ ] Organization knows which national CSIRT/NCA to contact

Enhanced (score 3):
- [ ] Documented incident response plan with roles and escalation paths
- [ ] Incident classification procedure (significant vs. non-significant)
- [ ] 24h/72h/1-month notification workflow documented and assigned
- [ ] National CSIRT contact on file and tested
- [ ] Post-incident review process defined
- [ ] Incident log maintained

**Significant incident definition** (Article 23(3)): An incident is significant if it
has caused or can cause severe operational disruption, financial loss, or material
damage to other persons.

Load `references/nis2-incidents.md` for detailed reporting guidance and notification templates.

**Evidence**: Incident log, last post-mortem, NCA notification records (if applicable), IRP document.

---

## Measure (c) — Business Continuity

**What NIS2 requires**: Business continuity measures including backup management,
disaster recovery, and crisis management.

Baseline (score 2):
- [ ] Critical systems identified
- [ ] Backup procedures exist

Enhanced (score 3):
- [ ] Business Impact Analysis (BIA) completed
- [ ] RTO and RPO defined per system tier
- [ ] Business Continuity Plan (BCP) documented and tested
- [ ] Disaster Recovery Plan (DRP) documented and tested
- [ ] Crisis communication procedures defined
- [ ] BCP/DRP tested at least annually (tabletop or live drill)

**Key requirement**: DR must be tested, not just documented. Annual minimum.

**Evidence**: DR test results (date, tester, outcome), backup restore test records, RTO/RPO documentation.

---

## Measure (d) — Supply Chain Security

**What NIS2 requires**: Security in the supply chain including relationships with
direct suppliers and service providers.

Baseline (score 2):
- [ ] Critical suppliers identified

Enhanced (score 3):
- [ ] Third-party risk assessment process in place
- [ ] Security requirements included in supplier contracts
- [ ] Supplier security review cycle defined (annual for critical suppliers)
- [ ] Inventory of all third-party software and services maintained
- [ ] Process for assessing supplier incidents (e.g., SolarWinds-type scenarios)

Load `references/nis2-supply-chain.md` for detailed guidance and assessment templates.

**Evidence**: Vendor inventory with risk tier, supplier security assessments, contractual security clauses.

---

## Measure (e) — Security in Network and Information Systems Acquisition, Development, and Maintenance

**What NIS2 requires**: Security in NIS acquisition, development, and maintenance —
including vulnerability handling and disclosure.

Baseline (score 2):
- [ ] Network perimeter controls exist (firewall)
- [ ] Systems are patched on some schedule

Enhanced (score 3):
- [ ] Secure development lifecycle (SDLC) policy
- [ ] Network segmentation implemented
- [ ] Vulnerability management with defined SLAs (critical: 24–72h; high: 7 days)
- [ ] Dependency vulnerability scanning in CI/CD
- [ ] System hardening baselines documented
- [ ] Network monitoring or SIEM in place
- [ ] Penetration testing performed at least annually

**Evidence**: CI/CD pipeline security scan config, PR review history, patch tickets with
timestamps, vulnerability scan reports, pentest report.

---

## Measure (f) — Policies to Assess Cybersecurity Effectiveness

**What NIS2 requires**: Policies for assessing the effectiveness of cybersecurity
risk management measures.

Baseline (score 2):
- [ ] Some security metrics tracked informally

Enhanced (score 3):
- [ ] KPIs defined for security program effectiveness
- [ ] Annual internal security review or audit
- [ ] Management review meeting with security agenda item (documented with minutes)
- [ ] Audit findings tracked to closure
- [ ] Third-party penetration test or security assessment

**Evidence**: Internal audit report, management review minutes, pentest report, KPI dashboard.

---

## Measure (g) — Basic Cyber Hygiene and Cybersecurity Training

**What NIS2 requires**: Basic cyber hygiene practices and cybersecurity training for all personnel.

Baseline (score 2):
- [ ] Staff receive some security awareness information

Enhanced (score 3):
- [ ] Annual security awareness training mandatory for all staff (completion tracked)
- [ ] Role-specific training for privileged users and IT staff
- [ ] Phishing simulation program in place
- [ ] Acceptable Use Policy distributed and acknowledged
- [ ] Password manager in use organization-wide

Cyber hygiene checklist to verify per user endpoint:
- [ ] MFA enabled
- [ ] Password manager in use
- [ ] Software kept up to date (OS, browsers, apps)
- [ ] Automatic screen lock configured
- [ ] Phishing awareness training completed

**Evidence**: Training completion records (LMS export), phishing simulation results, AUP acknowledgements.

---

## Measure (h) — Cryptography and Encryption

**What NIS2 requires**: Policies and procedures on the use of cryptography and encryption.

Baseline (score 2):
- [ ] Sensitive data encrypted at rest and in transit

Enhanced (score 3):
- [ ] Cryptography Policy documenting approved algorithms and key lengths
- [ ] Encryption at rest: AES-256 minimum
- [ ] Encryption in transit: TLS 1.2+ (TLS 1.3 recommended)
- [ ] Key management procedures (rotation, storage, destruction)
- [ ] Certificate inventory with expiry tracking

**Prohibited**: DES, 3DES, RC4, MD5 (for integrity), SHA-1 (for integrity), RSA <2048-bit.

**Evidence**: Cryptography Policy, SSL scan results (e.g., SSL Labs A/A+ grade), KMS configuration, certificate inventory.

---

## Measure (i) — Human Resources Security, Access Control, and Asset Management

**What NIS2 requires**: Human resources security, access control policies, and asset management.

Baseline (score 2):
- [ ] Access controlled by user accounts with passwords

Enhanced (score 3):
- [ ] Joiners/Movers/Leavers process documented and enforced
- [ ] Access revocation within 24h of termination
- [ ] Access reviews: privileged accounts quarterly, all accounts annually
- [ ] Principle of least privilege applied
- [ ] Background checks for roles with access to sensitive systems/data
- [ ] Privileged Access Management (PAM) for admin accounts
- [ ] Shared/generic accounts eliminated or documented with justification
- [ ] Asset inventory (hardware and software, with owners)
- [ ] Mobile device management (MDM) enrolled

**Evidence**: Asset inventory (date, coverage), access review records, offboarding checklists, MDM enrollment report.

---

## Measure (j) — Multi-Factor Authentication and Secured Communications

**What NIS2 requires**: Multi-factor authentication or continuous authentication,
and secured voice/video/text communications.

Baseline (score 2):
- [ ] MFA enabled for at least critical systems

Enhanced (score 3):
- [ ] MFA enforced for ALL user accounts — not optional
- [ ] MFA enforced for all remote access (VPN, remote desktop)
- [ ] MFA enforced for all cloud services
- [ ] Phishing-resistant MFA (FIDO2/passkeys) for privileged accounts
- [ ] MFA bypass exceptions documented and management-approved
- [ ] Encrypted channels for sensitive internal communications
- [ ] Email security: SPF, DKIM, DMARC configured
- [ ] No unencrypted FTP; no unencrypted internal messaging for sensitive data

**Evidence**: Identity provider config showing MFA enforced, exceptions list (should be empty or minimal), secure comms policy.

---

## Implementation Priority Order

For organizations starting from scratch, implement in this order:

1. **(j) MFA** — highest impact, can be done quickly
2. **(b) Incident handling** — required for NCA reporting obligations
3. **(a) Risk analysis** — foundational for everything else
4. **(g) Training** — quick wins, addresses most breaches
5. **(h) Cryptography** — verify existing systems first
6. **(i) Access control** — access reviews take time, start now
7. **(e) Vulnerability management** — implement scanning in CI/CD
8. **(c) Business continuity** — DR testing takes time to schedule
9. **(d) Supply chain** — vendor assessment is a long process
10. **(f) Effectiveness assessment** — once other measures are in place

---

## Gap Assessment Summary Template

```
Organization: [NAME]
Assessment Date: [DATE]
Assessor: [NAME]
Entity Classification: Essential / Important / Out of Scope

Measure | Score | Gap | Priority | Owner | Target Date
--------|-------|-----|----------|-------|------------
(a) Risk Analysis & Policies     | _ | | | |
(b) Incident Handling            | _ | | | |
(c) Business Continuity          | _ | | | |
(d) Supply Chain Security        | _ | | | |
(e) Network & IS Security        | _ | | | |
(f) Effectiveness Assessment     | _ | | | |
(g) Hygiene & Training           | _ | | | |
(h) Cryptography                 | _ | | | |
(i) HR Security & Access Control | _ | | | |
(j) MFA & Secure Communications  | _ | | | |

Overall Score: _ / 30
```

**Priority guidance**:
- Score 0 on any measure → immediate action required
- Score 0–1 on any measure → include in 90-day plan
- Score 2 on measures a, b, c, i → documentation sprint (30 days, high liability)
- Score 3 everywhere → maintenance mode, annual review

---

## Policy Templates

### Information Security Policy (master policy — required)

```
INFORMATION SECURITY POLICY
[ORGANIZATION NAME]
Version: 1.0 | Effective: [DATE] | Review: [DATE + 1 YEAR]
Approved by: [MANAGEMENT BODY / BOARD]

1. PURPOSE AND SCOPE
This policy establishes [ORGANIZATION NAME]'s commitment to protecting the
confidentiality, integrity, and availability of its information and information
systems. Applies to all employees, contractors, and third parties with access
to [ORGANIZATION NAME] systems.

2. REGULATORY ALIGNMENT
- NIS2 Directive (EU 2022/2555), Article 21
- GDPR (EU 2016/679)
- [ISO/IEC 27001:2022, if certified or in progress]

3. ROLES AND RESPONSIBILITIES
- Management Body: Accountable. Approves this policy. Reviews annually.
  Cannot delegate accountability (NIS2 Article 20).
- [CISO / IT Manager]: Responsible for implementation, monitoring, reporting.
- All Staff: Follow this policy. Report incidents.

4. POLICY STATEMENTS
4.1 Governance — Security decisions require management approval. Quarterly reports to board.
4.2 Risk Management — Annual risk assessment; unacceptable risks treated within 90 days.
4.3 Asset Management — Critical assets inventoried with assigned owners.
4.4 Access Control — Least privilege. MFA mandatory for remote and cloud access.
4.5 Incident Management — 24h/72h/1-month NIS2 obligations followed without exception.
4.6 Security Training — Annual mandatory training for all staff. Completion tracked.
4.7 Third-Party Security — Critical suppliers assessed annually. Security in contracts.

5. EXCEPTIONS
Written approval from [CISO / IT Manager] with documented justification and compensating controls.

6. REVIEW
Annually and after any significant security incident or regulatory change.
```

### Incident Management Policy Outline

```
INCIDENT MANAGEMENT POLICY — [ORGANIZATION NAME]
Version: 1.0 | Effective: [DATE] | Approved by: [MANAGEMENT BODY]

Purpose: Define how [ORGANIZATION NAME] detects, classifies, responds to,
and reports cybersecurity incidents per NIS2 Article 21(2)(b) and Article 23.

Scope: All information systems, networks, and data held or processed by
[ORGANIZATION NAME] or its suppliers.

Key Obligations:
- All staff report suspected incidents within 1 hour of awareness
- Incident Commander designated within 2 hours of confirmed incident
- 24h early warning to NCA/CSIRT for significant incidents
- 72h detailed notification for significant incidents
- 1-month final report
- Post-incident review within 2 weeks of closure for P1/P2

Contact: [CISO / IT Manager contact]
CSIRT Contact: [National CSIRT — see references/nis2-incidents.md]
```

### Access Control Policy Outline

```
ACCESS CONTROL POLICY — [ORGANIZATION NAME]
Version: 1.0 | Effective: [DATE] | Approved by: [MANAGEMENT BODY]

Principle: Access granted on business need and least privilege. All access
authorized, documented, and regularly reviewed.

1. Unique accounts — no shared accounts without documented justification
2. Passwords — minimum 12 characters; password manager; no reuse of last 10
3. MFA — mandatory for remote access, cloud services, privileged accounts
4. Joiners — access provisioned after HR confirmation and manager approval
5. Movers — access reviewed and adjusted within 5 business days of role change
6. Leavers — all access revoked within 24 hours of termination
7. Privileged access — admin accounts reviewed quarterly; PAM required
8. Access reviews — privileged: quarterly; all accounts: annually

Unused accounts (90+ days) disabled automatically.
```
