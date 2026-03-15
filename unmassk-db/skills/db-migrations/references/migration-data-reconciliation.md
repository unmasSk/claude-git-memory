---
title: Data Reconciliation Strategies
description: Detecting, measuring, and correcting data discrepancies during migrations
tags: migrations, reconciliation, data-consistency, validation, delta-detection
---

# Data Reconciliation

## Core Principles

- **Idempotent operations:** All reconciliation must be safe to run multiple times.
- **Audit trail:** Log all reconciliation actions for compliance and debugging.
- **Non-destructive:** Prefer addition over deletion. Always backup before corrections.
- **Eventual consistency:** Accept that perfect real-time consistency may not be achievable during active migrations.

## Types of Inconsistencies

| Type | Description |
|------|-------------|
| Missing records | Exist in source, not in target |
| Extra records | Exist in target, not in source |
| Field mismatches | Same record, different field values |
| Referential integrity violations | FK relationships broken during migration |
| Temporal inconsistencies | Incorrect timestamps or ordering |
| Schema drift | Structural differences between source and target |

## Row Count Validation

```sql
-- Compare total row counts
SELECT 'source' AS system, COUNT(*) AS row_count FROM source_table
UNION ALL
SELECT 'target' AS system, COUNT(*) AS row_count FROM target_table;

-- Compare with conditions
SELECT
    (SELECT COUNT(*) FROM source_table WHERE status = 'active') AS source_active,
    (SELECT COUNT(*) FROM target_table WHERE status = 'active') AS target_active;
```

## Delta Detection

```sql
-- Find records missing in target
SELECT 'missing_in_target' AS issue_type, source_id
FROM source_table s
WHERE NOT EXISTS (
    SELECT 1 FROM target_table t WHERE t.id = s.id
)
UNION ALL
-- Find extra records in target
SELECT 'extra_in_target' AS issue_type, target_id
FROM target_table t
WHERE NOT EXISTS (
    SELECT 1 FROM source_table s WHERE s.id = t.id
);
```

## Checksum Validation

```sql
-- Compare row checksums for specific columns
SELECT
    id,
    MD5(CONCAT(COALESCE(field1,''), '|', COALESCE(field2,''), '|', COALESCE(field3,''))) AS checksum
FROM source_table
WHERE id IN (SELECT id FROM target_table);
```

## Field-Level Mismatch Detection

```sql
-- Find rows where field values differ
SELECT s.id, s.field1 AS source_value, t.field1 AS target_value
FROM source_table s
JOIN target_table t ON s.id = t.id
WHERE s.field1 != t.field1
   OR (s.field1 IS NULL AND t.field1 IS NOT NULL)
   OR (s.field1 IS NOT NULL AND t.field1 IS NULL);
```

## Automated Reconciliation Pipeline

```python
class DataReconciler:
    def run_reconciliation(self, source_table, target_table):
        results = {
            'row_count_delta': self.check_row_counts(source_table, target_table),
            'missing_records': self.find_missing_records(source_table, target_table),
            'extra_records': self.find_extra_records(source_table, target_table),
            'field_mismatches': self.find_field_mismatches(source_table, target_table),
        }
        self.log_reconciliation_results(results)
        return results

    def check_row_counts(self, source, target):
        source_count = self.source_db.count(source)
        target_count = self.target_db.count(target)
        delta = abs(source_count - target_count)
        pct = (delta / source_count * 100) if source_count else 0
        return {'source': source_count, 'target': target_count, 'delta': delta, 'pct': pct}

    def find_missing_records(self, source, target):
        return self.source_db.execute(f"""
            SELECT s.id FROM {source} s
            WHERE NOT EXISTS (SELECT 1 FROM {target} t WHERE t.id = s.id)
            LIMIT 1000
        """)
```

## Automated Correction

```python
class DataCorrector:
    def correct_missing_records(self, missing_ids, source_table, target_table):
        """Re-insert records missing from target. Idempotent via INSERT IGNORE / ON CONFLICT."""
        for batch in self.chunk(missing_ids, 100):
            records = self.source_db.fetch_by_ids(source_table, batch)
            self.target_db.upsert(target_table, records)
            self.audit_log.record('insert', batch)

    def correct_field_mismatches(self, mismatches, target_table):
        """Update fields that differ. Log before/after for audit."""
        for mismatch in mismatches:
            before = self.target_db.fetch_by_id(target_table, mismatch['id'])
            self.target_db.update(target_table, mismatch['id'], mismatch['source_values'])
            self.audit_log.record('update', mismatch['id'], before, mismatch['source_values'])
```

## Validation Thresholds

Set alerting thresholds before migration starts:

| Metric | Warning | Critical |
|--------|---------|----------|
| Row count delta | >0.1% | >1% |
| Missing records | >10 | >100 |
| Field mismatches | >0.01% | >0.1% |
| Checksum failures | >0 | >10 |

## Reconciliation Schedule

| Phase | When to run |
|-------|------------|
| Pre-migration | Baseline before any changes |
| After dual-write deploy | Confirm writes are going to both systems |
| After backfill | Verify all historical data migrated |
| After read switch | Confirm reads returning correct data |
| Post-migration (24h) | Final consistency check |
| Post-migration (7d) | Confirm no drift after full traffic |

## Common Pitfalls

- **Soft deletes:** Ensure both systems use the same deleted_at filtering or reconciliation produces false positives.
- **Timezone mismatches:** Normalize timestamps before comparing.
- **Floating point:** Use exact types or tolerance-based comparison for numeric fields.
- **NULL vs empty string:** Treat consistently across systems.
- **Clock skew:** Accounts for records created in source during migration window — use a cutoff timestamp.
