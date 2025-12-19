# Load Testing - ETP Express

Testes de carga usando [k6](https://k6.io/) para validar performance e escalabilidade do sistema.

## Instalação

### Windows (Chocolatey)

```bash
choco install k6
```

### macOS (Homebrew)

```bash
brew install k6
```

### Linux

```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker

```bash
docker pull grafana/k6:latest
```

## Estrutura de Testes

```
tests/load/
├── README.md # Este arquivo
├── config.js # Configurações globais e profiles
├── auth-login.js # Load test: POST /auth/login
├── etp-create.js # Load test: POST /etps
├── section-generate.js # Load test: POST /sections/etp/:id/generate
├── run-progressive-load-test.sh # Script automatizado (Bash/macOS/Linux)
├── run-progressive-load-test.ps1 # Script automatizado (PowerShell/Windows)
├── RESULTS_TEMPLATE.md # Template de relatório de resultados
└── results/ # Outputs dos testes (gitignored)
```

## Execução Rápida

### Progressive Load Test (Issue #89) - Recomendado

Executa suite completa de testes progressivos (10 → 50 → 100 → 200 VUs) para identificar breaking point:

```bash
# Linux/macOS (Bash)
chmod +x tests/load/run-progressive-load-test.sh
./tests/load/run-progressive-load-test.sh

# Windows (PowerShell)
.\tests\load\run-progressive-load-test.ps1
```

**Duração total:** ~40 minutos
**Output:** Relatório markdown em `tests/load/results/progressive_load_test_[timestamp].md`

**Pré-requisitos:**

1. Backend rodando: `cd backend && npm run start:dev`
2. Usuário de teste criado (email: `testuser@example.com`, senha: `Test@1234`)
3. k6 instalado e no PATH

**Customização:**

```bash
# Usar credenciais diferentes
export TEST_EMAIL="outro@example.com"
export TEST_PASSWORD="OutraSenha@123"
./tests/load/run-progressive-load-test.sh
```

---

### Smoke Test (validação básica)

```bash
# Auth login
k6 run tests/load/auth-login.js

# Criar ETP (requer token)
K6_ACCESS_TOKEN="<token>" k6 run tests/load/etp-create.js

# Gerar seção (requer token + ETP ID)
K6_ACCESS_TOKEN="<token>" K6_ETP_ID="<id>" k6 run tests/load/section-generate.js
```

### Load Test (carga normal)

```bash
K6_PROFILE=load k6 run tests/load/auth-login.js
```

### Stress Test (carga elevada)

```bash
K6_PROFILE=stress k6 run tests/load/auth-login.js
```

## Configuração de Ambiente

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
| ----------------- | ----------------------------------------------- | ----------------------- |
| `BASE_URL` | URL base da API | `http://localhost:3000` |
| `K6_ENV` | Ambiente (local/staging/production) | `local` |
| `K6_PROFILE` | Profile de carga (smoke/load/stress/spike/soak) | `smoke` |
| `K6_ACCESS_TOKEN` | Token JWT para autenticação | - |
| `K6_ETP_ID` | ID do ETP para testes de seções | - |
| `TEST_EMAIL` | Email do usuário de teste | `testuser@example.com` |
| `TEST_PASSWORD` | Senha do usuário de teste | `Test@1234` |

### Exemplo de Uso

```bash
BASE_URL=http://localhost:3000 \
K6_ENV=local \
K6_PROFILE=load \
TEST_EMAIL=test@example.com \
TEST_PASSWORD=Test@1234 \
k6 run tests/load/auth-login.js
```

## Profiles de Carga

### Smoke Test

- **Objetivo:** Validação básica de funcionalidade
- **Duração:** 30s
- **VUs:** 1
- **Uso:** Validar scripts antes de executar testes maiores

### Load Test

- **Objetivo:** Simular carga normal esperada
- **Duração:** 5min
- **VUs:** 10 (ramp-up de 1min)
- **Uso:** Validar performance em condições normais

### Stress Test

- **Objetivo:** Identificar limites do sistema
- **Duração:** 14min
- **VUs:** 10 → 50 (incremental)
- **Uso:** Encontrar breaking point

### Spike Test

- **Objetivo:** Testar recuperação de picos súbitos
- **Duração:** 7min
- **VUs:** 10 → 100 → 10 (súbito)
- **Uso:** Validar resiliência a traffic spikes

### Soak Test

- **Objetivo:** Detectar memory leaks
- **Duração:** 3h+
- **VUs:** 10 (constante)
- **Uso:** Validar estabilidade prolongada

## Métricas Reportadas

### Métricas HTTP (padrão k6)

- `http_reqs`: Total de requests
- `http_req_duration`: Latência (p50, p95, p99)
- `http_req_failed`: Taxa de falha (%)
- `http_req_waiting`: Time to first byte (TTFB)
- `iterations`: Iterações completadas
- `vus`: Virtual users ativos

### Métricas Customizadas

- `login_errors`: Taxa de erro de login
- `login_duration`: Duração específica de login
- `etp_create_errors`: Taxa de erro de criação de ETP
- `section_generate_errors`: Taxa de erro de geração de seções
- `llm_calls_total`: Total de chamadas LLM (contador)

## Outputs e Visualização

### Output no Terminal (padrão)

```bash
k6 run tests/load/auth-login.js
```

### Output JSON (para CI/CD)

```bash
k6 run --out json=tests/load/results/result.json tests/load/auth-login.js
```

### Output CSV

```bash
k6 run --out csv=tests/load/results/metrics.csv tests/load/auth-login.js
```

### Output InfluxDB + Grafana

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/auth-login.js
```

### Grafana Cloud (recomendado)

```bash
K6_CLOUD_TOKEN=<token> k6 run --out cloud tests/load/auth-login.js
```

## Casos de Uso Práticos

### 1. Validar Performance Antes de Deploy

```bash
# Executar suite completa (CI/CD)
k6 run tests/load/auth-login.js
k6 run tests/load/etp-create.js

# Validar thresholds (exit code 0 se passou)
if k6 run tests/load/auth-login.js; then
 echo "✅ Performance OK"
else
 echo "❌ Performance degradada - deploy bloqueado"
 exit 1
fi
```

### 2. Obter Token para Testes Autenticados

```bash
# 1. Login via curl
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"test@example.com","password":"Test@1234"}' \
 | jq -r '.access_token')

