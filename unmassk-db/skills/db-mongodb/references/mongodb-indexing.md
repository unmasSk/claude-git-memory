# MongoDB Indexing

## Index Types

### Single Field
```javascript
db.users.createIndex({ email: 1 })     // ascending
db.posts.createIndex({ createdAt: -1 }) // descending
```

### Compound
```javascript
db.orders.createIndex({ status: 1, createdAt: -1 })

// Supports queries on:
// - { status: "..." }
// - { status: "...", createdAt: ... }
// Does NOT efficiently support: { createdAt: ... } alone
```

### Text (Full-Text Search)
```javascript
db.articles.createIndex({ title: "text", body: "text" })

db.articles.find({ $text: { $search: "mongodb database" } })

db.articles.find(
  { $text: { $search: "mongodb" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

### Geospatial
```javascript
db.places.createIndex({ location: "2dsphere" })

db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lon, lat] },
      $maxDistance: 5000
    }
  }
})
```

### Wildcard
```javascript
db.products.createIndex({ "attributes.$**": 1 })
db.products.find({ "attributes.color": "red" })
```

### Partial
```javascript
db.orders.createIndex(
  { customerId: 1 },
  { partialFilterExpression: { status: "active" } }
)
```

### TTL (Auto-delete)
```javascript
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
)
```

### Hashed (for sharding)
```javascript
db.users.createIndex({ userId: "hashed" })
```

## Query Optimization

### Explain Query Plans
```javascript
db.users.find({ email: "user@example.com" }).explain()
db.users.find({ age: { $gte: 18 } }).explain("executionStats")

// Key metrics:
// - executionTimeMillis
// - totalDocsExamined vs nReturned (should be close)
// - stage: "IXSCAN" (good) vs "COLLSCAN" (bad - full scan)
```

### Covered Queries
```javascript
db.users.createIndex({ email: 1, name: 1 })

// Covered - no document fetch needed
db.users.find(
  { email: "user@example.com" },
  { email: 1, name: 1, _id: 0 }
)
```

### Index Management
```javascript
db.collection.getIndexes()
db.collection.dropIndex("indexName")
db.collection.hideIndex("indexName")    // test before dropping
db.collection.unhideIndex("indexName")
db.collection.aggregate([{ $indexStats: {} }])
```
