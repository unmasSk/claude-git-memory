# MVCC Transactions and Concurrency

## Transaction Isolation Levels

- **READ UNCOMMITTED** -- treated as READ COMMITTED in PostgreSQL; no dirty reads ever.
- **READ COMMITTED** (default): new snapshot per statement; can see different data within same transaction.
- **REPEATABLE READ**: snapshot at first query; can cause serialization errors on write conflicts.
- **SERIALIZABLE**: strongest; transactions appear serial; requires retry logic in application code.

Readers never block writers; writers never block readers (only writer-writer conflicts on same row). No lock escalation -- row locks never degrade to table locks.

## XID Wraparound

32-bit transaction IDs wrap at ~2 billion (2^31). `VACUUM FREEZE` replaces old XIDs with FrozenXID (value 2, always visible). Without freeze: after wraparound, old rows appear "in the future" and become invisible. Data physically exists but is invisible to all queries -- looks like total data loss. PostgreSQL performs an emergency shutdown at 2B XIDs to prevent this.

Warning messages start at ~1.4B XIDs; shutdown at 2B. Recovery requires single-user mode VACUUM -- can take hours to days on large databases. Never disable autovacuum -- it is your protection against wraparound.

## XID Age Monitoring

```sql
SELECT datname, age(datfrozenxid),
  ROUND(100.0 * age(datfrozenxid) / 2147483648, 2) AS pct
FROM pg_database ORDER BY age(datfrozenxid) DESC;
```

## Long Transaction Impact

A single long-running transaction blocks VACUUM from removing dead tuples across the entire database. This causes table bloat, increased disk usage, slower queries, and cache pollution. `idle_in_transaction` connections are the primary operational MVCC issue. Set `idle_in_transaction_session_timeout` (30s-5min). Dead tuples waste I/O on sequential scans and cause useless heap lookups from indexes.

## Serialization Errors

Applications must handle "could not serialize access" with retry logic. More common in REPEATABLE READ and SERIALIZABLE isolation levels. Smaller, faster transactions reduce conflict frequency.
