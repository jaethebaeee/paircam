# Multi-stage Dockerfile for PairCam Backend (NestJS)
# Optimized for Fly.io, Railway, and other container platforms
# Build size: ~150MB, Runtime: ~80MB

# Stage 1: Build
FROM node:18.18.0-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend

# Build TypeScript to JavaScript
RUN cd packages/backend && npm run build

# Stage 2: Runtime
FROM node:18.18.0-alpine

WORKDIR /app

# Install dumb-init for proper signal handling (PID 1)
# This ensures the process can be terminated gracefully
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install production dependencies only (no devDependencies)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./dist

# Copy public assets if they exist
COPY --chown=nodejs:nodejs packages/backend/src/assets ./dist/assets 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3333

# Health check - tests if the server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3333/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use dumb-init to handle signals properly (ensures graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
