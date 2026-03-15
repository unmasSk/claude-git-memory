---
title: Index Strategy Patterns
description: Index types, composite design, common anti-patterns, and maintenance
tags: indexes, B-tree, composite, partial, covering, functional
---

# Index Strategy Patterns

## Index Types

### B-Tree (Default)
Use for: equality, range queries, sorting, `LIKE 'prefix%'`.
- O(log n) lookup.
- Supports prefix matching on composite indexes.
- Most versatile type — default choice.

```sql
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
```

### Hash
Use for: exact equality lookups only. Cannot support range queries or sorting.

```sql
-- PostgreSQL: hash index for exact lookups
CREATE INDEX idx_users_id_hash ON users USING HASH (user_id);
```

### Partial
Use for: filtering on a subset of data. Smaller, faster to maintain, more focused.

```sql
-- Index only active users
CREATE INDEX idx_active_users_email ON users (email) WHERE status = 'active';

-- Index non-null values only
CREATE INDEX idx_customers_phone ON customers (phone_number) WHERE phone_number IS NOT NULL;

-- Index recent data only
CREATE INDEX idx_recent_orders ON orders (customer_id, created_at)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';
```

### Covering
Include all columns a query needs to avoid table lookups (`Using index` in MySQL EXPLAIN, index-only scan in PostgreSQL).

```sql
-- PostgreSQL INCLUDE clause
CREATE INDEX idx_orders_customer_covering ON orders (customer_id, order_date)
  INCLUDE (order_total, status);

-- MySQL: add selected columns to the index directly
CREATE INDEX idx_orders_cover ON orders (customer_id, status, order_total);
```

### Functional / Expression
Use for: queries on transformed column values.

```sql
-- Case-insensitive email search
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- JSON path indexing (PostgreSQL)
CREATE INDEX idx_users_preferences_theme ON users ((preferences->>'theme'));
```

---

## Composite Index Design

### Column Ordering: Equality First, Then Range/Sort

```sql
-- Query: WHERE tenant_id = ? AND status = ? AND created_at > ?
-- Order: equality columns first (tenant_id, status), then range (created_at)
CREATE INDEX idx_orders ON orders (tenant_id, status, created_at);
```

Within equality columns: higher-cardinality (more selective) columns first, but query patterns and frequency usually matter more than pure selectivity.

Range predicates stop index usage for subsequent filter columns, but subsequent columns can still serve as covering columns or support `ORDER BY` in some cases.

### Sort Order Must Match Query

```sql
-- Index: (status ASC, created_at DESC)
-- Must match ORDER BY direction exactly for index scan; mixed directions may require filesort
CREATE INDEX idx_orders_status_created ON orders (status ASC, created_at DESC);  -- MySQL 8.0+
```

### Design for Multiple Queries

```sql
-- One index covers: WHERE user_id=?, WHERE user_id=? AND status=?,
-- and WHERE user_id=? AND status=? ORDER BY created_at DESC
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at DESC);
```

---

## Selectivity Analysis

```sql
-- Estimate column selectivity (higher = more selective)
SELECT
    COUNT(DISTINCT status)::float / COUNT(*) AS status_selectivity,
    COUNT(DISTINCT city)::float / COUNT(*) AS city_selectivity
FROM users;
```

---

## Performance Anti-Patterns

### Over-Indexing
```sql
-- BAD: redundant indexes
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
-- idx_orders_customer is redundant (prefix of idx_orders_customer_date)

-- GOOD: keep only the most complete one
CREATE INDEX idx_orders_customer_date_status ON orders (customer_id, order_date, status);
```

### Wrong Column Order
```sql
-- Query: WHERE active = true AND user_type = 'premium' AND city = 'Chicago'
-- BAD: boolean (lowest selectivity) first
CREATE INDEX idx_users_active_type_city ON users (active, user_type, city);

-- GOOD: most selective first
CREATE INDEX idx_users_city_type_active ON users (city, user_type, active);
```

### Function on Indexed Column (No Functional Index)
```sql
-- BAD: LOWER() prevents index use on email
WHERE LOWER(email) = 'john@example.com'

-- GOOD: functional index matches the query
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
```

### Trailing Wildcard Without Index
```sql
-- BAD: leading wildcard cannot use B-Tree index
WHERE name LIKE '%smith'

-- GOOD: prefix match uses index
WHERE name LIKE 'smith%'
```

---

## Monitoring and Maintenance

### Find Unused Indexes (PostgreSQL)
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### Find Large Indexes (PostgreSQL)
```sql
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

### Find Sequential Scans on Large Tables (PostgreSQL)
```sql
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND seq_tup_read > 100000
ORDER BY seq_tup_read DESC;
```

### MySQL: Unused Indexes
```sql
SELECT object_schema, object_name, index_name, COUNT_READ, COUNT_WRITE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'mydb' AND index_name != 'PRIMARY' AND COUNT_READ = 0
ORDER BY COUNT_WRITE DESC;
```

### Index Write Overhead
Every index adds writes on INSERT, UPDATE (for indexed columns), and DELETE. Keep index count lean: 1–5 per table is typical; 6+ warrants an audit.

### Guidelines

- Validate index usage with EXPLAIN before and after adding indexes.
- Wait at least one full business cycle after restart before dropping MySQL indexes (counters reset on restart).
- Use invisible indexes (MySQL 8.0+) to test removal without dropping: `ALTER TABLE t ALTER INDEX idx INVISIBLE`.
- Update statistics after large data changes: `ANALYZE TABLE t` (MySQL) / `ANALYZE t` (PostgreSQL).
