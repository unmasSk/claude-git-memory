# Policy Templates & Clarifying Questions

Reference for generating the 17 compliance policy domains. For each policy, contains: clarifying questions to ask before generating, required sections, and key commitments to include.

Load during the Policy Generation Workflow (Steps 2–3).

---

## Policy Structure (All Policies)

```
# [Policy Name]
**Version**: 1.0 | **Effective Date**: [DATE] | **Owner**: [ROLE]
**Review Cycle**: Annual

## 1. Purpose
## 2. Scope
## 3. Policy Statements
## 4. Roles & Responsibilities
## 5. Exceptions
## 6. Enforcement & Violations
## 7. Related Documents
## 8. Revision History
```

---

## Required for SOC 2 (Policies 1–10)

---

## 1. Information Security Policy

**Clarifying questions**:
1. Who is the executive sponsor / owner of information security? (CISO, CTO, CEO?)
2. What is the annual review cycle? (default: annual)
3. Are there regulatory frameworks already in scope beyond SOC 2/ISO 27001? (GDPR, HIPAA, PCI DSS?)

**Required commitments**:
- Management commitment to protecting information
- Scope of the ISMS
- Reference to supporting policies
- Roles with accountability
- Consequences for violations
- Annual review cadence

**SOC 2**: CC1.1, CC5.3 | **ISO 27001**: A.5.1

---

## 2. Access Control Policy

**Clarifying questions**:
1. What identity provider is used? (Okta, Google Workspace, Azure AD, other)
2. Is MFA enforced for all users? For admins only?
3. How often are access reviews performed? (quarterly is audit standard)
4. What is the process when an employee leaves? (same-day deprovisioning?)

**Required commitments**:
- Least privilege principle
- Need-to-know basis for data access
- MFA requirement (at minimum for admin accounts)
- Access review frequency
- Provisioning and deprovisioning procedures
- Privileged access management

**SOC 2**: CC6.1–CC6.8 | **ISO 27001**: A.5.15–A.5.18, A.8.2

---

## 3. Incident Response Policy

**Clarifying questions**:
1. Who is notified first when a security incident is detected?
2. Is there an on-call rotation?
3. What is the target time to classify an incident after detection?
4. Are customers notified of incidents? If yes, what is the SLA?
5. Do you have a bug bounty or responsible disclosure program?

**Required commitments**:
- Incident classification levels (P1/P2/P3 or Critical/High/Medium/Low)
- Escalation path and contacts
- Containment, eradication, recovery steps
- Post-incident review (PIR) requirement
- Breach notification timelines (72 hours for GDPR, align with customer contracts)
- Evidence preservation

**SOC 2**: CC7.3, CC7.4 | **ISO 27001**: A.5.24–A.5.28

---

## 4. Change Management Policy

**Clarifying questions**:
1. What is the deployment process? (CI/CD pipeline, manual, mixed?)
2. Is there a separate staging/QA environment?
3. Who approves changes before deployment to production?
4. Is there an emergency change process?

**Required commitments**:
- Change classification: standard / normal / emergency
- Approval requirements per classification
- Testing requirements before production deployment
- Rollback capability
- Documentation of all changes
- Change freeze periods (if applicable)

**SOC 2**: CC8.1 | **ISO 27001**: A.8.32

---

## 5. Risk Management Policy

**Clarifying questions**:
1. Is there a formal risk register?
2. How often is risk assessment performed? (annual minimum)
3. Who participates in risk assessment? (leadership, IT, legal?)
4. What risk scoring methodology is used? (likelihood × impact?)

**Required commitments**:
- Risk assessment frequency
- Risk scoring methodology
- Risk treatment options: accept, mitigate, transfer, avoid
- Risk owner accountability
- Risk register maintenance
- Board/leadership reporting on top risks

**SOC 2**: CC3.1–CC3.4 | **ISO 27001**: Clause 6 (mandatory)

---

## 6. Vendor Management Policy

**Clarifying questions**:
1. How are new vendors evaluated before onboarding?
2. Are DPAs (Data Processing Agreements) signed with vendors who process personal data?
3. How often are critical vendors re-assessed?
4. What constitutes a "critical" or "high-risk" vendor?

**Required commitments**:
- Vendor risk tiering (critical / standard / low-risk)
- Pre-onboarding due diligence requirements per tier
- Security questionnaire or SOC 2 report requirement for critical vendors
- DPA requirement for vendors processing personal data
- Annual re-assessment for critical vendors
- Incident notification obligations in vendor contracts

**SOC 2**: CC9.2 | **ISO 27001**: A.5.19–A.5.22

---

## 7. Data Classification Policy

**Clarifying questions**:
1. What data types does the organization process? (PII, PHI, payment, IP, public)
2. Are there specific regulatory definitions to align with? (GDPR "personal data", HIPAA "PHI")

**Required commitments**:
- Classification levels: Confidential / Internal / Public (minimum 3 tiers)
- Definition and examples for each tier
- Handling requirements per tier (encryption at rest/transit, access controls, retention)
- Labelling requirements
- Data owner accountability

**SOC 2**: CC6.4, C1.1 | **ISO 27001**: A.5.12, A.5.13

---

## 8. Acceptable Use Policy

**Clarifying questions**:
1. Are personal devices allowed to access company systems? (BYOD policy?)
2. Is company equipment used for personal use permitted?
3. Are there prohibited software categories?

**Required commitments**:
- Permitted and prohibited uses of company systems
- Personal use boundaries
- No expectation of privacy on company systems
- Prohibited activities (illegal content, credential sharing, etc.)
- Consequences for violations

