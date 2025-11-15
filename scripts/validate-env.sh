#!/bin/bash
# ============================================================================
# ETP EXPRESS - ENVIRONMENT VARIABLES VALIDATOR
# ============================================================================
#
# Validates .env file against .env.template to ensure all required
# variables are set and no default insecure values are used.
#
# USAGE:
#   bash scripts/validate-env.sh
#
# EXIT CODES:
#   0 - All validations passed
#   1 - Validation failed (missing or insecure values)
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  ETP EXPRESS - Environment Validator"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}[ERROR]${NC} .env file not found!"
    echo ""
    echo "Please create .env from template:"
    echo "  cp .env.template .env"
    echo ""
    exit 1
fi

# Check if .env.template exists
if [ ! -f .env.template ]; then
    echo -e "${RED}[ERROR]${NC} .env.template file not found!"
    exit 1
fi

# Load .env file
set -a  # Export all variables
source .env
set +a  # Stop exporting

# Validation flag
VALIDATION_PASSED=true

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_required() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${RED}[FAIL]${NC} $var_name is required but not set"
        VALIDATION_PASSED=false
        return 1
    fi

    echo -e "${GREEN}[OK]${NC} $var_name is set"
    return 0
}

validate_not_default() {
    local var_name=$1
    local var_value=${!var_name}
    local default_value=$2

    if [ "$var_value" = "$default_value" ]; then
        echo -e "${YELLOW}[WARN]${NC} $var_name is using default value (insecure for production)"
        if [ "$NODE_ENV" = "production" ]; then
            VALIDATION_PASSED=false
            return 1
        fi
    fi

    return 0
}

validate_min_length() {
    local var_name=$1
    local var_value=${!var_name}
    local min_length=$2

    if [ ${#var_value} -lt $min_length ]; then
        echo -e "${RED}[FAIL]${NC} $var_name is too short (min $min_length chars)"
        VALIDATION_PASSED=false
        return 1
    fi

    return 0
}

validate_openai_key_format() {
    local var_value=$OPENAI_API_KEY

    if [[ ! $var_value =~ ^sk- ]]; then
        echo -e "${RED}[FAIL]${NC} OPENAI_API_KEY has invalid format (should start with 'sk-')"
        VALIDATION_PASSED=false
        return 1
    fi

    return 0
}

validate_url_format() {
    local var_name=$1
    local var_value=${!var_name}

    if [[ ! $var_value =~ ^https?:// ]]; then
        echo -e "${YELLOW}[WARN]${NC} $var_name should start with http:// or https://"
        if [ "$NODE_ENV" = "production" ] && [[ ! $var_value =~ ^https:// ]]; then
            echo -e "${RED}[FAIL]${NC} Production MUST use https://!"
            VALIDATION_PASSED=false
            return 1
        fi
    fi

    return 0
}

# ============================================================================
# RUN VALIDATIONS
# ============================================================================

echo "Validating required variables..."
echo "-----------------------------------"

# Database
validate_required "POSTGRES_DB"
validate_required "POSTGRES_USER"
validate_required "POSTGRES_PASSWORD"
validate_not_default "POSTGRES_PASSWORD" "etp_password_dev_CHANGE_ME"
if [ "$NODE_ENV" = "production" ]; then
    validate_min_length "POSTGRES_PASSWORD" 16
fi

# Server
validate_required "NODE_ENV"

# Authentication
validate_required "JWT_SECRET"
validate_not_default "JWT_SECRET" "dev_jwt_secret_change_in_production_PLEASE"
if [ "$NODE_ENV" = "production" ]; then
    validate_min_length "JWT_SECRET" 32
fi

# OpenAI API
validate_required "OPENAI_API_KEY"
if [ -n "$OPENAI_API_KEY" ]; then
    validate_openai_key_format
fi

# Frontend API URL
validate_required "VITE_API_URL"
validate_url_format "VITE_API_URL"

echo ""
echo "Validating optional variables..."
echo "-----------------------------------"

# Perplexity (optional)
if [ -n "$PERPLEXITY_API_KEY" ]; then
    echo -e "${GREEN}[OK]${NC} PERPLEXITY_API_KEY is set (optional)"
else
    echo -e "${YELLOW}[INFO]${NC} PERPLEXITY_API_KEY not set (optional - search feature disabled)"
fi

# Sentry (optional)
if [ -n "$SENTRY_DSN" ]; then
    echo -e "${GREEN}[OK]${NC} SENTRY_DSN is set (optional)"
    validate_url_format "SENTRY_DSN"
else
    echo -e "${YELLOW}[INFO]${NC} SENTRY_DSN not set (optional - error tracking disabled)"
fi

echo ""
echo "=========================================="

# Final result
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    echo "Your .env file is ready. You can now run:"
    echo "  docker-compose up"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Validation failed!${NC}"
    echo ""
    echo "Please fix the errors above and run validation again."
    echo ""
    exit 1
fi
