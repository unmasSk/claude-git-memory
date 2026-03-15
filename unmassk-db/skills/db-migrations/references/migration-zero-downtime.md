---
title: Zero-Downtime Migration Techniques
description: Database-level techniques for schema and data changes without downtime
tags: migrations, zero-downtime, online-ddl, chunked-migration, expand-contract
---

# Zero-Downtime Migration Techniques

## Core Principles

1. **Backward compatibility:** Every change must be backward compatible until all clients migrate.
2. **Incremental changes:** Break large changes into smaller, independent steps with validation gates.
3. **Graceful degradation:** Systems must continue to function even when some components are transitioning.

## Online Schema Changes

### MySQL
```sql
-- INSTANT (metadata-only, MySQL 8.0+)
ALTER TABLE orders ADD COLUMN priority INT DEFAULT 1, ALGORITHM=INSTANT;

-- INPLACE (background rebuild, concurrent DML)
ALTER TABLE orders ADD INDEX idx_status (status), ALGORITHM=INPLACE, LOCK=NONE;

-- For large tables: use pt-online-schema-change or gh-ost
pt-online-schema-change \
  --alter "ADD COLUMN status VARCHAR(20) DEFAULT 'pending'" \
  --execute \
  D=mydb,t=orders
```

### PostgreSQL
```sql
-- Safe column addition
ALTER TABLE orders ADD COLUMN status_new VARCHAR(20) DEFAULT 'pending';

-- Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_orders_status_new ON orders(status_new);

-- Safe constraint (after data validation)
ALTER TABLE orders ADD CONSTRAINT check_status_new
  CHECK (status_new IN ('pending', 'processing', 'completed', 'cancelled'));
```

## Chunked Data Migration

Migrate data in batches to avoid long-running transactions and table locks.

```python
class DataMigrator:
    def __init__(self, source_table, target_table, chunk_size=1000):
        self.source_table = source_table
        self.target_table = target_table
        self.chunk_size = chunk_size

    def migrate_data(self):
        last_id = 0
        total_migrated = 0

        while True:
            chunk = self.get_chunk(last_id, self.chunk_size)
            if not chunk:
                break

            for record in chunk:
                transformed = self.transform_record(record)
                self.insert_or_update(transformed)

            last_id = chunk[-1]['id']
            total_migrated += len(chunk)
            time.sleep(0.1)  # avoid overwhelming the database
            self.log_progress(total_migrated)

        return total_migrated

    def get_chunk(self, last_id, limit):
        return db.execute(
            f"SELECT * FROM {self.source_table} WHERE id > %s ORDER BY id LIMIT %s",
            (last_id, limit)
        )
```

## Multi-Phase Schema Evolution (Expand-Contract)

### Phase 1: Expand
```sql
-- MySQL
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);

-- PostgreSQL
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);
CREATE INDEX CONCURRENTLY idx_users_email_address ON users(email_address);
```

### Phase 2: Dual Write (Application)
Write to both columns simultaneously. Deploy before backfill.

### Phase 3: Backfill
```sql
-- Run in batches
UPDATE users
SET email_address = email
WHERE email_address IS NULL
  AND id BETWEEN ? AND ?;
```

### Phase 4: Switch Reads
Read new column, fall back to old until confident.

### Phase 5: Contract
After validation window, remove the old column.
```sql
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_address TO email;
```

## Rollback Strategies

### Schema Rollback
```sql
-- Maintain rollback scripts for each migration step
-- Example: undo adding a column
ALTER TABLE users DROP COLUMN email_address;
```

### Data Rollback with Point-in-Time Recovery
```sql
-- PostgreSQL: create restore point before migration
SELECT pg_create_restore_point('pre_migration_' || to_char(now(), 'YYYYMMDD_HH24MISS'));
```

```python
class DataRollbackManager:
    async def create_rollback_point(self, migration_id):
        backup_path = await self.backup.create_backup(
            f"pre_migration_{migration_id}_{int(time.time())}"
        )
        schema_snapshot = await self.capture_schema_snapshot()
        await self.store_rollback_metadata({
            'migration_id': migration_id,
            'timestamp': datetime.utcnow(),
            'backup_location': backup_path,
            'schema_snapshot': schema_snapshot,
        })
```

## Pre-Migration Checklist

- [ ] Backup strategy in place and tested
- [ ] Rollback procedures tested in staging
- [ ] Monitoring and alerting configured for migration metrics
- [ ] Each phase has defined success criteria
- [ ] Estimated time per phase documented
- [ ] Dependent services notified

## During Migration

- Validate data consistency at each checkpoint before proceeding.
- Monitor lag, error rate, and throughput continuously.
- Keep detailed logs of all actions taken.
- Have rollback trigger criteria defined in advance.

## Post-Migration

- Continue monitoring for 24–48 hours after completion.
- Run final data reconciliation to confirm consistency.
- Remove temporary tables, indexes, and dual-write code.
- Update runbooks and documentation.
