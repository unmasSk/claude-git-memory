# MongoDB Aggregation Pipeline

## Core Pipeline Example

```javascript
db.orders.aggregate([
  { $match: { status: "completed", total: { $gte: 100 } } },

  { $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    as: "customer"
  }},

  { $unwind: "$items" },

  { $group: {
    _id: "$items.category",
    totalRevenue: { $sum: "$items.total" },
    orderCount: { $sum: 1 },
    avgOrderValue: { $avg: "$total" }
  }},

  { $sort: { totalRevenue: -1 } },
  { $limit: 10 },

  { $project: {
    category: "$_id",
    revenue: "$totalRevenue",
    orders: "$orderCount",
    avgValue: { $round: ["$avgOrderValue", 2] },
    _id: 0
  }}
])
```

## Common Patterns

### Time-Based Aggregation

```javascript
db.events.aggregate([
  { $match: { timestamp: { $gte: startDate, $lt: endDate } } },
  { $group: {
    _id: {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" }
    },
    count: { $sum: 1 }
  }}
])
```

### Faceted Search

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $facet: {
    priceRanges: [
      { $bucket: {
        groupBy: "$price",
        boundaries: [0, 100, 500, 1000, 5000],
        default: "5000+",
        output: { count: { $sum: 1 } }
      }}
    ],
    topBrands: [
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ],
    avgPrice: [
      { $group: { _id: null, avg: { $avg: "$price" } } }
    ]
  }}
])
```

### Window Functions

```javascript
db.sales.aggregate([
  { $setWindowFields: {
    partitionBy: "$region",
    sortBy: { date: 1 },
    output: {
      runningTotal: { $sum: "$amount", window: { documents: ["unbounded", "current"] } },
      movingAvg: { $avg: "$amount", window: { documents: [-7, 0] } }
    }
  }}
])
```

## Aggregation Operators

### Math
`$add`, `$subtract`, `$multiply`, `$divide`, `$mod`, `$abs`, `$ceil`, `$floor`, `$round`, `$sqrt`, `$pow`

### String
`$concat`, `$substr`, `$toLower`, `$toUpper`, `$trim`, `$split`, `$regexMatch`, `$regexFind`

### Array
`$arrayElemAt`, `$slice`, `$first`, `$last`, `$reverseArray`, `$sortArray`, `$filter`, `$map`, `$reduce`, `$zip`, `$concatArrays`

### Date
`$dateAdd`, `$dateDiff`, `$dateFromString`, `$dateToString`, `$dayOfMonth`, `$month`, `$year`, `$hour`, `$minute`, `$second`

### Type Conversion
`$toInt`, `$toString`, `$toDate`, `$toDouble`, `$toDecimal`, `$toObjectId`, `$toBool`
