# APIForge — REST API Specification

This document defines the unified API contracts, endpoints, request/response formats, and error codes for the APIForge backend.

---

## 1. Unified Response Envelope

All APIForge endpoints adhere to a standardized JSON envelope structure:

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable confirmation message"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Clear explanation of the error",
    "details": [
      {
        "field": "fieldName",
        "message": "Validation rule explanation"
      }
    ]
  }
}
```

---

## 2. Authentication & Authorization

Protected endpoints require a JSON Web Token (JWT) transmitted via standard HTTP Authorization header:
```text
Authorization: Bearer <jwt_token>
```

---

## 3. Core API Endpoints

### 3.1 System Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server uptime and health status check |

#### `GET /api/health` (Implemented in Stage 0)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-10-26T06:48:52.250Z",
    "version": "1.0.0",
    "uptime": 42.1
  },
  "message": "APIForge server is running"
}
```

---

### 3.2 Authentication Endpoints (Stage 3)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user account |
| `POST` | `/api/auth/login` | No | Authenticate user and receive JWT token |
| `GET` | `/api/auth/me` | Yes | Retrieve current authenticated user profile |

---

### 3.3 Target Management Endpoints (Stage 4)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/targets` | Yes | List targets owned by current user (paginated) |
| `POST` | `/api/targets` | Yes | Create and validate a new API test target |
| `GET` | `/api/targets/:id` | Yes | Retrieve target details |
| `PUT` | `/api/targets/:id` | Yes | Update target metadata & configuration |
| `DELETE` | `/api/targets/:id` | Yes | Remove target |
| `POST` | `/api/targets/:id/health` | Yes | Execute a live one-off probe to target URL |

---

### 3.4 Test Run & Execution Endpoints (Stage 6 & 7)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/tests` | Yes | Validate workload parameters, enforce limits, and queue test run |
| `GET` | `/api/tests` | Yes | List user's test runs with pagination (`?page=1&limit=10`) and filter (`?status=queued`) |
| `GET` | `/api/tests/engine/status`| Yes | Diagnostic status of k6 load-testing engine (version, path, active count) |
| `GET` | `/api/tests/:id` | Yes | Get test run details and configuration snapshot |
| `POST` | `/api/tests/:id/start` | Yes | Launch real k6 execution in background child worker process |
| `POST` | `/api/tests/:id/cancel` | Yes | Gracefully cancel and terminate active worker process |
| `DELETE`| `/api/tests/:id` | Yes | Delete a completed, cancelled, or failed test run |
| `POST` | `/api/tests/:id/simulate` | Yes | Stage 6 controlled lifecycle simulation (labeled `isSimulated: true`) |

---

### 3.5 Results, Comparison & Trends Endpoints (Stage 8, 10 & 12)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/results/:runId` | Yes | Fetch normalized performance metrics, SLA thresholds, and chart data |
| `GET` | `/api/results/dashboard/summary` | Yes | Fetch aggregate performance metrics and recent test runs across user account |
| `GET` | `/api/results/trends` | Yes | Historical performance trajectory over time with throughput and latency deltas (Stage 12) |
| `GET` | `/api/results/:runId/export`| Yes | Export metrics as CSV, JSON, or standalone HTML format (Stage 10 & 12) |
| `GET` | `/api/results/compare` | Yes | Compare metrics side-by-side across test runs (Stage 10) |

#### `GET /api/results/:runId` (Implemented in Stage 8)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "run": {
      "id": "6724...",
      "name": "Target Baseline Test",
      "status": "completed",
      "targetSnapshot": { "name": "Demo API", "baseUrl": "http://localhost:5001" },
      "config": { "vus": 10, "duration": 15, "rampUp": 3, "endpoint": "/api/demo/ping", "method": "GET" },
      "metrics": {
        "totalRequests": 1500,
        "successfulRequests": 1500,
        "failedRequests": 0,
        "requestsPerSecond": 100,
        "avgLatency": 12.5,
        "medianLatency": 11.2,
        "p90Latency": 18.4,
        "p95Latency": 22.1,
        "maxLatency": 45.0,
        "failureRate": 0,
        "networkErrors": 0,
        "statusCodeCounts": { "200": 1500 }
      },
      "isSimulated": false
    },
    "visualizations": {
      "percentilesBreakdown": [
        { "name": "Min", "latency": 5.2 },
        { "name": "Median (p50)", "latency": 11.2 },
        { "name": "Average", "latency": 12.5 },
        { "name": "p90", "latency": 18.4 },
        { "name": "p95", "latency": 22.1 },
        { "name": "Max", "latency": 45.0 }
      ],
      "statusCodeDistribution": [
        { "statusCode": 200, "count": 1500, "category": "2xx Success" }
      ],
      "workloadTimeline": [
        { "time": 0, "rps": 0, "vus": 0 }
      ]
    },
    "thresholds": [
      {
        "metric": "p95 Latency",
        "threshold": "500ms",
        "actual": "22.10ms",
        "passed": true
      },
      {
        "metric": "Failure Rate",
        "threshold": "< 1%",
        "actual": "0.00%",
        "passed": true
      }
    ]
  },
  "message": "Test run results retrieved successfully"
}
```

#### `GET /api/results/dashboard/summary` (Implemented in Stage 8)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalRuns": 12,
    "completedRuns": 10,
    "runningRuns": 0,
    "failedRuns": 2,
    "totalRequestsExecuted": 15420,
    "overallSuccessRate": 98.4,
    "avgLatencyAcrossRuns": 18.7,
    "recentRuns": [ ... ]
  },
  "message": "Dashboard results summary retrieved successfully"
}
```

