# Backup and Recovery

Fundamental rule: Backups are useless until you have successfully tested recovery.

## Logical Backups (pg_dump)

Exports as SQL or custom format; portable across PostgreSQL versions and architectures.

Formats:
- `-Fp` -- plain SQL
- `-Fc` -- custom compressed, selective restore
- `-Fd` -- directory, parallel with `-j`
- `-Ft` -- tar (avoid)

Use `-Fd -j 4` for large databases. Restore: `pg_restore -d dbname file.dump`; add `-j` for parallel restore. Selective table restore: `pg_restore -t tablename`. Slow for large databases; RPO = backup frequency (typically 24h).

## Physical Backups (pg_basebackup)

Copies raw PGDATA; same major version and platform required; cross-architecture works if same endianness (x86_64 and ARM64). Faster for large clusters; includes all databases.

Flags: `-Ft -z -P` for compressed tar with progress.

Manual alternative: `pg_backup_start()` then copy PGDATA then `pg_backup_stop()` (complex; must write returned `backup_label`).

## PITR (Point-in-Time Recovery)

Requires base backup + continuous WAL archiving. Restores to any timestamp, transaction, or named restore point.

- Without PITR: restore only to backup time (potentially lose hours).
- With PITR: RPO = minutes.

`archive_command` must return 0 ONLY when file is safely stored -- premature 0 = data loss risk. `wal_level` must be `replica` or `logical` (not `minimal`).

## WAL Archiving

```
archive_mode=on
archive_command='test ! -f /archive/%f && cp %p /archive/%f'
```

Test archive command as postgres user (not root) -- permission issues are common. Monitor `pg_stat_archiver` for `failed_count`, `last_archived_time`. Archive failures prevent WAL recycling and disk fills.

## Tool Comparison

| Tool | Use case |
|------|----------|
| pg_dump | Small databases, migrations, selective restore |
| pg_basebackup | Basic PITR, built-in |
| pgBackRest | Production -- parallel, incremental, S3/GCS/Azure, retention |
| Barman | Enterprise PITR, retention policies |
| WAL-G | Cloud-native, S3/GCS/Azure |

## RPO/RTO

| Strategy | RPO | RTO |
|----------|-----|-----|
| Logical only | Hours (backup interval) | Hours |
| PITR | Minutes | Hours |
| Synchronous replication | 0 | Seconds to minutes |

## Operational Rules

- Verify integrity with `pg_verifybackup` (PG 13+)
- Test recovery and PITR regularly
- Take backups from standby to avoid impacting primary
- Retention: 7 daily, 4 weekly, 12 monthly
- Monitor archive growth and backup age
- Never assume backups work without testing
