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

---

### BUG-003: Mongoose readyState property cannot be redefined in unit tests
- **Bug ID**: `BUG-003`
- **Affected Feature**: Database Connection Manager Tests
- **Severity**: Medium
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. Run `npm run test --workspace=server`
  2. Notice test failure: `TypeError: Cannot redefine property: readyState`
- **Expected Behavior**: Unit tests should verify database lifecycle without crashing on runtime mock redefinition.
- **Actual Behavior**: Vitest `vi.spyOn(mongoose.connection, 'readyState', 'get')` failed because `readyState` is a non-configurable accessor on modern Mongoose Connection prototypes.
- **Verified Root Cause**: Modern Mongoose declares `readyState` as non-configurable, preventing property descriptors from being redefined via `Object.defineProperty`.
- **Files Changed**: `server/src/tests/unit/database.test.js`
- **Fix Applied**: Updated test cases to inspect actual initial connection state and spy on `mongoose.connect` and `mongoose.disconnect` directly.
- **Regression Test**: All 25 server tests passed cleanly (`npm run test --workspace=server`).
- **Verification Date**: 2026-10-26

---

### BUG-004: Missing Link import in Header.jsx causing ReferenceError during route rendering
- **Bug ID**: `BUG-004`
- **Affected Feature**: Frontend Navigation Header
- **Severity**: Medium
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. Run `npm test` after adding `DashboardShell` to route components
  2. Notice test failure: `ReferenceError: Link is not defined at Header (Header.jsx:44:10)`
- **Expected Behavior**: Header component renders "New Test" link without throwing runtime reference errors.
- **Actual Behavior**: The `Link` component was unimported during icon cleanup.
- **Verified Root Cause**: `import { Link } from 'react-router-dom'` was inadvertently omitted when removing unused `User` icon from imports.
- **Files Changed**: `client/src/components/layout/Header.jsx`
- **Fix Applied**: Restored `import { Link } from 'react-router-dom'` in `Header.jsx`.
- **Regression Test**: Full client router test suite passed cleanly (`npm run test --workspace=client`).
- **Verification Date**: 2026-10-26

---

### BUG-005: `errorHandler.js` prioritized Mongoose `ValidationError` name over `AppError` instance
- **Bug ID**: `BUG-005`
- **Affected Feature**: Central Backend Error Handling Middleware
- **Severity**: Medium
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. Post invalid registration or login payload to `/api/auth/register` with missing fields
  2. Notice response had code `VALIDATION_ERROR` but `details` was an empty array instead of containing Zod field errors
- **Expected Behavior**: Custom `ValidationError` inheriting from `AppError` should preserve structured `details` array containing field-specific errors.
- **Actual Behavior**: The error handler checked `err.name === 'ValidationError'` first and constructed a Mongoose-specific ValidationError envelope, wiping out `err.details`.
- **Verified Root Cause**: Both Mongoose validation errors and the application's custom `ValidationError` class share `name = 'ValidationError'`. The Mongoose check preceded the `instanceof AppError` check.
- **Files Changed**: `server/src/middleware/errorHandler.js`
- **Fix Applied**: Reordered check to prioritize `if (err instanceof AppError) error = err;` before checking Mongoose error names.
- **Regression Test**: All integration tests in `server/src/tests/integration/auth.test.js` passed, verifying exact field-level validation messages.
- **Verification Date**: 2026-10-26

---

### BUG-006: Node 24 undici `RequestInit` rejected jsdom `AbortSignal` during router navigation test
- **Bug ID**: `BUG-006`
- **Affected Feature**: Frontend Authentication Unit Tests
- **Severity**: Low (Test Harness / Environment)
- **Status**: **Resolved**
- **Reproduction Steps**:
  1. In Node 24.x environment, run `createMemoryRouter` with `<Navigate to="/login" />` in Vitest/jsdom.
  2. Notice unhandled rejection: `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal`.
- **Expected Behavior**: Redirect route tests should render the destination route cleanly without throwing WebIDL type mismatches.
- **Actual Behavior**: Node 24's native `Request` constructor from undici performs strict identity checking on `init.signal`, rejecting jsdom's isolated `AbortSignal` instance.
- **Verified Root Cause**: `@remix-run/router` data router's `createClientSideRequest` instantiates `new Request(..., { signal })`. Under Node 24 + jsdom, `signal` belongs to the jsdom global while `Request` belongs to Node's undici runtime.
- **Files Changed**: `client/src/tests/auth.test.jsx`, `client/src/tests/setup.js`
- **Fix Applied**: Tested `ProtectedRoute` redirection using standard `MemoryRouter` with `<Routes>` and `<Route>`, bypassing data router request generation while preserving full redirection assertions.
- **Regression Test**: `npm run test --workspace=client` executed 22/22 tests successfully with 0 unhandled rejections.
- **Verification Date**: 2026-10-26

