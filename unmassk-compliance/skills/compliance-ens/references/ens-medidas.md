# ENS — Security Measures by Category

Reference for the 75 measures in Annex II of RD 311/2022, with applicability by category.

Source: RD 311/2022, Annex II. Notation: B = Basic, M = Medium, A = High (Alta), + = reinforced relative to previous level, R = recommended (not mandatory).

Official text: https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191

---

## Organizational Framework (org)

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| org.1 | Security policy | ✓ | ✓ | ✓ |
| org.2 | Security regulations | ✓ | ✓ | ✓ |
| org.3 | Security procedures | ✓ | ✓ | ✓ |
| org.4 | Authorization process | ✓ | ✓ | ✓ |

---

## Operational Framework (op)

### op.pl — Planning

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.pl.1 | Risk analysis | R | ✓ | ✓ |
| op.pl.2 | Security architecture | R | ✓ | ✓ |
| op.pl.3 | Acquisition of new components | ✓ | ✓ | ✓ |
| op.pl.4 | Dimensioning / capacity management | R | ✓ | ✓ |
| op.pl.5 | Certified components | R | R | ✓ |

### op.acc — Access Control

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.acc.1 | Identification | ✓ | ✓ | ✓ |
| op.acc.2 | Access requirements | ✓ | ✓ | ✓ |
| op.acc.3 | Segregation of functions and tasks | R | ✓ | ✓ |
| op.acc.4 | Access rights management process | ✓ | ✓ | ✓ |
| op.acc.5 | Authentication mechanism (external users) | ✓ | ✓+ | ✓++ |
| op.acc.6 | Authentication mechanism (organizational users) | ✓ | ✓+ | ✓++ |
| op.acc.7 | Local access (organizational employees) | ✓ | ✓ | ✓ |

**Note on op.acc.5 and op.acc.6** (authentication):
- Basic: username + strong password
- Medium: two-factor authentication (2FA)
- High: high-security authentication (digital certificate, hardware token)

### op.exp — Operations

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.exp.1 | Asset inventory | ✓ | ✓ | ✓ |
| op.exp.2 | Security configuration | ✓ | ✓ | ✓ |
| op.exp.3 | Configuration management | R | ✓ | ✓ |
| op.exp.4 | Maintenance | ✓ | ✓ | ✓ |
| op.exp.5 | Change management | R | ✓ | ✓ |
| op.exp.6 | Protection against malicious code | ✓ | ✓ | ✓ |
| op.exp.7 | Incident management | ✓ | ✓+ | ✓++ |
| op.exp.8 | User activity logging | R | ✓ | ✓ |
| op.exp.9 | Incident management logging | R | ✓ | ✓ |
| op.exp.10 | Protection of activity logs | R | ✓ | ✓ |
| op.exp.11 | Cryptographic key protection | R | ✓ | ✓ |

### op.ext — External Services

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.ext.1 | Contracting and service level agreements | ✓ | ✓ | ✓ |
| op.ext.2 | Day-to-day management | R | ✓ | ✓ |
| op.ext.3 | Supply chain protection | R | R | ✓ |
| op.ext.4 | System interconnection | R | ✓ | ✓ |

### op.cont — Service Continuity

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.cont.1 | Impact analysis | R | ✓ | ✓ |
| op.cont.2 | Continuity plan | R | ✓ | ✓ |
| op.cont.3 | Periodic testing | R | R | ✓ |

### op.mon — System Monitoring

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| op.mon.1 | Intrusion detection | R | ✓ | ✓ |
| op.mon.2 | Metrics system | R | R | ✓ |
| op.mon.3 | Surveillance | R | R | ✓ |

---

## Protection Measures (mp)

### mp.if — Facilities and Infrastructure Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.if.1 | Separated areas with access control | ✓ | ✓ | ✓ |
| mp.if.2 | Person identification | ✓ | ✓ | ✓ |
| mp.if.3 | Premises conditioning | ✓ | ✓ | ✓ |
| mp.if.4 | Electrical power | ✓ | ✓ | ✓ |
| mp.if.5 | Fire protection | ✓ | ✓ | ✓ |
| mp.if.6 | Flood protection | R | ✓ | ✓ |
| mp.if.7 | Equipment entry and exit logging | R | ✓ | ✓ |

