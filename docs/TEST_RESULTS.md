# APIForge — Test Execution Results Log

This document records the exact test commands executed, their terminal outputs, execution timestamps, and pass/fail statuses. Tests that have not been executed are explicitly labeled **Not Run**.

---

## 📊 Summary of Test Runs

| Date & Time (UTC) | Test Suite | Command Executed | Outcome | Tests Passed | Duration |
|---|---|---|---|---|---|
| 2026-10-26 06:44:49 | Server Unit & Integration | `npm run test --workspace=server` | **Passed** | 5 / 5 | 1.23s |
| 2026-10-26 06:45:29 | Client Unit Tests | `npm run test --workspace=client` | **Passed** | 2 / 2 | 2.72s |
| 2026-10-26 07:02:56 | Server Suite (Stage 1) | `npm run test --workspace=server` | **Passed** | 25 / 25 | 1.84s |
| 2026-10-26 07:02:59 | Monorepo Full Suite | `npm test` | **Passed** | 27 / 27 | 4.51s |
| 2026-10-26 07:02:46 | Monorepo ESLint | `npm run lint` | **Passed** | Clean (0 err, 0 warn) | 0.78s |
| 2026-10-26 07:03:27 | Live Health & DB State | `curl.exe -s http://localhost:5000/api/health` | **Passed** | Status 200 (DB Connected) | 0.08s |

---

## 🔍 Detailed Test Execution Logs

### 1. Server Unit & Integration Tests
**Command:** `npm run test --workspace=server`  
**Runner:** Vitest v3.2.7  
**Results:**
```text
✓ src/tests/unit/env.test.js (3 tests) 6ms
  ✓ validates and loads properly configured environment variables
  ✓ rejects short JWT_SECRET under 32 characters for security
  ✓ rejects invalid client URL format
✓ src/tests/integration/health.test.js (2 tests) 60ms
  ✓ GET /api/health returns 200 with healthy status
  ✓ GET /api/unknown-endpoint returns 404 with structured error

Test Files  2 passed (2)
     Tests  5 passed (5)
  Duration  1.23s
```

### 2. Client Unit Tests
**Command:** `npm run test --workspace=client`  
**Runner:** Vitest v3.2.7 + React Testing Library + jsdom  
**Results:**
```text
✓ src/tests/App.test.jsx (2 tests) 73ms
  ✓ renders the brand title and product tagline
  ✓ renders stage 0 indicator badge

Test Files  1 passed (1)
     Tests  2 passed (2)
  Duration  2.72s
```

### 3. Client Production Build
**Command:** `npm run build --workspace=client`  
**Runner:** Vite v6.4.5  
**Results:**
```text
vite v6.4.5 building for production...
transforming...
✓ 27 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.68 kB │ gzip:  0.41 kB
dist/assets/index-BbsdTFph.css   10.21 kB │ gzip:  2.75 kB
dist/assets/index-D_MaqjKS.js   147.26 kB │ gzip: 47.41 kB
✓ built in 1.69s
```

### 4. Code Linting & Static Analysis
**Command:** `npm run lint`  
**Runner:** ESLint v9 (Flat Config)  
**Results:**
```text
> apiforge-monorepo@1.0.0 lint
> npm run lint --workspaces

> apiforge-server@1.0.0 lint
> eslint "src/**/*.js"

> apiforge-client@1.0.0 lint
> eslint "src/**/*.{js,jsx}"

(Exited 0 with 0 errors and 0 warnings)
```

### 5. Live Server Startup & Health Smoke Test
**Command:** `node src/server.js` + `curl.exe -s http://localhost:5000/api/health`  
**Response Received:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-10-26T06:48:52.250Z",
    "version": "1.0.0",
    "uptime": 8.0608706
  },
  "message": "APIForge server is running"
}
```
