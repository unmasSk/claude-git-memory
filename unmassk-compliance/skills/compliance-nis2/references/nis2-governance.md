# NIS2 Governance — Crosswalks, Roadmap, and Executive Briefing

Reference for compliance crosswalks (GDPR, ISO 27001), 12-month implementation roadmap,
management accountability requirements, and regional implementation status.

Source: NIS2 SMB package by Paolo Carner, BARE Consulting (CC BY 4.0).
Directive EU 2022/2555, Articles 20–21.

---

## GDPR Crosswalk (~55% Overlap)

Existing GDPR controls that satisfy NIS2 requirements — no duplication needed.

| GDPR Article | GDPR Obligation | NIS2 Equivalent | Notes |
|---|---|---|---|
| Art. 5 + 25 | Data minimization and privacy by design | Art. 21.2(a) — risk analysis | Risk-based approach applies to both |
| Art. 32 | Appropriate technical and organizational measures | Art. 21.2(a–j) broadly | GDPR Art. 32 and NIS2 Art. 21 are largely equivalent in intent |
| Art. 33 | 72h breach notification to supervisory authority | Art. 23 — 72h notification to NCA/CSIRT | Two separate notifications, same deadline, different recipients |
| Art. 34 | Notification to affected individuals | No NIS2 equivalent | GDPR-only obligation |
| Art. 35 | Data Protection Impact Assessment (DPIA) | Art. 21.2(a) — risk assessment | DPIA can double as NIS2 risk assessment for personal data processing |
| Art. 28 | Data processor contracts | Art. 21.2(d) — supply chain security | DPAs and supply chain requirements overlap significantly |
| Art. 5(f) + 32 | Integrity and confidentiality | Art. 21.2(h, i, j) | Encryption, access control, authentication |

**Reuse strategy**: If GDPR controls are at enhanced maturity (documented, tested, reviewed),
they likely satisfy equivalent NIS2 controls. Map existing GDPR evidence to NIS2 controls
before creating new documentation.

---

## ISO 27001:2022 Crosswalk (~75% Alignment)

| NIS2 Measure | ISO 27001:2022 Annex A Controls |
|---|---|
| (a) Risk analysis and policies | 5.1 (IS policies), 8.2 (IS risk assessment), 8.3 (IS risk treatment) |
| (b) Incident handling | 5.24 (IR planning), 5.25 (incident assessment), 5.26 (IR response), 5.27 (lessons learned), 5.28 (evidence collection) |
| (c) Business continuity | 5.29 (IS during disruption), 5.30 (ICT readiness for BC), 8.13 (IS backup), 8.14 (redundancy) |
| (d) Supply chain security | 5.19 (supplier IS policy), 5.20 (contracts), 5.21 (ICT supply chain), 5.22 (monitoring), 5.23 (cloud services) |
| (e) Network and IS security | 8.20–8.23 (network controls), 8.8 (vulnerability management), 8.18–8.19 (privileged utilities) |
| (f) Effectiveness assessment | 9.1 (monitoring), 9.2 (internal audit), 9.3 (management review) |
| (g) Hygiene and training | 6.3 (awareness), 6.8 (reporting IS events) |
| (h) Cryptography | 8.24 (use of cryptography) |
| (i) HR security and access control | 5.2–5.6 (roles), 6.1–6.5 (HR), 8.2 (privileged access), 8.3–8.6 (access rights) |
| (j) MFA and secure communications | 8.5 (secure authentication), 8.20 (network security), 8.23–8.26 (web filtering, secure comms) |

**What ISO 27001 does NOT cover for NIS2** (fill these gaps explicitly):
- Management body personal accountability (Article 20) — ISO 27001 has top management commitment but not personal liability language
- National CSIRT registration and documented relationship
- Specific 24h/72h/1-month notification timelines — ISO 27001 has IR procedures but not these exact deadlines
- Sector-specific competent authority reporting

**Reuse strategy**: If ISO 27001 certified or implementing in parallel, ISMS documentation
satisfies most NIS2 requirements. Focus additional NIS2 effort on: management body
accountability documentation, explicit notification procedures, and CSIRT registration.

---

## 12-Month Implementation Roadmap

### Phase 1 — Foundation (Months 1–3)

Focus: Critical controls and regulatory minimums. Stops the clock on biggest liability.

- [ ] Management body briefed; personal accountability formally accepted (Article 20)
- [ ] Entity classification confirmed and documented
- [ ] Information Security Policy approved by management
- [ ] Incident response plan drafted; CSIRT/NCA contacts documented and tested
- [ ] MFA enabled on remote access and all cloud services
- [ ] Access review completed; stale and excessive accounts removed
- [ ] Staff security awareness training completed
- [ ] Entity registered with national NCA (if not already done)

**Estimated effort**: 40–60 person-days (varies by organization size and starting maturity)

### Phase 2 — Strengthening (Months 4–6)

Focus: Documented processes and control evidence.