# 2. Usar token em teste
K6_ACCESS_TOKEN="$TOKEN" k6 run tests/load/etp-create.js
```

### 3. Criar ETP e Testar Geração de Seções

```bash
# 1. Obter token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{"email":"test@example.com","password":"Test@1234"}' \
 | jq -r '.access_token')

# 2. Criar ETP
ETP_ID=$(curl -s -X POST http://localhost:3000/api/etps \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $TOKEN" \
 -d '{"title":"Load Test ETP","description":"ETP para teste"}' \
 | jq -r '.id')

# 3. Testar geração de seções
K6_ACCESS_TOKEN="$TOKEN" K6_ETP_ID="$ETP_ID" \
 k6 run --vus 1 --duration 1m tests/load/section-generate.js
```

### 4. Comparar Performance Entre Versões

```bash
# Versão baseline (main)
git checkout main
k6 run --out json=results/baseline.json tests/load/auth-login.js

# Nova versão (feature branch)
git checkout feat/optimization
k6 run --out json=results/feature.json tests/load/auth-login.js

# Comparar resultados
k6 inspect results/baseline.json results/feature.json
```

## Thresholds e SLAs

Os testes estão configurados com os seguintes SLAs:

### Endpoints de Autenticação

- ✅ 95% requests < 500ms
- ✅ 99% requests < 1s
- ✅ Taxa de erro < 5%

### Endpoints CRUD (ETPs)

- ✅ 95% requests < 1.5s
- ✅ 99% requests < 3s
- ✅ Taxa de erro < 5%

### Endpoints LLM (Geração de Seções)

- ✅ 95% requests < 15s
- ✅ 99% requests < 30s
- ✅ Taxa de erro < 10% (LLM pode falhar ocasionalmente)

**Se um threshold falhar, o k6 retorna exit code 99.**

## ⚠ Avisos Importantes

### Custos OpenAI

- ⚠ **section-generate.js** gera custos reais de API OpenAI (~$0.01-0.05 por request)
- Use `--vus 1 --duration 1m` para testes iniciais
- Monitore custos no dashboard OpenAI

### Rate Limiting

- Backend tem rate limit de **5 req/min por usuário**
- Use VUs baixos (1-2) para endpoints LLM
- Para load testing real, desative rate limiting temporariamente

### Ambiente de Produção

- **NUNCA** execute stress tests em produção sem autorização
- Use staging para validações
- Considere impacto em custos de infra (Railway/OpenAI)

## Referências

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Grafana Cloud k6](https://grafana.com/products/cloud/k6/)
- [Best Practices](https://k6.io/docs/testing-guides/test-types/)

## Contribuindo

Para adicionar novos testes:

1. Criar arquivo em `tests/load/<nome>.js`
2. Seguir estrutura existente (imports, options, default function)
3. Adicionar métricas customizadas se necessário
4. Documentar no README
5. Validar com smoke test antes de commit

## Changelog

- **2025-11-29**: Progressive load test automation scripts + results template - Issue #89
- **2025-11-29**: Setup inicial k6 + 3 scripts base (auth, etps, sections) - Issue #88
