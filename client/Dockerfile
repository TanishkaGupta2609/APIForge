# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspaces and client packages
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm ci --workspace=client

# Copy client source
COPY client/ ./client/

# Build client for production
WORKDIR /app/client
RUN npm run build

# Serve stage
FROM nginx:1.25-alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

