# MongoDB Data Modeling

## Relationship Patterns

### One-to-One (Embedded)
```javascript
{
  _id: ObjectId("..."),
  name: "Alice",
  email: "alice@example.com",
  address: {
    street: "123 Main St",
    city: "NYC",
    zipcode: "10001"
  }
}
```

### One-to-Few (Embedded Array)
```javascript
// Blog post with comments (< 100 comments)
{
  _id: ObjectId("..."),
  title: "MongoDB Guide",
  comments: [
    { author: "Bob", text: "Great post!", date: ISODate("...") },
    { author: "Charlie", text: "Thanks!", date: ISODate("...") }
  ]
}
```

### One-to-Many (Referenced)
```javascript
// Author collection
{ _id: ObjectId("author1"), name: "Alice" }

// Books collection
{ _id: ObjectId("book1"), title: "Book 1", authorId: ObjectId("author1") }
{ _id: ObjectId("book2"), title: "Book 2", authorId: ObjectId("author1") }
```

### Many-to-Many (Array of References)
```javascript
// Users
{ _id: ObjectId("user1"), name: "Alice", groupIds: [ObjectId("group1"), ObjectId("group2")] }

// Groups
{ _id: ObjectId("group1"), name: "MongoDB Users", memberIds: [ObjectId("user1"), ObjectId("user2")] }
```

## Advanced Patterns

### Time Series
```javascript
db.createCollection("sensor_data", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  }
})
```

### Computed Pattern (Cache Results)
```javascript
{
  _id: ObjectId("..."),
  username: "alice",
  stats: {
    postCount: 150,
    followerCount: 2500,
    lastUpdated: ISODate("...")
  }
}
```

### Schema Versioning
```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 2,
  name: { first: "Alice", last: "Smith" }
}
```

## Schema Validation

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+$",
          description: "must be a valid email"
        },
        age: {
          bsonType: "int",
          minimum: 0,
          maximum: 120
        },
        status: {
          enum: ["active", "inactive", "pending"]
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
})
```

## When to Embed vs Reference

| Criteria | Embed | Reference |
|----------|-------|-----------|
| Relationship | One-to-few | One-to-many |
| Access pattern | Always read together | Read independently |
| Update frequency | Rarely updated | Frequently updated |
| Size | Small subdocuments | Large or growing |
| Atomicity needed | Yes (single doc) | No |
