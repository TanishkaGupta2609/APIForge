# APIForge — Database Schema & Data Models

## 1. Database Overview

APIForge utilizes **MongoDB** as its primary persistence engine, managed via the **Mongoose ODM**. MongoDB's document model provides flexible serialization for variable HTTP workload configurations and nested k6 performance summaries while Mongoose guarantees schema validation, ownership enforcement, and index management.

---

## 2. Core Collections & Schemas

### 2.1 User Collection (`users`)
Stores registered developers with cryptographically hashed credentials.

```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }, // Never returned by default
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ email: 1 }` (Unique)

---

### 2.2 Target Collection (`targets`)
Represents an API target authorized for load testing.

```javascript
{
  _id: ObjectId,
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  baseUrl: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  defaultHeaders: [
    {
      key: { type: String, required: true },
      value: { type: String, required: true },
      isSecret: { type: Boolean, default: false } // Redacted in list/export responses
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ owner: 1, createdAt: -1 }` (Efficient user dashboard queries)

---

### 2.3 TestRun Collection (`test_runs`)
Represents a test execution lifecycle, configuration snapshot, and normalized metrics.

```javascript
{
  _id: ObjectId,
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  target: { type: ObjectId, ref: 'Target', required: true, index: true },
  
  // Immutable snapshot of configuration at test launch
  configSnapshot: {
    targetUrl: { type: String, required: true },
    httpMethod: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
    endpointPath: { type: String, default: '/' },
    virtualUsers: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    headers: [{ key: String, value: String }]
  },

  // Lifecycle status state machine
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },

  // Timestamps & Execution Duration
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  durationMs: { type: Number, default: 0 },

  // Normalized Performance Metrics Summary
  metrics: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    requestsPerSecond: { type: Number, default: 0 },
    latencyAvgMs: { type: Number, default: 0 },
    latencyMedMs: { type: Number, default: 0 },
    latencyP90Ms: { type: Number, default: 0 },
    latencyP95Ms: { type: Number, default: 0 },
    latencyMaxMs: { type: Number, default: 0 },
    httpStatusCounts: { type: Map, of: Number, default: {} },
    failureRate: { type: Number, default: 0 }
  },

  // Process & Diagnostic Metadata
  processMeta: {
    pid: { type: Number, default: null },
    exitCode: { type: Number, default: null },
    rawSummaryPath: { type: String, default: null }
  },

  errorSummary: {
    code: { type: String, default: null },
    message: { type: String, default: null }
  },

  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ owner: 1, createdAt: -1 }` (User run history)
  - `{ target: 1, createdAt: -1 }` (Target-specific test history)
  - `{ status: 1 }` (Worker reconciliation and active run lookups)

---

## 3. Ownership & Cascade Rules

1. **Strict Ownership Scoping**: Every document in `targets` and `test_runs` retains a non-null `owner` reference. Every controller query explicitly filters by `owner: req.user._id`.
2. **Soft vs Hard Deletions**: Deleting a target leaves previous historical `TestRun` documents intact (`target` becomes nullified or marked orphaned) to preserve audit trails and performance history.
3. **Sensitive Field Exclusion**: Password hashes and secret headers are excluded by default via Mongoose `select: false` projections.
