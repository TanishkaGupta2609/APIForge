# APIForge — Test Execution Results Log

This document records the exact test commands executed, their terminal outputs, execution timestamps, and pass/fail statuses. Tests that have not been executed are explicitly labeled **Not Run**.

---

## 📊 Summary of Test Runs

| Date & Time (UTC) | Test Suite | Command Executed | Outcome | Tests Passed | Duration |
|---|---|---|---|---|---|
| 2026-10-26 06:44:49 | Server Unit & Integration | `npm run test --workspace=server` | **Passed** | 5 / 5 | 1.23s |
| 2026-10-26 06:45:29 | Client Unit Tests | `npm run test --workspace=client` | **Passed** | 2 / 2 | 2.72s |
| 2026-10-26 07:02:56 | Server Suite (Stage 1) | `npm run test --workspace=server` | **Passed** | 25 / 25 | 1.84s |
| 2026-10-26 11:04:09 | Client Suite (Stage 2) | `npm run test --workspace=client` | **Passed** | 18 / 18 | 5.42s |
| 2026-10-26 11:04:36 | Full Monorepo Suite | `npm test` | **Passed** | 43 / 43 | 7.24s |
| 2026-10-26 11:32:05 | Client Suite (Stage 3 Auth) | `npm run test --workspace=client` | **Passed** | 22 / 22 | 8.59s |
| 2026-10-26 11:33:17 | Server Suite (Stage 3 Auth) | `npm run test --workspace=server` | **Passed** | 42 / 42 | 3.27s |
| 2026-10-26 11:33:53 | Full Monorepo Suite (Stage 3) | `npm test` | **Passed** | 64 / 64 | 9.39s |
| 2026-10-26 11:34:26 | Monorepo ESLint (Stage 3) | `npm run lint` | **Passed** | Clean (0 err, 0 warn) | 1.12s |
| 2026-10-26 11:34:41 | Client Production Build (Stage 3) | `npm run build --workspace=client` | **Passed** | Bundle generated | 4.28s |
| 2026-10-26 11:54:57 | Server Suite (Stage 4 Target) | `npm run test --workspace=server` | **Passed** | 65 / 65 | 3.02s |
| 2026-10-26 11:58:15 | Client Suite (Stage 4 Target) | `npm run test --workspace=client` | **Passed** | 26 / 26 | 4.28s |
| 2026-10-26 11:59:13 | Full Monorepo Suite (Stage 4) | `npm test` | **Passed** | 91 / 91 | 7.28s |
| 2026-10-26 11:59:55 | Monorepo ESLint (Stage 4) | `npm run lint` | **Passed** | Clean (0 err, 0 warn) | 0.88s |
| 2026-10-26 12:00:11 | Client Production Build (Stage 4) | `npm run build --workspace=client` | **Passed** | Bundle generated | 3.00s |
| 2026-10-26 13:20:06 | Server Suite (Stage 5 Demo) | `npm run test --workspace=server` | **Passed** | 72 / 72 | 4.17s |
| 2026-10-26 13:22:27 | Client Suite (Stage 5 Demo) | `npm run test --workspace=client` | **Passed** | 30 / 30 | 6.31s |
| 2026-10-26 13:25:47 | Full Monorepo Suite (Stage 5) | `npm test` | **Passed** | 102 / 102 | 10.37s |
| 2026-10-26 13:26:02 | Monorepo ESLint (Stage 5) | `npm run lint` | **Passed** | Clean (0 err, 0 warn) | 0.95s |
| 2026-10-26 13:26:13 | Client Production Build (Stage 5) | `npm run build --workspace=client` | **Passed** | Bundle generated | 4.33s |
| 2026-10-27 11:00:00 | Server Suite (Stage 6 Config & Lifecycle) | `npm run test --workspace=server` | **Passed** | 96 / 96 | 21.42s |
| 2026-10-27 11:15:00 | Client Suite (Stage 6 Config & UI) | `npm run test --workspace=client` | **Passed** | 35 / 35 | 6.84s |
| 2026-10-27 11:16:00 | Full Monorepo Suite (Stage 6) | `npm test` | **Passed** | 131 / 131 | 18.25s |
| 2026-10-27 11:17:00 | Monorepo ESLint (Stage 6) | `npm run lint --workspaces` | **Passed** | Clean (0 err, 0 warn) | 1.15s |
| 2026-10-27 11:17:30 | Client Production Build (Stage 6) | `npm run build` | **Passed** | Built in 4.38s | 4.38s |
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
