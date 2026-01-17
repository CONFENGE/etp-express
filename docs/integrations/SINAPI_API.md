# Integração SINAPI via API Orcamentador

**Atualizado:** 2026-01-17 | **Issue:** #1564 | **Milestone:** M17-PageIndex

## Overview

O ETP Express integra dados do SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil) via API REST do [Orcamentador](https://orcamentador.com.br/api/docs).

### Por que API ao invés de parsing de Excel/PDF?

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Parsing Excel/PDF** | Dados oficiais CEF | Frágil, manual, PDFs de centenas de páginas |
| **API Orcamentador** | JSON estruturado, atualização automática, webhook | Dependência de terceiro |

**Decisão:** API Orcamentador oferece melhor DX e confiabilidade.

---

## Autenticação

### Obter API Key

1. Acesse https://orcamentador.com.br/api/
2. Preencha o formulário de contato selecionando "API SINAPI – Orçamentador"
3. Aguarde email com API key

### Configuração

```env
# .env
SINAPI_API_KEY=your-api-key-here
SINAPI_API_BASE_URL=https://orcamentador.com.br/api
SINAPI_API_TIMEOUT=30000
```

### Headers de Requisição

```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Alternativa (menos segura):** Query parameter `?apikey=your-api-key`

---

## Rate Limits

### Limites por Plano

| Plano | Requisições/Hora | Requisições/Mês |
|-------|------------------|-----------------|
| Free | 100 | - |
| Comercial | Sob consulta | Sob consulta |

### Headers de Resposta

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1737150000
X-RateLimit-Monthly-Limit: 10000
X-RateLimit-Monthly-Used: 500
X-RateLimit-Monthly-Remaining: 9500
```

### Tratamento de Rate Limit

- **HTTP 429:** Rate limit excedido
- **Estratégia:** Exponential backoff (1s, 2s, 4s, 8s...)
- **Alerta:** Log warning quando < 10% de quota

---

## Endpoints

### GET /insumos

Lista materiais, mão de obra e equipamentos.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `nome` | string | Busca por nome (ex: "cimento") |
| `codigo` | number | Código SINAPI específico |
| `estado` | string | UF (ex: "sp", "rj") |
| `referencia` | string | Data de referência (YYYY-MM-DD) |
| `regime` | string | "DESONERADO" ou "NAO_DESONERADO" |
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (max: 100) |

**Exemplo:**

```bash
curl -X GET "https://orcamentador.com.br/api/insumos/?nome=cimento&estado=sp&limit=10" \
  -H "X-API-Key: $SINAPI_API_KEY"
```

**Resposta:**

```json
{
  "data": [
    {
      "codigo": 1234,
      "nome": "CIMENTO PORTLAND CP II-32",
      "unidade": "KG",
      "preco_desonerado": 0.85,
      "preco_naodesonerado": 0.92,
      "tipo": "MATERIAL",
      "classe": "AGLOMERANTES",
      "referencia": "2026-01-01"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

### GET /composicoes

Lista composições de serviços.

**Parâmetros:** Mesmos de `/insumos`

**Exemplo:**

```bash
curl -X GET "https://orcamentador.com.br/api/composicoes/?nome=concreto&estado=sp" \
  -H "X-API-Key: $SINAPI_API_KEY"
```

### GET /composicao

Detalhes de uma composição específica com itens componentes.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `codigo` | number | Código da composição |
| `estado` | string | UF |
| `regime` | string | "DESONERADO" ou "NAO_DESONERADO" |

**Resposta:**

```json
{
  "codigo": 87292,
  "nome": "CONCRETO FCK=25MPA...",
  "unidade": "M3",
  "preco_desonerado": 450.00,
  "preco_naodesonerado": 485.00,
  "itens": [
    {
      "codigo": 1234,
      "nome": "CIMENTO PORTLAND...",
      "unidade": "KG",
      "coeficiente": 350,
      "preco_unitario": 0.85,
      "preco_total": 297.50
    }
  ]
}
```

### GET /composicao_explode

Expande composição até o nível de materiais base (recursivo).

**Uso:** Análise de custos detalhada, verificação de composição.

### GET /encargos

Encargos sociais por estado e regime.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `estado` | string | UF |
| `regime` | string | Tipo de contrato |

### GET /historico

Histórico de preços para análise de tendências.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `codigo` | number | Código do item |
| `estado` | string | UF |
| `inicio` | string | Data início (YYYY-MM-DD) |
| `fim` | string | Data fim (YYYY-MM-DD) |

### GET /comparar

Comparação de preços entre estados.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `codigo` | number | Código do item |
| `estados` | string | Lista de UFs (ex: "sp,rj,mg") |

### GET /orcamento

Gera orçamento a partir de lista de itens.

**Parâmetros:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `itens` | string | Lista no formato `[C\|I]:codigo@quantidade` |
| `estado` | string | UF |
| `regime` | string | "DESONERADO" ou "NAO_DESONERADO" |
| `bdi` | number | Percentual de BDI (opcional) |

**Exemplo:**

```
itens=C:87292@10.5,I:1234@500,I:5678@200
```

**Resposta:**

```json
{
  "totais": {
    "total_insumos": 5000.00,
    "total_geral": 5750.00,
    "bdi_percentual": 15,
    "regime": "NAO_DESONERADO",
    "estado": "São Paulo (SP)"
  },
  "itens": [
    {
      "tipo": "Composição",
      "codigo": 87292,
      "nome": "CONCRETO FCK=25MPA...",
      "quantidade": 10.5,
      "preco_unit": 485.00,
      "subtotal": 5092.50
    }
  ]
}
```

### GET /estados

Lista estados brasileiros com códigos IBGE.

**Resposta:**

```json
[
  { "uf": "SP", "nome": "São Paulo", "ibge": 35, "regiao": "SUDESTE" },
  { "uf": "RJ", "nome": "Rio de Janeiro", "ibge": 33, "regiao": "SUDESTE" }
]
```

### GET /indicadores

Indicadores econômicos (INCC, IPCA, SELIC, dólar).

### GET /atualizacao

Informação sobre última atualização da tabela SINAPI.

**Resposta:**

```json
{
  "data": "2026-01-01",
  "tabela": "SINAPI",
  "versao": "2026.01"
}
```

### GET /status

Status operacional da API.

### POST /webhook

Registrar/gerenciar webhooks para notificações de atualização.

---

## Mapeamento de Tipos

### API → SinapiPriceReference

```typescript
// Transformação de resposta da API para tipo interno
function transformApiInsumo(apiItem: SinapiApiInsumo, filters: SinapiApiSearchParams): SinapiPriceReference {
  const desonerado = filters.regime === 'DESONERADO';
  const mesRef = apiItem.referencia.substring(0, 7); // "2026-01"

  return {
    // GovApiSearchResult fields
    id: `sinapi:${apiItem.codigo}:${filters.estado}:${mesRef}:${desonerado ? 'D' : 'O'}`,
    title: apiItem.nome,
    description: apiItem.nome,
    source: 'sinapi',
    url: undefined,
    relevance: 1.0,
    fetchedAt: new Date(),

    // GovApiPriceReference fields
    codigo: String(apiItem.codigo),
    descricao: apiItem.nome,
    unidade: apiItem.unidade,
    precoUnitario: desonerado ? apiItem.preco_desonerado : apiItem.preco_naodesonerado,
    mesReferencia: mesRef,
    uf: filters.estado?.toUpperCase() as SinapiUF,
    desonerado,
    categoria: mapTipoToCategoria(apiItem.tipo),

    // SinapiPriceReference specific
    tipo: SinapiItemType.INSUMO,
    classeId: undefined,
    classeDescricao: apiItem.classe,
    precoOnerado: apiItem.preco_naodesonerado,
    precoDesonerado: apiItem.preco_desonerado,
  };
}

function mapTipoToCategoria(tipo: string): SinapiCategoria {
  const mapping: Record<string, SinapiCategoria> = {
    'MATERIAL': SinapiCategoria.MATERIAIS,
    'MAO DE OBRA': SinapiCategoria.MAO_DE_OBRA,
    'EQUIPAMENTO': SinapiCategoria.EQUIPAMENTOS,
  };
  return mapping[tipo] || SinapiCategoria.SERVICOS;
}
```

---

## Tratamento de Erros

### Classes de Erro

```typescript
// Erros específicos da API SINAPI
export class SinapiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'SinapiApiError';
  }
}

