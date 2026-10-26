# MASTER PROMPT: BUILD APIForge — A COMPLETE, ADVANCED API LOAD-TESTING PLATFORM

## 1. ROLE AND OBJECTIVE

Act as a senior software architect, MERN-stack developer, frontend engineer, backend engineer, QA automation engineer, application security engineer, and technical mentor.

Build a complete, professional web application called **APIForge**, an API load-testing and performance-analysis platform.

This is a fifth-semester college group project developed by four students. The final application must look professional, provide real functionality, follow a clean architecture, be secure, and remain easy for students to understand, debug, maintain, test, and present.

Do not merely generate code. Inspect the workspace, plan the architecture, implement the application in small parts, test every feature, fix errors as they appear, review security throughout development, and maintain accurate documentation.

**Primary rule: Build one small part, test it, integrate it, review its security, fix its errors, and only then continue to the next part.**

Build the complete application across multiple stages. Do not attempt to implement every feature in one enormous response.

---

## 2. PRODUCT VISION

APIForge helps developers understand how an API performs under controlled workloads.

A user should be able to configure an API endpoint they own or are authorized to test, run a controlled load test, monitor execution, inspect performance metrics, compare previous runs, and export results.

The platform must use a real load-testing engine. It must not pretend that fabricated frontend numbers are actual performance measurements.

The finished application should provide:

- A polished landing page.
- Registration and login.
- An authenticated dashboard.
- API target management.
- Request configuration.
- Load-test configuration.
- Real k6-based test execution.
- Running, completed, failed, and cancelled test states.
- Performance charts and metric cards.
- Detailed result pages.
- Test history and comparisons.
- A built-in demo API.
- CSV and JSON exports.
- Useful error handling.
- Security controls and authorization.
- Automated unit, integration, and regression tests.
- Documentation and reproducible local setup.

---

## 3. REQUIRED TECHNOLOGY STACK

Use the MERN stack with the following technologies.

### Frontend
- React
- Vite
- JavaScript
- React Router
- Axios
- Tailwind CSS
- Recharts
- React Testing Library
- Vitest

### Backend
- Node.js
- Express.js
- JavaScript
- REST API architecture
- MongoDB
- Mongoose
- JWT-based authentication
- bcrypt or bcryptjs for password hashing
- Zod for request validation
- A consistent logging solution
- Jest or Vitest with Supertest for backend testing; select one approach and use it consistently.

### Load testing
- k6
- A dedicated load-testing service
- A controlled child-process runner
- A script builder using validated configuration
- A k6 summary parser
- Test-run lifecycle and cancellation management

### Development tools
- Git and GitHub
- ESLint
- Prettier
- MongoDB Compass
- Postman
- Environment variables
- Optional Docker Compose after the core application works

Use compatible, supported package versions. Avoid unnecessary dependencies.

Do not replace the required MERN stack with another framework.

---

## 4. PROJECT ARCHITECTURE

Use a **modular monolith with a separate load-test worker process**.

Do not begin with microservices, Kubernetes, Kafka, or unnecessary enterprise infrastructure. Keep the initial system straightforward and easy to explain.

Separate routing, controllers, business logic, database models, validation, infrastructure, and presentation.

Suggested project structure:

```text
APIForge/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.jsx
│   │   │   └── router.jsx
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── charts/
│   │   │   ├── forms/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── targets/
│   │   │   ├── test-runs/
│   │   │   ├── results/
│   │   │   ├── history/
│   │   │   └── demo/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── apiClient.js
│   │   │   ├── authService.js
│   │   │   ├── targetService.js
│   │   │   ├── testService.js
│   │   │   └── resultService.js
│   │   ├── utils/
│   │   ├── styles/
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example
│
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js
│   │   │   ├── validateRequest.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   └── rateLimiter.js
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── targets/
│   │   │   ├── tests/
│   │   │   ├── results/
│   │   │   ├── history/
│   │   │   └── demo/
│   │   ├── load-testing/
│   │   │   ├── k6Runner.js
│   │   │   ├── scriptBuilder.js
│   │   │   ├── processManager.js
│   │   │   └── summaryParser.js
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── scripts/
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── TEST_PLAN.md
│   ├── TEST_RESULTS.md
│   ├── SECURITY.md
│   ├── SECURITY_CHECKLIST.md
│   ├── TROUBLESHOOTING.md
│   ├── BUG_LOG.md
│   └── PROJECT_STAGES.md
│
├── .gitignore
├── package.json
└── README.md
```

