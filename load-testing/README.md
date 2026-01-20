# Load Testing Suite - ETP Express

Suíte de testes de carga para validar resiliência e performance sob concorrência alta.

## Ferramentas

- **k6** - Framework de load testing (https://k6.io/)
- **InfluxDB** - Time-series database para métricas (opcional)
- **Grafana** - Dashboard de visualização (opcional)

## Instalação

### k6

```bash
# Windows (via Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Cenários de Teste

### 1. ETP Creation Load Test

Testa criação concorrente de ETPs por 100 usuários simultâneos.

**Comando:**

```bash
k6 run --env BASE_URL=https://etp-express-production.up.railway.app \
       --env TEST_USER_EMAIL=loadtest@etp-express.com \
       --env TEST_USER_PASSWORD=<password> \
       scenarios/etp-creation.load.js
```

**Métricas:**

- P95 latency < 2s para CRUD
- Taxa de erro < 0.1%

### 2. Concurrent Section Approval

Testa atualizações concorrentes na mesma seção (stress test para race conditions).

**Comando:**

```bash
k6 run --env BASE_URL=https://etp-express-production.up.railway.app \
       --env TEST_USER_EMAIL=loadtest@etp-express.com \
       --env TEST_USER_PASSWORD=<password> \
       scenarios/section-approval-concurrent.load.js
```

**Métricas:**

- P95 latency < 2s
- Taxa de conflitos (409) < 5%
- Zero race conditions detectadas

### 3. Gov API Search Load Test

Testa busca em APIs governamentais com 200 requisições simultâneas.

**Comando:**

```bash
k6 run --env BASE_URL=https://etp-express-production.up.railway.app \
       --env TEST_USER_EMAIL=loadtest@etp-express.com \
       --env TEST_USER_PASSWORD=<password> \
       scenarios/gov-api-search.load.js
```

**Métricas:**

- P95 latency < 10s (APIs externas)
- Taxa de erro < 0.1%

## Executar Todos os Cenários

```bash
# Executar suite completa
./run-load-tests.sh
```

## Configuração do GitHub Actions

Arquivo `.github/workflows/load-testing.yml` configura execução agendada (semanal) dos testes de carga.

## Resultados

Os resultados são salvos em `load-testing/results/`:

- `etp-creation-<timestamp>.json` - Métricas detalhadas do teste de criação
- `section-approval-<timestamp>.json` - Métricas de concorrência
- `gov-api-search-<timestamp>.json` - Métricas de busca

## Baseline de Performance

### Ambiente: Railway Production (2026-01-20)

| Métrica               | Valor | Threshold | Status |
| --------------------- | ----- | --------- | ------ |
| ETP Creation P95      | TBD   | < 2s      | ⏳     |
| Section Update P95    | TBD   | < 2s      | ⏳     |
| Gov API Search P95    | TBD   | < 10s     | ⏳     |
| Concurrency Conflicts | TBD   | < 5%      | ⏳     |
| Overall Error Rate    | TBD   | < 0.1%    | ⏳     |

**Observações:** Baseline será estabelecido após primeira execução.

## Integração com Grafana (Opcional)

### Setup InfluxDB + Grafana

```bash
# Docker compose para stack de monitoramento
docker-compose -f docker-compose.monitoring.yml up -d
```

### Executar k6 com output para InfluxDB

```bash
k6 run --out influxdb=http://localhost:8086/k6 scenarios/etp-creation.load.js
```

### Grafana Dashboard

Acesse `http://localhost:3001` e importe o dashboard `grafana-dashboard.json`.

## Troubleshooting

### Erro: "connection refused"

Certifique-se que o backend está rodando:

```bash
cd backend
npm run start:dev
```

### Erro: "401 Unauthorized"

Verifique as credenciais do usuário de teste:

```bash
# Criar usuário de load test
npm run seed:loadtest-user
```

### Alta taxa de erros

1. Verifique se o banco de dados está rodando
2. Verifique logs do backend: `npm run logs`
3. Aumente o timeout: `--http-debug`

## Referências

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [InfluxDB k6 Output](https://k6.io/docs/results-output/real-time/influxdb/)
