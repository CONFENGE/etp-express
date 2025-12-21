#!/bin/bash
# =============================================================================
# Secret Rotation Helper Script
# ETP Express Project
# =============================================================================
#
# Usage: ./scripts/rotate-secret.sh [SECRET_NAME]
#
# This script helps generate new secret values and provides step-by-step
# instructions for completing the rotation via Railway Dashboard.
#
# RECOMMENDED: Use GitHub Actions workflow for automated rotation:
#   1. Go to GitHub Actions → "Rotate Secrets"
#   2. Click "Run workflow"
#   3. Select secret to rotate (or "all")
#
# This script is for manual/emergency rotation only.
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           ETP Express - Secret Rotation Helper                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get secret name from argument or show menu
SECRET_NAME=${1:-""}

if [ -z "$SECRET_NAME" ]; then
    echo "Select secret to rotate:"
    echo ""
    echo "  1) JWT_SECRET         - Authentication tokens (Monthly)"
    echo "  2) SESSION_SECRET     - Session management (Monthly)"
    echo "  3) OPENAI_API_KEY     - GPT-4 API (Quarterly)"
    echo "  4) EXA_API_KEY        - Web Search API (Quarterly)"
    echo "  5) DATABASE_URL       - PostgreSQL (On-demand)"
    echo ""
    read -p "Enter choice (1-5): " choice

    case $choice in
        1) SECRET_NAME="JWT_SECRET" ;;
        2) SECRET_NAME="SESSION_SECRET" ;;
        3) SECRET_NAME="OPENAI_API_KEY" ;;
        4) SECRET_NAME="EXA_API_KEY" ;;
        5) SECRET_NAME="DATABASE_URL" ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
fi

echo -e "${GREEN}Secret selected:${NC} $SECRET_NAME"
echo ""

# Generate instructions based on secret type
case $SECRET_NAME in
    "JWT_SECRET"|"SESSION_SECRET")
        # Generate new secret value
        NEW_VALUE=$(openssl rand -base64 32)

        echo -e "${YELLOW}Generated new value:${NC}"
        echo ""
        echo "  $NEW_VALUE"
        echo ""
        echo "Copy this value carefully (single-click to select all)."
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo ""
        echo "  1. Open Railway Dashboard:"
        echo "     https://railway.app/dashboard"
        echo ""
        echo "  2. Navigate to:"
        echo "     Project → Backend Service → Variables"
        echo ""
        echo "  3. Find and update: $SECRET_NAME"
        echo ""
        echo "  4. Paste the new value above"
        echo ""
        echo "  5. Click 'Save Changes'"
        echo "     (Railway will auto-redeploy)"
        echo ""
        echo "  6. Validate:"
        echo "     - Check Railway logs for errors"
        echo "     - Test login functionality"
        echo "     - Verify no 401 errors"
        echo ""
        echo "  7. Update documentation:"
        echo "     docs/SECRET_ROTATION_PROCEDURES.md"
        echo "     (Update 'Last Rotated' date)"
        echo ""
        ;;

    "OPENAI_API_KEY")
        echo -e "${GREEN}Steps to rotate OpenAI API Key:${NC}"
        echo ""
        echo "  1. Create new key at OpenAI:"
        echo "     https://platform.openai.com/api-keys"
        echo ""
        echo "  2. Click 'Create new secret key'"
        echo "     Name: etp-express-prod-$(date +%Y-%m)"
        echo ""
        echo "  3. Copy the key immediately (shown only once!)"
        echo ""
        echo "  4. Update in Railway Dashboard:"
        echo "     Project → Backend Service → Variables"
        echo "     Update OPENAI_API_KEY"
        echo "     Save Changes"
        echo ""
        echo "  5. Validate:"
        echo "     - Test section generation"
        echo "     - Check logs for API errors"
        echo ""
        echo "  6. Revoke old key (AFTER validation):"
        echo "     OpenAI Dashboard → API Keys → Delete old key"
        echo ""
        echo "  7. Update docs/SECRET_ROTATION_PROCEDURES.md"
        echo ""
        ;;

    "EXA_API_KEY")
        echo -e "${GREEN}Steps to rotate Exa API Key:${NC}"
        echo ""
        echo "  1. Create new key at Exa Dashboard:"
        echo "     https://dashboard.exa.ai/api-keys"
        echo ""
        echo "  2. Generate new API key"
        echo ""
        echo "  3. Copy the key immediately"
        echo ""
        echo "  4. Update in Railway Dashboard:"
        echo "     Project → Backend Service → Variables"
        echo "     Update EXA_API_KEY"
        echo "     Save Changes"
        echo ""
        echo "  5. Validate:"
        echo "     - Test web search queries"
        echo "     - Check logs for Exa API errors"
        echo ""
        echo "  6. Revoke old key in Exa dashboard"
        echo ""
        echo "  7. Update docs/SECRET_ROTATION_PROCEDURES.md"
        echo ""
        ;;

    "DATABASE_URL")
        echo -e "${RED}⚠️  DATABASE_URL rotation is critical!${NC}"
        echo ""
        echo "Before proceeding:"
        echo "  - Ensure database backup exists"
        echo "  - Schedule during low-traffic period"
        echo "  - Have rollback plan ready"
        echo ""
        echo -e "${GREEN}Steps:${NC}"
        echo ""
        echo "  1. Railway Dashboard → PostgreSQL Plugin"
        echo ""
        echo "  2. Access credentials/settings"
        echo ""
        echo "  3. Generate new credentials or update password"
        echo ""
        echo "  4. Format new DATABASE_URL:"
        echo "     postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
        echo ""
        echo "  5. Update in Backend Service Variables"
        echo ""
        echo "  6. Validate:"
        echo "     - Application connects to database"
        echo "     - Test CRUD operations"
        echo "     - Check connection logs"
        echo ""
        echo "  7. Keep old credentials available for 24h"
        echo ""
        ;;

    *)
        echo -e "${RED}Unknown secret: $SECRET_NAME${NC}"
        echo ""
        echo "Valid options:"
        echo "  - JWT_SECRET"
        echo "  - SESSION_SECRET"
        echo "  - OPENAI_API_KEY"
        echo "  - EXA_API_KEY"
        echo "  - DATABASE_URL"
        exit 1
        ;;
esac

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Full procedure: docs/SECRET_ROTATION_PROCEDURES.md"
echo "Issue template: .github/ISSUE_TEMPLATE/rotate-secret.md"
echo ""
echo -e "${GREEN}Remember to create a GitHub issue to track this rotation!${NC}"
echo ""
