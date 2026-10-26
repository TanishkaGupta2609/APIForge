# APIForge — Test Plan & QA Strategy

## 1. QA Objective & Philosophy

The testing strategy guarantees that APIForge functions reliably under real loads, avoids fabricated metrics, secures user data and internal networks against attacks, and prevents regressions.

Every feature follows a strict lifecycle:
**Unit Test → Integration Test → Security Verification → Regression Check → Documentation Update**.

---

## 2. Test Pyramid & Tooling

```text
       ▲
      / \     E2E Real Load Tests (k6 CLI + Built-in Demo API)
     /   \
    /-----\   Integration Tests (Vitest + Supertest + In-Memory MongoDB)
   /       \
  /---------\ Component & Unit Tests (Vitest + React Testing Library + jsdom)
```

- **Backend Unit & Integration Testing**: Vitest with Supertest.
- **Frontend Unit & Component Testing**: Vitest with React Testing Library and jsdom.
- **Real Load Testing Verification**: Native k6 executions directed at the built-in isolated Demo API (`:5001`).

---

## 3. Test Suites by Phase

### 3.1 Unit Testing Scope
- **Validation**: Schema tests for all Zod validators (auth bodies, target URLs, test run configs).
- **Environment**: Ensuring fail-fast validation on startup when configuration or secrets are invalid.
- **State Machine**: Testing TestRun transition invariants (e.g. `cancelled` cannot transition to `completed`).
- **Metrics Parsing**: Parsing raw k6 JSON summaries into normalized data models, including handling zero-request scenarios and missing fields.
- **UI Components**: Testing loading states, error alerts, empty states, and button actions.

### 3.2 Integration Testing Scope
- **Auth Flow**: Register → Login → Protected Endpoint → Expired Token.
- **Target Lifecycle**: Create Target → Fetch Target → Update Target → Health Check → Delete Target.
- **Test Execution Flow**: Start Test → Worker Spawn → State Polling → Process Exit → Result Persistence.
- **Cancellation**: Terminate active test run → Process SIGTERM verification → Stored state becomes `cancelled`.

### 3.3 Security Testing Scope
- **SSRF Defense**: Verification that targets resolving to `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254` (cloud metadata) are blocked.
- **Authorization Scoping**: Asserting that User A cannot read, update, cancel, or export User B's targets or test runs.
- **Resource Caps**: Verifying virtual user count and duration limits cannot be bypassed via forged API payloads.
- **Secret Redaction**: Ensuring tokens, password hashes, and sensitive target headers never appear in API responses or logs.

### 3.4 Regression Protocol
Whenever a bug is fixed (documented in `docs/BUG_LOG.md`), a regression test must be added to the relevant test suite, and the entire monorepo test suite (`npm test`) must pass before committing.
