# MongoDB Sharding

## Architecture

- **Shards**: Replica sets holding data subsets
- **Config Servers**: Store cluster metadata
- **Mongos**: Query routers directing operations to shards

## Shard Key Selection

Shard key determines data distribution and query performance.

Good shard keys have:
- High cardinality (many unique values)
- Even distribution (no hotspots)
- Query alignment (queries include shard key)

```javascript
sh.enableSharding("myDatabase")

// Hashed key
sh.shardCollection("myDatabase.users", { userId: "hashed" })

// Compound key
sh.shardCollection("myDatabase.orders", { customerId: 1, orderDate: 1 })
```

## Zone Sharding

```javascript
sh.addShardToZone("shard0", "US-EAST")
sh.addShardToZone("shard1", "US-WEST")

sh.addTagRange(
  "myDatabase.users",
  { zipcode: "00000" },
  { zipcode: "50000" },
  "US-EAST"
)
```

## Query Routing

```javascript
// Targeted query (includes shard key) - fast
db.users.find({ userId: "12345" })

// Scatter-gather (no shard key) - slow
db.users.find({ email: "user@example.com" })
```
