# MongoDB Replication

## Replica Sets

Architecture:
- **Primary**: Accepts writes, replicates to secondaries
- **Secondaries**: Replicate primary's oplog, can serve reads
- **Arbiter**: Votes in elections, holds no data

```javascript
rs.initiate({
  _id: "myReplicaSet",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})

rs.status()
rs.add("mongo4:27017")
rs.remove("mongo4:27017")
```

## Write Concern

```javascript
// Wait for majority acknowledgment (durable)
db.users.insertOne(
  { name: "Alice" },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
```

| Level | Description |
|-------|-------------|
| `w: 0` | No acknowledgment (fire and forget) |
| `w: 1` | Primary acknowledges (default) |
| `w: "majority"` | Majority of nodes acknowledge (recommended for production) |
| `w: <number>` | Specific number of nodes |

## Read Preference

```javascript
db.collection.find().readPref("secondaryPreferred")
```

| Option | Description |
|--------|-------------|
| `primary` | Read from primary only (default) |
| `primaryPreferred` | Primary if available, else secondary |
| `secondary` | Read from secondary only |
| `secondaryPreferred` | Secondary if available, else primary |
| `nearest` | Lowest network latency |

## Transactions

Multi-document ACID transactions:

```javascript
const session = client.startSession();
session.startTransaction();

try {
  await accounts.updateOne(
    { _id: fromAccount },
    { $inc: { balance: -amount } },
    { session }
  );

  await accounts.updateOne(
    { _id: toAccount },
    { $inc: { balance: amount } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```
