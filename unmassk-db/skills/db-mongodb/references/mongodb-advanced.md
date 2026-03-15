# MongoDB Advanced Features

## Atlas Search (Full-Text)

Index definition:
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "description": { "type": "string", "analyzer": "lucene.english" }
    }
  }
}
```

Query:
```javascript
db.articles.aggregate([
  { $search: {
    text: {
      query: "mongodb database",
      path: ["title", "description"],
      fuzzy: { maxEdits: 1 }
    }
  }},
  { $limit: 10 },
  { $project: { title: 1, description: 1, score: { $meta: "searchScore" } } }
])
```

## Atlas Vector Search

```javascript
db.products.aggregate([
  { $vectorSearch: {
    index: "vector_index",
    path: "embedding",
    queryVector: [0.123, 0.456, ...],  // 1536 dimensions for OpenAI
    numCandidates: 100,
    limit: 10
  }},
  { $project: {
    name: 1, description: 1,
    score: { $meta: "vectorSearchScore" }
  }}
])
```

## Change Streams

```javascript
const changeStream = collection.watch([
  { $match: { "fullDocument.status": "active" } }
]);

changeStream.on("change", (change) => {
  console.log("Change detected:", change);
  // change.operationType: "insert", "update", "delete", "replace"
});

// Resume from specific point
const resumeToken = changeStream.resumeToken;
const newStream = collection.watch([], { resumeAfter: resumeToken });
```

## Bulk Operations

```javascript
const bulkOps = [
  { insertOne: { document: { name: "Alice", age: 30 } } },
  { updateOne: {
    filter: { name: "Bob" },
    update: { $set: { age: 25 } },
    upsert: true
  }},
  { deleteOne: { filter: { name: "Charlie" } } }
];

const result = await collection.bulkWrite(bulkOps, { ordered: false });
```

## Time Series Collections (MongoDB 5.0+)

```javascript
db.createCollection("sensor_data", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  }
})
```

## Drivers

### Node.js
```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient(uri);
await client.connect();
const db = client.db("myDatabase");
const collection = db.collection("users");
```

### Python (PyMongo)
```python
from pymongo import MongoClient
client = MongoClient(uri)
db = client.myDatabase
collection = db.users
```

### Go
```go
client, _ := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
collection := client.Database("myDatabase").Collection("users")
```

## When NOT to Use MongoDB

- Strong consistency over availability (use RDBMS)
- Complex multi-table joins (SQL databases excel here)
- Extremely small dataset (<1GB) with simple queries
- ACID transactions across multiple databases
