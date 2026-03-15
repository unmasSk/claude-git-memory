# Indexing Best Practices

## Core Rules

1. Always index foreign key columns -- PostgreSQL does not auto-create these
2. Index columns in WHERE, JOIN, and ORDER BY clauses
3. Do not over-index -- each index slows writes and uses storage
4. Verify with EXPLAIN ANALYZE -- confirm indexes are actually used

## Composite Indexes

Put equality columns first, then range/sort columns:

```sql
-- WHERE status = 'active' AND created_at > '2026-01-01'
CREATE INDEX order_status_created_idx ON order_item (status, created_at);
```

A composite index on `(a, b)` supports queries on `a + b` and `a` alone, but not `b` alone.

## Partial Indexes

Reduce index size by filtering to common query patterns. Use only when index size is problematic but the index is needed for performance.

```sql
CREATE INDEX order_active_idx ON order_item (customer_id)
  WHERE status = 'active';
```

## Covering Indexes

Create covering indexes for query patterns that return a small number of columns:

```sql
CREATE INDEX ON order_item (customer_id) INCLUDE (status, created_at);
```

## Index Types

| Type | Use Case | Example |
|------|----------|---------|
| B-tree (default) | Equality, range, sorting | `WHERE id = 1`, `ORDER BY date` |
| GIN | Arrays, JSONB, full-text | `WHERE tags @> ARRAY['x']` |
| GiST | Geometric, range types, full-text | PostGIS, `tsrange`, `tsvector` |
| BRIN | Large sequential/time-series | Append-only logs, events (requires physical row order correlation) |

```sql
CREATE INDEX metadata_idx ON order_item USING GIN (metadata);        -- JSONB
CREATE INDEX event_created_idx ON event USING BRIN (created_at);     -- time-series
```

## Guidelines

- Name indexes consistently: `{table}_{column}_idx`
- Review for unused indexes periodically
- Confirm with a human before removing or dropping any indexes -- even unused ones may serve a purpose not reflected in recent stats
- Use partial indexes for frequently filtered subsets
- Use covering indexes on hot read paths
