# ENS — CCN-STIC Technical Guides

Reference for the CCN-STIC guide series applicable to ENS implementation and audit.

CCN-STIC guides are published by the Centro Criptológico Nacional (CCN) and provide technical instructions for implementing ENS measures. They are **recommended**, not legally mandatory, unless expressly required by contract with the public administration.

Download all guides: https://www.ccn-cert.cni.es/es/series-ccn-stic.html

---

## Core ENS Guides (800 Series)

| Guide | Scope | When to Use |
|-------|-------|-------------|
| CCN-STIC-801 | Responsibilities and functions: roles of security officer, system owner, and user in the ENS framework | When defining the security organization and assigning roles (article 11, RD 311/2022) |
| CCN-STIC-802 | ENS audit: methodology, evidence collection, report format, and non-conformity classification | When preparing for or conducting a Medium/High formal audit |
| CCN-STIC-803 | System valuation: detailed guidance for assessing the 5 security dimensions and determining category | When performing system categorization (Annex I, RD 311/2022) |
| CCN-STIC-804 | Measures and implementation: practical guidance for implementing Annex II measures, including example controls | Primary implementation reference; load alongside `ens-medidas.md` |
| CCN-STIC-805 | Information security policy: structure, minimum content, and approval process | When drafting the mandatory security policy (org.1, article 12) |
| CCN-STIC-806 | ENS remediation plan: how to structure and track the plan de adecuación | When generating the remediation plan after gap analysis |
| CCN-STIC-808 | Verification of measure compliance: self-assessment checklist for Basic category systems | Required for Basic category self-assessment audit |
| CCN-STIC-811 | Interconnection in the ENS: security requirements for interconnecting systems of different categories | When the system exchanges data with other systems (op.ext.4) |
| CCN-STIC-812 | Security in web environments and applications: hardening, OWASP controls, secure development | When implementing mp.sw.1, mp.sw.2, mp.s.2 for web-facing systems |
| CCN-STIC-817 | Cyber incident management: incident classification, response procedures, CCN-CERT notification | When implementing op.exp.7; required for Medium/High incident reporting to CCN-CERT |
| CCN-STIC-823 | Use of cloud services: requirements for cloud providers, shared responsibility model, ENS-compatible cloud configurations | When the system runs on cloud infrastructure (IaaS, PaaS, SaaS) |

---

## Cloud Provider Implementation Guides

| Guide | Provider | Scope |
|-------|----------|-------|
| CCN-STIC-884 | Amazon Web Services | ENS-specific configurations for AWS services: IAM, CloudTrail, S3 encryption, VPC, Security Hub. Covers Basic and Medium/High configurations. |
| CCN-STIC-887 | Microsoft Azure | ENS-specific configurations for Azure services: Entra ID, Defender, Key Vault, Policy, Monitor. Covers Basic and Medium/High configurations. |
| CCN-STIC-888 | Google Cloud | ENS-specific configurations for GCP services: IAM, Cloud Audit Logs, KMS, VPC Service Controls, Security Command Center. |

**When to use cloud guides**: Load the relevant guide when implementing mp.if measures for cloud-hosted infrastructure, when documenting cloud provider controls in the Statement of Applicability, or when a cloud provider's ENS certification is being used to cover infrastructure measures.

---

## Guide Selection by Workflow Step

| SKILL.md Step | Relevant CCN-STIC Guides |
|--------------|--------------------------|
| Step 1 — Categorization | CCN-STIC-803 |
| Step 2 — Risk analysis | MAGERIT v3 (separate methodology, not CCN-STIC series) |
| Step 3 — Security measures | CCN-STIC-804, plus cloud guides (884/887/888) if applicable |
| Step 4 — Statement of Applicability | CCN-STIC-804, CCN-STIC-806 |
| Step 5 — Security policy | CCN-STIC-805, CCN-STIC-801 |
| Step 6 — Audit | CCN-STIC-802 (Medium/High), CCN-STIC-808 (Basic) |
| Step 7 — Remediation plan | CCN-STIC-806 |

---

## Notes on Guide Versions

CCN updates guides periodically. Always download the latest version from the official CCN-CERT site before starting an implementation or audit. Versions are indicated in the guide filename (e.g., `CCN-STIC-804 v2.0`).

Some guides have multiple parts (e.g., CCN-STIC-804 has separate documents per operating system or technology). Filter by the technology stack in use.

---

## MAGERIT — Risk Analysis Methodology

MAGERIT is the official risk analysis methodology referenced by the ENS (op.pl.1). It is published by the Ministry of Finance and Public Administration, not by CCN.

| Resource | URL |
|----------|-----|
| MAGERIT v3 download | https://administracionelectronica.gob.es/pae_Home/pae_Metodologias/pae_Magerit.html |
| PILAR tool (CCN) | https://www.ccn-cert.cni.es/es/herramientas-de-ciberseguridad/pilar.html |

PILAR implements MAGERIT v3 and is the CCN-recommended tool for risk analysis in ENS contexts. It produces output compatible with the formal audit evidence requirements.
