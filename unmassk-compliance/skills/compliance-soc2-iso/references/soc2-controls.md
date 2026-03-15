# SOC 2 Trust Services Criteria — Control Reference

Reference for mapping policies and controls to SOC 2 Trust Services Criteria (TSC) as defined by the AICPA. Load this file when performing control mapping or gap analysis.

Source: AICPA Trust Services Criteria (2017, updated 2022). Official document: https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria

---

## Common Criteria (CC) — Security Category

Required for all SOC 2 engagements regardless of additional categories selected.

### CC1 — Control Environment

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC1.1 | COSO principles; commitment to integrity and ethics | Information Security Policy, Code of Conduct |
| CC1.2 | Board oversees internal controls | Governance documentation |
| CC1.3 | Management structures, reporting lines, authorities | Org chart, roles & responsibilities |
| CC1.4 | Commitment to competence | HR Security Policy, training records |
| CC1.5 | Accountability for internal control | Policy ownership assignments |

### CC2 — Communication and Information

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC2.1 | Information to support internal control objectives | Data Classification Policy |
| CC2.2 | Internal communication of objectives and responsibilities | Internal communications, policy acknowledgements |
| CC2.3 | External communication with parties affecting controls | Vendor Management Policy, customer agreements |

### CC3 — Risk Assessment

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC3.1 | Specify objectives clearly enough to enable risk identification | Risk Management Policy |
| CC3.2 | Identify and analyze risks to achieving objectives | Risk register, annual risk assessment |
| CC3.3 | Consider fraud risk | Risk Management Policy (fraud section) |
| CC3.4 | Identify and assess significant changes | Change Management Policy |

### CC4 — Monitoring Activities

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC4.1 | Ongoing and separate evaluations of controls | Logging & Monitoring Policy, internal audits |
| CC4.2 | Evaluate and communicate deficiencies | Incident Response Policy, audit findings tracking |

### CC5 — Control Activities

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC5.1 | Select and develop controls to mitigate risks | Risk Management Policy |
| CC5.2 | Select and develop technology controls | Information Security Policy |
| CC5.3 | Deploy policies and procedures | All policies — evidence of deployment and acknowledgement |

### CC6 — Logical and Physical Access Controls

The most evidence-intensive category. Auditors scrutinize this heavily.

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC6.1 | Implement logical access security measures | Access Control Policy |
| CC6.2 | Prior to issuing system credentials, register and authorize new users | Access Control Policy (provisioning section) |
| CC6.3 | Remove system access when no longer needed | Access Control Policy (deprovisioning section) |
| CC6.4 | Restrict access to confidential information | Data Classification Policy, Access Control Policy |
| CC6.5 | Identify and authenticate users before allowing access | Access Control Policy (MFA section) |
| CC6.6 | Implement controls to prevent or detect unauthorized access from outside | Network Security Policy, perimeter controls |
| CC6.7 | Restrict transmission, movement, and removal of information | Data Classification Policy |
| CC6.8 | Prevent or detect unauthorized or malicious software | Vulnerability Management Policy, endpoint controls |

**Key evidence for CC6**: Access review records (quarterly), provisioning/deprovisioning tickets, MFA enforcement screenshots, firewall rules, endpoint protection logs.

### CC7 — System Operations

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC7.1 | Detect and monitor for new vulnerabilities | Vulnerability Management Policy |
| CC7.2 | Monitor system components for anomalies | Logging & Monitoring Policy |
| CC7.3 | Evaluate security events to determine if they are security incidents | Incident Response Policy |
| CC7.4 | Respond to security incidents according to a defined procedure | Incident Response Policy |
| CC7.5 | Identify, develop, and implement recovery activities | Business Continuity & DR Policy |

### CC8 — Change Management

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC8.1 | Authorize, design, develop, test, and implement changes | Change Management Policy |

**Key evidence for CC8**: Change tickets, PR reviews, deployment approvals, staging environment evidence.

### CC9 — Risk Mitigation

| Criteria | What It Requires | Typical Policy Coverage |
|----------|-----------------|------------------------|
| CC9.1 | Identify, select, and develop risk mitigation activities | Risk Management Policy |
| CC9.2 | Assess and manage risks from vendors and business partners | Vendor Management Policy |

---

## Availability Category (A)

Add when uptime SLAs are part of service commitments.

| Criteria | What It Requires |
|----------|-----------------|
| A1.1 | Current processing capacity and usage meet capacity demands | Capacity planning documentation |
| A1.2 | Environmental threats monitored; environmental controls implemented | Infrastructure monitoring, incident logs |
| A1.3 | Recovery plan developed and tested | Business Continuity & DR Policy, DR test results |

---

## Confidentiality Category (C)

Add when confidential information handling is a service commitment.

| Criteria | What It Requires |
|----------|-----------------|
| C1.1 | Identify and maintain confidential information | Data Classification Policy |
| C1.2 | Dispose of confidential information in accordance with commitments | Data Retention Policy |

---

## Privacy Category (P)

Add when personal data processing is a service commitment. Overlaps significantly with GDPR.

| Criteria | What It Requires |
|----------|-----------------|
| P1.1 | Privacy notice provided and commitments honored | Privacy Policy (public-facing) |
| P2.1 | Choice and consent regarding personal data collection | Consent management, Privacy Policy |
| P3.1–P3.2 | Personal information collected only for identified purposes | Data minimization controls |
| P4.1–P4.3 | Personal information used only for identified purposes; retained and disposed properly | Data Retention Policy |
| P5.1–P5.2 | Access to personal information granted upon request; corrected upon request | DSAR process |
| P6.1–P6.7 | Disclosure to third parties only per commitments | Vendor Management Policy, DPA agreements |
| P7.1 | Quality of personal information maintained | Data quality procedures |
| P8.1 | Monitor compliance with privacy commitments | Privacy program documentation |

---

## Policy → TSC Mapping Summary

| Policy | Primary TSC |
|--------|-------------|
| Information Security Policy | CC1.1, CC5.2, CC5.3 |
| Access Control Policy | CC6.1–CC6.8 |
| Incident Response Policy | CC7.3, CC7.4 |
| Change Management Policy | CC8.1 |
| Risk Management Policy | CC3.1–CC3.4, CC9.1 |
| Vendor Management Policy | CC9.2 |
| Data Classification Policy | CC6.4, C1.1 |
| Acceptable Use Policy | CC1.1, CC6.8 |
| Business Continuity & DR Policy | CC7.5, A1.3 |
| Logging & Monitoring Policy | CC4.1, CC7.2 |
| HR Security Policy | CC1.4 |
| Physical Security Policy | CC6.4 (physical) |
| Cryptography Policy | CC6.1, CC6.7 |
| Network Security Policy | CC6.6 |
| Vulnerability Management Policy | CC7.1, CC6.8 |
| Privacy & Data Protection Policy | P1.1–P8.1 |
| Mobile & Endpoint Policy | CC6.8 |
