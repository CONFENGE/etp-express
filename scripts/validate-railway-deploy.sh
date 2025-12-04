#!/bin/bash
# Railway Deploy E2E Validation Script
# Issue: #390
# Purpose: Automated validation of Railway production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://etp-express-backend.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://etp-express-frontend.railway.app}"
TIMEOUT=10

# Results tracking
PASSED=0
FAILED=0
RESULTS_FILE="validation-results-$(date +%Y%m%d-%H%M%S).md"

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "- [x] $1" >> "$RESULTS_FILE"
    ((PASSED++))
}

log_failure() {
    echo -e "${RED}❌ $1${NC}"
    echo "- [ ] $1" >> "$RESULTS_FILE"
    ((FAILED++))
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
    echo "$1" >> "$RESULTS_FILE"
}

# Initialize results file
cat > "$RESULTS_FILE" <<EOF
# Railway Deploy E2E Validation Results
**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Backend URL:** $BACKEND_URL
**Frontend URL:** $FRONTEND_URL

---

## Phase 1: Backend Health Checks

EOF

log_info "Starting Railway E2E Validation..."
echo ""

# ==========================================
# PHASE 1: BACKEND HEALTH
# ==========================================
log_info "PHASE 1: Backend Health Checks"

# 1.1 Health Check Endpoint
log_info "Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$HEALTH_BODY" | grep -qE '("status":|"healthy"|OK)'; then
        log_success "Health check endpoint returns 200 OK with valid response"
    else
        log_failure "Health check returns 200 but unexpected body: $HEALTH_BODY"
    fi
else
    log_failure "Health check endpoint failed with HTTP $HTTP_CODE"
fi

# 1.2 Database connectivity (check from health response)
if echo "$HEALTH_BODY" | grep -q '"database":"up"'; then
    log_success "Database connected (from health check)"
else
    log_failure "Database not connected (from health check)"
fi

# 1.3 Redis connectivity (check from health response)
if echo "$HEALTH_BODY" | grep -q '"redis":"up"'; then
    log_success "Redis connected (from health check)"
else
    log_failure "Redis not connected (from health check)"
fi

echo "" >> "$RESULTS_FILE"
echo "## Phase 2: Core Functionality" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# ==========================================
# PHASE 2: CORE FUNCTIONALITY
# ==========================================
log_info ""
log_info "PHASE 2: Core Functionality Tests"

# 2.1 Auth endpoint availability (basic connectivity test)
log_info "Testing auth endpoint availability..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
    -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' || echo "000")
AUTH_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)

if [ "$AUTH_CODE" = "401" ] || [ "$AUTH_CODE" = "400" ] || [ "$AUTH_CODE" = "201" ]; then
    log_success "Auth endpoint responsive (HTTP $AUTH_CODE - expected auth error for invalid credentials)"
else
    log_failure "Auth endpoint unreachable or erroring (HTTP $AUTH_CODE)"
fi

# 2.2 ETPs endpoint availability
log_info "Testing ETPs endpoint availability..."
ETPS_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
    -X GET "$BACKEND_URL/etps" || echo "000")
ETPS_CODE=$(echo "$ETPS_RESPONSE" | tail -n1)

if [ "$ETPS_CODE" = "401" ]; then
    log_success "ETPs endpoint responsive (HTTP 401 - expected auth required)"
elif [ "$ETPS_CODE" = "200" ]; then
    log_success "ETPs endpoint responsive (HTTP 200)"
else
    log_failure "ETPs endpoint failed (HTTP $ETPS_CODE)"
fi

# 2.3 Sections endpoint availability
log_info "Testing Sections endpoint availability..."
SECTIONS_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
    -X GET "$BACKEND_URL/sections" || echo "000")
SECTIONS_CODE=$(echo "$SECTIONS_RESPONSE" | tail -n1)

if [ "$SECTIONS_CODE" = "401" ] || [ "$SECTIONS_CODE" = "404" ]; then
    log_success "Sections endpoint responsive (HTTP $SECTIONS_CODE)"
else
    log_failure "Sections endpoint failed (HTTP $SECTIONS_CODE)"
fi

echo "" >> "$RESULTS_FILE"
echo "## Phase 3: Frontend" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# ==========================================
# PHASE 3: FRONTEND
# ==========================================
log_info ""
log_info "PHASE 3: Frontend Tests"

# 3.1 Frontend loads
log_info "Testing frontend availability..."
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$FRONTEND_URL" || echo "000")
FRONTEND_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$FRONTEND_CODE" = "200" ]; then
    log_success "Frontend loads successfully (HTTP 200)"
else
    log_failure "Frontend failed to load (HTTP $FRONTEND_CODE)"
fi

# 3.2 Frontend serves HTML
if echo "$FRONTEND_RESPONSE" | head -n-1 | grep -q "<html"; then
    log_success "Frontend serves valid HTML"
else
    log_failure "Frontend does not serve valid HTML"
fi

echo "" >> "$RESULTS_FILE"
echo "## Phase 4: Manual Validation Required" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
cat >> "$RESULTS_FILE" <<EOF
The following validations require manual testing:

### Backend Manual Tests
- [ ] Database migrations applied (Railway CLI: \`railway run psql\`)
- [ ] BullMQ worker active (Railway logs: \`railway logs\`)
- [ ] Sentry initialized without critical errors

### Frontend Manual Tests
- [ ] Login flow functional (browser test)
- [ ] ETP editor loads without errors
- [ ] Export PDF functional

### Observability Manual Tests
- [ ] Sentry: Zero critical errors in first 1h
- [ ] Railway logs: No restart loops
- [ ] Response time P95 <3s

EOF

# ==========================================
# SUMMARY
# ==========================================
echo "" >> "$RESULTS_FILE"
echo "---" >> "$RESULTS_FILE"
echo "## Summary" >> "$RESULTS_FILE"
echo "**Automated Tests Passed:** $PASSED" >> "$RESULTS_FILE"
echo "**Automated Tests Failed:** $FAILED" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

if [ $FAILED -eq 0 ]; then
    echo "**Status:** ✅ All automated tests PASSED" >> "$RESULTS_FILE"
    log_success ""
    log_success "========================================="
    log_success "ALL AUTOMATED TESTS PASSED ($PASSED/$((PASSED+FAILED)))"
    log_success "========================================="
else
    echo "**Status:** ❌ Some automated tests FAILED" >> "$RESULTS_FILE"
    log_failure ""
    log_failure "========================================="
    log_failure "SOME TESTS FAILED ($FAILED failures, $PASSED passed)"
    log_failure "========================================="
fi

log_info ""
log_info "Results saved to: $RESULTS_FILE"
log_info ""
log_info "Next steps:"
log_info "1. Review $RESULTS_FILE"
log_info "2. Complete manual validation steps"
log_info "3. Update issue #390 with results"

exit $([ $FAILED -eq 0 ] && echo 0 || echo 1)
