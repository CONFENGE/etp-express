#!/bin/bash
# Smoke Test Script - ETP Express
# Automatiza validações básicas de health check

set -e

echo "🔍 Executando Smoke Test Automatizado..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local name=$2

    echo -n "Verificando $name... "

    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✓${NC} OK"
        return 0
    else
        echo -e "${RED}✗${NC} FALHOU"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check JSON response
check_json_field() {
    local url=$1
    local field=$2
    local expected=$3
    local name=$4

    echo -n "Verificando $name... "

    local response=$(curl -s "$url")
    local value=$(echo "$response" | jq -r ".$field")

    if [ "$value" == "$expected" ]; then
        echo -e "${GREEN}✓${NC} OK ($field: $value)"
        return 0
    else
        echo -e "${RED}✗${NC} FALHOU (esperado: $expected, obtido: $value)"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

echo "=== 1. Backend Health Check ==="
check_endpoint "https://etp-express-backend-production.up.railway.app/api/health" "Backend Health"

if [ $? -eq 0 ]; then
    check_json_field "https://etp-express-backend-production.up.railway.app/api/health" "status" "ok" "Status"
    check_json_field "https://etp-express-backend-production.up.railway.app/api/health" "database" "up" "Database"
    check_json_field "https://etp-express-backend-production.up.railway.app/api/health" "redis" "up" "Redis"
fi
echo ""

echo "=== 2. Frontend Load ==="
check_endpoint "https://etp-express-frontend-production.up.railway.app" "Frontend"
echo ""

echo "=== 3. Response Time ==="
echo -n "Medindo latência backend... "
time_total=$(curl -w "%{time_total}\n" -o /dev/null -s https://etp-express-backend-production.up.railway.app/api/health)
time_ms=$(echo "$time_total * 1000" | bc)
time_ms_int=${time_ms%.*}

if [ "$time_ms_int" -lt 2000 ]; then
    echo -e "${GREEN}✓${NC} OK (${time_ms_int}ms < 2000ms)"
elif [ "$time_ms_int" -lt 3000 ]; then
    echo -e "${GREEN}✓${NC} Aceitável (${time_ms_int}ms < 3000ms)"
else
    echo -e "${RED}✗${NC} Lento (${time_ms_int}ms >= 3000ms)"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# Summary
echo "=========================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ Smoke Test PASSED${NC}"
    echo "Todos os checks passaram com sucesso!"
    exit 0
else
    echo -e "${RED}❌ Smoke Test FAILED${NC}"
    echo "Total de falhas: $FAILURES"
    echo ""
    echo "Verifique os logs acima e execute checklist manual em .github/SMOKE_TEST.md"
    exit 1
fi
