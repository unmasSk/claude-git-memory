# PostgreSQL Table Design

## Core Rules

- Define a PRIMARY KEY for reference tables (users, orders, etc.). Not always needed for time-series/event/log data. When used, prefer `BIGINT GENERATED ALWAYS AS IDENTITY`; use `UUID` only when global uniqueness or opacity is needed.
- Normalize first (to 3NF) to eliminate data redundancy and update anomalies; denormalize only for measured, high-ROI reads where join performance is proven problematic.
- Add `NOT NULL` everywhere it is semantically required; use `DEFAULT`s for common values.
- Create indexes for access paths you actually query: PK/unique (auto), FK columns (manual), frequent filters/sorts, and join keys.
- Prefer `TIMESTAMPTZ` for event time; `NUMERIC` for money; `TEXT` for strings; `BIGINT` for integer values; `DOUBLE PRECISION` for floats (or `NUMERIC` for exact decimal arithmetic).

## PostgreSQL Gotchas

- **Identifiers**: unquoted are lowercased. Avoid quoted or mixed-case names. Convention: `snake_case` for table/column names.
- **Unique + NULLs**: UNIQUE allows multiple NULLs. Use `UNIQUE (...) NULLS NOT DISTINCT` (PG15+) to restrict to one NULL.
- **FK indexes**: PostgreSQL does not auto-index FK columns. Add them manually.
- **No silent coercions**: length/precision overflows error out (no truncation). Inserting 999 into `NUMERIC(2,0)` fails -- unlike databases that silently truncate.
- **Sequences/identity have gaps** (normal; do not attempt to fix). Rollbacks, crashes, and concurrent transactions create gaps (1, 2, 5, 6...). This is expected behavior.
- **Heap storage**: no clustered PK by default; `CLUSTER` is a one-off reorganization, not maintained on subsequent inserts.
- **MVCC**: updates/deletes leave dead tuples; vacuum handles them. Design to avoid hot wide-row churn.

## Data Types

- **IDs**: `BIGINT GENERATED ALWAYS AS IDENTITY` preferred; `UUID` when merging, federating, or requiring opaque IDs. Generate with `uuidv7()` (PG18+) or `gen_random_uuid()` on older versions.
- **Integers**: prefer `BIGINT` unless storage is critical; `INTEGER` for smaller ranges; avoid `SMALLINT` unless constrained.
- **Floats**: prefer `DOUBLE PRECISION` over `REAL`. Use `NUMERIC` for exact decimal arithmetic.
- **Strings**: prefer `TEXT`; if length limits are needed, use `CHECK (LENGTH(col) <= n)` instead of `VARCHAR(n)`; avoid `CHAR(n)`. Use `BYTEA` for binary data. Large strings/binary (>2KB default threshold) are automatically stored in TOAST with compression. Control strategy with `ALTER TABLE tbl ALTER COLUMN col SET STORAGE strategy`.
- **Money**: `NUMERIC(p,s)` -- never float.
- **Time**: `TIMESTAMPTZ` for timestamps; `DATE` for date-only; `INTERVAL` for durations. Avoid `TIMESTAMP` without timezone. Use `now()` for transaction start time, `clock_timestamp()` for current wall-clock time.
- **Booleans**: `BOOLEAN NOT NULL` unless tri-state values are required.
- **Enums**: `CREATE TYPE ... AS ENUM` for small, stable sets (e.g., US states, days of week). For business-logic-driven and evolving values (e.g., order statuses) use `TEXT` + CHECK or a lookup table.
- **Arrays**: `TEXT[]`, `INTEGER[]`, etc. Index with GIN for containment (`@>`, `<@`) and overlap (`&&`) queries. Good for tags; avoid for relations -- use junction tables instead.
- **Range types**: `daterange`, `numrange`, `tstzrange`. Support overlap (`&&`), containment (`@>`). Index with GiST. Good for scheduling, versioning, numeric ranges. Prefer `[)` (inclusive/exclusive) bounds by default.
- **Network types**: `INET` for IP addresses, `CIDR` for network ranges, `MACADDR` for MAC addresses.
- **Geometric types**: avoid built-in `POINT`, `LINE`, `POLYGON`, `CIRCLE`. Use PostGIS for spatial features.
- **Text search**: `TSVECTOR` for full-text search documents, `TSQUERY` for search queries. Index `tsvector` with GIN. Always specify language: `to_tsvector('english', col)`. Never use single-argument versions.
- **Domain types**: `CREATE DOMAIN email AS TEXT CHECK (VALUE ~ '^[^@]+@[^@]+$')` for reusable custom types with validation.
- **JSONB**: preferred over JSON; index with GIN. Use only for optional or semi-structured attributes. Use JSON only if original ordering of contents must be preserved.
- **Vector types**: `vector` type provided by pgvector for vector similarity search.

### Do Not Use

- `timestamp` (without time zone) -- use `timestamptz`
- `char(n)` or `varchar(n)` -- use `text`
- `money` type -- use `numeric`
- `timetz` type -- use `timestamptz`
- `timestamptz(0)` or any precision specification -- use `timestamptz`
- `serial` type -- use `generated always as identity`
- `POINT`, `LINE`, `POLYGON`, `CIRCLE` built-in types -- use PostGIS `geometry`

## Table Types

- **Regular**: default; fully durable, logged.
- **TEMPORARY**: session-scoped, auto-dropped, not logged. Faster for scratch work.
- **UNLOGGED**: persistent but not crash-safe. Faster writes; good for caches and staging.

## Row-Level Security

