# PostgreSQL Hypertable Candidate Analysis

Identify tables that would benefit from TimescaleDB hypertable conversion. After identification, use postgres-timescaledb-migration.md for configuration and migration.

## TimescaleDB Benefits

Performance gains: 90%+ compression, fast time-based queries, improved insert performance, efficient aggregations, continuous aggregates for materialization (dashboards, reports, analytics), automatic data management (retention, compression).

Best for insert-heavy patterns:
- Time-series data (sensors, metrics, monitoring)
- Event logs (user events, audit trails, application logs)
- Transaction records (orders, payments, financial)
- Sequential data (auto-incrementing IDs with timestamps)
- Append-only datasets (immutable records, historical)

Requirements: large volumes (1M+ rows), time-based queries, infrequent updates.

## Step 1: Database Schema Analysis

### Option A: From Database Connection

#### Table statistics and size

```sql
WITH table_stats AS (
    SELECT
        schemaname, tablename,
        n_tup_ins as total_inserts,
        n_tup_upd as total_updates,
        n_tup_del as total_deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
    FROM pg_stat_user_tables
),
table_sizes AS (
    SELECT
        schemaname, tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes
    FROM pg_tables
    WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
)
SELECT
    ts.schemaname, ts.tablename, ts.live_rows,
    tsize.total_size, tsize.total_size_bytes,
    ts.total_inserts, ts.total_updates, ts.total_deletes,
    ROUND(CASE WHEN ts.live_rows > 0
          THEN (ts.total_inserts::float / ts.live_rows) * 100
          ELSE 0 END, 2) as insert_ratio_pct
FROM table_stats ts
JOIN table_sizes tsize ON ts.schemaname = tsize.schemaname AND ts.tablename = tsize.tablename
ORDER BY tsize.total_size_bytes DESC;
```

Look for: mostly insert-heavy patterns (few updates/deletes); big tables (1M+ rows or 100MB+).

#### Index patterns

```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY tablename, indexname;
```

Look for:
- Multiple indexes with timestamp/created_at columns -- time-based queries
- Composite (entity_id, timestamp) indexes -- good candidates
- Time-only indexes -- time range filtering common

#### Query patterns (if pg_stat_statements available)

```sql
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements');

SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%your_table_name%'
ORDER BY total_exec_time DESC LIMIT 20;
```

Good patterns: time-based WHERE, entity filtering combined with time-based qualifiers, GROUP BY time_bucket, range queries over time.
Poor patterns: non-time lookups with no time-based qualifiers in same query (WHERE email = ...).

#### Constraints

```sql
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'your_table_name'::regclass;
```

Compatibility:
- Primary keys (p): must include partition column or ask user if it can be modified
- Foreign keys (f): Plain-to-Hypertable and Hypertable-to-Plain OK; Hypertable-to-Hypertable NOT supported
- Unique constraints (u): must include partition column or ask user
- Check constraints (c): usually OK

### Option B: From Code Analysis

Good patterns:

```python
# Append-only logging
INSERT INTO events (user_id, event_time, data) VALUES (...);
# Time-series collection
INSERT INTO metrics (device_id, timestamp, value) VALUES (...);
# Time-based queries
SELECT * FROM metrics WHERE timestamp >= NOW() - INTERVAL '24 hours';
# Time aggregations
SELECT DATE_TRUNC('day', timestamp), COUNT(*) GROUP BY 1;
```

Poor patterns:

```python
# Frequent updates to historical records
UPDATE users SET email = ..., updated_at = NOW() WHERE id = ...;
# Non-time lookups
SELECT * FROM users WHERE email = ...;
# Small reference tables
SELECT * FROM countries ORDER BY name;
```

Schema indicators -- good:
- Has timestamp/timestamptz column
- Multiple indexes with timestamp-based columns
- Composite (entity_id, timestamp) indexes

Schema indicators -- poor:
- Mostly indexes with non-time-based columns (email, name, status, etc.)
- Columns expected to be updated over time (updated_at, status, etc.)
- Unique constraints on non-time fields
- Small static tables

#### Special Case: ID-Based Tables

Sequential ID tables can be candidates if:
- Insert-mostly pattern / updates are infrequent or only on recent records
- IDs correlate with time (auto-incrementing, GENERATED ALWAYS AS IDENTITY)
- ID is the primary query dimension
- Recent data accessed more often
- Time-based reporting common

```sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,           -- Can partition by ID
    user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW() -- For sparse indexes
);
```

For ID-based tables with a time column, partition by ID and use sparse indexes on the time column. See postgres-timescaledb-migration.md for details.

## Step 2: Candidacy Scoring (8+ points = good candidate)

### Time-Series Characteristics (5+ points needed)

- Has timestamp/timestamptz column: 3 points
- Data inserted chronologically: 2 points
- Queries filter by time: 2 points
- Time aggregations common: 2 points

### Scale and Performance (3+ points recommended)

- Large table (1M+ rows or 100MB+): 2 points
- High insert volume: 1 point
- Infrequent updates to historical: 1 point
- Range queries common: 1 point
- Aggregation queries: 2 points

### Data Patterns (bonus)

- Contains entity ID for segmentation (device_id, user_id, product_id, symbol, etc.): 1 point
- Numeric measurements: 1 point
- Log/event structure: 1 point

## Common Patterns

Good candidates:

Event/Log tables (user_events, audit_logs):

```sql
CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    event_type TEXT,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);
-- Partition by id, segment by user_id, enable minmax sparse_index on event_time
```

Sensor/IoT data (sensor_readings, telemetry):

```sql
CREATE TABLE sensor_readings (
    device_id TEXT,
    timestamp TIMESTAMPTZ,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);
-- Partition by timestamp, segment by device_id, minmax sparse indexes on temperature and humidity
```

Financial/Trading (stock_prices, transactions):

```sql
CREATE TABLE stock_prices (
    symbol VARCHAR(10),
    price_time TIMESTAMPTZ,
    open_price DECIMAL,
    close_price DECIMAL,
    volume BIGINT
);
-- Partition by price_time, segment by symbol, minmax sparse indexes on open_price, close_price, and volume
```

Poor candidates:

Reference tables (countries, categories) -- static data, no time component.

User profiles (users, accounts) -- accessed by ID, frequently updated; timestamp exists but is not the primary query dimension.

Settings/config (user_settings) -- accessed by user_id, frequently updated.

## Analysis Output Requirements

For each candidate table provide:

- **Score**: based on criteria (8+ = strong candidate)
- **Pattern**: insert vs update ratio
- **Access**: time-based vs entity lookups
- **Size**: current size and growth rate
- **Queries**: time-range, aggregations, point lookups

Focus on insert-heavy patterns with time-based or sequential access. Tables scoring 8+ points are strong candidates for conversion.
