# Prompt Template — Alexandria (Audit)

> Template for the orchestrator.

```markdown
## Task: Post-audit documentation for module [MODULE]

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Branch: `chore/audit-[MODULE]-[N]`
- Audit complete — Yoda approved with [XX/110]

### Changes made during the audit

[PASTE SUMMARY of all WIPs and accumulated changes — Alexandria needs this
to know what to document]

- Step 2: [what Ultron fixed]
- Step 3: [what golden tests Dante created]
- Step 5: [what findings Ultron fixed, splits if any]
- Step 9: [what adversarial tests Dante created]

### New or renamed files

[LIST of files created, renamed, or deleted during the audit]

### Final score
- Yoda: [XX/110] — [APPROVED / APPROVED WITH RESERVATIONS]
- Tests: [N] passing
- Coverage: [X]%
```
