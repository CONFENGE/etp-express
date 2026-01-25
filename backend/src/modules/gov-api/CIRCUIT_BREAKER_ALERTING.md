# Circuit Breaker Alerting - Gov API Client

## Overview

O módulo `gov-api-client` agora envia alertas automáticos via Sentry quando o circuit breaker muda de estado, permitindo detecção de incidents em < 2 horas (anteriormente detectados apenas após 2h+ por usuários).

## Implementação

### Eventos Monitorados

| Evento       | Nível Sentry | Tags                                      | Extra Context            |
| ------------ | ------------ | ----------------------------------------- | ------------------------ |
| `open`       | `warning`    | `source`, `circuit_breaker_state`, `component` | `baseUrl`, `circuitBreakerStats` |
| `half-open`  | `info`       | `source`, `circuit_breaker_state`, `component` | -                        |
| `close`      | `info`       | `source`, `circuit_breaker_state`, `component` | -                        |

### Sentry Tags

- **source**: Identificador da API (`pncp`, `comprasgov`, `sinapi`, `sicro`)
- **circuit_breaker_state**: Estado atual (`open`, `half-open`, `closed`)
- **component**: Sempre `gov-api-client`

### Extra Context (apenas `open`)

- **baseUrl**: URL base da API gov
- **circuitBreakerStats**: Estatísticas do circuit breaker (failures, successes, fires, timeouts, etc.)

## Configuração Sentry

### 1. Filtros de Alertas

Configure filtros no Sentry para criar alertas específicos:

**Filtro para Circuit Breaker OPEN:**
```
event.tags.circuit_breaker_state = "open"
AND event.level = "warning"
```

**Filtro para fonte específica (ex: PNCP):**
```
event.tags.source = "pncp"
AND event.tags.circuit_breaker_state = "open"
```

### 2. Integrações de Alerta

**Slack:**
1. Vá para Sentry → Settings → Integrations → Slack
2. Crie regra de alerta:
   - Trigger: `when circuit_breaker_state is open`
   - Action: `send notification to #alerts-gov-api`

**PagerDuty:**
1. Sentry → Settings → Integrations → PagerDuty
2. Configure escalation policy para alertas de circuit breaker

### 3. Dashboard Grafana (Prometheus)

Embora a implementação atual use **apenas Sentry**, a issue #1067 menciona métricas Prometheus.

**Futuro (não implementado):**
```promql
# Métrica sugerida
gov_api_circuit_breaker_state{source="pncp", state="open"} = 1
```

## Troubleshooting

### Forçar Circuit Breaker OPEN (Teste Manual)

```typescript
// Em um teste ou job de manutenção
const client = new GovApiClient(configService, {
  baseUrl: 'https://pncp.gov.br/api',
  source: 'pncp',
  circuitBreaker: {
    volumeThreshold: 1, // Abre após 1 falha
    errorThresholdPercentage: 1, // 1% de erro
  },
});

// Forçar erro
try {
  await client.get('/endpoint-inexistente');
} catch (error) {
  // Circuit breaker deve abrir e enviar alerta Sentry
}
```

### Verificar Eventos no Sentry

1. Vá para Sentry → Issues
2. Filtre por: `component:gov-api-client`
3. Procure por mensagens contendo "Circuit breaker OPENED"

### Verificar Logs Locais

```bash
# Backend logs
tail -f backend/logs/app.log | grep "Circuit breaker"

# Output esperado:
# [WARN] Circuit breaker OPENED for pncp - too many failures, requests will be rejected
```

## Testes

### Executar Testes Unitários

```bash
cd backend
npm test -- gov-api-client.spec.ts
```

**Testes de Alerting:**
- ✅ Envia alerta Sentry quando circuit breaker abre
- ✅ Envia evento info quando vai para half-open
- ✅ Envia evento info quando fecha
- ✅ Inclui stats do circuit breaker no contexto

### Cobertura de Testes

```bash
npm run test:cov -- gov-api-client.spec.ts
```

**Cobertura esperada:**
- gov-api-client.ts: ~85%+ (28 testes passando)

## Acceptance Criteria

- [x] Evento Sentry warning ao forçar circuit breaker open
- [x] Tags Sentry incluem `source`, `circuit_breaker_state`, `component`
- [x] Extra context inclui `baseUrl` e `circuitBreakerStats`
- [x] Testes unitários validam integração Sentry
- [ ] Dashboard Grafana (não implementado - fora do escopo atômico)

## Próximos Passos (Fora do Escopo)

1. **Métricas Prometheus** (#1068, #1069): Implementar gauge `gov_api_circuit_breaker_state`
2. **Dashboard Grafana**: Visualizar estados do circuit breaker em tempo real
3. **Retry Optimization** (#1068): Adicionar jitter e circuit breaker mais agressivo
4. **Cache Invalidation** (#1069): TTL dinâmico baseado em eventos

## Referências

- Issue: #1067
- Arquivo principal: `backend/src/modules/gov-api/utils/gov-api-client.ts:239-308`
- Testes: `backend/src/modules/gov-api/utils/gov-api-client.spec.ts:344-478`
- Sentry Docs: https://docs.sentry.io/platforms/node/
- Opossum (Circuit Breaker): https://github.com/nodeshift/opossum
