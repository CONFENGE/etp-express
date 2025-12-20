#!/bin/bash
#
# Pre-Deploy Validation Script for Go-Live B2G
#
# Este script valida todos os pre-requisitos antes do deploy final.
# Deve ser executado ANTES de iniciar o processo de Go-Live.
#
# Uso:
#   ./scripts/pre-deploy-validation.sh
#
# Exit codes:
#   0 - Todas validacoes passaram, pronto para deploy
#   1 - Uma ou mais validacoes falharam
#

set -euo pipefail

# Configuration
BACKEND_URL="${BACKEND_URL:-https://etp-express-backend-production.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://etp-express-frontend-production.up.railway.app}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_FILE="${SCRIPT_DIR}/pre-deploy-validation-$(date +%Y%m%d-%H%M%S).md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "- [x] $1" >> "$RESULTS_FILE"
    ((PASSED++))
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "- [ ] **FAILED:** $1" >> "$RESULTS_FILE"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "- [ ] *WARNING:* $1" >> "$RESULTS_FILE"
    ((WARNINGS++))
}

# Initialize results file
init_results() {
    cat > "$RESULTS_FILE" <<EOF
# Pre-Deploy Validation Results - Go-Live B2G

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Backend URL:** $BACKEND_URL
**Frontend URL:** $FRONTEND_URL
**Validator:** pre-deploy-validation.sh

---

## Validation Results

EOF
}

# Phase 1: GitHub Issues Check
check_github_issues() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 1: Blocking Issues (P0/P1)" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 1: Checking blocking GitHub issues..."

    # Check P0 issues
    P0_OPEN=$(gh issue list --label "priority/P0" --state open --json number --jq length 2>/dev/null || echo "error")

    if [ "$P0_OPEN" = "error" ]; then
        log_warning "Could not fetch P0 issues (gh CLI not configured?)"
    elif [ "$P0_OPEN" = "0" ]; then
        log_success "No open P0 (blocker) issues"
    else
        log_failure "Found $P0_OPEN open P0 issues - must be resolved before Go-Live"
    fi

    # Check go-live labeled P1 issues
    P1_GOLIVE=$(gh issue list --label "go-live" --label "priority/P1" --state open --json number --jq length 2>/dev/null || echo "error")

    if [ "$P1_GOLIVE" = "error" ]; then
        log_warning "Could not fetch P1 go-live issues"
    elif [ "$P1_GOLIVE" = "0" ]; then
        log_success "No open P1 go-live issues"
    else
        log_failure "Found $P1_GOLIVE open P1 go-live issues"
    fi
}

# Phase 2: Production Health Check
check_production_health() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 2: Production Environment Health" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 2: Checking production health..."

    # Backend health
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 "$BACKEND_URL/api/health" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Backend health check: HTTP 200 OK"

        # Check database status
        if echo "$HEALTH_BODY" | grep -q '"database":"up"'; then
            log_success "Database: Connected"
        else
            log_failure "Database: Not connected"
        fi

        # Check redis status
        if echo "$HEALTH_BODY" | grep -q '"redis":"up"'; then
            log_success "Redis: Connected"
        else
            log_warning "Redis: Status unknown or not connected"
        fi
    else
        log_failure "Backend health check failed: HTTP $HTTP_CODE"
    fi

    # Frontend check
    FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")

    if [ "$FRONTEND_CODE" = "200" ]; then
        log_success "Frontend: HTTP 200 OK"
    else
        log_failure "Frontend check failed: HTTP $FRONTEND_CODE"
    fi
}

# Phase 3: Railway Infrastructure
check_railway_infrastructure() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 3: Railway Infrastructure" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 3: Checking Railway infrastructure..."

    # Check if Railway CLI is available
    if command -v railway &> /dev/null; then
        log_success "Railway CLI available"

        # Check backend replicas (if possible)
        REPLICAS=$(railway service --json 2>/dev/null | jq -r '.replicas // "unknown"' 2>/dev/null || echo "unknown")

        if [ "$REPLICAS" = "unknown" ]; then
            log_warning "Could not determine replica count (check Railway dashboard manually)"
        elif [ "$REPLICAS" -ge 2 ]; then
            log_success "Backend replicas: $REPLICAS (>= 2 required)"
        else
            log_failure "Backend replicas: $REPLICAS (need >= 2 for zero-downtime)"
        fi
    else
        log_warning "Railway CLI not installed - manual verification required"
    fi
}

# Phase 4: Sentry Error Check
check_sentry_errors() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 4: Error Monitoring (Sentry)" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 4: Sentry error check..."

    # This requires manual verification
    log_warning "Sentry check requires manual verification:"
    echo "  - Access Sentry dashboard" >> "$RESULTS_FILE"
    echo "  - Filter: last 24h, severity: error/fatal" >> "$RESULTS_FILE"
    echo "  - Confirm: 0 critical errors" >> "$RESULTS_FILE"

    echo ""
    echo -e "${YELLOW}Manual Action Required:${NC}"
    echo "  1. Open Sentry dashboard"
    echo "  2. Filter: last 24h, severity: error/fatal"
    echo "  3. Confirm: 0 critical errors"
    echo ""
}

