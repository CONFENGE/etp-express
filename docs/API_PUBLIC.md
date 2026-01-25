# API Pública - Market Intelligence

**API RESTful para consulta de benchmarks de preços de contratações públicas brasileiras.**

---

## 📋 Visão Geral

A API Pública de Preços do ETP Express fornece acesso a dados proprietários de market intelligence:

- **Regional Price Benchmarks** - Estatísticas de preços por categoria, região e porte de órgão
- **Price Search** - Busca full-text em itens contratados com histórico de preços
- **Categories** - Lista de categorias CATMAT/CATSER disponíveis

**Base URL:** `https://api.etpexpress.com.br/api/v1/prices` (produção)
**Base URL:** `http://localhost:3001/api/v1/prices` (desenvolvimento)

---

## 🔐 Autenticação

### Como Obter API Key

1. **Acesse o Dashboard:**
   Login em [https://etpexpress.com.br/dashboard](https://etpexpress.com.br/dashboard)

2. **Navegue para Configurações > API:**
   Menu lateral → "Configurações" → "API Keys"

3. **Gere sua Chave:**
   Clique em "Gerar Nova API Key" → Copie e armazene com segurança

**⚠️ IMPORTANTE:** A API Key é exibida apenas UMA VEZ. Armazene-a em local seguro (ex: variável de ambiente).

### Autenticação nas Requisições

Inclua a API Key no header `X-API-Key` de todas as requisições:

```bash
curl -H "X-API-Key: <your-api-key>" \
     https://api.etpexpress.com.br/api/v1/prices/benchmark
```

---

## 💰 Planos e Quotas

| Plano         | Requests/Mês | Preço/Mês | Rate Limit       |
| ------------- | ------------ | --------- | ---------------- |
| **Free**      | 100          | Grátis    | 10 req/min       |
| **Pro**       | 5.000        | R$ 500    | 100 req/min      |
| **Enterprise**| Ilimitado    | R$ 2.000  | 1.000 req/min    |

**Upgrade de Plano:**
Dashboard → Configurações → API → "Alterar Plano"

---

## 🌍 Endpoints

### 1. GET `/api/v1/prices/benchmark`

Retorna benchmarks regionais de preços com estatísticas agregadas.

#### Query Parameters

| Parâmetro       | Tipo   | Obrigatório | Descrição                                      | Exemplo          |
| --------------- | ------ | ----------- | ---------------------------------------------- | ---------------- |
| `categoryId`    | UUID   | Não*        | ID da categoria CATMAT/CATSER                  | `550e8400-...`   |
| `categoryCode`  | String | Não*        | Código da categoria (alternativa a categoryId) | `CATMAT-44122`   |
| `uf`            | String | Não         | Estado (2 letras) ou "BR" para nacional        | `SP`             |
| `orgaoPorte`    | Enum   | Não         | Porte do órgão (SMALL/MEDIUM/LARGE/TODOS)      | `MEDIUM`         |
| `periodMonths`  | Number | Não         | Período em meses para cálculo (1-60)           | `12`             |
| `page`          | Number | Não         | Página de paginação                            | `1`              |
| `limit`         | Number | Não         | Resultados por página (max 100)                | `20`             |

*Forneça `categoryId` OU `categoryCode`.

#### Exemplo de Requisição

```bash
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&orgaoPorte=MEDIUM&limit=10"
```

#### Exemplo de Resposta (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "uf": "SP",
      "ufName": "São Paulo",
      "orgaoPorte": "MEDIUM",
      "median": 3500.00,
      "average": 3650.00,
      "min": 2800.00,
      "max": 4200.00,
      "priceRange": {
        "min": 2800.00,
        "max": 4200.00,
        "p25": 3200.00,
        "p75": 3900.00
      },
      "stdDev": 450.00,
      "sampleSize": 87,
      "confidence": "HIGH",
      "period": {
        "start": "2025-01-25T00:00:00.000Z",
        "end": "2026-01-25T00:00:00.000Z"
      },
      "lastCalculatedAt": "2026-01-25T04:00:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### Campos da Resposta

| Campo           | Tipo   | Descrição                                              |
| --------------- | ------ | ------------------------------------------------------ |
| `median`        | Number | Mediana dos preços (indicador mais confiável)          |
| `average`       | Number | Média aritmética                                       |
| `min` / `max`   | Number | Faixa de preços observada                              |
| `p25` / `p75`   | Number | Quartis (25º e 75º percentis)                          |
| `stdDev`        | Number | Desvio padrão                                          |
| `sampleSize`    | Number | Quantidade de contratos analisados                     |
| `confidence`    | String | Nível de confiança: HIGH/MEDIUM/LOW/UNRELIABLE         |

**Níveis de Confiança:**
- `HIGH`: 50+ contratos, baixa variância
- `MEDIUM`: 10-49 contratos
- `LOW`: 5-9 contratos
- `UNRELIABLE`: <5 contratos (não recomendado usar)

---

### 2. GET `/api/v1/prices/search`

Busca full-text em itens contratados com histórico de preços reais.

#### Query Parameters

| Parâmetro  | Tipo   | Obrigatório | Descrição                                | Exemplo            |
| ---------- | ------ | ----------- | ---------------------------------------- | ------------------ |
| `query`    | String | **Sim**     | Busca por descrição do item (min 3 chars)| `microcomputador`  |
| `category` | String | Não         | Filtrar por código de categoria          | `CATMAT-44122`     |
| `limit`    | Number | Não         | Max resultados (max 100, default 20)     | `50`               |
| `offset`   | Number | Não         | Offset para paginação (default 0)        | `0`                |

#### Exemplo de Requisição

```bash
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/search?query=microcomputador&category=CATMAT-44122&limit=50"
```

#### Exemplo de Resposta (200 OK)

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "description": "Microcomputador Intel Core i5 8GB RAM 256GB SSD",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "price": 3200.00,
      "unit": "UN",
      "contractDate": "2025-11-15T00:00:00.000Z",
      "uf": "SP",
      "similarity": 0.92
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "description": "Microcomputador AMD Ryzen 5 16GB RAM 512GB SSD Windows 11",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "price": 3800.00,
      "unit": "UN",
      "contractDate": "2025-10-20T00:00:00.000Z",
      "uf": "RJ",
      "similarity": 0.88
    }
  ],
  "total": 234,
  "limit": 20,
  "offset": 0
}
```

**Campo `similarity`:** Score de relevância (0-1). Resultados ordenados por relevância decrescente.

---

### 3. GET `/api/v1/prices/categories`

Retorna lista de categorias CATMAT/CATSER disponíveis para consulta.

#### Exemplo de Requisição

```bash
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/categories"
```

#### Exemplo de Resposta (200 OK)

```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "code": "CATMAT-44122",
      "name": "Microcomputador",
      "type": "CATMAT",
      "benchmarkCount": 156,
      "active": true
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "code": "CATMAT-45001",
      "name": "Impressora",
      "type": "CATMAT",
      "benchmarkCount": 98,
      "active": true
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "code": "CATSER-17012",
      "name": "Serviços de Limpeza",
      "type": "CATSER",
      "benchmarkCount": 72,
      "active": true
    }
  ],
  "total": 245
}
```

**Tipos:**
- `CATMAT`: Materiais (produtos físicos)
- `CATSER`: Serviços

---

## 🔒 Rate Limiting

### Headers de Resposta

Todas as respostas incluem headers de rate limiting:

```
X-RateLimit-Limit: 100         # Quota total (req/min)
X-RateLimit-Remaining: 87      # Requests restantes
X-RateLimit-Reset: 1643723400  # Timestamp UNIX do reset
```

### Quota Excedida (429 Too Many Requests)

```json
{
  "statusCode": 429,
  "message": "API quota exceeded. Upgrade your plan or wait for quota reset.",
  "error": "Too Many Requests",
  "retryAfter": 3600  // Segundos até reset
}
```

**Solução:** Aguarde o reset ou faça upgrade de plano.

---

## ⚠️ Error Codes

| Código | Descrição                       | Solução                                      |
| ------ | ------------------------------- | -------------------------------------------- |
| 400    | Bad Request - Parâmetros inválidos | Verifique query parameters obrigatórios  |
| 401    | Unauthorized - API Key ausente   | Inclua header `X-API-Key`                   |
| 403    | Forbidden - API Key inválida     | Verifique a chave ou gere nova no dashboard |
| 404    | Not Found - Recurso não existe   | Verifique URL e parâmetros                  |
| 429    | Too Many Requests - Quota excedida | Aguarde reset ou faça upgrade              |
| 500    | Internal Server Error            | Contate suporte: suporte@etpexpress.com.br  |

### Exemplo de Erro (401 Unauthorized)

```json
{
  "statusCode": 401,
  "message": "Unauthorized access. API Key required.",
  "error": "Unauthorized",
  "details": "Please provide a valid API Key in the X-API-Key header"
}
```

---

## 📚 Exemplos de Uso

### Python (requests)

```python
import requests