```sql
ALTER TABLE tbl ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_access ON orders FOR SELECT TO app_users USING (user_id = current_user_id());
```

## Constraints

- **PK**: implicit UNIQUE + NOT NULL; creates a B-tree index.
- **FK**: specify `ON DELETE/UPDATE` action (`CASCADE`, `RESTRICT`, `SET NULL`, `SET DEFAULT`). Add explicit index on referencing column. Use `DEFERRABLE INITIALLY DEFERRED` for circular FK dependencies checked at transaction end.
- **UNIQUE**: creates a B-tree index; allows multiple NULLs unless `NULLS NOT DISTINCT` (PG15+). Prefer `NULLS NOT DISTINCT` unless duplicate NULLs are needed.
- **CHECK**: row-local constraints; NULL values pass the check (three-valued logic). Combine with `NOT NULL` to enforce fully.
- **EXCLUDE**: prevents overlapping values. `EXCLUDE USING gist (room_id WITH =, booking_period WITH &&)` prevents double-booking rooms.

## Indexing

- **B-tree**: default for equality/range queries (`=`, `<`, `>`, `BETWEEN`, `ORDER BY`)
- **Composite**: order matters -- index used if equality on leftmost prefix. Put most selective/frequently filtered columns first.
- **Covering**: `CREATE INDEX ON tbl (id) INCLUDE (name, email)` enables index-only scans without visiting the table.
- **Partial**: for hot subsets (`CREATE INDEX ON tbl (user_id) WHERE status = 'active'`).
- **Expression**: `CREATE INDEX ON tbl (LOWER(email))`. Expression must match exactly in WHERE clause.
- **GIN**: JSONB containment/existence, arrays (`@>`, `?`), full-text search (`@@`)
- **GiST**: ranges, geometry, exclusion constraints
- **BRIN**: very large, naturally ordered data (time-series) -- minimal storage overhead. Effective when row order on disk correlates with indexed column.

## Partitioning

- Use for very large tables (>100M rows) where queries consistently filter on partition key (often time/date).
- Also use when data maintenance requires bulk pruning or periodic replacement.
- **RANGE**: `PARTITION BY RANGE (created_at)`. Common for time-series. TimescaleDB automates time-based partitioning.
- **LIST**: `PARTITION BY LIST (region)`. For discrete values.
- **HASH**: `PARTITION BY HASH (user_id)`. For even distribution when no natural key.
- **Limitations**: no global UNIQUE constraints -- include partition key in PK/UNIQUE. FKs from partitioned tables not supported; use triggers.
- Prefer declarative partitioning or hypertables. Do NOT use table inheritance.

## Update-Heavy Tables

- Separate hot/cold columns -- put frequently updated columns in a separate table to minimize bloat.
- Use `fillfactor=90` to leave space for HOT updates that avoid index maintenance.
- Avoid updating indexed columns -- prevents beneficial HOT updates.

## Insert-Heavy Workloads

- Minimize indexes -- every index slows inserts.
- Use `COPY` or multi-row `INSERT` instead of single-row inserts.
- Use UNLOGGED tables for rebuildable staging data.
- Defer index creation for bulk loads: drop index, load data, recreate indexes.
- If a surrogate key is needed, prefer `BIGINT GENERATED ALWAYS AS IDENTITY` over `UUID`.

## Upsert-Friendly Design

- Requires UNIQUE index on conflict target columns -- `ON CONFLICT (col1, col2)` needs exact matching unique index. Partial indexes do not work.
- Use `EXCLUDED.column` to reference would-be-inserted values; only update columns that actually changed.
- `DO NOTHING` is faster than `DO UPDATE` when no actual update is needed.

## Safe Schema Evolution

- **Transactional DDL**: most DDL can run in transactions and be rolled back.
- **Concurrent index creation**: `CREATE INDEX CONCURRENTLY` avoids blocking writes but cannot run in transactions.
- **Volatile defaults cause rewrites**: adding `NOT NULL` columns with volatile defaults (e.g., `now()`, `gen_random_uuid()`) rewrites the entire table. Non-volatile defaults are fast.

## Generated Columns

`... GENERATED ALWAYS AS (<expr>) STORED` for computed, indexable fields. PG18+ adds VIRTUAL columns (computed on read, not stored).

## JSONB Guidance

- Default GIN index: `CREATE INDEX ON tbl USING GIN (jsonb_col)` -- accelerates containment (`@>`), key existence (`?`, `?|`, `?&`), path containment.
- For heavy `@>` workloads only: `CREATE INDEX ON tbl USING GIN (jsonb_col jsonb_path_ops)` -- smaller/faster but loses key existence support.
- Equality/range on a specific scalar field: extract and index with B-tree via generated column.
- Keep core relations in tables; use JSONB for optional or variable attributes.
- Constrain allowed JSONB shapes: `config JSONB NOT NULL CHECK(jsonb_typeof(config) = 'object')`

## Examples

### Users

```sql
CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON users (LOWER(email));
CREATE INDEX ON users (created_at);
```

### Orders

```sql
CREATE TABLE orders (
  order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','CANCELED')),
  total NUMERIC(10,2) NOT NULL CHECK (total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON orders (user_id);
CREATE INDEX ON orders (created_at);
```

### JSONB

```sql
CREATE TABLE profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  attrs JSONB NOT NULL DEFAULT '{}',
  theme TEXT GENERATED ALWAYS AS (attrs->>'theme') STORED
);
CREATE INDEX profiles_attrs_gin ON profiles USING GIN (attrs);
```
