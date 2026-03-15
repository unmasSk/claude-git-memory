---
title: Migration Patterns
description: Core database migration patterns with implementation guidance
tags: migrations, expand-contract, dual-write, CDC, strangler-fig
---

# Migration Patterns

## Expand-Contract (Default Pattern for Schema Changes)

Three-phase approach for zero-downtime schema evolution.

**Phase 1 — Expand:** Add new schema elements alongside existing ones.
```sql
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);
CREATE INDEX CONCURRENTLY idx_users_email_address ON users(email_address);  -- PostgreSQL
```

**Phase 2 — Dual Write:** Application writes to both old and new columns.
```python
def update_email(user_id, new_email):
    user.email = new_email          # old column
    user.email_address = new_email  # new column
    user.save()
```

**Phase 3 — Backfill:** Update rows written before dual-write started.
```sql
UPDATE users
SET email_address = email
WHERE email_address IS NULL
  AND id BETWEEN ? AND ?;  -- batch by id range
```

**Phase 4 — Switch Reads:** Read from new column, fall back to old.
```python
return user.email_address or user.email
```

**Phase 5 — Contract:** Drop old column after validation window.
```sql
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_address TO email;
```

**Trade-offs:** Increased storage during transition, extended timeline. Safe rollback at any phase.

## Parallel Schema Pattern

Run new and old schemas simultaneously, routing traffic by feature flag.

```python
class DatabaseRouter:
    def route_query(self, user_id, query_type):
        if self.feature_flags.is_enabled("new_schema", user_id):
            return self.new_db.execute(query_type)
        return self.old_db.execute(query_type)

    def dual_write(self, data):
        success_old = self.old_db.write(data)
        success_new = self.new_db.write(transform_data(data))
        if not (success_old and success_new):
            self.handle_dual_write_failure(data, success_old, success_new)
```

Use when: major restructuring where expand-contract would produce excessive complexity.

## Dual Write

Write to both source and target systems during migration. Use compensation patterns for write failures. Requires reconciliation to detect drift.

## Change Data Capture (CDC)

Stream database changes to the target system via binlog/WAL consumers (Debezium, Kafka Connect). Enables zero-downtime migrations for large datasets.

```python
class CDCProcessor:
    def process_changes(self):
        for message in self.kafka_consumer:
            change = json.loads(message.value)
            if change['operation'] == 'INSERT':
                self.target_db.insert(change['table'], self.transform(change['after']))
            elif change['operation'] == 'UPDATE':
                self.target_db.update(change['table'], change['key'], self.transform(change['after']))
            elif change['operation'] == 'DELETE':
                self.target_db.delete(change['table'], change['key'])
```

## Strangler Fig (Service Migration)

Gradually replace legacy functionality by intercepting calls and routing to new services.

```python
class StranglerProxy:
    def handle_request(self, request):
        user_id = request.get('user_id')
        if self.feature_flags.is_enabled("new_user_service", user_id):
            if self.feature_flags.is_enabled("dual_write", user_id):
                return self.handle_with_both(request)
            return self.handle_with_new(request)
        return self.handle_with_legacy(request)
```

## Pattern Selection

| Migration Type | Complexity | Downtime Tolerance | Pattern |
|---------------|------------|-------------------|---------|
| Schema column change | Low | Zero | Expand-Contract |
| Schema restructuring | High | Zero | Parallel Schema |
| Service replacement | Medium | Zero | Strangler Fig |
| Large dataset move | High | Zero | CDC |
| Service update | Low | Zero | Blue-Green |

## Anti-Patterns

- **Big Bang:** All-or-nothing migration. High failure risk, difficult rollback.
- **No Rollback Plan:** Never migrate without tested rollback for each phase.
- **Insufficient Validation:** Validate data consistency at each checkpoint.
