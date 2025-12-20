#!/bin/bash
# ============================================================================
# ETP EXPRESS - SECURITY HEADERS VALIDATOR
# ============================================================================
#
# Validates security headers on production endpoints to ensure compliance
# with OWASP security best practices.
#
# USAGE:
#   bash scripts/check-security-headers.sh [URL]
#
# ARGUMENTS:
#   URL - (Optional) Base URL to check. Defaults to production backend.
#
# EXIT CODES:
#   0 - All required headers present and valid
#   1 - One or more required headers missing or invalid
#
# HEADERS CHECKED:
#   - Strict-Transport-Security (HSTS)
#   - Content-Security-Policy (CSP)
#   - X-Frame-Options
#   - X-Content-Type-Options
#   - X-XSS-Protection (deprecated but still checked)
#   - Referrer-Policy
#   - Permissions-Policy
#
# REFERENCES:
#   - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
#   - Mozilla Observatory: https://observatory.mozilla.org/
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default URL (production backend)
DEFAULT_URL="https://etp-express-backend-production.up.railway.app"
URL="${1:-$DEFAULT_URL}"

# Track validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo "=============================================="
echo "  ETP EXPRESS - Security Headers Validator"
echo "=============================================="
echo ""
echo -e "${BLUE}Target URL:${NC} $URL"
echo ""

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

fetch_headers() {
    # Fetch headers with timeout and follow redirects
    curl -sI -m 10 -L "$URL" 2>/dev/null
}

check_header() {
    local header_name="$1"
    local headers="$2"
    local required="${3:-true}"
    local expected_value="$4"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # Case-insensitive grep for header
    local header_line=$(echo "$headers" | grep -i "^$header_name:" | head -1)

    if [ -z "$header_line" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}[FAIL]${NC} $header_name: Missing (REQUIRED)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "${YELLOW}[WARN]${NC} $header_name: Missing (recommended)"
            WARNINGS=$((WARNINGS + 1))
            return 0
        fi
    fi

    # Extract header value
    local header_value=$(echo "$header_line" | cut -d':' -f2- | xargs)

    # Check expected value if provided
    if [ -n "$expected_value" ]; then
        if [[ "$header_value" == *"$expected_value"* ]]; then
            echo -e "${GREEN}[PASS]${NC} $header_name: $header_value"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            echo -e "${YELLOW}[WARN]${NC} $header_name: $header_value (expected: $expected_value)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}[PASS]${NC} $header_name: $header_value"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi

    return 0
}

check_hsts_max_age() {
    local headers="$1"
    local header_line=$(echo "$headers" | grep -i "^Strict-Transport-Security:" | head -1)

    if [ -n "$header_line" ]; then
        # Extract max-age value
        local max_age=$(echo "$header_line" | grep -oP 'max-age=\K[0-9]+' || echo "0")

        if [ "$max_age" -lt 31536000 ]; then
            echo -e "  ${YELLOW}    -> max-age=$max_age (should be >= 31536000 / 1 year)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check for includeSubDomains
        if ! echo "$header_line" | grep -qi "includeSubDomains"; then
            echo -e "  ${YELLOW}    -> Missing 'includeSubDomains' directive${NC}"
        fi
    fi
}

check_csp_directives() {
    local headers="$1"
    local header_line=$(echo "$headers" | grep -i "^Content-Security-Policy:" | head -1)

    if [ -n "$header_line" ]; then
        # Check for important directives
        local important_directives=("default-src" "script-src" "style-src" "img-src")

        for directive in "${important_directives[@]}"; do
            if ! echo "$header_line" | grep -qi "$directive"; then
                echo -e "  ${YELLOW}    -> Missing '$directive' directive (recommended)${NC}"
            fi
        done

        # Warn about unsafe-inline
        if echo "$header_line" | grep -qi "unsafe-inline"; then
            echo -e "  ${YELLOW}    -> Contains 'unsafe-inline' (consider removing for stricter security)${NC}"
        fi
    fi
}

# ============================================================================
# MAIN VALIDATION
# ============================================================================

echo "Fetching headers..."
echo "----------------------------------------------"

HEADERS=$(fetch_headers)

if [ -z "$HEADERS" ]; then
    echo -e "${RED}[ERROR]${NC} Failed to fetch headers from $URL"
    echo ""
    echo "Possible causes:"
    echo "  - URL is unreachable"
    echo "  - Connection timeout"
    echo "  - SSL/TLS error"
    exit 1
fi

echo ""
echo "Checking Required Security Headers..."
echo "----------------------------------------------"

# Required headers (MUST have)
check_header "Strict-Transport-Security" "$HEADERS" "true"
check_hsts_max_age "$HEADERS"

check_header "X-Frame-Options" "$HEADERS" "true" "DENY"

check_header "X-Content-Type-Options" "$HEADERS" "true" "nosniff"

echo ""
echo "Checking Recommended Security Headers..."
echo "----------------------------------------------"

# Recommended headers (SHOULD have)
check_header "Content-Security-Policy" "$HEADERS" "false"
check_csp_directives "$HEADERS"

check_header "X-XSS-Protection" "$HEADERS" "false" "1; mode=block"

check_header "Referrer-Policy" "$HEADERS" "false"

check_header "Permissions-Policy" "$HEADERS" "false"

check_header "X-Permitted-Cross-Domain-Policies" "$HEADERS" "false"

echo ""
echo "Checking Deprecated/Removed Headers..."
echo "----------------------------------------------"

# Headers that should NOT be present
PUBLIC_KEY_PINS=$(echo "$HEADERS" | grep -i "^Public-Key-Pins:" | head -1)
if [ -n "$PUBLIC_KEY_PINS" ]; then
    echo -e "${YELLOW}[WARN]${NC} Public-Key-Pins: Present (DEPRECATED - should be removed)"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}[PASS]${NC} Public-Key-Pins: Not present (correctly removed/absent)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

echo ""
echo "=============================================="
echo "  SECURITY HEADERS VALIDATION SUMMARY"
echo "=============================================="
echo ""
echo -e "  Target: ${BLUE}$URL${NC}"
echo ""
echo "  Results:"
echo "  ----------------------------------------"
echo -e "  ${GREEN}Passed:${NC}    $PASSED_CHECKS"
echo -e "  ${RED}Failed:${NC}    $FAILED_CHECKS"
echo -e "  ${YELLOW}Warnings:${NC}  $WARNINGS"
echo "  ----------------------------------------"
echo "  Total:     $TOTAL_CHECKS"
echo ""

# Calculate score
if [ $TOTAL_CHECKS -gt 0 ]; then
    SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "  Score: ${BLUE}$SCORE%${NC}"
fi

echo ""

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}RESULT: FAILED${NC}"
    echo ""
    echo "Required security headers are missing. Please configure:"
    echo ""
    echo "For NestJS/Express, add to main.ts:"
    echo ""
    echo "  import helmet from 'helmet';"
    echo "  app.use(helmet());"
    echo ""
    echo "Or configure individual headers in your reverse proxy (Railway/Nginx)."
    echo ""
    exit 1
else
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}RESULT: PASSED WITH WARNINGS${NC}"
        echo ""
        echo "All required headers present, but some recommended headers are missing."
        echo "Consider adding them for improved security posture."
    else
        echo -e "${GREEN}RESULT: PASSED${NC}"
        echo ""
        echo "All security headers are properly configured."
    fi
    exit 0
fi
