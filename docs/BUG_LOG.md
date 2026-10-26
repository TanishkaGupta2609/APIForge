# APIForge — Living Bug & Remediation Log

This log documents issues identified during development, their verified root causes, reproduction steps, applied fixes, and regression test verification.

---

## 🐛 Bug Entries

### BUG-001: Unhandled async state update warning in `App.test.jsx`
- **Bug ID**: `BUG-001`
- **Affected Feature**: Client Testing Setup
- **Severity**: Low (Warning)
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. Run `npm run test --workspace=client`
  2. Notice React warning: `Warning: An update to App inside a test was not wrapped in act(...)`
- **Expected Behavior**: Component test should cleanly wait for async fetch response to resolve before completing.
- **Actual Behavior**: Test asserted synchronously before the mock `fetch` resolved, causing state update after test completion.
- **Verified Root Cause**: `useEffect` inside `App.jsx` fetched server health asynchronously, but test assertions in `App.test.jsx` finished before the promise chain completed.
- **Files Changed**: `client/src/tests/App.test.jsx`
- **Fix Applied**: Wrapped status assertion inside `waitFor(() => expect(screen.getByText(/ONLINE/i)).toBeInTheDocument())`.
- **Regression Test**: `npm run test --workspace=client` executed and passed with 0 warnings.
- **Verification Date**: 2026-10-26

---

### BUG-002: ESLint unused parameter warning in Express error middleware
- **Bug ID**: `BUG-002`
- **Affected Feature**: Server Error Middleware & Linting
- **Severity**: Low (Lint Warning)
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. Run `npm run lint --workspace=server`
  2. Notice warning: `'next' is defined but never used. Allowed unused args must match /^_/u`
- **Expected Behavior**: Linting should pass cleanly without warnings.
- **Actual Behavior**: Express requires four arguments `(err, req, res, next)` to identify an error middleware, triggering standard unused parameter warnings.
- **Verified Root Cause**: ESLint `no-unused-vars` rule is configured to allow unused parameters only when prefixed with `_`.
- **Files Changed**: `server/src/app.js`
- **Fix Applied**: Renamed `next` parameter to `_next` in the error handling middleware signature.
- **Regression Test**: `npm run lint --workspace=server` passed with 0 warnings and 0 errors.
- **Verification Date**: 2026-10-26