You may adjust the structure if there is a clear technical reason. Keep module responsibilities understandable and avoid giant files, duplicated implementations, circular dependencies, and unnecessary abstractions.

### Backend responsibilities

- Routes define endpoints.
- Controllers handle HTTP input and output.
- Services implement business rules.
- Models define MongoDB schemas.
- Validation checks incoming data.
- Middleware handles authentication, permissions, and errors.
- The load-testing layer controls k6 execution and result parsing.

### Frontend responsibilities

- Pages represent complete screens.
- Components provide reusable UI.
- Feature folders group related functionality.
- Services handle API requests.
- Hooks encapsulate reusable client-side behavior.
- Charts visualize actual stored metrics.

Explain the request flow between these layers in the documentation.

---

## 5. WEBSITE DESIGN AND USER EXPERIENCE

Build a premium, modern developer-tool interface.

The application must look like a credible software product, not a basic CRUD assignment.

### Visual direction

Use a clean developer-dashboard aesthetic with:

- A professional dark or light theme; choose a consistent default.
- Strong typography and clear visual hierarchy.
- Carefully spaced cards and panels.
- Subtle borders and shadows.
- A consistent color system.
- Restrained accent colors.
- Responsive layouts.
- Clear charts and metric cards.
- Consistent button and form styles.
- Helpful tooltips and inline explanations.
- Accessible contrast and keyboard navigation.
- Responsive side navigation and top navigation.
- Loading skeletons, empty states, success feedback, and error states.

Avoid excessive gradients, decorative animations, cluttered dashboards, and unnecessary effects.

Do not sacrifice usability for appearance.

### Landing page

Create a polished public landing page containing:

1. Navigation bar with APIForge branding.
2. Hero section explaining API performance testing.
3. Primary call to action to start or access the dashboard.
4. Secondary call to action to explore the demo.
5. Feature cards explaining load testing, metrics, history, and analysis.
6. A visual preview of the dashboard.
7. A simple workflow explaining how the platform works.
8. Security and responsible-testing messaging.
9. Footer with navigation and project information.

Do not claim enterprise-grade certifications, guaranteed performance improvements, or capabilities the application does not actually provide.

### Authentication pages

Create registration and login pages with:

- Validated forms.
- Password visibility control.
- Loading states.
- Clear validation messages.
- Friendly authentication errors.
- Responsive design.
- Proper redirect behavior after authentication.

### Authenticated dashboard

Include:

- Overview of saved targets.
- Total test runs.
- Completed, failed, and currently running tests.
- Recent test runs.
- Latest performance summary.
- Quick actions to create a target or start a test.
- Empty states for new users.
- Clear distinction between real test data and demo examples.

Use real backend data, not hardcoded dashboard statistics.

### Target management

Provide:

- Target list.
- Add target.
- Edit target.
- View target details.
- Delete target with confirmation.
- Target health-check action.
- Target name, base URL, description, and configuration.
- Validation feedback.
- Useful empty and error states.

### Test configuration

Create an understandable configuration interface with:

- Target selection.
- HTTP method.
- Endpoint path.
- Request headers.
- Optional request body.
- Virtual-user count.
- Test duration.
- Ramp-up and ramp-down profile where supported.
- Optional pass/fail thresholds.
- Configuration summary.
- Safety-limit explanation.
- Start-test confirmation.

Validate inputs on both frontend and backend. Backend validation is authoritative.

Do not store secrets in browser logs or show sensitive values in test history.

### Test execution page

Show:

- Test name and target.
- Run status.
- Start time and elapsed time.
- Configured virtual users.
- Progress information where it can be measured accurately.
- Available metrics during execution.
- Cancel-test action.
- Useful failure messages.
- Refresh or polling behavior.

Do not invent live progress percentages if k6 does not provide the data needed to calculate them. Clearly distinguish live measurements from final summaries.

### Results page

