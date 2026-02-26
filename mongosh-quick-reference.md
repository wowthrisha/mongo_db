# MongoDB Shell (mongosh) Quick Reference Guide

This guide contains all MongoDB queries for your ARIA project demonstration, optimized for mongosh syntax.

## 🚀 Quick Start

```bash
# Connect to your database
mongosh aria_intelligence

# Or run the complete demo
./run-mongosh-demo.sh

# Or load the script directly
mongosh aria_intelligence < mongosh-demo.mongosh
```

## 📝 Setup Commands

```javascript
// Connect to database
use aria_intelligence

// Set sample user ID (replace with actual ID)
var SAMPLE_USER_ID = ObjectId("507f1f77bcf86cd799439011")

// Show collections
show collections

// Show database stats
db.stats()
```

---

## CRUD OPERATIONS

### CREATE

```javascript
// Insert single document
db.memories.insertOne({
    userId: SAMPLE_USER_ID,
    key: "favorite_color",
    value: "blue",
    type: "preference",
    tags: ["personal", "preference"],
    confidenceScore: 0.9,
    createdAt: new Date()
})

// Insert multiple documents
db.memories.insertMany([
    { userId: SAMPLE_USER_ID, key: "key1", value: "value1", type: "preference" },
    { userId: SAMPLE_USER_ID, key: "key2", value: "value2", type: "fact" }
])
```

### READ

```javascript
// Find all documents
db.memories.find({ userId: SAMPLE_USER_ID })

// Find with pretty formatting
db.memories.find({ userId: SAMPLE_USER_ID }).pretty()

// Find one document
db.memories.findOne({ userId: SAMPLE_USER_ID, type: "preference" })

// Find with multiple conditions
db.interactions.find({ 
    userId: SAMPLE_USER_ID, 
    detectedIntent: "query_schedule" 
})

// Count documents
db.memories.countDocuments({ userId: SAMPLE_USER_ID })
```

### UPDATE

```javascript
// Update single document
db.memories.updateOne(
    { userId: SAMPLE_USER_ID, key: "favorite_color" },
    { $set: { value: "green" } }
)

// Update multiple documents
db.tasks.updateMany(
    { userId: SAMPLE_USER_ID, status: "pending" },
    { $set: { priority: "medium" } }
)

// Upsert (update or insert)
db.memories.updateOne(
    { userId: SAMPLE_USER_ID, key: "last_login" },
    { 
        $set: { 
            value: new Date().toISOString(),
            type: "fact"
        }
    },
    { upsert: true }
)

// Multiple update operators
db.memories.updateOne(
    { userId: SAMPLE_USER_ID, key: "test" },
    { 
        $set: { value: "updated" },
        $inc: { accessCount: 1 },
        $push: { tags: "updated" },
        $unset: { tempField: 1 }
    }
)
```

### DELETE

```javascript
// Delete one document
db.memories.deleteOne({ userId: SAMPLE_USER_ID, key: "favorite_color" })

// Delete multiple documents
db.interactions.deleteMany({ 
    userId: SAMPLE_USER_ID, 
    processingMode: "on-device" 
})

// Find and delete
db.tasks.findOneAndDelete({ 
    userId: SAMPLE_USER_ID, 
    status: "completed" 
})
```

---

## EMBEDDED DOCUMENTS

### Query Arrays

```javascript
// Find documents with non-empty arrays
db.memories.find({
    userId: SAMPLE_USER_ID,
    tags: { $exists: true, $ne: [] }
})

// Query by array element
db.memories.find({
    userId: SAMPLE_USER_ID,
    tags: "personal"
})

// Query multiple array elements
db.memories.find({
    userId: SAMPLE_USER_ID,
    tags: { $all: ["personal", "preference"] }
})

// Query by array size
db.memories.find({
    userId: SAMPLE_USER_ID,
    tags: { $size: 2 }
})

// Query nested objects
db.interactions.find({
    userId: SAMPLE_USER_ID,
    "entities.type": "timeframe"
})
```

### Array Operations

```javascript
// Add to array
db.memories.updateOne(
    { userId: SAMPLE_USER_ID },
    { $push: { tags: "new_tag" } }
)

// Add multiple elements
db.memories.updateOne(
    { userId: SAMPLE_USER_ID },
    { $push: { tags: { $each: ["tag1", "tag2", "tag3"] } } }
)

// Add if not present
db.memories.updateOne(
    { userId: SAMPLE_USER_ID },
    { $addToSet: { tags: "unique_tag" } }
)

// Remove from array
db.memories.updateOne(
    { userId: SAMPLE_USER_ID },
    { $pull: { tags: "unwanted_tag" } }
)

// Remove multiple elements
db.memories.updateOne(
    { userId: SAMPLE_USER_ID },
    { $pull: { tags: { $in: ["tag1", "tag2"] } } }
)
```

