# PostgreSQL to TimescaleDB Hypertable Migration

Migrate identified PostgreSQL tables to TimescaleDB hypertables with optimal configuration and validation.

Prerequisites: tables already identified as hypertable candidates. Use postgres-timescaledb-candidates.md if identification is still needed.

## Step 1: Optimal Configuration

### Partition Column Selection

```sql
-- Find potential partition columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table_name'
  AND data_type IN ('timestamp', 'timestamptz', 'bigint', 'integer', 'date')
ORDER BY ordinal_position;
```

Requirements: time-based (TIMESTAMP/TIMESTAMPTZ/DATE) or sequential integer (INT/BIGINT). Should represent when the event actually occurred or sequential ordering.

Common choices:
- `timestamp`, `created_at`, `event_time` -- when event occurred
- `id`, `sequence_number` -- auto-increment for sequential data without timestamps
- `ingested_at` -- less ideal, only if primary query dimension
- `updated_at` -- AVOID unless primary query dimension (records updated out of order break chunk distribution)

#### Special Case: Table with Both ID and Timestamp

When a table has sequential ID (PK) AND timestamp that correlate:

```sql
-- Partition by ID, enable minmax sparse indexes on timestamp
SELECT create_hypertable('orders', 'id', chunk_time_interval => 1000000);
ALTER TABLE orders SET (
    timescaledb.sparse_index = 'minmax(created_at),...'
);
```

Use when: ID correlates with time (newer records have higher IDs), need ID-based lookups, and time queries are also common.

### Chunk Interval Selection

```sql
ANALYZE your_table_name;

WITH time_range AS (
    SELECT
        MIN(timestamp_column) as min_time,
        MAX(timestamp_column) as max_time,
        EXTRACT(EPOCH FROM (MAX(timestamp_column) - MIN(timestamp_column)))/3600 as total_hours
    FROM your_table_name
),
total_index_size AS (
    SELECT SUM(pg_relation_size(indexname::regclass)) as total_index_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname||'.'||tablename = 'your_schema.your_table_name'
)
SELECT
    pg_size_pretty(tis.total_index_bytes / tr.total_hours) as index_size_per_hour
FROM time_range tr, total_index_size tis;
```

Target: indexes of recent chunks < 25% of RAM. Default: keep 7 days if unsure. Range: 1 hour minimum, 30 days maximum.

Example: 32GB RAM, target 8GB for recent indexes. If index_size_per_hour = 200MB:
- 1 hour chunks: 200MB x 40 recent = 8GB (acceptable)
- 6 hour chunks: 1.2GB x 7 recent = 8.4GB (acceptable)
- 1 day chunks: 4.8GB x 2 recent = 9.6GB (over target)

### Primary Key/Unique Constraints Compatibility

```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'your_table_name'::regclass AND (contype = 'p' OR contype = 'u');
```

Rules: PK/UNIQUE must include partition column.

Actions:
1. No PK/UNIQUE: no changes needed
2. PK/UNIQUE includes partition column: no changes needed
3. PK/UNIQUE excludes partition column: ask user permission to modify

If user accepts:

```sql
BEGIN;
ALTER TABLE your_table_name DROP CONSTRAINT existing_pk_name;
ALTER TABLE your_table_name ADD PRIMARY KEY (existing_columns, partition_column);
COMMIT;
```

Do NOT modify the primary key/unique constraint without user permission. If user does not accept, do not migrate the table.

### Compression Configuration

For detailed segment_by and order_by selection, see postgres-timescaledb-setup.md.

Quick reference:
- `segment_by`: most common WHERE filter with >100 rows per value per chunk
- `order_by`: usually `timestamp DESC`

```sql
-- Analyze cardinality for segment_by selection
SELECT column_name, COUNT(DISTINCT column_name) as unique_values,
       ROUND(COUNT(*)::float / COUNT(DISTINCT column_name), 2) as avg_rows_per_value
FROM your_table_name GROUP BY column_name;
```

```sql
ALTER TABLE your_table_name SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'entity_id',
    timescaledb.orderby = 'timestamp DESC',
    timescaledb.sparse_index = 'minmax(value_1),...'
);
CALL add_columnstore_policy('your_table_name', after => INTERVAL '7 days');
```

## Step 2: Migration Planning

### Pre-Migration Checklist

- [ ] Partition column selected
- [ ] Chunk interval calculated (or using default)
- [ ] PK includes partition column OR user approved modification
- [ ] No Hypertable-to-Hypertable foreign keys
- [ ] Unique constraints include partition column
- [ ] Compression configuration created (segment_by, order_by, sparse indexes, compression policy)
- [ ] Maintenance window scheduled / backup created

### Option 1: In-Place (Tables < 1GB)

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable(
    'your_table_name',
    'timestamp_column',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

ALTER TABLE your_table_name SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'entity_id',
    timescaledb.orderby = 'timestamp DESC',
    timescaledb.sparse_index = 'minmax(value_1),...'
);