Display metric cards and charts for:

- Total requests.
- Requests per second.
- Average latency.
- Median latency.
- p90 latency.
- p95 latency.
- Maximum latency.
- HTTP failure rate.
- Network errors.
- HTTP status-code distribution.
- Response-time distribution when data is available.
- Configured virtual users.
- Test duration.
- Start and end timestamps.

Use units and explanatory labels. Show unavailable metrics explicitly instead of fabricating values.

### Test history

Include:

- Paginated test history.
- Filters by target, status, and date where appropriate.
- Search by test name.
- Run details.
- Re-run configuration where safe.
- Delete-history behavior if supported.
- Links to result details.

### Test comparison

Allow users to compare two or more completed runs when compatible.

Show differences in latency, throughput, error rate, and request counts. Explain that results can differ due to machine resources, network conditions, target state, and test configuration.

### Export

Support CSV and JSON exports of stored results.

Verify ownership and authorization before exporting. Do not include passwords, tokens, or sensitive request headers.

### Responsive behavior

Ensure the landing page, forms, navigation, charts, tables, and dashboards work on desktop, tablet, and mobile layouts.

---

## 6. DATABASE DESIGN

Use MongoDB and Mongoose.

Define these models with validation, timestamps, appropriate indexes, and clear ownership rules.

### User

Fields:
- Name.
- Email, normalized and unique.
- Password hash.
- Optional minimal account settings.
- Timestamps.

Never return password hashes in API responses.

### Target

Fields:
- Owner reference.
- Name.
- Base URL.
- Description.
- Approved target configuration.
- Default request configuration where appropriate.
- Timestamps.

Do not expose stored credentials or sensitive headers in responses.

### TestRun

Fields:
- Owner reference.
- Target reference.
- Test configuration snapshot.
- Lifecycle status.
- Start and end times.
- Duration.
- Progress information where available.
- Normalized metrics summary.
- Error category and safe error summary.
- Worker/process metadata where appropriate.
- Timestamps.

Support these statuses:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Define permitted status transitions. Prevent a failed or cancelled run from accidentally becoming completed due to a late worker event.

### Additional models

Add models only when required by a real feature. Avoid redundant collections and premature complexity.

### Database requirements

- Enforce ownership.
- Validate references.
- Add indexes for common queries.
- Use pagination for growing collections.
- Handle missing or deleted targets gracefully.
- Define deletion behavior.
- Avoid leaking database internals to clients.
- Use a dedicated test database or isolated test environment for automated integration tests.

---

## 7. AUTHENTICATION AND AUTHORIZATION

Implement real authentication.

Required features:

- User registration.
- Login.
- Logout behavior appropriate to the chosen authentication strategy.
- Password hashing.
- Token expiration.
- Protected frontend routes.
- Protected backend endpoints.
- Authorization checks.
- Consistent authentication errors.

Prefer a secure, documented token strategy. If using JWT in an HttpOnly cookie, configure cookie security, CSRF protections where applicable, and same-site behavior correctly. If using bearer tokens, explain the storage trade-offs and avoid insecure long-lived browser storage patterns.

Never assume that hiding a frontend button protects an API endpoint.

Every operation on a target or test run must verify that the authenticated user owns the resource or has explicit permission.

Write tests for:
- Missing tokens.
- Invalid tokens.
- Expired tokens.
- Accessing another user's target.
- Accessing another user's run.
- Cancelling another user's run.
- Exporting another user's results.
- Modifying resource IDs to attempt unauthorized access.

---

## 8. REAL LOAD TESTING WITH K6

The load-testing engine is a core feature. Implement actual k6 execution.

Do not substitute fake numbers for real measurements.

### Execution flow

1. Authenticate the user.
2. Validate the requested target and configuration.
3. Verify ownership and target authorization.
4. Apply safe resource limits.
5. Create a TestRun record.
6. Start k6 using a controlled worker/process layer.
7. Record the process associated with the run.
8. Collect process output, errors, and exit status.
9. Parse the k6 summary.
10. Normalize metrics.
11. Persist the final results.
12. Update lifecycle status.
13. Notify or expose the updated status to the frontend.
14. Clean up resources.

### Process management

