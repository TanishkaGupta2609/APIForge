# APIForge — Deployment & Containerization Guide

This guide covers deployment procedures for APIForge, including Docker Compose multi-container deployment, bare-metal / VM setup, and environment configurations.

---

## 🐳 Docker Compose Deployment (Recommended)

APIForge provides a complete, production-ready multi-container configuration via Docker Compose.

### Architecture Overview

```
 ┌──────────────────────────────────────────────────────────────┐
 │                      User Browser                            │
 └──────────────┬──────────────────────────────┬────────────────┘
                │ Port 3000                    │ Port 5000 (Direct/Proxied)
                ▼                              ▼
 ┌──────────────────────────────┐   ┌───────────────────────────┐
 │       apiforge-client        │   │      apiforge-server      │
 │        (Nginx:alpine)        │──▶│   (Node.js 20 + k6 CLI)   │
 │   SPA Static Bundle + Proxy  │   │     REST API & Workers    │
 └──────────────────────────────┘   └─────────────┬─────────────┘
                                                  │ Port 27017
                                                  ▼
                                    ┌───────────────────────────┐
                                    │       apiforge-mongo      │
                                    │        (MongoDB 7.0)      │
                                    │     Persistent Data Volume│
                                    └───────────────────────────┘
```

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+

### Steps to Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TanishkaGupta2609/APIForge.git
   cd APIForge
   ```

2. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```
   Expected status:
   - `apiforge-mongo`: Up (healthy)
   - `apiforge-server`: Up (healthy)
   - `apiforge-client`: Up

4. **Access the application**:
   - **Frontend UI**: `http://localhost:3000`
   - **Backend API**: `http://localhost:5000/api`
   - **Health Endpoint**: `http://localhost:5000/api/health`

5. **Stop containers**:
   ```bash
   docker compose down
   ```
   To remove persistent database volumes:
   ```bash
   docker compose down -v
   ```

---

## 💻 Local Development / Bare-Metal Setup

### Prerequisites
- Node.js v20.10+
- npm v10+
- MongoDB 7.0+ (running locally on `localhost:27017`)
- k6 CLI binary installed and available in system `PATH` (or located at `./bin/k6.exe` on Windows)

### Steps to Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `server/.env.example` to `server/.env`
   - Copy `client/.env.example` to `client/.env`
   Ensure `JWT_SECRET` has at least 32 characters.

3. **Run automated verification**:
   ```bash
   npm run lint
   npm test
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```
   - Client starts on `http://localhost:5173`
   - Server starts on `http://localhost:5000`
   - Demo API available on `http://localhost:5001`

