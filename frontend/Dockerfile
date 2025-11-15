# ============================================================================
# ETP EXPRESS FRONTEND - MULTI-STAGE DOCKERFILE
# ============================================================================
#
# STAGES:
#   1. base       - Common dependencies and setup
#   2. development - Development with Vite dev server (hot-reload)
#   3. build      - Production build
#   4. production - Nginx-based production runtime
#
# BUILD COMMANDS:
#   Development:  docker build --target development -t etp-frontend:dev .
#   Production:   docker build --target production -t etp-frontend:prod .
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
# STAGE 2: DEVELOPMENT - Vite Dev Server (Hot Reload)
# ============================================================================
FROM base AS development

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

# Start Vite dev server (hot-reload enabled)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============================================================================
# STAGE 3: BUILD - Production Build
# ============================================================================
FROM base AS build

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build application (TypeScript + Vite → dist/)
# Environment variables injected at build time via VITE_* prefix
RUN npm run build

# ============================================================================
# STAGE 4: PRODUCTION - Nginx Static Server
# ============================================================================
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start nginx (foreground mode for Docker)
CMD ["nginx", "-g", "daemon off;"]