Use Node.js process APIs such as `spawn` with an argument array.

Never concatenate untrusted input into shell commands.

Requirements:
- Do not block the Express event loop while a test runs.
- Handle process exit and unexpected termination.
- Support cancellation.
- Implement timeouts.
- Limit concurrent tests.
- Avoid orphan processes.
- Capture useful diagnostic output.
- Redact secrets.
- Validate generated script configuration.
- Handle malformed summaries.
- Handle backend restarts and interrupted runs.

Do not allow arbitrary user input to become executable JavaScript.

Document that the initial process manager is designed for a single backend instance. Persist enough information to identify interrupted runs and reconcile stale statuses after restart.

A durable distributed queue can be considered later, but is not required for the initial implementation.

### Metrics

Normalize available k6 metrics into a stable format:

- Request count.
- Successful requests.
- Failed requests.
- Requests per second.
- Average response time.
- Median response time.
- p90 response time.
- p95 response time.
- Maximum response time.
- HTTP status counts when collected.
- HTTP failure rate.
- Network and transport errors.
- Duration.
- Virtual-user configuration.
- Start and end times.

Document the exact definitions of failure metrics. Distinguish HTTP error responses, transport failures, and k6 threshold failures.

If a metric is unavailable, return `null` or another explicitly documented representation. Never silently invent it.

---

## 9. BUILT-IN DEMO API

Provide a controlled demo API for repeatable demonstrations.

It must support:

- Normal responses.
- Artificial latency.
- Configurable error responses.
- Rate limiting with HTTP 429.
- Health checks.
- Repeatable test scenarios.

Use clear demo endpoints and document their behavior.

The demo API must be isolated from the management API so that load tests do not accidentally overload the dashboard and authentication endpoints.

Make the demo configuration explicit. Do not weaken general SSRF protections to make local development convenient.

Document that artificial latency is only a controlled test scenario and observed response times may include network, operating-system, and execution overhead.

Write integration tests for each scenario.

---

## 10. SECURITY ENGINEERING — REQUIRED THROUGHOUT DEVELOPMENT

Security must be reviewed during every feature implementation, not postponed until the final stage.

### Input and API security

- Validate all body, query, and path parameters.
- Enforce request-size limits.
- Use consistent error responses.
- Configure CORS intentionally.
- Apply appropriate security headers.
- Rate-limit authentication and sensitive management endpoints.
- Avoid unsafe dynamic database queries.
- Never trust client-side validation alone.
- Prevent sensitive stack traces from reaching users.

### SSRF and target validation

Because APIForge sends HTTP traffic to user-configured targets, SSRF prevention is essential.

- Permit only supported URL schemes.
- Validate and normalize target URLs.
- Block loopback, private, link-local, and cloud metadata addresses for arbitrary targets.
- Account for DNS resolution changes and rebinding risks.
- Validate redirect destinations or disable redirects where appropriate.
- Restrict outbound network access where feasible.
- Use an explicit allowlist or controlled configuration for local demo targets.
- Do not permit arbitrary users to turn the application into a proxy to internal services.
- Apply target authorization and resource limits.

Do not claim complete SSRF protection from URL parsing alone.

### Load-generation safety

- Enforce conservative backend-side user and duration limits.
- Limit concurrent runs.
- Require authentication and resource authorization.
- Implement cancellation and process cleanup.
- Protect management endpoints from accidental or malicious overload.
- Avoid exposing an unauthenticated load-test launcher.
- Restrict tests to authorized systems.
- Provide safe defaults and visible warnings.

### Secret management

- Use environment variables for secrets.
- Provide `.env.example` with placeholders.
- Never commit real credentials.
- Redact tokens, authorization headers, and sensitive payloads.
- Never expose passwords or secret configuration in dashboard responses.
- Avoid logging sensitive request content.

### Security tests

For each applicable feature, test:
- Authentication bypass.
- Authorization bypass.
- Invalid input.
- Unexpected fields.
- Injection attempts.
- Resource-limit bypass.
- SSRF attempts.
- Malicious redirects.
- Secret leakage.
- Excessive request behavior.
- Unauthorized cancellation and exports.

Record test evidence and remediation status.

---