# Phase 5: Load Test Results
check_load_test() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 5: Load Test Results" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 5: Checking load test results..."

    # Check if k6 results exist
    K6_RESULTS="${SCRIPT_DIR}/../backend/k6-results.json"

    if [ -f "$K6_RESULTS" ]; then
        log_success "Load test results found"

        # Parse P95 response time if possible
        P95=$(jq -r '.metrics.http_req_duration.values.p95 // "unknown"' "$K6_RESULTS" 2>/dev/null || echo "unknown")

        if [ "$P95" != "unknown" ]; then
            P95_MS=$(echo "$P95" | cut -d'.' -f1)
            if [ "$P95_MS" -lt 3000 ]; then
                log_success "P95 response time: ${P95_MS}ms (< 3000ms target)"
            else
                log_failure "P95 response time: ${P95_MS}ms (> 3000ms target)"
            fi
        fi
    else
        log_warning "Load test results not found - verify #676 completed successfully"
    fi
}

# Phase 6: Security Scan
check_security() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 6: Security Validation" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 6: Security checks..."

    # Check security headers
    if [ -f "${SCRIPT_DIR}/check-security-headers.sh" ]; then
        HEADERS_CHECK=$(bash "${SCRIPT_DIR}/check-security-headers.sh" --quiet 2>/dev/null || echo "failed")

        if [ "$HEADERS_CHECK" != "failed" ]; then
            log_success "Security headers script executed"
        else
            log_warning "Security headers check returned errors"
        fi
    else
        log_warning "Security headers script not found"
    fi

    # Quick npm audit check
    if [ -d "${SCRIPT_DIR}/../backend" ]; then
        AUDIT_HIGH=$(cd "${SCRIPT_DIR}/../backend" && npm audit --audit-level=high 2>&1 | grep -c "high\|critical" || echo "0")

        if [ "$AUDIT_HIGH" = "0" ]; then
            log_success "npm audit: No high/critical vulnerabilities (backend)"
        else
            log_warning "npm audit: Found potential vulnerabilities (run npm audit for details)"
        fi
    fi
}

# Phase 7: Backup Verification
check_backup() {
    echo "" >> "$RESULTS_FILE"
    echo "### Phase 7: Backup Readiness" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    log_info "Phase 7: Backup verification..."

    if [ -f "${SCRIPT_DIR}/backup-db.sh" ]; then
        log_success "Backup script available"
    else
        log_failure "Backup script not found"
    fi

    if [ -f "${SCRIPT_DIR}/rollback.sh" ]; then
        log_success "Rollback script available"
    else
        log_failure "Rollback script not found"
    fi

    log_warning "Remember to create backup before deploy: ./scripts/backup-db.sh"
}

# Generate Summary
generate_summary() {
    echo "" >> "$RESULTS_FILE"
    echo "---" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "## Summary" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    echo "| Metric | Value |" >> "$RESULTS_FILE"
    echo "|--------|-------|" >> "$RESULTS_FILE"
    echo "| Passed | $PASSED |" >> "$RESULTS_FILE"
    echo "| Failed | $FAILED |" >> "$RESULTS_FILE"
    echo "| Warnings | $WARNINGS |" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"

    if [ $FAILED -eq 0 ]; then
        echo "**Status:** READY FOR GO-LIVE" >> "$RESULTS_FILE"
    else
        echo "**Status:** NOT READY - Fix $FAILED failures before proceeding" >> "$RESULTS_FILE"
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}  Pre-Deploy Validation - Go-Live B2G${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    init_results

    check_github_issues
    check_production_health
    check_railway_infrastructure
    check_sentry_errors
    check_load_test
    check_security
    check_backup

    generate_summary

    echo ""
    echo -e "${BLUE}=============================================${NC}"

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}  VALIDATION PASSED${NC}"
        echo -e "${GREEN}  Ready for Go-Live Deploy${NC}"
        echo -e "${BLUE}=============================================${NC}"
        echo ""
        echo "Passed: $PASSED | Warnings: $WARNINGS | Failed: $FAILED"
        echo ""
        echo "Results saved to: $RESULTS_FILE"
        echo ""
        echo "Next step: ./scripts/go-live-deploy.sh"
        exit 0
    else
        echo -e "${RED}  VALIDATION FAILED${NC}"
        echo -e "${RED}  Fix $FAILED issues before Go-Live${NC}"
        echo -e "${BLUE}=============================================${NC}"
        echo ""
        echo "Passed: $PASSED | Warnings: $WARNINGS | Failed: $FAILED"
        echo ""
        echo "Results saved to: $RESULTS_FILE"
        echo ""
        echo "Review failures and resolve before proceeding."
        exit 1
    fi
}

main "$@"