---

## PROJECTION

### Include/Exclude Fields

```javascript
// Include only specific fields
db.memories.find(
    { userId: SAMPLE_USER_ID },
    { key: 1, value: 1, type: 1, _id: 0 }
)

// Exclude specific fields
db.interactions.find(
    { userId: SAMPLE_USER_ID },
    { assistantResponse: 0, entities: 0 }
)

// Slice arrays
db.memories.find(
    { userId: SAMPLE_USER_ID },
    { tags: { $slice: 3 } }  // First 3 elements
)

// Computed fields
db.tasks.find(
    { userId: SAMPLE_USER_ID },
    { 
        title: 1, 
        status: 1,
        isOverdue: { 
            $cond: { 
                if: { $lt: ["$scheduledTime", new Date()] }, 
                then: true, 
                else: false 
            } 
        }
    }
)
```

---

## AGGREGATION PIPELINE

### Basic Aggregation

```javascript
// Group and count
db.memories.aggregate([
    { $match: { userId: SAMPLE_USER_ID } },
    { $group: { 
        _id: "$type", 
        count: { $sum: 1 },
        avgConfidence: { $avg: "$confidenceScore" }
    }}
])

// Group by multiple fields
db.tasks.aggregate([
    { $match: { userId: SAMPLE_USER_ID } },
    { $group: { 
        _id: { status: "$status", priority: "$priority" }, 
        count: { $sum: 1 }
    }},
    { $sort: { "_id.status": 1, "_id.priority": 1 } }
])
```

### Complex Pipeline

```javascript
// Multi-stage aggregation
db.interactions.aggregate([
    // Stage 1: Filter
    { $match: { userId: SAMPLE_USER_ID } },
    
    // Stage 2: Group
    { 
        $group: {
            _id: { 
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                intent: "$detectedIntent"
            },
            count: { $sum: 1 },
            uniqueSessions: { $addToSet: "$sessionId" }
        }
    },
    
    // Stage 3: Reshape
    {
        $project: {
            date: "$_id.date",
            intent: "$_id.intent",
            interactionCount: "$count",
            sessionCount: { $size: "$uniqueSessions" },
            _id: 0
        }
    },
    
    // Stage 4: Sort
    { $sort: { date: -1, interactionCount: -1 } },
    
    // Stage 5: Limit
    { $limit: 10 }
])
```

### Lookup (Join)

```javascript
// Join with users collection
db.interactions.aggregate([
    { $match: { userId: SAMPLE_USER_ID } },
    { 
        $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails"
        }
    },
    { $unwind: "$userDetails" },
    {
        $project: {
            "userDetails.username": 1,
            rawInput: 1,
            detectedIntent: 1,
            createdAt: 1
        }
    }
])
```

---

## SORTING AND LIMITING

```javascript
// Sort and limit
db.interactions.find({ userId: SAMPLE_USER_ID })
    .sort({ createdAt: -1 })
    .limit(5)

// Multi-field sort
db.tasks.find({ userId: SAMPLE_USER_ID })
    .sort({ priority: -1, status: 1, createdAt: 1 })
    .limit(10)

// Complex sort
db.interactions.find({ userId: SAMPLE_USER_ID })
    .sort([
        ["processingMode", 1],
        ["createdAt", -1],
        ["detectedIntent", 1]
    ])
    .limit(5)

// Pagination
db.interactions.find({ userId: SAMPLE_USER_ID })
    .sort({ createdAt: -1 })
    .skip(10)
    .limit(5)
```

---

## ADVANCED QUERIES

### Regular Expressions

```javascript
// Case-insensitive regex
db.memories.find({
    userId: SAMPLE_USER_ID,
    key: { $regex: /color|preference/i }
})

// Starts with
db.memories.find({
    userId: SAMPLE_USER_ID,
    key: { $regex: "^favorite" }
})

// Exact phrase
db.memories.find({
    userId: SAMPLE_USER_ID,
    key: { $regex: "^favorite color$" }
})
```

### Date Queries

```javascript
// Date range
db.interactions.find({
    userId: SAMPLE_USER_ID,
    createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        $lt: new Date()
    }
})

// Specific date
db.tasks.find({
    userId: SAMPLE_USER_ID,
    scheduledTime: {
        $gte: new Date("2024-01-01"),
        $lte: new Date("2024-12-31")
    }
})

// Date parts
db.interactions.find({
    userId: SAMPLE_USER_ID,
    $expr: {
        $and: [
            { $eq: [{ $month: "$createdAt" }, new Date().getMonth() + 1] },
            { $eq: [{ $year: "$createdAt" }, new Date().getFullYear()] }
        ]
    }
})
```

