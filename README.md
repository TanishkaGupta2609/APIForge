# APIForge — Advanced API Load-Testing & Performance-Analysis Platform

APIForge is a modern, developer-centric web platform engineered to run real API load tests, monitor live executions, normalize performance metrics, compare past test runs, and generate actionable engineering reports.

Built as an advanced Capstone Project, APIForge pairs a high-performance **MERN-stack** application with a dedicated **k6 execution engine** running in controlled worker child processes.

---

## ⚡ Key Features

- **Real Load Testing Engine**: Executes native k6 load tests via controlled child-process execution without fabricating metrics.
- **Multi-Stage Workload Profiles**: Supports Constant Load (`fixed`), Ramping Profiles (`ramping`), Spike Tests (`spike`), Stress Curves (`stress`), and customizable multi-stage workloads.
- **SLA Threshold Detection**: Evaluates latency (p95) and error rate budgets, recording pass/breach verdicts.
- **Interactive Performance Trends**: Analyzes throughput and latency trajectories across historical builds with calculated percentage deltas.
- **Developer-Centric Visualizations**: Recharts distributions (response time percentiles, HTTP status code donut, throughput timelines).
- **Target Management**: Secure target definition with strict multi-layer SSRF defense, origin validation, and active health checks.
- **Benchmark Exports**: Export performance reports as **Standalone HTML** (print/PDF-ready), **CSV** (spreadsheet format), or **JSON**.
- **Isolated Built-in Demo API**: Controlled latency, error injection, and rate-limiting sandbox endpoints on `:5001`.
- **Hardened Security**: JWT authentication, bcrypt hashing, BOLA/IDOR protection, CORS, Helmet, and automatic secret header masking.
- **Reliable Process Lifecycle**: Process tree termination on Windows/POSIX and startup crash reconciliation for orphaned runs.
- **Docker Compose Ready**: Multi-container containerization with MongoDB, APIForge Backend (with k6 binary), and Nginx-powered SPA Frontend.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (Developer Dark Theme)
- **Routing**: React Router DOM
- **HTTP Client**: Axios (Centralized client with token interceptors)
- **Visualizations**: Recharts
- **Testing**: Vitest + React Testing Library + jsdom

### Backend
- **Runtime**: Node.js (ES Modules)
- **Web Server**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, bcryptjs, JSON Web Tokens
- **Testing**: Vitest + Supertest

### Load Testing
- **Engine**: Grafana k6 CLI
- **Process Layer**: Controlled Node.js `spawn` process runner, script builder, and summary parser

---

## 🐳 Quickstart with Docker Compose

The fastest way to run APIForge with all dependencies pre-configured:

```bash
# Clone the repository
git clone https://github.com/TanishkaGupta2609/APIForge.git
cd APIForge

# Launch all containers (MongoDB, Server with k6, Client via Nginx)
docker compose up -d --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Endpoint**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 💻 Local Development Setup

### Prerequisites
1. **Node.js**: `v18.0.0` or higher (verified with `v20.x` and `v24.x`)
2. **npm**: `v9.0.0` or higher
3. **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017`
4. **k6**: Required for executing real load tests.
   - *Windows (Chocolatey)*: `choco install k6`
   - *Windows (Winget)*: `winget install k6`
   - *macOS (Homebrew)*: `brew install k6`
   - *Linux (apt)*: `sudo gpg -k && sudo apt-get install k6`

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```
Ensure `server/.env` contains a secure `JWT_SECRET` (at least 32 characters long) and your `MONGODB_URI`.

### 3. Start Development Servers
```bash
npm run dev
```
- Client starts on `http://localhost:5173`
- Server starts on `http://localhost:5000`
- Demo API available on `http://localhost:5001`

---

## 🧪 Testing & Code Quality

APIForge enforces automated test verification and static analysis:

```bash
# Run all tests across server and client (38 test files, 275 tests)
npm test

# Run code style & linting checks (0 errors, 0 warnings enforced)
npm run lint

# Build client production bundle
npm run build
```

---

## 📁 Repository Structure

```text
APIForge/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── app/                # App container & router
│   │   ├── components/         # Reusable UI & layout components
│   │   ├── features/           # Domain features (auth, dashboard, targets, tests, results, history)
│   │   ├── services/           # Axios API client & services
│   │   └── tests/              # Frontend unit & integration tests
│   ├── Dockerfile              # Multi-stage production Dockerfile (Vite + Nginx)
│   ├── nginx.conf              # Nginx reverse proxy & SPA configuration
│   └── package.json
│
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # Environment & database configuration
│   │   ├── middleware/         # Auth, validation, rate limiting & error handling
│   │   ├── modules/            # Domain modules (auth, targets, tests, results, history, demo)
│   │   ├── load-testing/       # k6 runner, script builder, process manager & reconciler
│   │   └── tests/              # Backend unit & integration tests
│   ├── Dockerfile              # Production Dockerfile with pre-installed k6 binary
│   └── package.json
│
├── docs/                       # Comprehensive Engineering Documentation
│   ├── ARCHITECTURE.md         # Architecture diagrams & process state machine
│   ├── API.md                  # Unified REST API specifications
│   ├── DATABASE.md             # Schema models & indexing strategies
│   ├── DEPLOYMENT.md           # Docker Compose & bare-metal deployment guide
│   ├── SECURITY.md             # Security policies & threat model
│   ├── SECURITY_CHECKLIST.md   # Security verification checklist
│   ├── TEST_PLAN.md            # Comprehensive test strategy
│   ├── TEST_RESULTS.md         # Actual test execution logs
│   ├── BUG_LOG.md              # Living bug tracking log
│   ├── TROUBLESHOOTING.md      # Troubleshooting & operational guide
│   └── PROJECT_STAGES.md       # Staged implementation tracking
│
├── docker-compose.yml          # Multi-container orchestration (Mongo, Server, Client)
├── .dockerignore
├── package.json                # Root workspace configuration
└── README.md
```

---

## ⚠️ Known Limitations & Scope Boundaries

1. **Single-Node Execution Engine**: APIForge runs k6 workers on the local server host or container. It is not currently backed by a distributed worker cluster (such as k6 Cloud or Kubernetes Operators).
2. **Authoritative Resource Bounds**: To ensure safety in student/lab environments, test concurrency is capped at a maximum of **50 virtual users (VUs)**, maximum duration of **300 seconds**, and **2 concurrent active runs per user**.
3. **Local Filesystem k6 Invocation**: Test execution scripts and summaries are generated into an isolated `.runs/` directory before cleanup.
4. **Target Reachability**: Targets running on private internal networks must be reachable from the APIForge server host; SSRF controls safely permit testing against the built-in Demo sandbox (`http://localhost:5001`).

---

## 📄 License

Academic / Educational Capstone Project.
