# TimescaleDB Complete Setup

For insert-heavy data patterns where data is inserted but rarely changed:

- Time-series data (sensors, metrics, system monitoring)
- Event logs (user events, audit trails, application logs)
- Transaction records (orders, payments, financial transactions)
- Sequential data (records with auto-incrementing IDs and timestamps)
- Append-only datasets (immutable records, historical data)

## Step 1: Create Hypertable

```sql
CREATE TABLE your_table_name (
    timestamp TIMESTAMPTZ NOT NULL,
    entity_id TEXT NOT NULL,          -- device_id, user_id, symbol, etc.
    category TEXT,                    -- sensor_type, event_type, asset_class, etc.
    value_1 DOUBLE PRECISION,         -- price, temperature, latency, etc.
    value_2 DOUBLE PRECISION,         -- volume, humidity, throughput, etc.
    value_3 INTEGER,                  -- count, status, level, etc.
    metadata JSONB                    -- flexible additional data
) WITH (
    tsdb.hypertable,
    tsdb.partition_column='timestamp',
    tsdb.enable_columnstore=true,     -- Disable if table has vector columns
    tsdb.segmentby='entity_id',       -- See selection guide below
    tsdb.orderby='timestamp DESC',    -- See selection guide below
    tsdb.sparse_index='minmax(value_1),minmax(value_2),minmax(value_3)'
);
```

### Compression Decision

- Enable by default for insert-heavy patterns.
- Disable if table has vector type columns (pgvector) -- indexes on vector columns are incompatible with columnstore.

### Partition Column Selection

Must be time-based (TIMESTAMP/TIMESTAMPTZ/DATE) or integer (INT/BIGINT) with good temporal/sequential distribution.

Common patterns:

- TIME-SERIES: `timestamp`, `event_time`, `measured_at`
- EVENT LOGS: `event_time`, `created_at`, `logged_at`
- TRANSACTIONS: `created_at`, `transaction_time`, `processed_at`
- SEQUENTIAL: `id` (auto-increment when no timestamp), `sequence_number`
- APPEND-ONLY: `created_at`, `inserted_at`, `id`

Avoid: `updated_at` (breaks time ordering unless it is the primary query dimension).

### Segment_By Column Selection

Prefer a single column -- multi-column rarely optimal. Multi-column only works for highly correlated columns with sufficient row density.

Requirements:
- Frequently used in WHERE clauses
- Good row density (>100 rows per value per chunk)
- Primary logical partition/grouping

Examples:
- IoT: `device_id`
- Finance: `symbol`
- Metrics: `service_name`, or `metric_name, metric_type` (if sufficient row density)
- Analytics: `user_id` if sufficient row density, otherwise `session_id`

Row density guidelines:
- Target: >100 rows per segment_by value within each chunk
- Poor: <10 rows per segment_by value per chunk -- choose less granular column
- Low-density columns: prepend to order_by column list instead

Avoid: timestamps, unique IDs, low-density columns, columns rarely used in filtering.

### Order_By Column Selection

Creates natural time-series progression when combined with segment_by for optimal compression.

Most common: `timestamp DESC`

Examples:
- IoT/Finance/E-commerce: `timestamp DESC`
- Metrics: `metric_name, timestamp DESC` (if metric_name has too low density for segment_by)
- Analytics: `user_id, timestamp DESC` (user_id has too low density for segment_by)

Low-density column handling: If a column has <100 rows per chunk (too low for segment_by), prepend it to order_by. Example: `metric_name` has 20 rows/chunk -- use `segment_by='service_name'`, `order_by='metric_name, timestamp DESC'`.

Avoid in order_by: random columns, columns with high variance between adjacent rows.

### Compression Sparse Index Selection

Sparse indexes enable query filtering on compressed data without decompression. They store metadata per batch (~1000 rows) to eliminate batches that do not match query predicates.

Types:
- **minmax**: min/max values per batch -- for range queries (`>`, `<`, `BETWEEN`) on numeric/temporal columns

Use minmax for:
- Outlier detection (temperature > 90)
- Fields highly correlated with segmentby and orderby columns

Never index columns in segmentby or orderby. Orderby columns always have minmax indexes without any configuration.