export class SinapiApiAuthError extends SinapiApiError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'SinapiApiAuthError';
  }
}

export class SinapiApiRateLimitError extends SinapiApiError {
  constructor(
    public readonly resetAt: Date,
    public readonly remaining: number,
  ) {
    super(`Rate limit exceeded. Resets at ${resetAt.toISOString()}`, 429, 'RATE_LIMIT');
    this.name = 'SinapiApiRateLimitError';
  }
}

export class SinapiApiNotFoundError extends SinapiApiError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 404, 'NOT_FOUND');
    this.name = 'SinapiApiNotFoundError';
  }
}

export class SinapiApiServerError extends SinapiApiError {
  constructor(message = 'API server error') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'SinapiApiServerError';
  }
}
```

### Estratégia de Fallback

```typescript
async search(query: string, filters?: PriceSearchFilters): Promise<GovApiResponse<SinapiPriceReference[]>> {
  // 1. Tentar API primeiro
  try {
    return await this.searchFromApi(query, filters);
  } catch (error) {
    if (error instanceof SinapiApiRateLimitError) {
      this.logger.warn(`Rate limit hit, waiting until ${error.resetAt}`);
    } else if (error instanceof SinapiApiAuthError) {
      this.logger.error('API authentication failed - check SINAPI_API_KEY');
    }

    // 2. Fallback para database local
    this.logger.warn('API unavailable, falling back to database');
    return await this.searchFromDatabase(filters);
  }
}
```

---

## Cache

### Estratégia

| Dado | TTL | Invalidação |
|------|-----|-------------|
| Busca de insumos | 24h | Webhook de atualização |
| Composições | 24h | Webhook de atualização |
| Estados | 7 dias | Manual |
| Indicadores | 1h | Automático |

### Cache Key Pattern

```
sinapi:api:insumos:{hash(params)}
sinapi:api:composicao:{codigo}:{estado}:{regime}
sinapi:api:estados
sinapi:last-update
```

### Invalidação via Webhook

```typescript
@Post('webhooks/sinapi/update')
async handleSinapiUpdate(@Body() payload: { evento: string; data: string }) {
  if (payload.evento === 'SINAPI_ATUALIZADO') {
    await this.cache.invalidateByPrefix('sinapi:api');
    await this.syncJob.warmupCache();
  }
}
```

---

## Webhook

### Registrar Webhook

```bash
curl -X POST "https://orcamentador.com.br/api/webhook" \
  -H "X-API-Key: $SINAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.etpexpress.com.br/api/webhooks/sinapi/update",
    "eventos": ["SINAPI_ATUALIZADO"],
    "secret": "your-webhook-secret"
  }'
