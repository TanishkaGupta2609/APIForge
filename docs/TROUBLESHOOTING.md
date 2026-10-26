# APIForge — Troubleshooting Guide

This guide provides practical resolutions and verification commands for common environment, setup, and runtime errors.

---

## 🛠 Common Errors & Solutions

### 1. `Environment validation failed: JWT_SECRET must be at least 32 characters`
- **Cause**: The `JWT_SECRET` in `server/.env` is missing or shorter than the required 32-character security threshold.
- **Solution**: Open `server/.env` and replace `JWT_SECRET` with a long cryptographically secure random string (at least 32 characters).
- **Verification Command**:
  ```bash
  npm run test --workspace=server
  ```

---

### 2. `k6 is not recognized as an internal or external command`
- **Cause**: The Grafana k6 binary is not installed or not present in your system PATH.
- **Solution**:
  - **Windows**: Install using Chocolatey (`choco install k6`) or Winget (`winget install k6`).
  - **macOS**: `brew install k6`
  - **Linux**: `sudo apt-get install k6`
- **Verification Command**:
  ```bash
  k6 version
  ```

---

### 3. `Error: listen EADDRINUSE: address already in use :::5000`
- **Cause**: Another process or background instance of the APIForge server is currently bound to port 5000.
- **Solution (Windows PowerShell)**:
  ```powershell
  # Find PID using port 5000
  netstat -ano | findstr :5000
  # Stop the process by PID
  taskkill /PID <PID> /F
  ```
- **Solution (macOS / Linux)**:
  ```bash
  lsof -ti :5000 | xargs kill -9
  ```

---

### 4. `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause**: MongoDB is not running locally or the connection string in `server/.env` is incorrect.
- **Solution**:
  - Ensure the local MongoDB service is started (`net start MongoDB` on Windows, `brew services start mongodb-community` on macOS).
  - Alternatively, provide a cloud MongoDB Atlas URI in `server/.env` (`MONGODB_URI=mongodb+srv://...`).

---

### 5. `CORS Policy: No 'Access-Control-Allow-Origin' header is present`
- **Cause**: The client is attempting to make API requests from an origin not matching `CLIENT_URL` in `server/.env`.
- **Solution**: Check `server/.env` and ensure `CLIENT_URL=http://localhost:5173` matches the exact port Vite is serving the frontend on.
