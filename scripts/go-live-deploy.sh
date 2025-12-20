#!/bin/bash
#
# Go-Live Deploy Script for ETP Express B2G
#
# Este script coordena todo o processo de deploy Go-Live:
# 1. Validacao pre-deploy
# 2. Backup do database
# 3. Deploy backend e frontend
# 4. Validacao pos-deploy (smoke tests)
# 5. Geracao de relatorio final
#
# Uso:
#   ./scripts/go-live-deploy.sh [--dry-run] [--skip-backup]
#
# Opcoes:
#   --dry-run      Executa validacoes sem deploy real
#   --skip-backup  Pula backup (usar apenas se backup manual foi feito)
#
# IMPORTANTE: Execute em horario de baixo uso (22h-6h)
#
# Exit codes:
#   0 - Go-Live completado com sucesso
#   1 - Falha em alguma etapa (rollback pode ter sido executado)
#   2 - Erro de configuracao
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_URL="${BACKEND_URL:-https://etp-express-backend-production.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://etp-express-frontend-production.up.railway.app}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${SCRIPT_DIR}/go-live-${TIMESTAMP}.log"
REPORT_FILE="${SCRIPT_DIR}/go-live-report-${TIMESTAMP}.md"

# Options
DRY_RUN=false
SKIP_BACKUP=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
    esac
done

# Logging functions
log() {
    local msg="[$(date +%H:%M:%S)] $1"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

log_step() {
    echo ""
    log "${MAGENTA}========================================${NC}"
    log "${MAGENTA}  $1${NC}"
    log "${MAGENTA}========================================${NC}"
    echo ""
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[OK]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARN]${NC} $1"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" <<EOF
# Go-Live Deploy Report - ETP Express B2G

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Operator:** $(whoami)
**Mode:** $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "PRODUCTION")

---

## Timeline

EOF
}

add_to_report() {
    echo "- **$(date +%H:%M:%S)** - $1" >> "$REPORT_FILE"
}

# Pre-flight check
preflight_check() {
    log_step "Step 0: Pre-Flight Check"

    # Check required tools
    local tools=("curl" "jq" "git")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_success "$tool available"
        else
            log_error "$tool not found"
            exit 2
        fi
    done

    # Check Railway CLI (optional but recommended)
    if command -v railway &> /dev/null; then
        log_success "Railway CLI available"
    else
        log_warning "Railway CLI not found - some features limited"
    fi

    # Check we're on master branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" = "master" ] || [ "$CURRENT_BRANCH" = "main" ]; then
        log_success "On $CURRENT_BRANCH branch"
    else
        log_error "Not on master/main branch (current: $CURRENT_BRANCH)"
        exit 2
    fi

    # Check for uncommitted changes
    if git diff --quiet && git diff --staged --quiet; then
        log_success "No uncommitted changes"
    else
        log_error "Uncommitted changes detected - commit or stash first"
        exit 2
    fi

    add_to_report "Pre-flight check passed"
}

# Step 1: Pre-deploy validation
run_pre_deploy_validation() {
    log_step "Step 1: Pre-Deploy Validation"

    if [ -f "${SCRIPT_DIR}/pre-deploy-validation.sh" ]; then
        if bash "${SCRIPT_DIR}/pre-deploy-validation.sh"; then
            log_success "Pre-deploy validation passed"
            add_to_report "Pre-deploy validation: PASSED"
        else
            log_error "Pre-deploy validation failed"
            add_to_report "Pre-deploy validation: FAILED"
            exit 1
        fi
    else
        log_warning "Pre-deploy validation script not found, skipping..."
        add_to_report "Pre-deploy validation: SKIPPED (script not found)"
    fi
}

# Step 2: Create backup
create_backup() {
    log_step "Step 2: Database Backup"

    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Backup skipped (--skip-backup flag)"
        add_to_report "Database backup: SKIPPED (manual flag)"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would create backup"
        add_to_report "Database backup: DRY RUN"
        return
    fi

    if [ -f "${SCRIPT_DIR}/backup-db.sh" ]; then
        BACKUP_FILE="backup-pre-golive-${TIMESTAMP}.sql"

        if bash "${SCRIPT_DIR}/backup-db.sh" "$BACKUP_FILE"; then
            log_success "Backup created: $BACKUP_FILE"
            add_to_report "Database backup: $BACKUP_FILE"
        else
            log_error "Backup failed"
            add_to_report "Database backup: FAILED"
            exit 1
        fi
    else
        log_warning "Backup script not found - create manual backup"
        add_to_report "Database backup: MANUAL REQUIRED"

        echo ""
        read -p "Have you created a manual backup? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Backup required before Go-Live"
            exit 1
        fi
    fi
}

# Step 3: Deploy backend
deploy_backend() {
    log_step "Step 3: Deploy Backend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy backend"
        add_to_report "Backend deploy: DRY RUN"
        return
    fi

    log_info "Deploying backend to Railway..."

    if [ -f "${SCRIPT_DIR}/deploy.sh" ]; then
        if bash "${SCRIPT_DIR}/deploy.sh" etp-express-backend; then
            log_success "Backend deployed successfully"
            add_to_report "Backend deploy: SUCCESS"
        else
            log_error "Backend deploy failed"
            add_to_report "Backend deploy: FAILED"
            exit 1
        fi
    else
        # Fallback: Use Railway CLI directly
        if command -v railway &> /dev/null; then
            railway up --service etp-express-backend
            log_success "Backend deployed via Railway CLI"
            add_to_report "Backend deploy: SUCCESS (Railway CLI)"
        else
            log_error "No deploy method available"
            exit 1
        fi
    fi

    # Wait for health check
    log_info "Waiting for backend health check..."
    local retries=30
    local delay=10

    for ((i=1; i<=retries; i++)); do
        if curl -sf "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
            log_success "Backend health check passed"
            break
        fi

        if [ $i -eq $retries ]; then
            log_error "Backend health check failed after $retries attempts"
            add_to_report "Backend health: FAILED"
            exit 1
        fi

        log_info "Attempt $i/$retries - waiting ${delay}s..."
        sleep $delay
    done
}

