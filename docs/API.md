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
| `GET` | `/api/tests/:id` | Yes | Get test run details and configuration snapshot |
| `POST` | `/api/tests/:id/cancel` | Yes | Gracefully cancel an active or queued test run |
| `DELETE`| `/api/tests/:id` | Yes | Delete a completed, cancelled, or failed test run |
| `POST` | `/api/tests/:id/simulate` | Yes | Stage 6 controlled lifecycle simulation (labeled `isSimulated: true`) |

---

### 3.5 Results & Comparison Endpoints (Stage 8 & 10)
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/results/:runId` | Yes | Fetch normalized performance metrics and charts |
| `GET` | `/api/results/:runId/export`| Yes | Export metrics as CSV or JSON format |
| `GET` | `/api/results/compare` | Yes | Compare metrics side-by-side across test runs |

---

### 3.6 Demo Sandbox Endpoints (Stage 5)
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