```sql
ALTER TABLE table_name SET (
    timescaledb.sparse_index = 'minmax(value_1),minmax(value_2)'
);
```

Explicit configuration available since v2.22.0.

### Chunk Time Interval (Optional)

Default: 7 days. Adjust based on volume:

- High frequency: 1 hour - 1 day
- Medium: 1 day - 1 week
- Low: 1 week - 1 month

```sql
SELECT set_chunk_time_interval('your_table_name', INTERVAL '1 day');
```

Good test: recent chunk indexes should fit in less than 25% of RAM.

### Indexes and Primary Keys

Common index pattern -- composite on entity and timestamp:

```sql
CREATE INDEX idx_entity_timestamp ON your_table_name (entity_id, timestamp DESC);
```

Primary key rules: must include partition column.

Option 1: Composite PK with partition column:

```sql
ALTER TABLE your_table_name ADD PRIMARY KEY (entity_id, timestamp);
```

Option 2: Single-column PK (only if it is the partition column):

```sql
CREATE TABLE ... (id BIGINT PRIMARY KEY, ...) WITH (tsdb.partition_column='id');
```

Option 3: No PK -- strict uniqueness is often not required for insert-heavy patterns.

## Step 2: Compression Policy (Optional)

If you used `tsdb.enable_columnstore=true` in Step 1, starting with TimescaleDB 2.23 a columnstore policy is automatically created with `after => INTERVAL '7 days'`. Only call `add_columnstore_policy()` if you want to override the 7-day default.

```sql
-- Only needed if overriding the default 7-day policy from tsdb.enable_columnstore=true
-- Remove the auto-created policy first:
-- CALL remove_columnstore_policy('your_table_name');
-- Then add custom policy:
-- CALL add_columnstore_policy('your_table_name', after => INTERVAL '1 day');
```

## Step 3: Retention Policy

Do not guess -- ask user or comment out if unknown.

```sql
-- Example - replace with requirements or comment out
SELECT add_retention_policy('your_table_name', INTERVAL '365 days');
```

## Step 4: Create Continuous Aggregates

### Short-term (Minutes/Hours)

For up-to-the-minute dashboards on high-frequency data:

```sql
CREATE MATERIALIZED VIEW your_table_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket(INTERVAL '1 hour', timestamp) AS bucket,
    entity_id,
    category,
    COUNT(*) as record_count,
    AVG(value_1) as avg_value_1,
    MIN(value_1) as min_value_1,
    MAX(value_1) as max_value_1,
    SUM(value_2) as sum_value_2
FROM your_table_name
GROUP BY bucket, entity_id, category;
```

### Long-term (Days/Weeks/Months)

For long-term reporting and analytics:

```sql
CREATE MATERIALIZED VIEW your_table_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket(INTERVAL '1 day', timestamp) AS bucket,
    entity_id,
    category,
    COUNT(*) as record_count,
    AVG(value_1) as avg_value_1,
    MIN(value_1) as min_value_1,
    MAX(value_1) as max_value_1,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value_1) as median_value_1,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value_1) as p95_value_1,
    SUM(value_2) as sum_value_2
FROM your_table_name
GROUP BY bucket, entity_id, category;
```

## Step 5: Aggregate Refresh Policies

- **start_offset**: Usually omit (refreshes all). Exception: if you do not care about refreshing data older than X. With retention policy on raw data: match the retention policy.
- **end_offset**: Set beyond active update window (e.g., 15 min if data usually arrives within 10 min). Data newer than end_offset will not appear in queries without real-time aggregation.
- **schedule_interval**: Set to the same value as end_offset but not more than 1 hour.

```sql
-- Hourly
SELECT add_continuous_aggregate_policy('your_table_hourly',
    start_offset => NULL,
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes');

-- Daily
SELECT add_continuous_aggregate_policy('your_table_daily',
    start_offset => NULL,    -- Use NULL to refresh all data, or set to retention period if enabled on raw data
--  start_offset => INTERVAL '<retention period here>',    -- uncomment if retention policy is enabled on the raw data table
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## Step 6: Real-Time Aggregation (Optional)

Real-time combines materialized + recent raw data at query time. Provides up-to-date results at the cost of higher query latency. Disabled by default in v2.13+.

Use when: need data newer than end_offset, up-to-minute dashboards, can tolerate higher query latency.
Disable when: performance critical, refresh policies sufficient, high query volume.

```sql
-- Enable for current results (higher query cost)
ALTER MATERIALIZED VIEW your_table_hourly SET (timescaledb.materialized_only = false);

