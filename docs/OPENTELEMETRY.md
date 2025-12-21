# OpenTelemetry Distributed Tracing

**Status:** Implementado
**Ultima atualizacao:** 2025-12-21
**Versao:** 1.0
**Issues:** #857, #858, #859

## Visao Geral

O ETP Express utiliza OpenTelemetry para distributed tracing, permitindo rastrear requisicoes atraves de todos os componentes do sistema.

**Beneficios:**

- **Visibilidade E2E:** Trace completo de requisicoes (HTTP -> NestJS -> DB -> LLM)
- **Performance Analysis:** Identificar gargalos e latencia
- **Error Correlation:** Conectar erros ao contexto completo da requisicao
- **Debug em Producao:** Diagnosticar problemas sem reproduzir localmente

---

## Arquitetura

```
                         +------------------+
                         |   Trace Backend  |
                         |  (Jaeger/Tempo)  |
                         +--------+---------+
                                  ^
                                  | OTLP/HTTP
                                  | :4318/v1/traces
                                  |
+-------------+    HTTP    +------+------+    SQL    +------------+
|   Browser   +----------->+   NestJS    +---------->+ PostgreSQL |
|  (Frontend) |            |   Backend   |           +------------+
+-------------+            +------+------+
                                  |
                                  | HTTP
                                  v
                         +--------+--------+
                         |   External APIs  |
                         | (OpenAI, Exa)    |
                         +-----------------+
```

### Componentes Instrumentados

