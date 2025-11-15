#!/bin/bash
# ============================================================================
# ETP EXPRESS - LOCAL DEVELOPMENT SETUP
# ============================================================================
#
# One-command setup script for new developers.
# Automates the entire local development environment setup.
#
# USAGE:
#   bash scripts/setup-local.sh
#
# WHAT IT DOES:
#   1. Checks prerequisites (Docker, Docker Compose, Node.js)
#   2. Creates .env file from template (if not exists)
#   3. Prompts for required API keys
#   4. Validates environment variables
#   5. Builds and starts Docker containers
#   6. Runs database migrations
#   7. Displays access URLs
#
# PREREQUISITES:
#   - Docker Engine 20.10+
#   - Docker Compose V2
#   - Node.js 20+ (for local npm scripts)
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  ETP EXPRESS - Local Setup"
echo "=========================================="
echo ""

# ============================================================================
# STEP 1: CHECK PREREQUISITES
# ============================================================================

echo -e "${BLUE}[1/7]${NC} Checking prerequisites..."
echo "-----------------------------------"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker is not installed!"
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Docker: $(docker --version)"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker Compose V2 is not installed!"
    echo "Install from: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Docker Compose: $(docker compose version)"

# Check Node.js (optional but recommended)
if command -v node &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} Node.js: $(node --version)"
else
    echo -e "${YELLOW}[WARN]${NC} Node.js not found (optional for local npm scripts)"
fi

echo ""

# ============================================================================
# STEP 2: CREATE .env FILE
# ============================================================================

echo -e "${BLUE}[2/7]${NC} Configuring environment variables..."
echo "-----------------------------------"

if [ -f .env ]; then
    echo -e "${YELLOW}[INFO]${NC} .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file"
    else
        rm .env
        echo "Creating new .env file from template..."
        cp .env.template .env
    fi
else
    echo "Creating .env file from template..."
    cp .env.template .env
    echo -e "${GREEN}[OK]${NC} .env file created"
fi

echo ""

# ============================================================================
# STEP 3: PROMPT FOR REQUIRED API KEYS
# ============================================================================

echo -e "${BLUE}[3/7]${NC} Configuring required API keys..."
echo "-----------------------------------"

# OpenAI API Key
echo ""
echo "OpenAI API Key (required for AI content generation)"
echo "Get yours at: https://platform.openai.com/api-keys"
read -p "Enter your OpenAI API Key: " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    # Update .env file (cross-platform sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
    else
        sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
    fi
    echo -e "${GREEN}[OK]${NC} OpenAI API Key configured"
else
    echo -e "${RED}[ERROR]${NC} OpenAI API Key is required!"
    exit 1
fi

# JWT Secret
echo ""
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev_jwt_secret_$(date +%s)")
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
else
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
fi
echo -e "${GREEN}[OK]${NC} JWT secret generated"

# PostgreSQL Password
echo ""
echo "Generating secure database password..."
POSTGRES_PASSWORD=$(openssl rand -base64 24 2>/dev/null || echo "etp_password_$(date +%s)")
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
else
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
fi
echo -e "${GREEN}[OK]${NC} Database password generated"

echo ""

# ============================================================================
# STEP 4: VALIDATE ENVIRONMENT
# ============================================================================

echo -e "${BLUE}[4/7]${NC} Validating environment variables..."
echo "-----------------------------------"

if [ -f scripts/validate-env.sh ]; then
    bash scripts/validate-env.sh
else
    echo -e "${YELLOW}[WARN]${NC} Validation script not found, skipping..."
fi

echo ""

# ============================================================================
# STEP 5: BUILD DOCKER IMAGES
# ============================================================================

echo -e "${BLUE}[5/7]${NC} Building Docker images..."
echo "-----------------------------------"

echo "This may take 5-10 minutes on first run..."
docker compose build

echo -e "${GREEN}[OK]${NC} Docker images built successfully"
echo ""

# ============================================================================
# STEP 6: START SERVICES
# ============================================================================

echo -e "${BLUE}[6/7]${NC} Starting services..."
echo "-----------------------------------"

# Stop any existing containers
docker compose down 2>/dev/null || true

# Start services in detached mode
docker compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10  # Give services time to start

# Check service health
docker compose ps

echo ""

# ============================================================================
# STEP 7: RUN DATABASE MIGRATIONS (if needed)
# ============================================================================

echo -e "${BLUE}[7/7]${NC} Running database migrations..."
echo "-----------------------------------"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U etp_user -d etp_express &> /dev/null; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 1
done

# Run migrations (if backend supports it)
if docker compose exec -T backend npm run migration:run &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} Database migrations completed"
else
    echo -e "${YELLOW}[INFO]${NC} No migrations to run or command not available"
fi

echo ""

# ============================================================================
# SETUP COMPLETE
# ============================================================================

echo "=========================================="
echo -e "${GREEN}✓ Setup complete!${NC}"
echo "=========================================="
echo ""
echo "Your ETP Express local environment is ready!"
echo ""
echo "Access your application:"
echo "-----------------------------------"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3001"
echo "  API Docs:  http://localhost:3001/api/docs"
echo "  Database:  localhost:5432"
echo ""
echo "Useful commands:"
echo "-----------------------------------"
echo "  View logs:        docker compose logs -f"
echo "  Stop services:    docker compose down"
echo "  Restart services: docker compose restart"
echo "  Rebuild images:   docker compose build"
echo ""
echo "Next steps:"
echo "-----------------------------------"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Register a new user account"
echo "  3. Start creating ETPs!"
echo ""
echo "Need help? Check docs/INFRASTRUCTURE.md"
echo ""
