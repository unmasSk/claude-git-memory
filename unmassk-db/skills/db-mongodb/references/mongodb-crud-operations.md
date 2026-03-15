# MongoDB CRUD Operations

## Read Operations

```javascript
// Find documents
db.collection.find({ status: "active" })
db.collection.findOne({ _id: ObjectId("...") })

// Query operators
db.users.find({ age: { $gte: 18, $lt: 65 } })
db.posts.find({ tags: { $in: ["mongodb", "database"] } })
db.products.find({ price: { $exists: true } })

// Projection (select specific fields)
db.users.find({ status: "active" }, { name: 1, email: 1 })

// Cursor operations
db.collection.find().sort({ createdAt: -1 }).limit(10).skip(20)
```

## Write Operations

```javascript
// Insert
db.collection.insertOne({ name: "Alice", age: 30 })
db.collection.insertMany([{ name: "Bob" }, { name: "Charlie" }])

// Update
db.users.updateOne(
  { _id: userId },
  { $set: { status: "verified" } }
)
db.users.updateMany(
  { lastLogin: { $lt: cutoffDate } },
  { $set: { status: "inactive" } }
)

// Replace entire document
db.users.replaceOne({ _id: userId }, newUserDoc)

// Delete
db.users.deleteOne({ _id: userId })
db.users.deleteMany({ status: "deleted" })

// Upsert (update or insert if not exists)
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { name: "User", lastSeen: new Date() } },
  { upsert: true }
)
```

## Atomic Operations

```javascript
// Increment counter
db.posts.updateOne({ _id: postId }, { $inc: { views: 1 } })

// Add to array (if not exists)
db.users.updateOne({ _id: userId }, { $addToSet: { interests: "mongodb" } })

// Push to array
db.posts.updateOne(
  { _id: postId },
  { $push: { comments: { author: "Alice", text: "Great!" } } }
)

// Find and modify atomically
db.counters.findOneAndUpdate(
  { _id: "sequence" },
  { $inc: { value: 1 } },
  { upsert: true, returnDocument: "after" }
)
```

## Query Operators

### Comparison
| Operator | Description |
|----------|-------------|
| `$eq` | Equal |
| `$ne` | Not equal |
| `$gt` / `$gte` | Greater than / greater or equal |
| `$lt` / `$lte` | Less than / less or equal |
| `$in` | Match any value in array |
| `$nin` | Match none of values in array |

### Logical
```javascript
// $and, $or, $not, $nor
db.products.find({
  $and: [
    { price: { $gte: 100 } },
    { stock: { $gt: 0 } }
  ]
})
```

### Array
```javascript
// $all, $elemMatch, $size
db.posts.find({ tags: { $all: ["mongodb", "database"] } })

db.products.find({
  reviews: { $elemMatch: { rating: { $gte: 4 }, verified: true } }
})
```

### Existence and Type
```javascript
db.users.find({ phoneNumber: { $exists: true } })
db.data.find({ value: { $type: "string" } })
```

## Common Patterns

### Pagination (cursor-based, preferred)
```javascript
const lastId = ObjectId("...");
db.collection.find({ _id: { $gt: lastId } }).limit(20)
```

### Soft Delete
```javascript
db.users.updateOne({ _id: userId }, { $set: { deleted: true, deletedAt: new Date() } })
db.users.find({ deleted: { $ne: true } })
```

### Atomic Counter
```javascript
db.counters.findOneAndUpdate(
  { _id: "sequence" },
  { $inc: { value: 1 } },
  { upsert: true, returnDocument: "after" }
)
```