- [ ] Risk assessment completed and risk register created
- [ ] Business Continuity Plan drafted
- [ ] Supply chain inventory completed; Tier 1 supplier assessments underway
- [ ] Vulnerability management process operational (scanning + SLA-driven remediation)
- [ ] Security KPIs defined; first board security report delivered
- [ ] Cryptography policy and certificate inventory completed
- [ ] GDPR and ISO 27001 crosswalk completed; evidence mapped

**Estimated effort**: 50–70 person-days

### Phase 3 — Optimization (Months 7–12)

Focus: Testing, continuous improvement, audit readiness.

- [ ] BCP/DRP tabletop exercise completed
- [ ] Penetration test completed and findings remediated
- [ ] Phishing simulation program launched
- [ ] Supplier contracts updated with security requirements
- [ ] Internal compliance audit completed
- [ ] 12-month roadmap reviewed and updated for next cycle

**Estimated effort**: 60–80 person-days

---

## Management Accountability (Article 20)

NIS2 Article 20 makes management body members personally accountable. Key points for
board and executive briefings:

1. **Personal liability**: Management body members are personally accountable for NIS2
   compliance. This cannot be delegated. Non-compliance can result in personal liability
   and temporary bans from management roles.

2. **Enforcement is active in Belgium** (since October 2024). Netherlands: expected Q2 2026.

3. **What management must approve**:
   - Information Security Policy (annual)
   - Risk treatment decisions
   - Security budget adequate for compliance
   - Incident notification authority (who can authorize the 24h early warning)

4. **What management receives quarterly**:
   - Security status dashboard (controls maturity, incidents, patches)
   - Significant incident reports
   - Compliance roadmap progress

**Board-ready penalty framing**:

| Scenario | Essential Entity | Important Entity |
|---|---|---|
| Fixed maximum | €10,000,000 | €7,000,000 |
| Percentage alternative | 2% global annual turnover | 1.4% global annual turnover |
| Regulatory basis | Article 34 NIS2 | Article 34 NIS2 |
| Additional exposure | Management personal liability | Management personal liability |

**Strategic framing**: NIS2 compliance overlaps significantly with GDPR and ISO 27001.
If GDPR controls are mature, ~55% of NIS2 requirements are already met. If ISO 27001
certified, ~75% alignment exists. Marginal compliance cost is primarily in: management
accountability documentation, CSIRT notification procedures, and remaining control gaps.

---

## Management Sign-Off Template

Generate `.compliance/nis2-management-approval.md`:

```markdown
# NIS2 Management Accountability Statement

**Organization**: [NAME]
**Date**: [DATE]
**Approved by**: [MANAGEMENT BODY MEMBER NAMES AND TITLES]

We, the undersigned members of the management body of [ORGANIZATION NAME], acknowledge:

1. NIS2 Directive (EU 2022/2555) applies to [ORGANIZATION NAME] as a [Essential/Important] entity.
2. We have reviewed and approved the Information Security Policy dated [DATE].
3. We have reviewed and accepted the cybersecurity risk management measures as documented.
4. We understand that personal accountability for NIS2 compliance cannot be delegated.
5. We authorize [CISO/IT MANAGER NAME] to issue 24-hour early warnings to the national NCA/CSIRT
   on our behalf in the event of a significant incident.

Annual security reports will be presented to the management body at [FREQUENCY] intervals.

Signed: _________________ Date: _________
[Name, Title]
```

---

## Regional Implementation Status

### Belgium

**Status**: NIS2 transposed into national law October 2024. Obligations active. Enforcement live.

**Competent authority**: CCB (Centre for Cybersecurity Belgium)
- Website: ccb.belgium.be
- Incident reporting: via CERT.be platform

**Registration**: Essential and important entities must register with CCB. Not automatic.

**Notification procedure**:
1. Register on CERT.be platform before any incident occurs
2. Submit 24h early warning via CERT.be reporting portal
3. Submit 72h notification via same portal with full incident data
4. Submit 1-month final report via portal

### Netherlands

**Status**: NIS2 transposition expected Q2 2026. Not yet in force as of March 2026.

**Competent authority (expected)**: NCSC-NL (ncsc.nl). Sector-specific authorities may apply (e.g., DNB for financial sector).

**Action now**: Begin compliance preparation. When Dutch law is enacted: register with NCSC-NL or sector-specific authority, update CSIRT contacts, verify notification format requirements.

**Verify before acting**: Dutch implementation details are pending legislation. Confirm current status at ncsc.nl.

### Other EU Member States

All member states were required to transpose NIS2 by October 17, 2024. Check national transposition status before assuming procedures apply.

ENISA CSIRT directory: enisa.europa.eu/topics/csirts-in-europe

---

## Disclaimer

This reference provides educational content based on NIS2 Directive (EU 2022/2555).
It does not constitute legal advice, official regulatory guidance, or a guarantee of
compliance. Consult qualified legal counsel for regulatory interpretation and engage
cybersecurity professionals for implementation. Verify requirements with national
competent authorities.