API_KEY = "your-api-key-here"
BASE_URL = "https://api.etpexpress.com.br/api/v1/prices"

headers = {
    "X-API-Key": API_KEY
}

# Benchmark de microcomputadores em SP
response = requests.get(
    f"{BASE_URL}/benchmark",
    headers=headers,
    params={
        "categoryCode": "CATMAT-44122",
        "uf": "SP",
        "orgaoPorte": "MEDIUM"
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Mediana: R$ {data['data'][0]['median']:.2f}")
else:
    print(f"Error {response.status_code}: {response.text}")
```

### Node.js (axios)

```javascript
const axios = require('axios');

const API_KEY = process.env.ETP_API_KEY;
const BASE_URL = 'https://api.etpexpress.com.br/api/v1/prices';

async function searchPrices(query) {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      headers: {
        'X-API-Key': API_KEY
      },
      params: {
        query: query,
        limit: 50
      }
    });

    console.log(`Found ${response.data.total} results`);
    response.data.data.forEach(item => {
      console.log(`${item.description}: R$ ${item.price.toFixed(2)} (${item.uf})`);
    });
  } catch (error) {
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Retry after:', error.response.headers['x-ratelimit-reset']);
    } else {
      console.error('API Error:', error.message);
    }
  }
}

searchPrices('microcomputador');
```

### cURL

```bash
# Benchmark nacional de impressoras
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/benchmark?categoryCode=CATMAT-45001&uf=BR"