```

### Validar Assinatura

```typescript
private verifyWebhookSignature(signature: string, payload: unknown): boolean {
  const secret = this.configService.get('SINAPI_WEBHOOK_SECRET');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}
```

---

## Variáveis de Ambiente

```env
# API SINAPI (Orcamentador)
SINAPI_API_KEY=                      # API key obtida via formulário
SINAPI_API_BASE_URL=https://orcamentador.com.br/api
SINAPI_API_TIMEOUT=30000             # Timeout em ms
SINAPI_API_RETRY_ATTEMPTS=3          # Tentativas em caso de erro
SINAPI_API_RETRY_DELAY=1000          # Delay inicial para retry (ms)

# Webhook
SINAPI_WEBHOOK_SECRET=               # Secret para validar webhooks
SINAPI_WEBHOOK_ENABLED=true          # Habilitar endpoint de webhook

# Cache
SINAPI_CACHE_TTL=86400               # TTL em segundos (24h)
SINAPI_CACHE_WARMUP_ENABLED=true     # Pré-popular cache no startup
```

---

## Monitoramento

### Métricas Recomendadas

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `sinapi_api_requests_total` | Counter | Total de requisições à API |
| `sinapi_api_errors_total` | Counter | Total de erros por tipo |
| `sinapi_api_latency_seconds` | Histogram | Latência das requisições |
| `sinapi_api_rate_limit_remaining` | Gauge | Quota restante |
| `sinapi_cache_hits_total` | Counter | Cache hits |
| `sinapi_cache_misses_total` | Counter | Cache misses |

### Alertas

| Alerta | Condição | Ação |
|--------|----------|------|
| Rate Limit Warning | remaining < 10% | Log warning |
| Rate Limit Critical | remaining < 5% | Slack notification |
| API Errors | errors > 10/min | Investigar |
| High Latency | p95 > 2s | Investigar |

---

## Referências

- [API Orcamentador - Documentação Oficial](https://orcamentador.com.br/api/docs)
- [SDK PHP Oficial](https://packagist.org/packages/orcamentador/sdk)
- [SINAPI CEF - Fonte Oficial](https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/)
- [Decreto 7.983/2013](http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7983.htm)

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-17 | 1.0.0 | Documentação inicial |
