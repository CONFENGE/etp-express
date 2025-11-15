# ============================================================================
# ETP EXPRESS BACKEND - MULTI-STAGE DOCKERFILE
# ============================================================================
#
# STAGES:
#   1. base       - Common dependencies and setup
#   2. development - Development with hot-reload
#   3. build      - Production build
#   4. production - Optimized production runtime
#
# BUILD COMMANDS:
#   Development:  docker build --target development -t etp-backend:dev .
#   Production:   docker build --target production -t etp-backend:prod .
#
# ============================================================================

# ============================================================================
# STAGE 1: BASE - Common Dependencies
# ============================================================================
FROM node:20-alpine AS base

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================================================
# STAGE 2: DEVELOPMENT - Hot Reload
# ============================================================================
FROM base AS development

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start in development mode (hot-reload with --watch)
CMD ["npm", "run", "start:dev"]

# ============================================================================
# STAGE 3: BUILD - Production Build
# ============================================================================
FROM base AS build

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build application (compiles TypeScript → JavaScript in dist/)
RUN npm run build

# Remove devDependencies to reduce size
RUN npm prune --production

# ============================================================================
# STAGE 4: PRODUCTION - Optimized Runtime
# ============================================================================
FROM node:20-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy TypeORM migrations (se existirem)
COPY --from=build /app/src/migrations ./src/migrations

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application in production mode
CMD ["node", "dist/main"]