**SOC 2**: CC1.1 | **ISO 27001**: A.5.10

---

## 9. Business Continuity & Disaster Recovery Policy

**Clarifying questions**:
1. What is the RTO (Recovery Time Objective) for critical systems?
2. What is the RPO (Recovery Point Objective) — how much data loss is acceptable?
3. How often is DR tested? (annual minimum for most audits)
4. Where are backups stored? (geographically separate?)

**Required commitments**:
- RTO and RPO per system tier
- Backup frequency and retention
- Backup storage location (off-site/cloud)
- DR test frequency and documentation
- Crisis communication plan
- Alternative work location or remote work capability

**SOC 2**: CC7.5, A1.3 | **ISO 27001**: A.5.29, A.5.30

---

## 10. Logging & Monitoring Policy

**Clarifying questions**:
1. What logging platform is used? (Datadog, CloudWatch, Splunk, ELK?)
2. How long are logs retained? (1 year is common audit expectation)
3. Are there automated alerts for anomalous activity?
4. Who reviews alerts and on what cadence?

**Required commitments**:
- What events are logged (authentication, authorization, data access, changes)
- Log retention period (minimum 12 months)
- Log integrity protection (immutability)
- Alert thresholds and escalation
- Prohibited items in logs (passwords, credit card numbers, unredacted PII)
- Review cadence

**SOC 2**: CC4.1, CC7.2 | **ISO 27001**: A.8.15, A.8.16

---

## Additional for ISO 27001 (Policies 11–17)

---

## 11. Human Resources Security Policy

**Clarifying questions**:
1. Are background checks performed on new hires?
2. Is security awareness training provided? How often?
3. What is the onboarding security checklist?
4. What is the offboarding process for system access?

**Required commitments**:
- Background check requirements per role
- Security training frequency (annual minimum)
- NDA / confidentiality agreement at hire
- Onboarding checklist (account creation, training completion)
- Offboarding checklist (account deactivation, device return, exit interview)

**SOC 2**: CC1.4 | **ISO 27001**: A.6.1–A.6.6

---

## 12. Physical & Environmental Security Policy

**Clarifying questions**:
1. Does the organization have a physical office with servers or sensitive equipment?
2. Is the primary infrastructure cloud-based?
3. How is visitor access managed?

**Note**: If infrastructure is 100% cloud-based, scope this policy to office/laptop physical security only. Reference the cloud provider's physical security (their SOC 2 / ISO 27001 report covers data center controls).

**Required commitments**:
- Physical access controls (badge access, visitor logs)
- Clean desk policy
- Screen lock requirements
- Secure disposal of physical media
- Environmental controls (temperature, fire suppression) — if applicable

**SOC 2**: CC6.4 (physical) | **ISO 27001**: A.7.1–A.7.14

---

## 13. Cryptography Policy

**Clarifying questions**:
1. What encryption standards are used for data at rest?
2. What TLS version is enforced for data in transit?
3. How are encryption keys managed? (KMS, HSM, manual?)

**Required commitments**:
- Minimum encryption standards: AES-256 at rest, TLS 1.2+ in transit
- Prohibited algorithms (DES, RC4, MD5, SHA-1 for integrity)
- Key management: rotation frequency, access controls
- Certificate management (expiry monitoring, rotation)

**ISO 27001**: A.8.24

---

## 14. Network Security Policy

**Clarifying questions**:
1. Is there network segmentation between production and development?
2. Are there firewall rules documented?
3. Is VPN required for remote access to internal systems?

**Required commitments**:
- Network segmentation requirements
- Firewall rule review cadence
- VPN / zero-trust access requirements
- Wireless network security (WPA3, guest network isolation)
- Prohibited protocols and ports

**SOC 2**: CC6.6 | **ISO 27001**: A.8.20–A.8.22

---

## 15. Vulnerability Management Policy

**Clarifying questions**:
1. How are vulnerabilities discovered? (SAST, DAST, dependency scanning, pentests?)
2. What are SLAs for patching by severity? (Critical: 24–72h / High: 7–14d / Medium: 30d?)
3. Is there an annual penetration test?

**Required commitments**:
- Vulnerability scanning frequency (weekly minimum for production)
- Patching SLAs by CVSS severity
- Annual penetration test requirement
- Responsible disclosure / bug bounty policy (if applicable)
- Patch exception process

**SOC 2**: CC7.1 | **ISO 27001**: A.8.8

---

## 16. Privacy & Data Protection Policy

See also: **compliance-gdpr** skill for GDPR-specific implementation.

**Clarifying questions**:
1. What personal data is collected and processed?
2. What is the legal basis for each processing activity?
3. Who is the Data Protection Officer or privacy contact?

**Required commitments**:
- Types of personal data processed
- Legal basis for processing (GDPR Article 6)
- Data subject rights and how to exercise them
- Data retention periods per data type
- Third-party data sharing and DPA requirements
- Breach notification procedures

**SOC 2**: P1–P8 | **ISO 27001**: A.5.34

---

## 17. Mobile & Endpoint Policy

**Clarifying questions**:
1. Is MDM (Mobile Device Management) deployed? (Jamf, Intune, Kandji?)
2. Are personal devices allowed to access company systems?
3. What is the minimum OS version requirement?

**Required commitments**:
- MDM enrollment requirement for company devices
- BYOD requirements (MDM enrollment or containerization)
- Disk encryption requirement (FileVault, BitLocker)
- Screen lock with PIN/password
- Remote wipe capability
- Prohibited: jailbroken/rooted devices
- Lost/stolen device reporting procedure

**ISO 27001**: A.8.1, A.6.7