# Step 4: Deploy frontend
deploy_frontend() {
    log_step "Step 4: Deploy Frontend"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy frontend"
        add_to_report "Frontend deploy: DRY RUN"
        return
    fi

    log_info "Deploying frontend to Railway..."

    if command -v railway &> /dev/null; then
        railway up --service etp-express-frontend
        log_success "Frontend deployed via Railway CLI"
        add_to_report "Frontend deploy: SUCCESS"
    else
        log_warning "Railway CLI not available - deploy manually"
        add_to_report "Frontend deploy: MANUAL REQUIRED"

        echo ""
        read -p "Have you deployed frontend manually? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Frontend deploy required"
            exit 1
        fi
    fi

    # Wait for frontend
    log_info "Waiting for frontend..."
    sleep 30

    local frontend_code=$(curl -so /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null || echo "000")
    if [ "$frontend_code" = "200" ]; then
        log_success "Frontend responding (HTTP 200)"
    else
        log_warning "Frontend check returned HTTP $frontend_code"
    fi
}

# Step 5: Post-deploy validation (Smoke tests)
run_smoke_tests() {
    log_step "Step 5: Post-Deploy Smoke Tests"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run smoke tests"
        add_to_report "Smoke tests: DRY RUN"
        return
    fi

    if [ -f "${SCRIPT_DIR}/validate-railway-deploy.sh" ]; then
        if bash "${SCRIPT_DIR}/validate-railway-deploy.sh"; then
            log_success "Smoke tests passed"
            add_to_report "Smoke tests: PASSED"
        else
            log_error "Smoke tests failed"
            add_to_report "Smoke tests: FAILED"

            echo ""
            log_warning "Smoke tests failed. Options:"
            echo "  1. Investigate and fix issues"
            echo "  2. Execute rollback: ./scripts/rollback.sh"
            echo ""

            read -p "Continue anyway? (y/n) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        log_warning "Smoke test script not found - manual validation required"
        add_to_report "Smoke tests: MANUAL REQUIRED"
    fi
}

# Step 6: Generate final report
generate_final_report() {
    log_step "Step 6: Final Report"

    cat >> "$REPORT_FILE" <<EOF

---

## Validation Results

### Backend
- URL: $BACKEND_URL
- Health Check: $(curl -sf "${BACKEND_URL}/api/health" > /dev/null 2>&1 && echo "PASS" || echo "FAIL")

### Frontend
- URL: $FRONTEND_URL
- Status: $(curl -so /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null || echo "UNKNOWN")

---

## Next Steps

1. Monitor Sentry for errors (next 24h)
2. Check Railway metrics and logs
3. Send early adopter notification (see docs/EARLY_ADOPTERS_EMAIL.md)
4. Execute issue #742 - 24h monitoring

---

## Rollback Instructions

If issues are detected:

\`\`\`bash
# Rollback to previous deployment
./scripts/rollback.sh

# Restore database backup
./scripts/restore-db.sh backup-pre-golive-${TIMESTAMP}.sql
\`\`\`

---

**Generated by:** go-live-deploy.sh
**Log file:** $LOG_FILE

EOF

    log_success "Report generated: $REPORT_FILE"
    add_to_report "Go-Live process completed"
}

# Main execution
main() {
    local start_time=$(date +%s)

    echo ""
    echo -e "${MAGENTA}*************************************************${NC}"
    echo -e "${MAGENTA}*                                               *${NC}"
    echo -e "${MAGENTA}*   ETP EXPRESS - GO-LIVE DEPLOY B2G            *${NC}"
    echo -e "${MAGENTA}*                                               *${NC}"
    echo -e "${MAGENTA}*************************************************${NC}"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}*** DRY RUN MODE - No actual changes ***${NC}"
        echo ""
    fi

    init_report

    # Execute steps
    preflight_check
    run_pre_deploy_validation
    create_backup
    deploy_backend
    deploy_frontend
    run_smoke_tests
    generate_final_report

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${GREEN}*************************************************${NC}"
    echo -e "${GREEN}*                                               *${NC}"
    echo -e "${GREEN}*   GO-LIVE COMPLETED SUCCESSFULLY!             *${NC}"
    echo -e "${GREEN}*                                               *${NC}"
    echo -e "${GREEN}*************************************************${NC}"
    echo ""
    log_info "Duration: ${duration}s"
    log_info "Log: $LOG_FILE"
    log_info "Report: $REPORT_FILE"
    echo ""
    log_info "Next steps:"
    echo "  1. Monitor Sentry dashboard for 24h"
    echo "  2. Send early adopter notification"
    echo "  3. Execute #742 - 24h post-deploy monitoring"
    echo ""

    exit 0
}

# Execute main
main "$@"
