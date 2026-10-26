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

| **Ownership Authorization** | Scoped queries preventing unauthorized cross-user access | Stage 4 | Pending Stage 4 implementation | ⏳ Pending |
| **SSRF Address Filter** | Block private, loopback, and cloud metadata IP destinations | Stage 4 | Pending Stage 4 implementation | ⏳ Pending |
| **Safe Process Invocation** | Use argument arrays with `spawn` without shell interpolation | Stage 7 | Pending Stage 7 implementation | ⏳ Pending |
| **Hard Concurrency Caps** | Enforce maximum concurrent active tests per instance | Stage 7 | Pending Stage 7 implementation | ⏳ Pending |
| **Sensitive Header Masking**| Redact secrets in target configs and exported results | Stage 10 | Pending Stage 10 implementation | ⏳ Pending |