### Conditional Queries

```javascript
// OR condition
db.tasks.find({
    userId: SAMPLE_USER_ID,
    $or: [
        { priority: "high", status: "pending" },
        { type: "reminder", scheduledTime: { $lte: new Date() } }
    ]
})

// AND condition (implicit)
db.tasks.find({
    userId: SAMPLE_USER_ID,
    priority: "high",
    status: "pending"
})

// NOR condition
db.tasks.find({
    userId: SAMPLE_USER_ID,
    $nor: [
        { status: "completed" },
        { status: "cancelled" }
    ]
})

// Nested conditions
db.interactions.find({
    userId: SAMPLE_USER_ID,
    $and: [
        { $or: [{ detectedIntent: "query_schedule" }, { detectedIntent: "set_reminder" }] },
        { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
})
```

### Type Queries

```javascript
// Query by BSON type
db.interactions.find({
    userId: { $type: "objectId" }
})

// Multiple types
db.memories.find({
    value: { $type: ["string", "null"] }
})

// Array vs non-array
db.memories.find({
    tags: { $type: "array" }
})
```

---

## PERFORMANCE QUERIES

### Index Usage

```javascript
// Use index hint
db.interactions.find({
    userId: SAMPLE_USER_ID,
    detectedIntent: "query_schedule"
}).hint({ userId: 1, detectedIntent: 1, createdAt: -1 })

// Covered query
db.memories.find(
    { userId: SAMPLE_USER_ID, type: "preference" },
    { _id: 0, key: 1, value: 1 }
).hint({ userId: 1, type: 1 })
```

### Performance Analysis

```javascript
// Explain query execution
db.interactions.find({ 
    userId: SAMPLE_USER_ID, 
    detectedIntent: "query_schedule" 
}).explain("executionStats")

// Collection stats
db.memories.stats()

// Index information
db.memories.getIndexes()

// Index usage
db.memories.aggregate([{ $indexStats: {} }])
```

### Bulk Operations

```javascript
// Bulk write
var bulkOps = [
    { updateOne: { 
        filter: { userId: SAMPLE_USER_ID, key: "test1" }, 
        update: { $set: { value: "value1" } }, 
        upsert: true 
    }},
    { updateOne: { 
        filter: { userId: SAMPLE_USER_ID, key: "test2" }, 
        update: { $set: { value: "value2" } }, 
        upsert: true 
    }}
]
db.memories.bulkWrite(bulkOps)
```

---

## UTILITY COMMANDS

### Database Operations

```javascript
// List databases
show dbs

// List collections
show collections

// Create collection
db.createCollection("test_collection")

// Drop collection
db.test_collection.drop()

// Rename collection
db.test_collection.renameCollection("new_name")
```

### Data Analysis

```javascript
// Get distinct values
db.memories.distinct("type", { userId: SAMPLE_USER_ID })

// Sample documents
db.memories.aggregate([{ $sample: { size: 5 } }])

// Random document
db.memories.findOne({ $where: "function() { return Math.random() > 0.9; }" })

// Text search (requires text index)
db.memories.find({ $text: { $search: "preference personal" } })
```

### Export/Import

```javascript
// Export to JSON (in shell)
db.memories.find().forEach(function(doc) { print(JSON.stringify(doc)) })

// Count documents by type
db.memories.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
])
```

---

## 🎯 Demo Checklist

For your demonstration, cover these key areas:

### ✅ **Basic Operations**
- `insertOne()`, `find()`, `updateOne()`, `deleteOne()`
- `countDocuments()`, `distinct()`

### ✅ **Query Patterns**
- Field selection, comparison operators
- Logical operators (`$or`, `$and`, `$nor`)
- Array operations (`$push`, `$pull`, `$size`, `$all`)

### ✅ **Advanced Features**
- Regular expressions, date queries
- Aggregation pipelines with multiple stages
- `$lookup` for joins, `$unwind` for arrays

### ✅ **Performance**
- Index analysis with `explain()`
- Bulk operations with `bulkWrite()`
- Query optimization techniques

### ✅ **Real-world Examples**
- User activity analysis
- Memory access patterns
- Task prioritization
- Intent tracking

---

## 🚀 Running Commands

### Interactive Mode
```bash
mongosh aria_intelligence
# Then paste commands interactively
```

### Script Mode
```bash
mongosh aria_intelligence < mongosh-demo.mongosh
```

### File Mode
```bash
mongosh aria_intelligence --file mongosh-demo.mongosh
```

### Automated Demo
```bash
./run-mongosh-demo.sh
```

All queries are production-ready and demonstrate MongoDB's powerful capabilities for your ARIA project!
