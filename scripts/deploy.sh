#!/bin/bash
#
# Zero-Downtime Deployment Script for ETP Express
#
# Este script executa deploy no Railway com validação de health check
# e rollback automático em caso de falha.
#
# Uso:
#   ./scripts/deploy.sh [service-name]
#
# Argumentos:
#   service-name  Nome do serviço Railway (default: etp-express-backend)
#
# Variáveis de ambiente requeridas:
#   RAILWAY_TOKEN          Token de autenticação Railway
#   RAILWAY_BACKEND_URL    URL pública do backend (ex: https://backend.railway.app)
#
# Exit codes:
#   0 - Deploy bem-sucedido
#   1 - Falha no health check ou smoke tests (rollback executado)
#   2 - Erro de configuração (variáveis faltando)
#

set -euo pipefail

# Configuração
RAILWAY_SERVICE="${1:-etp-express-backend}"
HEALTH_CHECK_URL="${RAILWAY_BACKEND_URL}/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=10
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Validar variáveis de ambiente
validate_env() {
    if [ -z "${RAILWAY_TOKEN:-}" ]; then
        log_error "RAILWAY_TOKEN não definido"
        exit 2
    fi

    if [ -z "${RAILWAY_BACKEND_URL:-}" ]; then
        log_error "RAILWAY_BACKEND_URL não definido"
        exit 2
    fi

    log_success "Variáveis de ambiente validadas"
}

# Verificar se Railway CLI está instalado
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI não encontrado. Instale com: npm install -g @railway/cli"
        exit 2
    fi
    log_success "Railway CLI encontrado: $(railway --version)"
}

# Trigger deployment no Railway
trigger_deployment() {
    log_info "Iniciando deployment no Railway..."
    log_info "Serviço: ${RAILWAY_SERVICE}"

    # Railway up retorna ID do deployment
    DEPLOYMENT_ID=$(railway up --service "$RAILWAY_SERVICE" --json | jq -r '.deploymentId')

    if [ -z "$DEPLOYMENT_ID" ] || [ "$DEPLOYMENT_ID" = "null" ]; then
        log_error "Falha ao obter ID do deployment"
        exit 1
    fi

    log_success "Deployment iniciado: ${DEPLOYMENT_ID}"
    echo "$DEPLOYMENT_ID"
}

# Aguardar health check
wait_for_health_check() {
    log_info "Aguardando health check em ${HEALTH_CHECK_URL}..."

    for i in $(seq 1 $MAX_RETRIES); do
        # -f: fail silently on HTTP errors
        # -s: silent mode
        # -o /dev/null: discard output
        if curl -f -s -o /dev/null "$HEALTH_CHECK_URL"; then
            log_success "Health check passou (tentativa $i/$MAX_RETRIES)"
            return 0
        fi

        if [ $i -eq $MAX_RETRIES ]; then
            log_error "Health check falhou após $MAX_RETRIES tentativas"
            return 1
        fi

        log_warning "Health check não respondeu (tentativa $i/$MAX_RETRIES), aguardando ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
}

# Executar smoke tests
run_smoke_tests() {
    log_info "Executando smoke tests..."

    # Test 1: Health endpoint retorna JSON válido
    log_info "Test 1/3: Validando formato JSON do health check..."
    HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")

    if ! echo "$HEALTH_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
        log_error "Health check não retornou JSON válido"
        return 1
    fi

    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
    if [ "$HEALTH_STATUS" != "healthy" ]; then
        log_error "Health status é '${HEALTH_STATUS}', esperado 'healthy'"
        return 1
    fi
    log_success "Test 1/3: JSON válido e status healthy"

    # Test 2: Database conectado
    log_info "Test 2/3: Validando conectividade database..."
    DB_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.database')
    if [ "$DB_STATUS" != "connected" ]; then
        log_error "Database status é '${DB_STATUS}', esperado 'connected'"
        return 1
    fi
    log_success "Test 2/3: Database conectado"

    # Test 3: Response time aceitável (<2s)
    log_info "Test 3/3: Validando response time..."
    RESPONSE_TIME=$(curl -s -o /dev/null -w '%{time_total}' "$HEALTH_CHECK_URL")
    RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)

    if [ "$RESPONSE_TIME_MS" -gt 2000 ]; then
        log_warning "Response time alto: ${RESPONSE_TIME_MS}ms (target: <2000ms)"
    else
        log_success "Test 3/3: Response time OK (${RESPONSE_TIME_MS}ms)"
    fi

    log_success "Todos os smoke tests passaram!"
    return 0
}

# Executar rollback
execute_rollback() {
    log_error "Executando rollback automático..."

    if [ -f "$SCRIPT_DIR/rollback.sh" ]; then
        bash "$SCRIPT_DIR/rollback.sh"
    else
        log_error "Script de rollback não encontrado em $SCRIPT_DIR/rollback.sh"
        exit 1
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)

    echo ""
    log_info "═══════════════════════════════════════════════════════"
    log_info "  Zero-Downtime Deployment - ETP Express"
    log_info "═══════════════════════════════════════════════════════"
    echo ""

    # 1. Validações
    validate_env
    check_railway_cli

    # 2. Trigger deployment
    echo ""
    log_info "Etapa 1/3: Deployment"
    DEPLOYMENT_ID=$(trigger_deployment)

    # 3. Health check
    echo ""
    log_info "Etapa 2/3: Health Check"
    if ! wait_for_health_check; then
        execute_rollback
        exit 1
    fi

    # 4. Smoke tests
    echo ""
    log_info "Etapa 3/3: Smoke Tests"
    if ! run_smoke_tests; then
        execute_rollback
        exit 1
    fi

    # 5. Sucesso
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    log_success "═══════════════════════════════════════════════════════"
    log_success "  Deployment concluído com sucesso!"
    log_success "═══════════════════════════════════════════════════════"
    log_info "Deployment ID: ${DEPLOYMENT_ID}"
    log_info "Duração: ${duration}s"
    log_info "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo ""

    exit 0
}

# Execute main
main "$@"