# Buscar preços de cadeiras
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/search?query=cadeira+giratoria&limit=100"

# Listar categorias disponíveis
curl -H "X-API-Key: your-api-key-here" \
     "https://api.etpexpress.com.br/api/v1/prices/categories"
```

---

## 🎯 Casos de Uso

### 1. Validação de Preços em Pregões

Evite preços questionáveis pelo TCE/TCU:

```python
def validate_price(category_code, price, uf):
    benchmark = get_benchmark(category_code, uf)
    deviation = (price - benchmark['median']) / benchmark['median'] * 100

    if deviation > 60:
        return "CRITICAL - TCE pode questionar"
    elif deviation > 40:
        return "HIGH - Atenção recomendada"
    elif deviation > 20:
        return "MEDIUM - Revisar justificativa"
    else:
        return "LOW - Dentro do esperado"
```

### 2. Estimativa de Custos para ETPs

```javascript
async function estimateCost(items) {
  const estimates = await Promise.all(
    items.map(async (item) => {
      const benchmark = await getBenchmark(item.categoryCode, item.uf);
      return {
        item: item.description,
        estimatedPrice: benchmark.median,
        priceRange: [benchmark.min, benchmark.max]
      };
    })
  );

  return estimates;
}
```

### 3. Market Analysis Dashboard

```python
def regional_comparison(category_code):
    states = ['SP', 'RJ', 'MG', 'RS', 'BA']

    for state in states:
        benchmark = get_benchmark(category_code, state)
        print(f"{state}: R$ {benchmark['median']:.2f} (amostra: {benchmark['sampleSize']})")
```

---

## 📊 SLA e Garantias

| Métrica            | Free    | Pro     | Enterprise |
| ------------------ | ------- | ------- | ---------- |
| **Uptime**         | 95%     | 99%     | 99.9%      |
| **Latência P95**   | <500ms  | <200ms  | <100ms     |
| **Suporte**        | Email   | Email   | Email + Telefone |
| **Histórico**      | 12 meses| 24 meses| 60 meses   |

---

## 🔄 Versionamento da API

**Versão atual:** `v1`

- Mudanças **compatíveis** (novos endpoints, novos campos opcionais): sem incremento de versão
- Mudanças **incompatíveis** (remoção de campos, alteração de tipos): nova versão (`v2`)

**Política de Depreciação:**
- Versões antigas são suportadas por **12 meses** após lançamento de nova versão
- Notificação via email **6 meses** antes da depreciação

---

## 📞 Suporte

**Email:** suporte@etpexpress.com.br
**Documentação Interativa:** [https://api.etpexpress.com.br/api/docs](https://api.etpexpress.com.br/api/docs)
**Status da API:** [https://status.etpexpress.com.br](https://status.etpexpress.com.br)

**Reportar Issues:**
- GitHub: [https://github.com/CONFENGE/etp-express/issues](https://github.com/CONFENGE/etp-express/issues)
- Tag: `public-api`

---

## 📄 Licença

© 2026 ETP Express. Dados proprietários de market intelligence.
Uso comercial permitido apenas com plano ativo.

---

**Última atualização:** 2026-01-25
**Issue de referência:** [#1687](https://github.com/CONFENGE/etp-express/issues/1687) - M13: Market Intelligence
