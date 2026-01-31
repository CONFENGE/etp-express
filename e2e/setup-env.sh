#!/bin/bash
#
# E2E Environment Setup Script
#
# This script automates the setup of E2E test environment:
# 1. Checks if services are running
# 2. Verifies environment variables
# 3. Creates auth state directory
# 4. Provides guidance for missing requirements
#
# Usage:
#   ./e2e/setup-env.sh          # Run checks only
#   ./e2e/setup-env.sh --setup  # Create .env if missing
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001/api/v1/health"
AUTH_DIR="e2e/.auth"
ENV_FILE=".env"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} E2E Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if service is running
check_service() {
  local url=$1
  local name=$2

  if curl -s --max-time 3 "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name is running${NC}"
    return 0
  else
    echo -e "${RED}❌ $name is NOT running${NC}"
    return 1
  fi
}

# Function to check environment variable
check_env_var() {
  local var_name=$1

  if [ -n "${!var_name}" ]; then
    echo -e "${GREEN}✅ $var_name is set${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  $var_name is NOT set${NC}"
    return 1
  fi
}

# Check frontend service
echo -e "${BLUE}Checking services...${NC}"
frontend_running=0
if check_service "$FRONTEND_URL" "Frontend"; then
  frontend_running=1
fi

# Check backend service
backend_running=0
if check_service "$BACKEND_URL" "Backend"; then
  backend_running=1
fi
echo ""

# Check environment variables
echo -e "${BLUE}Checking environment variables...${NC}"

# Load .env if exists
if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}✅ .env file found${NC}"
  export $(grep -v '^#' "$ENV_FILE" | xargs -0)
else
  echo -e "${YELLOW}⚠️  .env file NOT found${NC}"
fi

# Check required env vars
env_vars_ok=1
check_env_var "E2E_ADMIN_EMAIL" || env_vars_ok=0
check_env_var "E2E_ADMIN_PASSWORD" || env_vars_ok=0
echo ""

# Check auth directory
echo -e "${BLUE}Checking auth directory...${NC}"
if [ -d "$AUTH_DIR" ]; then
  echo -e "${GREEN}✅ Auth directory exists ($AUTH_DIR)${NC}"

  if [ -f "$AUTH_DIR/user.json" ]; then
    echo -e "${GREEN}✅ Auth state file exists${NC}"
  else
    echo -e "${YELLOW}⚠️  Auth state file NOT found (will be created on first test run)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Auth directory NOT found (creating...)${NC}"
  mkdir -p "$AUTH_DIR"
  echo -e "${GREEN}✅ Auth directory created${NC}"
fi
echo ""

# Summary and recommendations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} Summary${NC}"
echo -e "${BLUE}========================================${NC}"

all_ok=1

if [ $frontend_running -eq 0 ]; then
  all_ok=0
  echo -e "${RED}❌ Frontend service is not running${NC}"
  echo -e "${YELLOW}   Start with: cd frontend && npm run dev${NC}"
fi

if [ $backend_running -eq 0 ]; then
  all_ok=0
  echo -e "${RED}❌ Backend service is not running${NC}"
  echo -e "${YELLOW}   Start with: cd backend && npm run start:dev${NC}"
fi

if [ $env_vars_ok -eq 0 ]; then
  all_ok=0
  echo -e "${RED}❌ Required environment variables are not set${NC}"

  # Offer to create .env file
  if [ "$1" == "--setup" ] || [ "$1" == "-s" ]; then
    echo -e "${YELLOW}   Creating .env file with default test credentials...${NC}"
    cat > "$ENV_FILE" << 'EOF'
# E2E Test Credentials (default values for local development)
# These match the seeded users in backend/scripts/seed-admin.ts

E2E_ADMIN_EMAIL=admin@confenge.com.br
E2E_ADMIN_PASSWORD=Admin@123

E2E_DEMO_EMAIL=demo@confenge.com.br
E2E_DEMO_PASSWORD=Demo@123

E2E_MANAGER_EMAIL=manager@confenge.com.br
E2E_MANAGER_PASSWORD=Manager@123

E2E_SYSTEM_ADMIN_EMAIL=admin@confenge.com.br
E2E_SYSTEM_ADMIN_PASSWORD=Admin@123

E2E_USER_EMAIL=user@confenge.com.br
E2E_USER_PASSWORD=User@123
EOF
    echo -e "${GREEN}✅ .env file created with default credentials${NC}"
    echo -e "${YELLOW}   If your database has different seeded users, edit .env manually${NC}"
  else
    echo -e "${YELLOW}   Run with --setup flag to create .env automatically:${NC}"
    echo -e "${YELLOW}   ./e2e/setup-env.sh --setup${NC}"
    echo ""
    echo -e "${YELLOW}   Or create .env manually with:${NC}"
    cat << 'EOF'
E2E_ADMIN_EMAIL=admin@confenge.com.br
E2E_ADMIN_PASSWORD=Admin@123
E2E_DEMO_EMAIL=demo@confenge.com.br
E2E_DEMO_PASSWORD=Demo@123
EOF
  fi
fi

echo ""

if [ $all_ok -eq 1 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN} ✅ Environment is ready for E2E tests!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${BLUE}Run tests with:${NC}"
  echo -e "  npx playwright test"
  echo -e "  npx playwright test --project=chromium"
  echo -e "  npx playwright test --ui"
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED} ❌ Environment setup incomplete${NC}"
  echo -e "${RED}========================================${NC}"
  echo ""
  echo -e "${YELLOW}Please fix the issues above before running E2E tests.${NC}"
  echo ""
  echo -e "${BLUE}Quick start guide:${NC}"
  echo -e "  1. cd backend && npm run start:dev"
  echo -e "  2. cd frontend && npm run dev"
  echo -e "  3. ./e2e/setup-env.sh --setup"
  echo -e "  4. npx playwright test"
  exit 1
fi
