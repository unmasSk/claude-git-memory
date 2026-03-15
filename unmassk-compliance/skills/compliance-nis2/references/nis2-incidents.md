# NIS2 Article 23 — Incident Reporting Timelines and Templates

Reference for implementing NIS2 incident notification obligations. Article 23 defines
strict timelines and content requirements for reporting significant incidents to national
competent authorities (NCAs).

Source: Article 23, Directive EU 2022/2555.

---

## Reporting Timeline Overview

```
Incident detected / organization becomes aware
         │
         ▼
    [0 hours]
    Internal classification: Is this a "significant incident"?
         │
    YES  │
         ▼
    [≤24 hours] ── EARLY WARNING ──► NCA / CSIRT
         │          (brief notification, no full assessment needed)
         │
         ▼
    [≤72 hours] ── INCIDENT NOTIFICATION ──► NCA / CSIRT
         │          (initial assessment required)
         │
         ▼
    [≤1 month]  ── FINAL REPORT ──► NCA / CSIRT
                   (full description and measures)
```

**Parallel GDPR obligation**: If personal data is involved, also notify the data protection
authority within 72h per GDPR Article 33. This is a separate notification to a different
authority — same deadline, different recipient.

---

## What Is a "Significant Incident"?

Article 23(3): An incident is significant if it:

**Criterion A** — Caused or can cause:
- Severe disruption of the operation of services
- Financial loss for the affected entity

**Criterion B** — Has affected or can affect other persons by causing:
- Considerable material damage
- Considerable non-material damage (reputation, safety, etc.)

**Practical guidance** (ENISA interpretation):
- Service unavailability >4 hours for critical systems → likely significant
- Data breach affecting personal data of >500 individuals → likely significant
- Ransomware attack impacting production systems → significant
- Phishing email with no successful compromise → likely NOT significant
- Brief DDoS mitigated by CDN with no user impact → likely NOT significant

**When in doubt**: Report. NCAs prefer over-reporting to under-reporting.

---

## Internal Incident Classification Matrix

| Severity | Criteria | NIS2 Reporting | Timeline |
|----------|----------|----------------|----------|
| P1 — Critical | Production fully down; confirmed breach; ransomware; data exfiltration | YES — significant | 24h warning + 72h notification |
| P2 — High | Major degradation; suspected breach; >4h outage | LIKELY — assess | 24h warning if confirmed significant |
| P3 — Medium | Partial degradation; contained event; <4h outage | UNLIKELY — document | Internal log only |
| P4 — Low | Minor issue; no user impact; no data exposure | NO | Internal log only |

---

## Early Warning (≤24 hours)

**Who receives it**: NCA AND CSIRT of the Member State where the entity is established.

**Content required** (minimal at this stage):
- Indication that a significant incident has occurred
- Whether the incident is suspected to result from unlawful or malicious action
- Whether it has cross-border impact

**Template — Early Warning**:
```
Subject: NIS2 Early Warning Notification — [Organization Name] — [Date]

Organization: [Legal name]
NIS2 Classification: Essential / Important Entity
Sector: [Annex I/II sector]
Contact: [Name, role, email, phone]

Incident detected: [Date and time]
Nature of incident: [Brief description — 2–3 sentences]
Systems affected: [High-level — e.g., "production web infrastructure"]
Suspected cause: [Known / Unknown / Suspected malicious action]
Cross-border impact: [Yes / No / Unknown]

Status: Investigation ongoing
Next notification: Incident Notification within 72 hours of first awareness
```

---

## Incident Notification (≤72 hours)

**Content required** (Article 23(4)(b)):
- Detailed description of the incident
- Severity and impact assessment
- Indicators of compromise (if available and safe to share)
- Applied mitigating measures
- Whether cross-border impact is likely

**Template — Incident Notification**:
```
Subject: NIS2 Incident Notification — [Reference Number] — [Organization Name]

INCIDENT REFERENCE: [Internal ticket/case number]
REPORTING ENTITY: [Legal name, address, NCA registration ID if known]
REPORTING DATE: [Date/time of this notification]
INCIDENT START: [Date/time incident began or was detected]
TIME SINCE FIRST AWARENESS: [Hours]

## Incident Description
[Detailed narrative — what happened, how discovered, systems affected]

## Impact Assessment
- Services disrupted: [Yes/No — describe]
- Data affected: [Yes/No — type and estimated volume]
- Users affected: [Estimated number]
- Financial impact: [Estimated / Unknown]
- Cross-border impact: [Yes / No / Unknown — describe if yes]
- Duration of disruption: [Ongoing / Resolved — timestamp if resolved]

## Root Cause
[Known / Under investigation — describe if known]

## Indicators of Compromise
[IPs, domains, file hashes — mark TLP:AMBER if sensitive]

## Mitigating Measures Taken
[List of containment and remediation actions taken so far]

## Ongoing Actions
[What is currently being done]

## Estimated Resolution
[Expected timeline if not yet resolved]

CONTACT FOR FOLLOW-UP:
Name: [Name] | Role: [Role] | Email: [Email] | Phone: [Phone — 24/7?]
```

