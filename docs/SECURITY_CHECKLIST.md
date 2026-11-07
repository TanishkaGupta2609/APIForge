# APIForge — Security Verification Checklist

This living checklist tracks the verification status of all security controls across development stages.

---

## 🛡️ Security Verification Status

| Security Control | Description | Stage | Verification Evidence | Status |
|---|---|---|---|---|
| **Fail-Fast Env Validation** | Validate all environment variables with Zod on server startup | Stage 0 | `server/src/tests/unit/env.test.js` | ✅ **Passed** |
| **JWT Secret Entropy** | Enforce minimum 32 characters for `JWT_SECRET` | Stage 0 | `server/src/tests/unit/env.test.js` (rejection test) | ✅ **Passed** |
| **HTTP Security Headers** | Protect against clickjacking, sniffing, and XSS via Helmet | Stage 0 | Enabled in `server/src/app.js` | ✅ **Passed** |
| **CORS Policy** | Restrict cross-origin access strictly to configured `CLIENT_URL` | Stage 0 | Enabled in `server/src/app.js` | ✅ **Passed** |
| **Body Size Limits** | Cap JSON and URL-encoded payloads at 1MB to prevent DoS | Stage 0 | Configured in `server/src/app.js` | ✅ **Passed** |
| **Stack Trace Privacy** | Hide stack traces from API error responses outside development | Stage 0 | Verified in `server/src/shared/utils/response.js` | ✅ **Passed** |
| **Structured 404 Handler** | Prevent default Express 404 HTML leaking server technology | Stage 0 | Verified in `health.test.js` | ✅ **Passed** |
| **Standardized Error Handling**| Centralized error middleware shielding database internals | Stage 1 | `server/src/middleware/errorHandler.js` | ✅ **Passed** |
| **Strict Request Validation** | Zod middleware validating bodies, queries, and params | Stage 1 | `server/src/tests/unit/validateRequest.test.js` | ✅ **Passed** |
| **API Rate Limiting** | Throttling requests to prevent resource starvation | Stage 1 | `server/src/middleware/rateLimiter.js` | ✅ **Passed** |
| **Bcrypt Password Hashing** | Store passwords as salted bcrypt hashes (>=10 rounds) | Stage 3 | `server/src/tests/unit/user.model.test.js` & `server/src/tests/integration/auth.test.js` | ✅ **Passed** |
| **JWT Authentication & Protection** | Verify Bearer JWT tokens, reject tampered/expired tokens, exclude passwordHash | Stage 3 | `server/src/tests/unit/authenticate.test.js` & `server/src/tests/integration/auth.test.js` | ✅ **Passed** |
| **Ownership Authorization (BOLA/IDOR)** | Scoped queries preventing unauthorized cross-user access | Stage 4 & 11 | `server/src/tests/integration/target.test.js` & `securityHardening.test.js` | ✅ **Passed** |
| **SSRF Multi-Layer Filtering** | Block private RFC 1918, loopback, and cloud metadata (`169.254.169.254`) destinations | Stage 4 & 11 | `server/src/tests/unit/ssrfFilter.test.js` & `securityHardening.test.js` | ✅ **Passed** |
| **Safe Process Invocation** | Use argument arrays with `spawn` without shell interpolation | Stage 7 & 11 | `server/src/load-testing/processManager.js` & `processManager.test.js` | ✅ **Passed** |
| **Script Injection Immunity** | Serialize URL, headers, and body into k6 script constants via `JSON.stringify` | Stage 7 & 11 | `server/src/load-testing/scriptBuilder.js` & `securityHardening.test.js` | ✅ **Passed** |
| **ReDoS Query Defense** | Escape special regex characters in history and target search inputs | Stage 9 & 11 | `history.service.js` & `securityHardening.test.js` | ✅ **Passed** |
| **Hard Concurrency Caps** | Enforce maximum 2 concurrent active tests per user (`MAX_CONCURRENT_RUNS_PER_USER`) | Stage 7 & 11 | `test.service.js`, `history.service.js`, `securityHardening.test.js` | ✅ **Passed** |
| **Secret Redaction Across Layers**| Redact Authorization, Cookie, API keys in targets, tests, results, history, and exports | Stage 10 & 11 | `results.service.js`, `test.service.js`, `target.service.js`, `securityHardening.test.js` | ✅ **Passed** |
| **Process Tree Termination** | Clean process killing with Windows `taskkill /pid <PID> /T /F` & POSIX `SIGKILL` | Stage 7 & 11 | `server/src/load-testing/processManager.js` | ✅ **Passed** |
| **Crash Recovery & Reconciliation**| Detect interrupted test runs on reboot and reconcile to `FAILED` with `INTERNAL_ERROR` | Stage 7 & 11 | `server/src/load-testing/reconciler.js` & `securityHardening.test.js` | ✅ **Passed** |
