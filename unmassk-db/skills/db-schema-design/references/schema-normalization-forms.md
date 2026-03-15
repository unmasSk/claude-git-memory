---
title: Normalization Forms and Data Modeling Patterns
description: Quick reference for normal forms, index patterns, and data modeling (star, snowflake, graph)
tags: normalization, data-modeling, star-schema, snowflake, graph
---

# Normalization Forms and Data Modeling Patterns

## Normal Forms Quick Reference

| Form | Core requirement |
|------|----------------|
| 1NF | Atomic values, no repeating groups |
| 2NF | 1NF + no partial dependencies on composite PKs |
| 3NF | 2NF + no transitive dependencies |
| BCNF | 3NF + every determinant is a candidate key |

See `schema-normalization-guide.md` for violations, examples, and fixes.

---

## Index Selection Algorithm

```
1. Identify WHERE clause columns
2. Equality columns first (most selective → least selective)
3. Range columns next
4. Include ORDER BY columns if possible after range
5. Evaluate covering index opportunity (INCLUDE clause or additional columns)
6. Check for existing overlapping indexes before creating new ones
```

### Composite Indexes

```sql
-- Query: WHERE status = 'active' AND created_date > '2023-01-01' ORDER BY priority DESC
CREATE INDEX idx_task_status_date_priority ON tasks (status, created_date, priority DESC);

-- Query: WHERE user_id = 123 AND category IN ('A', 'B') AND date_field BETWEEN ? AND ?
CREATE INDEX idx_user_category_date ON user_activities (user_id, category, date_field);
```

### Covering Indexes

```sql
-- Include columns to avoid table lookups
CREATE INDEX idx_user_email_covering ON users (email) INCLUDE (first_name, last_name, status);
-- SELECT first_name, last_name, status FROM users WHERE email = 'user@example.com' -- no table access
```

### Partial Indexes

```sql
-- Index only active users
CREATE INDEX idx_active_users_email ON users (email) WHERE status = 'active';

-- Index recent orders only
CREATE INDEX idx_recent_orders ON orders (customer_id, created_at)
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
```

---

## Data Modeling Patterns

### Star Schema (Data Warehousing)

Central fact table with dimension tables.

```sql
CREATE TABLE sales_facts (
    sale_id BIGINT PRIMARY KEY,
    product_id INT REFERENCES products(id),
    customer_id INT REFERENCES customers(id),
    date_id INT REFERENCES date_dimension(id),
    quantity INT,
    unit_price DECIMAL(8,2),
    total_amount DECIMAL(10,2)
);

CREATE TABLE date_dimension (
    id INT PRIMARY KEY, date_value DATE,
    year INT, quarter INT, month INT, day_of_week INT, is_weekend BOOLEAN
);
```

Use for: analytical queries, reporting, BI tools.

### Snowflake Schema

Normalized dimension tables (dimensions reference other dimensions).

```sql
CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(200), category_id INT REFERENCES product_categories(id));
CREATE TABLE product_categories (id INT PRIMARY KEY, name VARCHAR(100), parent_category_id INT REFERENCES product_categories(id));
```

Use for: analytics with complex dimension hierarchies.

### Adjacency List (Hierarchical Data)

```sql
CREATE TABLE categories (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    parent_id INT REFERENCES categories(id),
    path VARCHAR(500)  -- Materialized path: "/1/5/12/"
);
```

Use for: tree structures (categories, org charts, comment threads).

### Many-to-Many with Attributes

```sql
CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    from_entity_id UUID NOT NULL,
    to_entity_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX ON relationships (from_entity_id, relationship_type);
CREATE INDEX ON relationships (to_entity_id, relationship_type);
```

### Document Model (JSON Storage)

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    document_type VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index specific JSON paths via generated column (PostgreSQL)
CREATE INDEX ON documents USING GIN ((data->>'user_id'));

-- Or for a specific document_type (partial index)
CREATE INDEX ON documents ((data->>'status')) WHERE document_type = 'order';
```

---

## Connection Management and Read Replicas

```
-- Pool sizing: CPU cores × 2–10, tuned by monitoring actual usage
-- Route writes to primary; route non-critical reads to replicas
-- For consistent reads after a write: route to primary
```

---

## Caching Patterns

**Cache-Aside (most common):**
```python
def get_user(user_id):
    user = cache.get(f"user:{user_id}")
    if user is None:
        user = db.query("SELECT * FROM users WHERE id = %s", user_id)
        cache.set(f"user:{user_id}", user, ttl=3600)
    return user
```

**Invalidation strategies:** TTL-based, event-driven on data change, version-based, tag-based.
