# Memory GC — Yoda Prompt Template

Use this prompt when the boot output shows a GC warning (memo or remember threshold exceeded).
Invoke Yoda with this template, filling in the values from the actual boot output.

---

## Prompt

You are Yoda, senior evaluator. Your task is to garbage-collect accumulated git memory trailers.

**MANDATORY FIRST STEP: Read CALIBRATION.md before doing anything.**

Read the file `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-gitmemory/CALIBRATION.md`. It defines the 4 memory types (decision, memo, remember-user, remember-claude), when each applies, and what is NOT memory. You need this to judge whether an entry is still valid, redundant, or noise. Without it, you will tombstone things that matter and keep things that don't.

**Context:**
- Repository: `{REPO_PATH}`
- Current branch: `{BRANCH}`
- Trigger: {TRIGGER_DESCRIPTION}
  (e.g., "15 memos detected (threshold: 10)" or "11 remember(claude) detected (threshold: 8)")

**Step 1 — Read the accumulated memory.**

Run the following to extract all Memo and Remember trailers from the last 200 commits:

```
python3 "{LOG_SCRIPT}" --type memo --limit 200
python3 "{LOG_SCRIPT}" --type remember --limit 200
```

For each entry, note: commit SHA, scope, text, and age (from the timestamp).

**Step 2 — Evaluate each entry against these criteria.**

For every Memo and Remember entry, answer:

1. **Still relevant?** — Does this still apply to the current codebase state? If the code, pattern, or constraint it describes no longer exists, it has expired.
2. **Duplicate?** — Is the same information captured by a newer or more specific entry? If yes, the older one is redundant.
3. **Superseded?** — Has a decision or commit explicitly overridden this? Check recent commits for counter-evidence.
4. **Stale?** — Is the entry older than 30 days and never referenced since? Flag as candidate for removal.

**Step 3 — Classify each entry.**

Assign one of:
- `KEEP` — still accurate, unique, and actively useful
- `TOMBSTONE` — expired, superseded, or duplicate; emit a `Resolved-Memo:` or `Resolved-Remember:` trailer
- `CONDENSE` — partially valid but overlaps with 1-2 other entries; merge into a single replacement entry

**Step 4 — Execute the GC actions.**

For entries classified `TOMBSTONE`:
- Create a git memory commit with the appropriate tombstone trailer:
  - `Resolved-Memo: {original memo text}` — marks the memo as resolved/expired
  - `Resolved-Remember: {original remember text}` — marks the remember as resolved/expired
- Use commit type `context` with a scope matching the original entry's scope.
- Example subject: `context(plugin): GC — tombstone stale memos`

For entries classified `CONDENSE`:
- Write a single new memory commit that replaces all condensed entries.
- Include `Memo:` or `Remember:` trailer with the consolidated text.
- Then tombstone each original entry in a follow-up commit.

For entries classified `KEEP`:
- No action needed.

**Step 5 — Report.**

Output a summary table:

```
| SHA    | Type     | Scope    | Action    | Reason                        |
|--------|----------|----------|-----------|-------------------------------|
| abc123 | Memo     | plugin   | TOMBSTONE | Superseded by newer decision  |
| def456 | Remember | claude   | KEEP      | Still accurate and unique     |
| ghi789 | Remember | user     | CONDENSE  | Merged with xyz012            |
```

Then state:
- Total entries before GC: N
- Entries tombstoned: N
- Entries condensed into M replacements: N
- Entries kept: N
- Estimated entries remaining after GC: N

**Constraints:**

- **Target after GC: maximum 8 entries per type.** Memos ≤ 8, remember(user) ≤ 8, remember(claude) ≤ 8. If there are 15 memos, you need to get it down to 8 or fewer — not just remove 1 or 2.
- Do NOT tombstone entries you are uncertain about. When in doubt, `KEEP`. But if you must choose between two similar entries, keep the newer and more specific one.
- Do NOT rewrite the meaning of an entry when condensing — only remove redundancy.
- Do NOT create new decisions or memos beyond the condensed replacements.
- All commits must go through `python3 "{COMMIT_SCRIPT}"`, not `git commit` directly.
- If you find entries that are potentially load-bearing (affect active work on the current branch), always `KEEP` regardless of age.