CALL add_columnstore_policy('your_table_name', after => INTERVAL '7 days');
```

### Option 2: Blue-Green (Tables > 1GB)

```sql
-- 1. Create new hypertable
CREATE TABLE your_table_name_new (LIKE your_table_name INCLUDING ALL);

-- 2. Convert to hypertable
SELECT create_hypertable('your_table_name_new', 'timestamp_column');

-- 3. Configure compression
ALTER TABLE your_table_name_new SET (
    timescaledb.enable_columnstore,
    timescaledb.segmentby = 'entity_id',
    timescaledb.orderby = 'timestamp DESC'
);

-- 4. Migrate data in batches
INSERT INTO your_table_name_new
SELECT * FROM your_table_name
WHERE timestamp_column >= '2024-01-01' AND timestamp_column < '2024-02-01';
-- Repeat for each time range

-- 5. Enter maintenance window
-- 6. Pause modification of the old table
-- 7. Copy over the most recent data from the old table

-- 8. Swap tables
BEGIN;
ALTER TABLE your_table_name RENAME TO your_table_name_old;
ALTER TABLE your_table_name_new RENAME TO your_table_name;
COMMIT;

-- 9. Drop old table after validation (sometime later)
-- DROP TABLE your_table_name_old;
```

### Common Issues

#### Foreign Keys

```sql
SELECT conname, confrelid::regclass as referenced_table
FROM pg_constraint
WHERE (conrelid = 'your_table_name'::regclass
    OR confrelid = 'your_table_name'::regclass)
  AND contype = 'f';
```

Supported: Plain to Hypertable, Hypertable to Plain.
Not supported: Hypertable to Hypertable.

Hypertable-to-Hypertable FKs must be dropped (enforce in application). Ask user permission. If no, stop migration.

#### Large Table Migration Time

```sql
SELECT
    pg_size_pretty(pg_total_relation_size(tablename)) as size,
    n_live_tup as rows,
    ROUND(n_live_tup / 75000.0 / 60, 1) as estimated_minutes
FROM pg_stat_user_tables
WHERE tablename = 'your_table_name';
```

For tables >1GB/10M rows: use blue-green migration, migrate during off-peak, test on subset first.

## Step 3: Performance Validation

### Chunk and Compression Analysis

```sql
SELECT
    chunk_name,
    pg_size_pretty(total_bytes) as size,
    pg_size_pretty(compressed_total_bytes) as compressed_size,
    ROUND((total_bytes - compressed_total_bytes::numeric) / total_bytes * 100, 1) as compression_pct,
    range_start,
    range_end
FROM timescaledb_information.chunks
WHERE hypertable_name = 'your_table_name'
ORDER BY range_start DESC;
```

Look for:
- Consistent chunk sizes (within 2x)
- Compression >90% for time-series
- Recent chunks uncompressed
- Chunk indexes < 25% RAM

### Query Performance Tests

```sql
-- Time-range query (should show chunk exclusion)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*), AVG(value)
FROM your_table_name
WHERE timestamp >= NOW() - INTERVAL '1 day';

-- Entity + time query (benefits from segment_by)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM your_table_name
WHERE entity_id = 'X' AND timestamp >= NOW() - INTERVAL '1 week';

-- Aggregation (benefits from columnstore)
EXPLAIN (ANALYZE, BUFFERS)
SELECT DATE_TRUNC('hour', timestamp), entity_id, COUNT(*), AVG(value)
FROM your_table_name
WHERE timestamp >= NOW() - INTERVAL '1 month'
GROUP BY 1, 2;
```

Good signs:
- "Chunks excluded during startup: X" in EXPLAIN plan
- "Custom Scan (ColumnarScan)" for compressed data
- Lower "Buffers: shared read" than pre-migration
- Faster execution times

Bad signs:
- "Seq Scan" on large chunks
- No chunk exclusion messages
- Slower than before migration

### Ongoing Monitoring

```sql
CREATE OR REPLACE VIEW hypertable_compression_status AS
SELECT
    h.hypertable_name,
    COUNT(c.chunk_name) as total_chunks,
    COUNT(c.chunk_name) FILTER (WHERE c.compressed_total_bytes IS NOT NULL) as compressed_chunks,
    ROUND(
        COUNT(c.chunk_name) FILTER (WHERE c.compressed_total_bytes IS NOT NULL)::numeric /
        COUNT(c.chunk_name) * 100, 1
    ) as compression_coverage_pct,
    pg_size_pretty(SUM(c.total_bytes)) as total_size,
    pg_size_pretty(SUM(c.compressed_total_bytes)) as compressed_size
FROM timescaledb_information.hypertables h
LEFT JOIN timescaledb_information.chunks c ON h.hypertable_name = c.hypertable_name
GROUP BY h.hypertable_name;
```

## Success Criteria

Migration is successful when:
- All queries return correct results
- Query performance equal or better
- Compression >90% for older data
- Chunk exclusion working for time queries
- Insert performance acceptable

Investigate if:
- Query performance >20% worse
- Compression <80%
- No chunk exclusion
- Insert performance degraded
- Increased error rates
