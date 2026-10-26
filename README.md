# APIForge — Advanced API Load-Testing & Performance-Analysis Platform

APIForge is a modern, developer-centric web platform engineered to run real API load tests, monitor live executions, normalize performance metrics, compare past test runs, and generate actionable engineering reports.

Built as a 5th-semester Capstone Project for four collaborating students, APIForge pairs a high-performance **MERN-stack** application with a dedicated **k6 execution engine** running in an isolated worker process.

---

## ⚡ Key Features

- **Real Load Testing Engine**: Executes native k6 load tests via controlled child-process execution without fabricating metrics.
- **Developer-Centric Dashboard**: Real-time test status tracking (`queued`, `running`, `completed`, `failed`, `cancelled`), metric cards, and charts.
- **Target Management**: Secure target definition with strict SSRF defense, origin validation, and health checks.
- **Metrics Normalization**: Extracts RPS, average/median/p90/p95/max latency, HTTP error distribution, and transport errors.
- **Test Run Comparisons & Exports**: Side-by-side run evaluations and clean exports (CSV, JSON) with sensitive data redaction.
- **Isolated Built-in Demo API**: Controlled latency, error injection, and rate-limiting endpoints for repeatable benchmarking without overloading management services.
- **Robust Security**: JWT authentication, hashed passwords, CORS and Helmet policies, backend-authoritative input validation (Zod), and private network protections.

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
- **Engine**: k6 (Grafana k6 CLI)
- **Process Layer**: Controlled Node.js `spawn` process runner, script builder, and summary parser

---

## 📋 Prerequisites

Before setting up APIForge locally, ensure you have installed:

1. **Node.js**: `v18.0.0` or higher (verified with `v24.13.0`)
2. **npm**: `v9.0.0` or higher (verified with `11.6.2`)
3. **MongoDB**: Local MongoDB Community instance running on `mongodb://localhost:27017` or MongoDB Atlas URI
4. **k6**: Required for executing real load tests.
   - *Windows (Chocolatey)*: `choco install k6`
   - *Windows (Winget)*: `winget install k6`
   - *macOS (Homebrew)*: `brew install k6`
   - *Linux (apt)*: `sudo gpg -k && sudo apt-get install k6`

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

From the workspace root directory:

```bash
# Install dependencies across all workspaces (root, client, server)
npm install
```

### 2. Configure Environment Variables

Create `.env` files for both server and client:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Ensure `server/.env` contains a secure `JWT_SECRET` (at least 32 characters long) and your `MONGODB_URI`.

### 3. Start Development Servers

Run both the backend API and frontend Vite dev server concurrently:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:server   # Starts Express API at http://localhost:5000
npm run dev:client   # Starts Vite React dev server at http://localhost:5173
```

---

## 🧪 Testing and Verification

APIForge maintains unit, integration, and security tests across all workspaces:

```bash
# Run all tests across server and client
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run code style & linting checks
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
│   │   ├── features/           # Feature-specific components
│   │   ├── services/           # Axios API client & services
│   │   └── tests/              # Frontend unit & integration tests
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # Environment & database configuration
│   │   ├── middleware/         # Auth, validation, rate limiting & error handling
│   │   ├── modules/            # Domain modules (auth, targets, tests, results, demo)
│   │   ├── load-testing/       # k6 runner, script builder & summary parser
│   │   └── tests/              # Backend unit & Supertest integration tests
│   ├── package.json
│   └── .env.example
│
├── docs/                       # Comprehensive Project Documentation
│   ├── ARCHITECTURE.md         # System architecture & data flow
│   ├── API.md                  # REST API endpoint specifications
│   ├── DATABASE.md             # Data models & schemas
│   ├── TEST_PLAN.md            # Testing strategy & suites
│   ├── TEST_RESULTS.md         # Executed test logs & statuses
│   ├── SECURITY.md             # Threat model & security controls
│   ├── SECURITY_CHECKLIST.md   # Security verification checklist
│   ├── BUG_LOG.md              # Living bug tracking log
│   ├── TROUBLESHOOTING.md      # Common failure modes & resolutions
│   └── PROJECT_STAGES.md       # Implementation stage status tracker
│
├── .gitignore
├── package.json                # Root workspace configuration
└── README.md
```

---

## 👥 Team Collaboration (Student Responsibilities)

- **Student 1 (Frontend)**: React views, dashboard state, responsive layout, Recharts data visualization, client tests.
- **Student 2 (Backend & Database)**: Express routes, Mongoose schemas, JWT authentication, authorization middleware, input validation.
- **Student 3 (Load Testing Engine)**: k6 execution runner, script generation, process lifecycle, summary metrics parser, demo API.
- **Student 4 (Security, QA & Integration)**: Test plans, SSRF defenses, security audits, regression testing, bug tracking, documentation.

---

## 📄 License

Academic / Educational Capstone Project.