## 11. MANDATORY UNIT TESTING

Write unit tests alongside implementation.

Use:
- Vitest for frontend testing.
- Jest or Vitest for backend testing.
- React Testing Library for components.
- Mocks for isolated dependencies where appropriate.

Test:
- Business logic.
- Validation.
- Boundary conditions.
- Error handling.
- State transitions.
- Metrics parsing.
- Authorization rules.
- UI loading, success, empty, and error states.

Examples:
- Invalid test duration is rejected.
- Excessive virtual-user count is rejected.
- Invalid metrics are parsed safely.
- A cancelled run cannot become completed through an invalid transition.
- A form displays backend validation errors.
- A failed API request produces a useful message.

Avoid meaningless tests that merely repeat implementation details.

---

## 12. MANDATORY INTEGRATION TESTING

After implementing and connecting related components, verify that they work together.

Use Supertest and an isolated test database for backend integration tests.

Test the complete workflows:

1. Registration → login → authenticated dashboard.
2. Target creation → database persistence → target listing.
3. Target update and deletion → authorization → database state.
4. Test configuration → validation → TestRun creation.
5. TestRun → k6 process → summary parsing → stored results.
6. Process failure → failed run status → useful frontend error.
7. Cancellation → process termination → cancelled status.
8. Stored metrics → result API → charts and metric cards.
9. Test history → filtering and pagination.
10. Result export → authorization → correct CSV or JSON.
11. Demo endpoint → actual k6 execution → measurable results.

Use mocks for ordinary deterministic integration tests when appropriate. Also include controlled end-to-end tests using real k6 and the built-in demo API.

Do not allow mocked tests to hide broken integration.

---

## 13. FRONTEND AND BACKEND INTEGRATION

Define API contracts before connecting frontend features.

