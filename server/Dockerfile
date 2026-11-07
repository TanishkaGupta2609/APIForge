# APIForge Backend Production Dockerfile
FROM node:20-bullseye-slim

# Install CA certificates and curl to fetch official k6 binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "amd64" ]; then K6_ARCH="amd64"; else K6_ARCH="arm64"; fi \
    && curl -L -s "https://github.com/grafana/k6/releases/download/v0.56.0/k6-v0.56.0-linux-${K6_ARCH}.tar.gz" | tar -xz -C /tmp \
    && mv /tmp/k6-v0.56.0-linux-${K6_ARCH}/k6 /usr/local/bin/k6 \
    && chmod +x /usr/local/bin/k6 \
    && rm -rf /tmp/k6* \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspaces configuration and server package
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm ci --workspace=server --omit=dev

# Copy server application source
COPY server/ ./server/

# Set working directory to server
WORKDIR /app/server

# Expose server port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]

