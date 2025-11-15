#!/bin/bash
#
# Rollback Script for ETP Express
#
# Este script executa rollback para o deployment anterior no Railway
# e valida que o serviço está saudável após o rollback.
#
# Uso:
#   ./scripts/rollback.sh [service-name]
#
# Argumentos:
#   service-name  Nome do serviço Railway (default: etp-express-backend)
#
# Variáveis de ambiente requeridas:
#   RAILWAY_TOKEN          Token de autenticação Railway
#   RAILWAY_BACKEND_URL    URL pública do backend
#
# Exit codes:
#   0 - Rollback bem-sucedido
#   1 - Falha no rollback ou validação
#   2 - Erro de configuração
#

set -euo pipefail

# Configuração
RAILWAY_SERVICE="${1:-etp-express-backend}"
HEALTH_CHECK_URL="${RAILWAY_BACKEND_URL}/api/health"
MAX_RETRIES=20
RETRY_INTERVAL=10

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

# Verificar Railway CLI
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI não encontrado"
        exit 2
    fi
    log_success "Railway CLI encontrado"
}

# Obter deployment anterior
get_previous_deployment() {
    log_info "Buscando deployment anterior..."

    # Listar deployments e pegar o segundo (índice [1])
    PREVIOUS_DEPLOYMENT=$(railway deployment list --service "$RAILWAY_SERVICE" --json | jq -r '.[1].id' 2>/dev/null)

    if [ -z "$PREVIOUS_DEPLOYMENT" ] || [ "$PREVIOUS_DEPLOYMENT" = "null" ]; then
        log_error "Nenhum deployment anterior encontrado"
        log_warning "Possível primeiro deployment - rollback não é possível"
        exit 1
    fi

    log_success "Deployment anterior encontrado: ${PREVIOUS_DEPLOYMENT}"
    echo "$PREVIOUS_DEPLOYMENT"
}

# Executar rollback
execute_rollback() {
    local deployment_id=$1

    log_info "Executando rollback para deployment: ${deployment_id}"

    # Railway deployment rollback
    if railway deployment rollback "$deployment_id" --service "$RAILWAY_SERVICE"; then
        log_success "Comando de rollback executado com sucesso"
        return 0
    else
        log_error "Falha ao executar comando de rollback"
        return 1
    fi
}

# Validar rollback
validate_rollback() {
    log_info "Validando rollback via health check..."

    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f -s -o /dev/null "$HEALTH_CHECK_URL"; then
            log_success "Health check passou após rollback (tentativa $i/$MAX_RETRIES)"

            # Verificar status detalhado
            HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")
            HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "unknown")

            if [ "$HEALTH_STATUS" = "healthy" ]; then
                log_success "Serviço está healthy após rollback"
                return 0
            else
                log_warning "Serviço respondeu mas status é: ${HEALTH_STATUS}"
            fi
        fi

        if [ $i -eq $MAX_RETRIES ]; then
            log_error "Health check falhou após $MAX_RETRIES tentativas"
            log_error "Rollback pode ter falhado - intervenção manual necessária!"
            return 1
        fi

        log_warning "Aguardando serviço estabilizar (tentativa $i/$MAX_RETRIES)..."
        sleep $RETRY_INTERVAL
    done
}

# Main execution
main() {
    local start_time=$(date +%s)

    echo ""
    log_error "═══════════════════════════════════════════════════════"
    log_error "  ROLLBACK - ETP Express"
    log_error "═══════════════════════════════════════════════════════"
    echo ""

    # 1. Validações
    validate_env
    check_railway_cli

    # 2. Obter deployment anterior
    echo ""
    log_info "Etapa 1/3: Identificar Deployment Anterior"
    PREVIOUS_DEPLOYMENT=$(get_previous_deployment)

    # 3. Executar rollback
    echo ""
    log_info "Etapa 2/3: Executar Rollback"
    if ! execute_rollback "$PREVIOUS_DEPLOYMENT"; then
        log_error "Falha ao executar rollback"
        exit 1
    fi

    # 4. Validar rollback
    echo ""
    log_info "Etapa 3/3: Validar Rollback"
    if ! validate_rollback; then
        log_error "Validação do rollback falhou"
        log_error "INTERVENÇÃO MANUAL NECESSÁRIA!"
        log_error "Verifique logs no Railway: railway logs --service $RAILWAY_SERVICE"
        exit 1
    fi

    # 5. Sucesso
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    log_success "═══════════════════════════════════════════════════════"
    log_success "  Rollback concluído com sucesso!"
    log_success "═══════════════════════════════════════════════════════"
    log_info "Deployment restaurado: ${PREVIOUS_DEPLOYMENT}"
    log_info "Duração: ${duration}s"
    log_info "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    log_warning "Investigue a causa da falha antes de tentar novo deploy"
    echo ""

    exit 0
}

# Execute main
main "$@"