**Note for cloud/SaaS systems**: If the infrastructure is 100% cloud, mp.if measures are the cloud provider's responsibility. Document this via the provider's ENS or SOC 2 certification.

### mp.per — Personnel Management

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.per.1 | Job role characterization | R | ✓ | ✓ |
| mp.per.2 | Duties and obligations | ✓ | ✓ | ✓ |
| mp.per.3 | Awareness | ✓ | ✓ | ✓ |
| mp.per.4 | Training | R | ✓ | ✓ |
| mp.per.5 | Alternate personnel | R | R | ✓ |

### mp.eq — Equipment Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.eq.1 | Clear desk | ✓ | ✓ | ✓ |
| mp.eq.2 | Workstation locking | ✓ | ✓ | ✓ |
| mp.eq.3 | Portable equipment protection | ✓ | ✓+ | ✓++ |
| mp.eq.4 | Alternate means | R | R | ✓ |

### mp.com — Communications Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.com.1 | Secure perimeter | ✓ | ✓ | ✓ |
| mp.com.2 | Confidentiality protection | R | ✓ | ✓ |
| mp.com.3 | Authenticity and integrity protection | R | ✓ | ✓ |
| mp.com.4 | Network segregation | R | ✓ | ✓ |
| mp.com.5 | Alternate means | R | R | ✓ |

### mp.si — Information Media Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.si.1 | Labeling | R | ✓ | ✓ |
| mp.si.2 | Cryptography | R | ✓ | ✓ |
| mp.si.3 | Custody | ✓ | ✓ | ✓ |
| mp.si.4 | Transport | ✓ | ✓ | ✓ |
| mp.si.5 | Erasure and destruction | ✓ | ✓ | ✓ |

### mp.sw — Application Software Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.sw.1 | Application development | R | ✓ | ✓ |
| mp.sw.2 | Acceptance and commissioning | R | ✓ | ✓ |

### mp.info — Information Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.info.1 | Personal data | ✓ | ✓ | ✓ |
| mp.info.2 | Information classification | R | ✓ | ✓ |
| mp.info.3 | Encryption | R | ✓ | ✓ |
| mp.info.4 | Electronic signature | R | ✓ | ✓ |
| mp.info.5 | Timestamps | R | R | ✓ |
| mp.info.6 | Document sanitization | R | ✓ | ✓ |
| mp.info.7 | Backups | ✓ | ✓ | ✓ |

### mp.s — Service Protection

| ID | Measure | B | M | A |
|----|---------|---|---|---|
| mp.s.1 | Email protection | ✓ | ✓ | ✓ |
| mp.s.2 | Web services and applications protection | ✓ | ✓ | ✓ |
| mp.s.3 | Denial of service protection | R | ✓ | ✓ |
| mp.s.4 | Alternate means | R | R | ✓ |

---

## CCN-STIC Reference Guides

CCN-STIC guides provide detailed technical instructions for implementing ENS measures. See `references/ens-ccn-stic.md` for the full guide list with scope, download URLs, and when to use each one.

| Guide | Content |
|-------|---------|
| CCN-STIC-801 | Responsibilities and functions in the ENS |
| CCN-STIC-802 | ENS audit |
| CCN-STIC-803 | System valuation in the ENS |
| CCN-STIC-804 | ENS measures and implementation |
| CCN-STIC-805 | Information security policy |
| CCN-STIC-806 | ENS remediation plan |
| CCN-STIC-808 | Verification of measure compliance |
| CCN-STIC-811 | Interconnection in the ENS |
| CCN-STIC-812 | Security in web environments and applications |
| CCN-STIC-817 | Cyber incident management |
| CCN-STIC-823 | Use of cloud services |
| CCN-STIC-884 | ENS implementation guide for AWS |
| CCN-STIC-887 | ENS implementation guide for Microsoft Azure |
| CCN-STIC-888 | ENS implementation guide for Google Cloud |

Guide downloads: https://www.ccn-cert.cni.es/es/series-ccn-stic.html
