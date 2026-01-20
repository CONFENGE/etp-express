# Performance Baseline - ETP Express

Este documento estabelece o baseline de performance do sistema sob carga.

## Ambiente de Teste

- **Plataforma:** Railway Production
- **URL:** https://etp-express-production.up.railway.app
- **Banco de Dados:** PostgreSQL (Railway)
- **Cache:** Redis (Railway)
- **Região:** US East
- **Data:** 2026-01-20

## Cenários de Teste

### 1. ETP Creation Load Test

**Objetivo:** Validar criação concorrente de ETPs sob carga.

**Configuração:**
- Virtual Users (VUs): 0 → 50 → 100 → 0
- Duração: 9 minutos (2min ramp-up, 5min sustentado, 2min ramp-down)
- Think Time: 1 segundo

**Thresholds:**
- P95 latency < 2000ms
- Error rate < 0.1%

**Resultados (Baseline TBD):**

| Métrica                  | Valor | Status | Observações |
|--------------------------|-------|--------|-------------|
| Total Requests           | TBD   | ⏳     | A executar  |
| P50 Latency              | TBD   | ⏳     | A executar  |
| P95 Latency              | TBD   | ⏳     | A executar  |
| P99 Latency              | TBD   | ⏳     | A executar  |
| Error Rate               | TBD   | ⏳     | A executar  |
| Max VUs                  | 100   | ✅     | -           |

### 2. Concurrent Section Approval Test

**Objetivo:** Detectar race conditions em atualizações concorrentes.

**Configuração:**
- Virtual Users (VUs): 0 → 25 → 50 → 0
- Duração: 3 minutos
- Think Time: 0.5 segundo (agressivo)
- Alvo: Mesma seção atualizada por múltiplos usuários

**Thresholds:**
- P95 latency < 2000ms
- Error rate < 0.1%
- Concurrency conflicts (409) < 5%

**Resultados (Baseline TBD):**

| Métrica                  | Valor | Status | Observações |
|--------------------------|-------|--------|-------------|
| Total Requests           | TBD   | ⏳     | A executar  |
| P95 Latency              | TBD   | ⏳     | A executar  |
| Error Rate               | TBD   | ⏳     | A executar  |
| Concurrency Conflicts    | TBD   | ⏳     | A executar  |
| Race Conditions Detected | TBD   | ⏳     | A executar  |

### 3. Gov API Search Load Test

**Objetivo:** Validar resiliência de integração com APIs governamentais sob carga.

**Configuração:**
- Virtual Users (VUs): 0 → 100 → 200 → 0
- Duração: 5 minutos
- Think Time: 2 segundos
- Queries: 10 termos variados (computador, notebook, etc.)

**Thresholds:**
- P95 latency < 10000ms (APIs externas lentas)
- Error rate < 0.1%

**Resultados (Baseline TBD):**

| Métrica                  | Valor | Status | Observações |
|--------------------------|-------|--------|-------------|
| Total Requests (PNCP)    | TBD   | ⏳     | A executar  |
| Total Requests (SINAPI)  | TBD   | ⏳     | A executar  |
| P95 Latency (PNCP)       | TBD   | ⏳     | A executar  |
| P95 Latency (SINAPI)     | TBD   | ⏳     | A executar  |
| Error Rate               | TBD   | ⏳     | A executar  |

## Interpretação dos Resultados

### Performance Aceitável

- **P95 < 2s para CRUD:** Operações críticas de usuário devem ser rápidas
- **P95 < 10s para Gov API:** APIs externas são lentas, mas devem responder
- **Error Rate < 0.1%:** Máximo de 1 falha a cada 1000 requisições
- **Concurrency Conflicts < 5%:** Otimistic locking deve prevenir race conditions

### Alertas de Degradação

🟡 **Warning:**
- P95 entre 2-3s para CRUD
- P95 entre 10-15s para Gov API
- Error rate entre 0.1-1%
- Concurrency conflicts entre 5-10%

🔴 **Critical:**
- P95 > 3s para CRUD
- P95 > 15s para Gov API
- Error rate > 1%
- Concurrency conflicts > 10%
- Qualquer race condition detectada

## Histórico de Execuções

| Data       | ETP P95 | Section P95 | GovAPI P95 | Error Rate | Nota                    |
|------------|---------|-------------|------------|------------|-------------------------|
| 2026-01-20 | TBD     | TBD         | TBD        | TBD        | Baseline inicial (a executar) |

## Próximos Passos

1. ✅ Configurar suite de load testing (Issue #1075)
2. ⏳ Executar baseline inicial (manual ou CI)
3. ⏳ Documentar resultados reais
4. ⏳ Configurar monitoramento contínuo (Grafana)
5. ⏳ Estabelecer alertas de degradação
6. ⏳ Executar load tests semanalmente (GitHub Actions)

## Referências

- [k6 Documentation](https://k6.io/docs/)
- [Issue #1075](https://github.com/CONFENGE/etp-express/issues/1075)
- [ROADMAP.md - Quality & Security](../ROADMAP.md)
