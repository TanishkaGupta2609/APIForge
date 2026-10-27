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

### 2.3 TestRun Collection (`testruns`)
Represents a test execution lifecycle, immutable configuration snapshot, progress, and normalized metrics.

```javascript
{
  _id: ObjectId,
  owner: { type: ObjectId, ref: 'User', required: true, index: true },
  target: { type: ObjectId, ref: 'Target', required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },

  // Immutable snapshot of configuration at test creation
  configuration: {
    targetSnapshot: {
      name: { type: String, required: true },
      baseUrl: { type: String, required: true }
    },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    endpoint: { type: String, required: true },
    headers: { type: Map, of: String, default: {} },
    body: { type: String, default: null },
    vus: { type: Number, required: true, min: 1, max: 50 },
    duration: { type: Number, required: true, min: 5, max: 300 },
    rampUpDuration: { type: Number, default: 0 },
    thresholds: {
      httpReqDurationP95: { type: Number, default: null },
      httpReqFailedRate: { type: Number, default: null }
    }
  },

  // Authoritative lifecycle state machine
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },

  // Execution Timestamps & Duration
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  actualDurationMs: { type: Number, default: null },

  // Live execution progress
  progress: {
    percent: { type: Number, default: 0, min: 0, max: 100 },
    stage: { type: String, default: 'Pending execution' },
    message: { type: String, default: 'Test queued in scheduler' }
  },

  // Normalized Performance Metrics Summary
  metrics: {
    totalRequests: { type: Number, default: null },
    successfulRequests: { type: Number, default: null },
    failedRequests: { type: Number, default: null },
    requestsPerSecond: { type: Number, default: null },
    avgLatency: { type: Number, default: null },
    medianLatency: { type: Number, default: null },
    p90Latency: { type: Number, default: null },
    p95Latency: { type: Number, default: null },
    maxLatency: { type: Number, default: null },
    failureRate: { type: Number, default: null },
    networkErrors: { type: Number, default: null },
    statusCodeCounts: { type: Map, of: Number }
  },

  error: {
    category: {
      type: String,
      enum: ['NONE', 'NETWORK_ERROR', 'TIMEOUT', 'CANCELLED_BY_USER', 'TARGET_UNREACHABLE', 'EXECUTION_ERROR', 'INTERNAL_ERROR'],
      default: 'NONE'
    },
    message: { type: String, default: null }
  },

  isSimulated: { type: Boolean, default: false },

  createdAt: Date,
  updatedAt: Date
}
```
- **Indexes**:
  - `{ owner: 1, createdAt: -1 }` (User test run history)
  - `{ status: 1, owner: 1 }` (Active concurrency lookups)
  - `{ target: 1 }` (Target-specific test runs)

---

## 3. Ownership & Cascade Rules

1. **Strict Ownership Scoping**: Every document in `targets` and `test_runs` retains a non-null `owner` reference. Every controller query explicitly filters by `owner: req.user._id`.
2. **Soft vs Hard Deletions**: Deleting a target leaves previous historical `TestRun` documents intact (`target` becomes nullified or marked orphaned) to preserve audit trails and performance history.
3. **Sensitive Field Exclusion**: Password hashes and secret headers are excluded by default via Mongoose `select: false` projections.