Use a consistent response format, for example:

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input",
    "details": []
  }
}
```

Adapt the exact structure where needed, but use it consistently.

Use a centralized Axios client and centralized backend error handling.

Frontend requirements:
- Handle expired authentication.
- Handle failed requests.
- Avoid duplicate requests.
- Use loading states.
- Handle empty results.
- Refresh active test statuses at a reasonable interval.
- Stop polling when a test is terminal or the page no longer needs updates.
- Avoid fake success states.
- Do not claim an action succeeded before receiving confirmation.

---

## 14. FEATURE-BY-FEATURE DEVELOPMENT PROCESS

Every feature must be divided into small, independently testable parts.

For every part, follow this sequence:

1. Define its purpose and acceptance criteria.
2. Identify dependencies and affected files.
3. Identify security risks.
4. Implement the smallest useful code change.
5. Write or update unit tests.
6. Run the targeted unit tests.
7. Connect related components.
8. Write and run integration tests.
9. Run applicable security tests.
10. Run relevant regression tests.
11. Fix failures and verify the fixes.
12. Review readability and maintainability.
13. Update documentation and progress tracking.
14. Recommend a Git checkpoint.
15. Continue to the next part only after acceptance criteria are satisfied.

Do not wait until the whole feature is complete to start testing.

If a test fails:
- Show the actual failure.
- Investigate the cause.
- Identify the responsible file.
- Fix the underlying problem.
- Add a regression test when appropriate.
- Rerun the affected tests.

Never disable tests or weaken security rules just to obtain a passing result.

Never claim that a command or test passed unless it was actually executed.

If the environment cannot run a test, label it **Not Run** and provide the exact command for local execution.

---

## 15. PROJECT IMPLEMENTATION STAGES

Build the application in the following stages. Each stage contains smaller tasks, and every task must follow the testing and security process above.

### Stage 0 — Workspace inspection and project setup

- Inspect existing files before changing anything.
- Preserve unrelated user work.
- Initialize the monorepo if needed.
- Configure React and Vite.
- Configure Express and Node.js.
- Create environment examples.
- Configure linting and formatting.
- Create Git checkpoints.
- Add initial documentation.
- Verify client and server startup.

Tests:
- Project scripts run.
- Lint and build checks execute.
- Environment validation behaves correctly.

### Stage 1 — Backend foundation

- Express setup.
- Environment configuration.
- MongoDB connection.
- Health endpoint.
- Centralized error handling.
- Request validation.
- Logging.
- Not-found handling.

Tests:
- Health endpoint success.
- Invalid request handling.
- Database unavailable behavior.
- Error-response consistency.

### Stage 2 — Frontend foundation and design system

- React routing.
- Tailwind configuration.
- Layout components.
- Navigation.
- Buttons, inputs, cards, dialogs, and feedback components.
- Central Axios client.
- Landing page.
- Responsive dashboard shell.

Tests:
- Component unit tests.
- Route behavior.
- Responsive layout review.
- Frontend/backend health-check integration.

### Stage 3 — Authentication

- Registration.
- Login.
- Secure password hashing.
- Authentication strategy.
- Protected routes.
- Logout.
- Authorization middleware.

Tests:
- Valid and invalid credentials.
- Duplicate email.
- Invalid or expired token.
- Unauthorized requests.
- Password-hash privacy.
- Authentication error handling.

### Stage 4 — Target management

- Target schema.
- Target validation.
- Target service.
- Target controllers and routes.
- Target CRUD UI.
- Ownership checks.

Tests:
- Service unit tests.
- CRUD integration tests.
- Invalid URL handling.
- Cross-user access denial.
- SSRF protection tests.
- Secret-redaction checks.

### Stage 5 — Demo API

- Normal response endpoint.
- Latency scenario.
- Error scenario.
- Rate-limiting scenario.
- Health endpoint.
- Demo UI and documentation.

Tests:
- Repeatable responses.
- Correct HTTP status codes.
- Latency behavior within reasonable tolerances.
- Rate-limit behavior.
- Isolation from management APIs.

### Stage 6 — Test configuration and lifecycle

- Test configuration form.
- Backend validation.
- TestRun schema.
- Lifecycle transitions.
- Queue and concurrency rules.
- Initial lifecycle tests using a controlled fake worker where appropriate.

Tests:
- Valid and invalid configurations.
- Boundary values.
- Invalid lifecycle transitions.
- Ownership checks.
- Cancellation authorization.
- Resource-limit enforcement.

Clearly label any fake worker or simulated lifecycle test. Never represent simulated measurements as real load-test results.

### Stage 7 — Real k6 execution

- Verify k6 installation.
- Create safe script generation.
- Implement process management.
- Launch and track real k6 processes.
- Capture output and errors.
- Parse summaries.
- Normalize metrics.
- Persist real results.
- Implement cancellation, timeout, and cleanup.
- Reconcile interrupted runs after restart.

Tests:
- Real k6 test against the demo API.
- Expected request count and metric structure.
- Failed target behavior.
- Malformed summary handling.
- Process crash.
- Cancellation.
- Concurrency limits.
- Script-injection attempts.
- SSRF controls.

### Stage 8 — Results dashboard

- Results API.
- Metric cards.
- Charts.
- HTTP status distribution.
- Error summary.
- Detailed run page.
- Real result persistence.

Tests:
- Correct metric mapping.
- Missing metrics.
- Empty results.
- Failed and cancelled runs.
- Frontend/backend results integration.
- No fabricated measurements.

### Stage 9 — Test history

- Paginated history.
- Search and filtering.
- Run details.
- Ownership checks.
- Safe rerun behavior.

Tests:
- Pagination.
- Filter combinations.
- Empty results.
- Cross-user access denial.
- Database failure handling.

### Stage 10 — Comparison and exports

- Compare completed runs.
- Show performance differences.
- CSV export.
- JSON export.
- Export authorization.
- Redact sensitive information.

Tests:
- Compatible and incompatible runs.
- Correct calculations.
- Empty or missing metrics.
- Export format validity.
- Unauthorized export prevention.

### Stage 11 — Security and reliability hardening

- Review the complete attack surface.
- Review all authorization rules.
- Review SSRF and egress restrictions.
- Review authentication and secret handling.
- Test process lifecycle and cleanup.
- Test backend restart recovery.
- Improve logging and observability.
- Fix high-priority bugs.
- Run full applicable regression suites.

Do not postpone security work until this stage; this stage is for an additional complete review.

### Stage 12 — Advanced features

Only after the core system is stable, consider:

- Historical performance trends.
- Configurable pass/fail thresholds.
- Advanced ramp-up and ramp-down profiles.
- More detailed error categorization.
- Better comparison reports.
- Optional Grafana integration.
- Optional Docker Compose.
- Optional durable job queue.
- Additional export formats.

Keep advanced functionality modular. Do not introduce unnecessary infrastructure before the core application is working.

### Stage 13 — Final verification and presentation

- Verify a clean local setup from documentation.
- Run lint and build checks.
- Run unit tests.
- Run integration tests.
- Run controlled real-k6 demo tests.
- Run applicable security tests.
- Fix critical issues.
- Verify the README.
- Create architecture and workflow diagrams.
- Prepare sample test scenarios.
- Prepare a college-presentation explanation.
- Document known limitations honestly.

---

## 16. BUG FIXING AND REGRESSION WORKFLOW

Maintain a living bug log at `docs/BUG_LOG.md`.

For every bug, record:
- Bug ID.
- Affected feature.
- Reproduction steps.
- Expected behavior.
- Actual behavior.
- Verified root cause.
- Files changed.
- Fix applied.
- Regression test.
- Verification status.

When a bug is discovered:
1. Reproduce it.
2. Identify its root cause.
3. Make the smallest safe fix.
4. Add or update a test.
5. Run the relevant unit tests.
6. Run related integration tests.
7. Check for regressions.
8. Update the bug log.

Do not merely patch the visible symptom if the underlying design is wrong.

Maintain `docs/TEST_RESULTS.md` with actual commands and outcomes.

Use explicit statuses:
- Passed
- Failed
- Blocked
- Not Run

Report the difference between a test that passed and a test that was not executed.

---

## 17. SECURITY AND QUALITY GATES

A feature cannot be marked complete until:

- Its acceptance criteria are met.
- Relevant unit tests pass.
- Relevant integration tests pass, or unexecuted tests are explicitly documented.
- Applicable security tests pass.
- No unresolved critical security issue remains.
- High-severity issues are resolved or explicitly blocked from release with a documented risk decision.
- Existing related features pass regression tests.
- Error handling is implemented.
- Sensitive information is protected.
- Documentation is updated.
- The team can explain the implementation.

If a critical security issue is discovered, prioritize remediation before continuing with dependent features.

---

## 18. DEVELOPMENT COMMANDS

Create working npm scripts appropriate to the actual project.

Examples:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run test:coverage
```

