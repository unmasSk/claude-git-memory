# Evidence Patterns — Audit Evidence Collection Guide

Reference for planning audit evidence. For each SOC 2 / ISO 27001 control area, lists what auditors expect, where to collect it, and how frequently.

Load during the Policy Generation Workflow (Step 5 — Evidence Planning).

---

## Evidence Types

- **Configuration evidence**: Screenshots, exports, or reports showing a control is configured
- **Operational evidence**: Logs, tickets, records showing the control operated during the audit period
- **Process evidence**: Documents, meeting notes, emails showing the process was followed

For SOC 2 Type II audits (period-based), operational evidence must span the full audit period (typically 6 or 12 months). For Type I (point-in-time), configuration evidence is sufficient.

---

## Access Control Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| User provisioning | Tickets/records showing access granted upon request and approval | Jira, Linear, GitHub Issues | Per event |
| User deprovisioning | Tickets showing access removed within SLA of termination | HR system + IT tickets | Per event |
| Access review | Signed-off access review with date, reviewer, and any removals made | Spreadsheet, Vanta, Drata | Quarterly |
| MFA enforcement | Admin console screenshot showing MFA required for all or admin users | Google Workspace, Okta | Point-in-time |
| Privileged access | List of admin/privileged accounts with justification | Admin console export | Quarterly |

**Common finding**: Access reviews not documented, or MFA not enforced for all users.

---

## Change Management Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Code review | PRs with at least one approver before merge to main | GitHub, GitLab | Per deployment |
| Deployment approval | Approval record for production deployments | CI/CD logs, change tickets | Per deployment |
| Staging environment | Evidence that staging exists separately from production | Infrastructure screenshot | Point-in-time |
| Emergency changes | Documentation of emergency change rationale and post-hoc approval | Change ticket | Per event |

**Common finding**: Direct pushes to main branch without PR review; no staging environment.

---

## Incident Response Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Incident log | Log of all security events with classification and resolution | Ticketing system, SIEM | Ongoing |
| Post-incident review | PIR documents for P1/P2 incidents | Confluence, Notion, docs | Per incident |
| Incident response test | Tabletop exercise or drill documentation | Meeting notes | Annual |
| Alert configuration | Screenshot of alert rules configured in monitoring tool | Datadog, PagerDuty, etc. | Point-in-time |

---

## Vulnerability Management Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Vulnerability scan results | Scan reports showing open vulnerabilities and remediation status | Snyk, Dependabot, Qualys | Weekly scans |
| Patching SLA compliance | Evidence that critical vulns patched within SLA | Ticket timestamps vs. disclosure date | Per vulnerability |
| Penetration test | Pentest report + remediation evidence for findings | External pentest firm | Annual |
| Dependency scanning | CI/CD integration showing dep scanning runs on each build | GitHub Actions, GitLab CI | Per build |

**Common finding**: No formal patching SLAs; pentest report without remediation evidence.

---

## Logging & Monitoring Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Log retention | Evidence logs are retained for required period | CloudWatch, Datadog retention settings | Point-in-time |
| Alert rules | Configured alert rules for key events (failed logins, privilege escalation) | Monitoring tool screenshot | Point-in-time |
| Alert review | Evidence that alerts are reviewed (acknowledgement logs, tickets) | Ticketing system | Ongoing |
| Log immutability | Evidence logs cannot be modified by regular users | IAM policies, CloudTrail config | Point-in-time |

---

## Business Continuity Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Backup configuration | Screenshots showing backup schedule, retention, and storage location | AWS S3, GCS, backup tool | Point-in-time |
| Backup restore test | Evidence that backups were successfully restored | Test record with date, tester, result | Annual minimum |
| DR test | DR exercise documentation showing RTO/RPO validated | Test runbook + results | Annual |
| Uptime metrics | System availability metrics for audit period | Monitoring dashboard export | Full audit period |

**Common finding**: Backups configured but never tested for restorability.

---

## Vendor Management Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Vendor inventory | List of all vendors with tier classification | Spreadsheet or GRC tool | Maintained |
| Security assessments | Completed security questionnaires or SOC 2 reports for critical vendors | Vendor-provided documents | Annual |
| DPA agreements | Signed DPAs with vendors processing personal data | Contract repository | Per vendor |
| Vendor review | Evidence of annual critical vendor re-assessment | Email trail, meeting notes | Annual |

---

## HR & Training Evidence

| Control | Evidence Expected | Source | Frequency |
|---------|-----------------|--------|-----------|
| Security training completion | Training completion records for all employees | LMS export (BambooHR, Rippling, Trainual) | Annual |
| Background checks | Evidence checks are run for new hires | HR system records | Per hire |
| Policy acknowledgements | Signed acknowledgement of security policies | DocuSign, HR system | Annual + at hire |
| Offboarding records | Evidence access revoked and equipment returned at offboarding | HR/IT tickets | Per departure |

---

## Evidence Collection Timing

For SOC 2 Type II with a 12-month audit period:
- Start collecting evidence from **day 1** of the audit period
- Quarterly evidence (access reviews) must have records for all 4 quarters
- Annual evidence (pentest, DR test) must occur within the audit period
- Point-in-time evidence collected at audit fieldwork start

**Auditor expectation**: Evidence is organized and retrievable within 24–48 hours of request. Maintain a shared evidence folder (Google Drive, SharePoint) organized by control area.

## Session State

After each working session, save progress to `.compliance/status.md`:

```
## Compliance Session Status
- Frameworks: [SOC2 / ISO27001]
- Policies generated: X/17
- Control mapping: [complete/pending]
- Gap analysis: [complete/pending]
- Evidence plan: [complete/pending]
- Open questions: [list]
```

On next session start, read `.compliance/status.md` and resume from where left off.