---

## Final Report (≤1 month)

**Content required** (Article 23(4)(c)):
- Detailed description of the incident
- Type of threat or root cause
- Applied and ongoing mitigating measures
- Cross-border impact if any

**Template — Final Report**:
```
Subject: NIS2 Final Report — [Reference Number] — [Organization Name]

[Include all fields from Incident Notification, plus:]

## Root Cause Analysis
[Full RCA — technical and process factors]

## Timeline of Events
[Chronological: detection, response, containment, eradication, recovery]

## Lessons Learned
[What went wrong, what went well]

## Corrective Actions
Action | Owner | Target Date | Status

## Control Improvements
[Changes to policies, procedures, or technical controls]

## Residual Risk
[Any remaining risk after remediation]
```

---

## 7-Phase Incident Response Procedure

### Phase 1 — Detection (Target: < 1 hour from alert)

1. Alert received from SIEM, endpoint tool, user report, or supplier
2. Assign Incident Commander (IC) — senior security or IT staff
3. Create incident record with timestamp, source, and initial description
4. Initial triage: real incident or false positive?
5. If real: escalate to Phase 2. If false positive: document and close.

### Phase 2 — Classification (Target: < 2 hours from detection)

1. IC assembles core response team
2. Assess: What systems/data are affected?
3. Assess: Is there confirmed malicious activity?
4. Assess: Could this have cross-border impact?
5. Assign severity level (P1–P4) using matrix above
6. P1 or malicious P2 → trigger 24h early warning clock

### Phase 3 — 24-Hour Early Warning

Submit early warning using template above. Do not delay waiting for full investigation.

### Phase 4 — Containment (parallel with phases 3 and 5)

**Ransomware**:
1. Isolate affected systems from network immediately
2. Preserve encrypted systems for forensics — do not wipe
3. Identify patient zero and infection vector
4. Notify legal and cyber insurance
5. Assess backup integrity before recovery decisions

**Data Breach / Unauthorized Access**:
1. Terminate active sessions (revoke credentials, close connections)
2. Preserve logs before any system changes
3. Identify all accessed data (what, how much, whose)
4. Assess GDPR Article 33 notification obligation (72h, separate from NIS2)
5. Preserve evidence chain for potential law enforcement

**DDoS**:
1. Activate DDoS mitigation (upstream filtering, CDN, rate limiting)
2. Identify attack vector (volumetric, protocol, application layer)
3. Contact ISP/CDN provider for assistance
4. Communicate status to affected users

### Phase 5 — Investigation (Target: complete before 72h notification)

1. Collect evidence: logs, network captures, disk images, memory dumps
2. Establish timeline of attacker activity (first access → detection)
3. Identify Indicators of Compromise (IoCs): IPs, hashes, domains, techniques
4. Determine root cause
5. Assess full scope: all affected systems, data, and third parties
6. Document all findings in incident log

Evidence preservation checklist:
- [ ] System logs (firewall, SIEM, endpoint) exported and preserved
- [ ] Affected systems imaged before remediation
- [ ] Chain of custody documented for forensic evidence
- [ ] Analyst notes timestamped

### Phase 6 — 72-Hour Notification

Submit incident notification using template above. If 72h deadline cannot be met,
submit what is available and notify CSIRT of the delay with a reason.

### Phase 7 — Recovery and Final Report

Recovery steps:
1. Remediate root cause (patch, reconfigure, rebuild affected systems)
2. Restore from clean backups or rebuild from known-good state
3. Verify integrity of restored systems
4. Re-enable services in controlled, monitored rollout
5. Confirm no attacker persistence (re-scan, behavioral monitoring)

Submit final report using template above at T+1 month.

---

## NCA Contact Information

**Spain — Private sector** (INCIBE-CERT):
- Reporting portal: https://www.incibe.es/incibe-cert/alerta/reporte
- Phone: 017 (cybersecurity hotline, 24/7 for critical incidents)
- Email: cert@incibe.es

**Spain — Public sector / essential entities** (CCN-CERT):
- Reporting: https://www.ccn-cert.cni.es
- Email: cert@ccn.cni.es

**Belgium** (CCB / CERT.be):
- Platform: ccb.belgium.be — register BEFORE an incident occurs
- Submit all notifications via the CERT.be reporting portal

**Netherlands** (NCSC-NL):
- Website: ncsc.nl — verify current status (transposition expected Q2 2026)

**Other EU Member States**:
- ENISA CSIRT directory: enisa.europa.eu/topics/csirts-in-europe

**Important**: Register with the appropriate NCA BEFORE an incident occurs. Notification
credentials and processes should be tested in advance.