For a monorepo, provide clear root-level commands and document when a command must be run inside `client/` or `server/`.

Do not create placeholder scripts that falsely report success.

Include the necessary commands for:
- Installing dependencies.
- Configuring environment variables.
- Starting MongoDB.
- Starting client and server.
- Running tests.
- Building the frontend.
- Running a controlled k6 test.
- Troubleshooting common errors.

---

## 19. TEAM COLLABORATION

Assume four students are working together.

### Student 1 — Frontend
Responsible for:
- React pages.
- Dashboard.
- Forms.
- Charts.
- Responsive UI.
- Frontend tests.
- API integration.

### Student 2 — Backend and database
Responsible for:
- Express routes.
- Controllers and services.
- Authentication.
- MongoDB schemas.
- Authorization.
- API validation.
- Backend unit and integration tests.

### Student 3 — Load testing
Responsible for:
- Demo API.
- k6 integration.
- Script generation.
- Process management.
- Summary parsing.
- Metrics validation.
- Load-test integration tests.

### Student 4 — Quality, security, and integration
Responsible for:
- Test planning.
- Security checklist.
- Regression tests.
- Integration verification.
- Bug log.
- Documentation.
- Cross-module integration.

These roles are collaborative, not isolated silos. All students should understand the architecture and review the interfaces between modules.

Before parallel implementation:
- Agree on endpoint contracts.
- Agree on schema fields.
- Agree on error formats.
- Agree on ownership rules.
- Agree on branch and merge conventions.

Use feature branches, small commits, and reviewed pull requests.

---

## 20. DOCUMENTATION REQUIREMENTS

Create and continuously update:

### `README.md`
- Project overview.
- Features.
- Technology stack.
- Prerequisites.
- Installation.
- Environment setup.
- Run commands.
- Test commands.
- Demo instructions.
- Troubleshooting.

