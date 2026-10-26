# APIForge — Security Architecture & Threat Model

## 1. Security Overview

Because APIForge generates network traffic towards external and local endpoints, robust security controls are required throughout development. Security is integrated from Stage 0 and verified at every stage.

---

## 2. Threat Model & Mitigations

### 2.1 Server-Side Request Forgery (SSRF)
- **Threat**: An attacker configures a target pointing to internal loopback services (`localhost`, `127.0.0.1`), private LAN IP subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or cloud instance metadata services (`169.254.169.254`).
- **Mitigation**:
  1. Strict scheme allowlist: Only `http:` and `https:` schemes permitted.
  2. Target address resolution: Target hostnames are resolved via DNS prior to execution, and resolved IP addresses are verified against CIDR block blacklists (RFC 1918, RFC 3927, RFC 5735).
  3. Isolated Demo Allowlist: Local development targets are permitted exclusively when pointed to the designated Demo API port (`DEMO_PORT=5001`).

---

### 2.2 Arbitrary Command & Script Injection
- **Threat**: User-supplied headers, target URLs, or endpoint parameters are concatenated into shell strings or executable JavaScript passed to k6.
- **Mitigation**:
  1. Execution via `child_process.spawn`: Uses structured argument arrays (`['run', '--summary-export=...', scriptPath]`), preventing shell expansion or command injection.
  2. Non-executable data templating: k6 scripts are synthesized from strictly validated JSON parameter models without `eval` or dynamic code concatenation.

---

### 2.3 Broken Object Level Authorization (IDOR)
- **Threat**: User A manipulates a target ID or test run ID in API parameters to inspect, modify, cancel, or export User B's resources.
- **Mitigation**:
  1. Database queries for single-resource operations always scope by authenticated owner:
     `{ _id: resourceId, owner: req.user._id }`.
  2. Attempts to access resources belonging to other users return a clean `404 Not Found` or `403 Forbidden` without leaking the existence of other users' records.

---

### 2.4 Resource Exhaustion & Denial of Service
- **Threat**: A user queues hundreds of concurrent tests or configures 100,000 virtual users for 10 hours, crashing the server CPU/RAM.
- **Mitigation**:
  1. Authoritative Backend Limits: Hard cap on maximum virtual users (`MAX_VIRTUAL_USERS=500`) and test duration (`MAX_TEST_DURATION=300s`).
  2. Concurrency Throttle: Maximum concurrent running tests per server instance (`MAX_CONCURRENT_TESTS=2`).
  3. API Rate Limiting: Authentication and test launch endpoints are throttled.

---

### 2.5 Secret Leakage
- **Threat**: User passwords, JWT secrets, or sensitive target authorization tokens leak in HTTP logs, frontend responses, or error traces.
- **Mitigation**:
  1. Passwords hashed using `bcryptjs` with salt rounds >= 10.
  2. Mongoose models set `select: false` on password hashes.
  3. JWT secrets validated on startup to ensure a minimum entropy length of 32 characters.
  4. Stack traces omitted from API error envelopes in non-development environments.
  5. Target authorization headers marked sensitive are masked before storage or display.