-- Disable for performance
ALTER MATERIALIZED VIEW your_table_hourly SET (timescaledb.materialized_only = true);
```

## Step 7: Compress Aggregates

Rule: segment_by = ALL GROUP BY columns except time_bucket; order_by = time_bucket DESC

```sql
-- Hourly
ALTER MATERIALIZED VIEW your_table_hourly SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'entity_id, category',
    timescaledb.orderby = 'bucket DESC'
);
CALL add_columnstore_policy('your_table_hourly', after => INTERVAL '3 days');

-- Daily
ALTER MATERIALIZED VIEW your_table_daily SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'entity_id, category',
    timescaledb.orderby = 'bucket DESC'
);
CALL add_columnstore_policy('your_table_daily', after => INTERVAL '7 days');
```

## Step 8: Aggregate Retention

Aggregates are typically kept longer than raw data. Do not guess -- ask user or comment out if unknown.

```sql
-- Example - replace or comment out
SELECT add_retention_policy('your_table_hourly', INTERVAL '2 years');
SELECT add_retention_policy('your_table_daily', INTERVAL '5 years');
```

## Step 9: Performance Indexes on Continuous Aggregates

Pattern: `(filter_column, bucket DESC)` supports `WHERE filter_column = X AND bucket >= Y ORDER BY bucket DESC`

```sql
CREATE INDEX idx_hourly_entity_bucket ON your_table_hourly (entity_id, bucket DESC);
CREATE INDEX idx_hourly_category_bucket ON your_table_hourly (category, bucket DESC);

-- Multi-column filters
CREATE INDEX idx_hourly_entity_category_bucket ON your_table_hourly (entity_id, category, bucket DESC);
```

## Step 11: Verify Configuration

```sql
SELECT * FROM timescaledb_information.hypertables
WHERE hypertable_name = 'your_table_name';

SELECT * FROM hypertable_compression_stats('your_table_name');

SELECT * FROM timescaledb_information.continuous_aggregates;

SELECT * FROM timescaledb_information.jobs ORDER BY job_id;

SELECT
    chunk_name,
    range_start,
    range_end,
    is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'your_table_name'
ORDER BY range_start DESC;
```

## Performance Guidelines

- Chunk size: recent chunk indexes should fit in less than 25% of RAM
- Compression: expect 90%+ reduction (10x) with proper columnstore config
- Query optimization: use continuous aggregates for historical queries and dashboards
- Memory: run `timescaledb-tune` for self-hosting

## API Reference (Current vs Deprecated)

Deprecated parameters and their replacements:

- `timescaledb.compress` → `timescaledb.enable_columnstore`
- `timescaledb.compress_segmentby` → `timescaledb.segmentby`
- `timescaledb.compress_orderby` → `timescaledb.orderby`

Deprecated functions and their replacements:

- `add_compression_policy()` → `add_columnstore_policy()`
- `remove_compression_policy()` → `remove_columnstore_policy()`
- `compress_chunk()` → `convert_to_columnstore()` (use with `CALL`, not `SELECT`)
- `decompress_chunk()` → `convert_to_rowstore()` (use with `CALL`, not `SELECT`)

Compression stats -- use functions, not views:

```sql
SELECT
    number_compressed_chunks,
    pg_size_pretty(before_compression_total_bytes) as before_compression,
    pg_size_pretty(after_compression_total_bytes) as after_compression,
    ROUND(100.0 * (1 - after_compression_total_bytes::numeric / NULLIF(before_compression_total_bytes, 0)), 1) as compression_pct
FROM hypertable_compression_stats('your_table_name');
```

## Questions to Ask User

1. What kind of data will you be storing?
2. How do you expect to use the data?
3. What queries will you run?
4. How long to keep the data?
5. Column types if unclear