### `docs/ARCHITECTURE.md`
- Architecture overview.
- Module responsibilities.
- Request flow.
- Load-test execution flow.
- Key design decisions.

### `docs/API.md`
- Endpoints.
- Authentication requirements.
- Request examples.
- Response examples.
- Error codes.
- Pagination and filtering.

### `docs/DATABASE.md`
- Schemas.
- Relationships.
- Indexes.
- Ownership rules.
- Data lifecycle.

### `docs/TEST_PLAN.md`
- Unit tests.
- Integration tests.
- End-to-end scenarios.
- Regression tests.
- Security tests.

### `docs/TEST_RESULTS.md`
- Commands actually executed.
- Pass/fail outcomes.
- Blocked tests.
- Unexecuted tests.

### `docs/SECURITY.md`
- Threats.
- Security controls.
- SSRF defenses.
- Authentication strategy.
- Secrets handling.
- Known limitations.

### `docs/SECURITY_CHECKLIST.md`
- Security requirements.
- Test evidence.
- Remediation status.

### `docs/BUG_LOG.md`
- Reproducible bugs.
- Root causes.
- Fixes.
- Regression tests.

### `docs/TROUBLESHOOTING.md`
- Common errors.
- Causes.
- Fixes.
- Verification commands.

### `docs/PROJECT_STAGES.md`
- Stage checklist.
- Acceptance criteria.
- Completed work.
- Pending work.
- Current blockers.

Explain unfamiliar concepts in simple language so the team can confidently present and defend its design decisions.

---

## 21. FINAL ENGINEERING RULES

Follow these rules throughout the project:

1. Inspect the existing workspace before editing.
2. Never overwrite unrelated user work.
3. Do not build the entire application in one response.
4. Break each feature into small, testable parts.
5. Write unit tests alongside implementation.
6. Write integration tests as components are connected.
7. Conduct security reviews throughout development.
8. Fix bugs before declaring a feature complete.
9. Run regression tests after fixes.
10. Never claim unexecuted tests passed.
11. Never invent actual performance measurements.
12. Never disable security controls just to make the demo work.
13. Never hardcode secrets.
14. Keep backend validation authoritative.
15. Keep API contracts consistent.
16. Avoid unnecessary complexity.
17. Keep the application runnable at each major checkpoint.
18. Document limitations honestly.
19. Recommend Git checkpoints after verified work.
20. Explain the architecture and code in student-friendly language.

Prioritize correctness, security, maintainability, and understandability over code volume.

---

## 22. HOW YOU MUST START

Start with **Stage 0 only**.

First inspect the existing workspace and determine whether a project already exists.

Then:

1. Explain the proposed architecture briefly.
2. Show the initial folder structure.
3. Identify the files that need to be created or changed.
4. Set up the project.
5. Implement only the first small part.
6. Write and run relevant tests.
7. Perform the applicable security checks.
8. Fix any errors found.
9. Run the relevant regression checks.
10. Update documentation and the project checklist.
11. Report actual test outcomes.
12. Recommend a Git commit checkpoint.
13. Tell me exactly what to do next.

Do not begin Stage 1 until Stage 0 meets its acceptance criteria and I approve continuing.

For every subsequent stage, work on one small part at a time. Implement it, unit-test it, integrate it, security-review it, fix errors, verify regressions, document it, and then wait for my approval before proceeding.

If you cannot execute commands or tests in the current environment, say so clearly and give me the exact commands needed to verify the work locally.

## FINAL GOAL

Deliver a complete, advanced, responsive, secure, professional-looking MERN-stack API load-testing website with:

- Real k6 load generation.
- Reliable MongoDB persistence.
- Secure authentication and authorization.
- A clear modular architecture.
- A polished React dashboard.
- Accurate performance metrics.
- Test history, comparisons, and exports.
- A controlled demo API.
- Continuous unit testing.
- Continuous integration testing.
- Continuous security reviews.
- Regression testing and systematic bug fixing.
- Clear documentation.
- An understandable implementation that all four students can explain.

**Build the whole product progressively, with testing and security integrated into every feature—not as an afterthought.**