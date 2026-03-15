# Schema Design

## Primary Keys

Prefer `BIGINT GENERATED ALWAYS AS IDENTITY`. Avoid random UUIDs (UUIDv4) as primary keys; use `uuidv7()` when UUIDs are required.

```sql
CREATE TABLE user_account (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);
```

Random UUID PKs (v4) cause index fragmentation; UUIDs are larger (16 vs 8 bytes) and slow joins.

## Data Types

| Use | Avoid |
|-----|-------|
| `TEXT`, `VARCHAR` | Extension-specific types |
| `JSONB` | Custom ENUMs (use CHECK instead) |
| `TIMESTAMPTZ` | `TIMESTAMP` without time zone |
| `BIGINT`, `INTEGER` | Platform-specific types |

Prefer CHECK constraints over ENUM types -- they are easier to modify:

```sql
CREATE TABLE order_item (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered'))
);
```

## Foreign Keys

- Always index FK columns (PostgreSQL does not auto-create these)
- Avoid circular FK dependencies
- Specify `ON DELETE CASCADE` or `ON DELETE SET NULL` explicitly

```sql
CREATE TABLE order_item (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE
);
CREATE INDEX order_item_customer_id_idx ON order_item (customer_id);
```

## Naming Conventions

- Tables: singular snake_case (`user_account`, `order_item`)
- Columns: singular snake_case (`created_at`, `user_id`)
- Indexes: `{table}_{column}_idx`
- Constraints: `{table}_{column}_{type}` (e.g., `order_item_status_check`)

## General Guidelines

- Add `NOT NULL` to as many columns as possible
- Add `created_at TIMESTAMPTZ DEFAULT NOW()` to all tables
- Use `BIGINT` for all IDs and foreign keys, even on small tables
- Keep tables normalized; denormalize only for proven hot read paths