| Componente | Instrumentacao | Spans Criados |
|------------|----------------|---------------|
| HTTP Server | Auto (Express) | `HTTP GET /api/...` |
| HTTP Client | Auto (http) | `HTTP POST openai.com` |
| PostgreSQL | Auto (pg) | `pg.query` |
| NestJS | Auto (express) | `middleware`, `controller` |
| OpenAI LLM | Manual (#858) | `llm.chat_completion` |
| Exa Search | Manual (#858) | `exa.search` |

---

## Configuracao

### Variaveis de Ambiente

```bash
# Endpoint OTLP para envio de traces
# Backends suportados: Jaeger, Grafana Tempo, Signoz, Honeycomb, etc.
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Headers opcionais para endpoints autenticados (JSON)
# Exemplo Grafana Cloud: {"Authorization": "Basic base64(user:api-key)"}
OTEL_EXPORTER_OTLP_HEADERS=

# Nome do servico nos traces
OTEL_SERVICE_NAME=etp-express-backend
```

### Backends Suportados

#### 1. Jaeger (Desenvolvimento Local)

```bash
# Iniciar Jaeger com Docker
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Configurar .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

**UI:** http://localhost:16686

#### 2. Grafana Tempo (Producao)

```bash
# Configurar .env com Grafana Cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo-us-central1.grafana.net/tempo
OTEL_EXPORTER_OTLP_HEADERS={"Authorization": "Basic <base64(instanceId:apiKey)>"}
```

**UI:** Grafana Cloud Dashboard

#### 3. Railway (Built-in)

Railway oferece observability integrado. Verificar documentacao atual:
https://docs.railway.app/reference/observability

---

## Uso

### Visualizando Traces

1. **Abrir Jaeger UI:** http://localhost:16686
2. **Selecionar Service:** `etp-express-backend`
3. **Buscar traces** por operacao, tags ou duration
4. **Analisar waterfall** para ver timeline completa

### Exemplo de Trace

Um request para gerar uma secao de ETP produz:

```
[Trace ID: abc123...]
|
+-- HTTP POST /api/v1/sections/generate (200ms total)
    |
    +-- NestJS Controller (5ms)
    |
    +-- SectionsService.generate (190ms)
        |
        +-- pg.query SELECT etp (10ms)
        |
        +-- exa.search (50ms)
        |   +-- HTTP POST api.exa.ai (45ms)
        |
        +-- llm.chat_completion (120ms)
        |   +-- HTTP POST api.openai.com (115ms)
        |
        +-- pg.query INSERT section (5ms)
```

### Encontrando Problemas

**Latencia alta em LLM:**

```
Operation: llm.chat_completion
Duration: >10s
Tags: model=gpt-4.1-nano, tokens.total=8000
```

**Erro em external API:**

```
Operation: exa.search
Status: ERROR
Tags: http.status_code=429, error=rate_limited
```

---

## Spans Customizados

### LLM Instrumentation (#858)

O OpenAI service adiciona spans detalhados:

```typescript
// backend/src/modules/orchestrator/llm/openai.service.ts
const span = trace.getActiveSpan();
span?.setAttribute('llm.vendor', 'openai');
span?.setAttribute('llm.model', this.model);
span?.setAttribute('llm.tokens.prompt', promptTokens);
span?.setAttribute('llm.tokens.completion', completionTokens);
span?.setAttribute('llm.tokens.total', totalTokens);
```

**Atributos capturados:**

| Atributo | Tipo | Descricao |
|----------|------|-----------|
| `llm.vendor` | string | Provider (openai, anthropic) |
| `llm.model` | string | Modelo usado (gpt-4.1-nano) |
| `llm.tokens.prompt` | int | Tokens no prompt |
| `llm.tokens.completion` | int | Tokens na resposta |
| `llm.tokens.total` | int | Total de tokens |
| `llm.request.temperature` | float | Temperatura usada |
| `llm.request.max_tokens` | int | Max tokens configurado |

### Exa Search Instrumentation (#858)

```typescript
// backend/src/modules/search/exa/exa.service.ts
span?.setAttribute('exa.query', query);
span?.setAttribute('exa.results_count', results.length);
span?.setAttribute('exa.search_type', 'auto');
```

---

## Validacao E2E

### Teste Manual

```bash
# 1. Iniciar Jaeger
docker run -d --name jaeger -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest

# 2. Configurar .env
echo "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces" >> backend/.env

# 3. Iniciar backend
cd backend && npm run start:dev

# 4. Fazer requisicao de teste
curl http://localhost:3001/api/v1/health

# 5. Verificar traces no Jaeger
# Abrir http://localhost:16686
# Service: etp-express-backend
# Operation: HTTP GET /api/v1/health
```

### Teste Automatizado

```bash
# Executar teste de integracao
cd backend && npm test -- --testPathPattern=telemetry
```

**Verificacoes:**

- [x] SDK inicializa sem erros
- [x] Spans sao criados para HTTP requests
- [x] Spans de LLM incluem token counts
- [x] Trace context e propagado entre servicos
- [x] Graceful shutdown funciona

---

## Troubleshooting

### Traces nao aparecem no Jaeger

**Checklist:**

- [ ] Jaeger esta rodando? `docker ps | grep jaeger`
- [ ] Porta 4318 acessivel? `curl http://localhost:4318/v1/traces`
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` configurado?
- [ ] Backend reiniciado apos mudanca de .env?

**Debug:**

```bash
# Ver logs de inicializacao
cd backend && npm run start:dev 2>&1 | grep -i otel
# Deve mostrar: [OpenTelemetry] SDK initialized successfully
```

### Spans de LLM faltando

**Checklist:**

- [ ] OpenAI service atualizado com instrumentacao (#858)?
- [ ] Request chegou ao OpenAI? (verificar logs)
- [ ] Span context ativo? (`trace.getActiveSpan()` nao e null)

### Performance degradada

**Sintomas:** Latencia aumentou apos habilitar tracing

**Solucoes:**

1. Verificar `ignoreIncomingRequestHook` ignora `/api/health`
2. Desabilitar instrumentacoes desnecessarias (fs, dns)
3. Usar sampling em producao (nao 100% dos traces)

---

## Integracao com Sentry

OpenTelemetry e Sentry trabalham juntos:

- **Sentry:** Error tracking, alertas, sessoes
- **OpenTelemetry:** Distributed tracing, performance

```
[Request] --> [Sentry Transaction] --> [OTEL Span]
                     |
                     v
              [Sentry Breadcrumbs]
```

Sentry automaticamente correlaciona erros com trace IDs quando ambos estao habilitados.

---

## Proximos Passos

1. [ ] Configurar sampling rate para producao (10%)
2. [ ] Adicionar custom metrics via OpenTelemetry Metrics API
3. [ ] Integrar com Grafana Cloud para dashboards unificados
4. [ ] Implementar trace context propagation para frontend

---

## Referencias

- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry NestJS](https://opentelemetry.io/docs/instrumentation/js/libraries/nestjs/)
- [Jaeger Getting Started](https://www.jaegertracing.io/docs/getting-started/)
- [Grafana Tempo](https://grafana.com/docs/tempo/latest/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

---

**Ultima revisao:** 2025-12-21
