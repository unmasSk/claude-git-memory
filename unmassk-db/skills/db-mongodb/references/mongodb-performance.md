# MongoDB Performance

## Best Practices

1. **Index critical fields** — fields used in queries, sorts, joins. Monitor slow queries (>100ms).

2. **Use projection** — return only needed fields:
```javascript
// Good
db.users.find({ status: "active" }, { name: 1, email: 1 })
// Bad
db.users.find({ status: "active" })
```

3. **Limit result sets**: `db.users.find().limit(100)`

4. **Use aggregation pipeline** — process data server-side. Use `$match` early, `$project` to reduce size.

5. **Connection pooling**:
```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 50,
  minPoolSize: 10
});
```

6. **Batch writes**:
```javascript
// Good
await collection.insertMany(documents);
// Bad
for (const doc of documents) { await collection.insertOne(doc); }
```

7. **Write concern tuning** — `w: 1` for non-critical (faster), `w: "majority"` for critical (safer).

8. **Read preference** — `secondary` for analytics, `primary` for consistency.

## Monitoring

```javascript
// Profiler for slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Current operations
db.currentOp()

// Server status
db.serverStatus()

// Collection stats
db.collection.stats()
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `MongoNetworkError` | Connection failed | Check network, IP whitelist, credentials |
| `E11000 duplicate key` | Duplicate unique field | Check unique indexes, handle duplicates |
| `ValidationError` | Schema validation failed | Check document structure, field types |
| `OperationTimeout` | Query too slow | Add indexes, optimize query, increase timeout |
| `BSONObjectTooLarge` | Document/result > 16MB | Use `$limit`, `$project`, or `$out` |
| `InvalidShardKey` | Bad shard key | Choose high-cardinality, even-distribution key |
| `ChunkTooBig` | Jumbo chunk | Use `refineCollectionShardKey` or re-shard |
| `OplogTailFailed` | Replication lag | Check network, increase oplog size |

## Debugging

```javascript
db.collection.find({ field: value }).explain("executionStats")
db.collection.aggregate([{ $indexStats: {} }])
db.setProfilingLevel(2)  // Profile all queries
db.system.profile.find({ millis: { $gt: 100 } })
rs.printReplicationInfo()
rs.printSecondaryReplicationInfo()
```
