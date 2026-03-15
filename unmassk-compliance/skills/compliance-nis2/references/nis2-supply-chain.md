# NIS2 Supply Chain Security

Reference for implementing Article 21(2)(d) supply chain security requirements.
NIS2 explicitly requires entities to assess and manage security risks in their
supply chain, including direct suppliers and service providers.

Source: Article 21(2)(d), Directive EU 2022/2555. ENISA guidelines on supply
chain security for NIS2.

---

## What NIS2 Requires

Article 21(2)(d): Security in the supply chain — entities must address security
risks relating to relationships between each entity and its direct suppliers or
service providers, including security-related aspects of the relationships between
those suppliers or service providers and their own suppliers.

This covers:
- ICT product and service suppliers
- Managed service providers (MSPs) and managed security service providers (MSSPs)
- Cloud service providers
- Software vendors
- Third-party processors handling entity data

---

## Supplier Risk Tiering

Classify all suppliers before starting assessments. Prioritize tier 1.

| Tier | Description | Review Frequency |
|------|-------------|-----------------|
| 1 — Critical | Access to production systems, sensitive data, or infrastructure; disruption causes service outage | Annual assessment + continuous monitoring |
| 2 — Important | Regular access to internal systems; partial disruption possible | Annual review |
| 3 — Standard | No system access; low-sensitivity data only | Onboarding screening only |

**Examples of Tier 1 suppliers**: Cloud providers (AWS, Azure, GCP), identity providers, SIEM/EDR vendors, MSPs with network access, critical SaaS platforms.

---

## Supplier Security Assessment Checklist

For each Tier 1 supplier, verify:

**Certification and posture**:
- [ ] Supplier holds ISO 27001, SOC 2 Type II, or equivalent certification
- [ ] Certificate is current and covers relevant services
- [ ] Last audit report available (request SOC 2 report or ISO 27001 certificate)
- [ ] Supplier has a documented vulnerability disclosure process

**Contractual requirements**:
- [ ] Security clause in contract covering incident notification obligations
- [ ] Supplier must notify entity within 24h of any breach affecting entity's data or services
- [ ] Supplier must cooperate with forensic investigations
- [ ] Right to audit clause (for Tier 1)
- [ ] Data processing agreement (DPA) in place if personal data involved (GDPR Art. 28)

**NIS2 compliance status** (for EU-based Tier 1 suppliers):
- [ ] Is the supplier itself subject to NIS2? (MSPs, cloud providers, DNS providers typically are)
- [ ] If yes, is the supplier registered with its national NCA?
- [ ] Supplier can provide evidence of NIS2-aligned incident response procedures

**Operational resilience**:
- [ ] Supplier has documented business continuity and DR plans
- [ ] Supplier can articulate RTO/RPO for services provided to this entity
- [ ] Supplier has multi-region or redundant infrastructure for critical services

---

## Supply Chain Incident Scenarios

Document response procedures for these scenarios:

**Scenario 1 — Supplier breach (e.g., SolarWinds type)**:
1. Receive notification from supplier or from threat intelligence
2. Assess: were this entity's systems or data affected?
3. If yes: initiate incident response procedure (load `references/nis2-incidents.md`)
4. Verify supplier is notifying their NCA if they are NIS2-obligated
5. Assess whether entity's own NIS2 notification obligation is triggered
6. Document assessment even if no notification required

**Scenario 2 — Critical supplier goes offline**:
1. Activate business continuity plan for affected services
2. Identify fallback suppliers or manual workarounds per BCP
3. Assess whether service disruption triggers entity's NIS2 notification obligation
4. Document and review supplier resilience requirements post-incident

**Scenario 3 — Malicious code in software update (dependency attack)**:
1. Isolate affected systems
2. Identify scope of compromise
3. Report to relevant national CSIRT (both for NIS2 and as threat intel sharing)
4. Review all systems using the affected software or version

---

## Supplier Inventory Template

Maintain this inventory. Review and update annually.

```
Supplier Inventory — [ORGANIZATION NAME]
Last Updated: [DATE]

Supplier | Service | Tier | Certification | Contract Expiry | Last Review | NIS2 Obligated?
---------|---------|------|---------------|----------------|-------------|----------------
[Name]   |         | 1/2/3|               |                |             | Y/N/Unknown
```

---

## Supply Chain Assessment Output

Generate `.compliance/nis2-supply-chain-assessment.md` with:

```markdown
# Supply Chain Security Assessment

**Organization**: [NAME]
**Date**: [DATE]
**Assessor**: [NAME]

## Supplier Inventory Summary
- Total suppliers: X
- Tier 1 (critical): X
- Tier 2 (important): X
- Tier 3 (standard): X

## Assessment Results

| Supplier | Tier | ISO 27001 / SOC 2 | Security Clause | NCA Registered | Risk Level | Action Required |
|----------|------|-------------------|-----------------|----------------|------------|-----------------|

## Critical Gaps
[List any Tier 1 suppliers without certification or contractual security clauses]

## Remediation Plan
[Actions, owners, target dates]
```

---

## Key Linkage: Article 21(2)(d) and Article 21(2)(e)

Article 21(2)(e) (network and IS security) also addresses supply chain risk from the
software side: vulnerability handling for software components, secure development
practices, and dependency scanning. Together, (d) and (e) cover:

- Organizational supply chain risk (who your vendors are, their security posture)
- Technical supply chain risk (open source dependencies, third-party libraries, CI/CD pipeline integrity)

For software-heavy organizations: document both supplier security assessments AND
software composition analysis (SCA) in CI/CD as evidence for these two measures.

---

## GDPR Overlap

Article 28 GDPR (data processor contracts) overlaps significantly with NIS2 Article 21(2)(d).
Existing Data Processing Agreements (DPAs) may already contain security requirements that
partially satisfy NIS2 supply chain obligations.

Check existing DPAs for:
- Security obligations on the processor (Article 28(3)(c))
- Sub-processor notification requirements (Article 28(2))
- Right to audit (Article 28(3)(h))

These clauses can be cited as evidence for NIS2 supply chain compliance if they meet the
NIS2 content requirements. See `references/nis2-governance.md` for the full GDPR crosswalk.