#### `GET /api/results/:runId/export` (Implemented in Stage 10)
- **Query Parameters**:
  - `format`: Export format (`json` or `csv`, default: `json`)
- **Headers Returned**:
  - `Content-Type`: `application/json` or `text/csv`
  - `Content-Disposition`: `attachment; filename="apiforge-test-<runId>.<ext>"`
- **Security**: Sensitive authentication headers (`Authorization`, `X-Api-Key`, `Cookie`, passwords) are sanitized to `[REDACTED]`.

#### `GET /api/results/compare` (Implemented in Stage 10)
- **Query Parameters**:
  - `baseRunId`: 24-character hex ObjectId of baseline test run
  - `compareRunId`: 24-character hex ObjectId of comparison test run
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "baseRun": { "id": "...", "name": "Baseline V1", "metrics": { ... } },
    "compareRun": { "id": "...", "name": "Optimized V2", "metrics": { ... } },
    "compatibility": {
      "rating": "HIGH",
      "isSameTarget": true,
      "isSameEndpoint": true,
      "notes": ["Workload, target endpoint, and test configuration are fully compatible."]
    },
    "deltas": {
      "avgLatency": { "base": 35.0, "compare": 28.0, "diff": -7.0, "percentChange": -20.0, "isImprovement": true },
      "requestsPerSecond": { "base": 26.6, "compare": 33.3, "diff": 6.7, "percentChange": 25.1, "isImprovement": true }
    },
    "summary": "Average latency improved by 7ms (-20%); throughput increased by 6.7 req/s (+25.1%)"
  },
  "message": "Comparative test performance analysis generated successfully"
}
```

---

### 3.6 Test History & Filtering Endpoints (Stage 9)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/history` | Yes | List paginated test runs with status, target, date, search, and sorting |
| `GET` | `/api/history/stats` | Yes | Fetch high-level execution counts across statuses for user account |
| `POST` | `/api/history/:id/rerun` | Yes | Safely clone test configuration and queue a new execution run |
| `DELETE` | `/api/history/:id` | Yes | Delete a non-running test run from history |

#### `GET /api/history` (Implemented in Stage 9)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `status`: Filter by status (`all`, `completed`, `failed`, `cancelled`, `running`, `queued`)
  - `targetId`: Filter by target Mongo ObjectId
  - `search`: Case-insensitive search keyword matching name, snapshot name, or endpoint
  - `startDate`: ISO 8601 start date
  - `endDate`: ISO 8601 end date
  - `sortBy`: `createdAt`, `name`, `duration`, `vus` (default: `createdAt`)
  - `sortOrder`: `desc`, `asc` (default: `desc`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "testRuns": [
      {
        "id": "6724...",
        "name": "Alpha Checkout Test",
        "status": "completed",
        "target": { "name": "Demo API", "baseUrl": "http://localhost:5001" },
        "configuration": { "method": "GET", "endpoint": "/api/demo/ping", "vus": 10, "duration": 15 },
        "metrics": { "totalRequests": 500, "requestsPerSecond": 33.3, "avgLatency": 24.5 },
        "createdAt": "2026-11-05T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "filters": {
      "status": "all",
      "targetId": null,
      "search": "",
      "sortBy": "createdAt",
      "sortOrder": "desc"
    }
  },
  "message": "Test history retrieved successfully"
}
```

---

### 3.7 Demo Sandbox Endpoints (Stage 5)
*Hosted on isolated demo port (:5001) to safeguard core platform:*
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/demo/ping` | No | Instant 200 OK baseline response |
| `GET` | `/api/demo/delayed` | No | Artificial latency benchmark (`?ms=250`) |
| `GET` | `/api/demo/error` | No | Artificial error injection (`?status=500`) |
| `GET` | `/api/demo/rate-limited`| No | Sliding window rate limit (returns 429 when cap hit) |
| `GET` | `/api/demo/health` | No | Demo service status probe |

---

## 4. Standard Error Codes Directory

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body or parameters failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired authentication token |
| `FORBIDDEN` | 403 | User does not own the requested target or test resource |
| `NOT_FOUND` | 404 | Endpoint or database resource not found |
| `CONFLICT` | 409 | Duplicate entity (e.g., email already registered) |
| `SSRF_DETECTED` | 400 | Target URL resolved to loopback, private or cloud metadata IP |
| `CONCURRENCY_LIMIT` | 429 | Exceeded maximum concurrent running test limit |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server exception (stack hidden in production) |
