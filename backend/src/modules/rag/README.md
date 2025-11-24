# RAG Module - Retrieval-Augmented Generation

**Issue:** #211 - PoC RAG com Lei 14.133/2021

Sistema de RAG (Retrieval-Augmented Generation) para fact-checking de citações legais em textos gerados por LLMs.

## 🎯 Objetivo

Verificar se citações legais mencionadas em textos de IA existem de fato no ordenamento jurídico brasileiro, usando busca semântica com embeddings vetoriais.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    AntiHallucinationAgent                │
│  Detecta citações legais e solicita verificação         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────┐
│                      RAGService                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ verifyReference() │  │ findSimilar()                │ │
│  │ Exact match      │  │ Vector similarity search     │ │
│  └──────────────────┘  └──────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + pgvector                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  legislation table                              │    │
│  │  - type, number, year (exact match index)       │    │
│  │  - embedding vector(1536) (IVFFlat index)       │    │
│  │  - articles JSONB (granular retrieval)          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────────┐
│                  OpenAI Embeddings API                   │
│            text-embedding-3-small (1536 dim)             │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Setup

### 1. Rodar Migrations

```bash
cd backend
npm run migration:run
```

Isso criará:
- Extension `pgvector`
- Tabela `legislation`
- Índices de busca (B-tree para exact match, IVFFlat para vector similarity)

### 2. Popular com Lei 14.133/2021

```bash
npm run seed:legislation
```

Isso indexará:
- Lei 14.133/2021 (Nova Lei de Licitações)
- 14 artigos principais
- Embedding vetorial de 1536 dimensões

**⏱️ Tempo estimado:** ~10 segundos (inclui chamada à API do OpenAI)

## 📖 Uso

### Via Controller (API REST)

#### 1. Busca por Similaridade Semântica

```bash
GET /rag/search?q=licitações&limit=5&threshold=0.7

Response:
{
  "query": "licitações",
  "count": 1,
  "results": [
    {
      "id": "...",
      "reference": "Lei 14.133/2021",
      "title": "Lei de Licitações e Contratos Administrativos",
      "similarity": 0.95,
      "type": "lei",
      "year": 2021
    }
  ]
}
```

#### 2. Verificação de Referência Legal

```bash
GET /rag/verify?type=lei&number=14.133&year=2021

Response:
{
  "reference": "lei 14.133/2021",
  "exists": true,
  "confidence": 1.0,
  "legislation": {
    "id": "...",
    "reference": "Lei 14.133/2021",
    "title": "Lei de Licitações e Contratos Administrativos"
  },
  "suggestion": null
}
```

#### 3. Listar Toda Legislação Indexada

```bash
GET /rag/legislation

Response:
{
  "count": 1,
  "legislation": [
    {
      "id": "...",
      "reference": "Lei 14.133/2021",
      "title": "Lei de Licitações e Contratos Administrativos",
      "type": "lei",
      "year": 2021,
      "hasEmbedding": true,
      "articlesCount": 14
    }
  ]
}
```

#### 4. Estatísticas do RAG

```bash
GET /rag/stats

Response:
{
  "total": 1,
  "byType": {
    "lei": 1
  },
  "withEmbeddings": 1
}
```

### Via Service (Programático)

```typescript
import { RAGService } from './modules/rag/rag.service';
import { LegislationType } from './entities/legislation.entity';

// Injetar via DI
constructor(private ragService: RAGService) {}

// Buscar legislação similar
const results = await this.ragService.findSimilar(
  'contratos administrativos',
  5,
  0.7
);

// Verificar se existe
const verification = await this.ragService.verifyReference(
  LegislationType.LEI,
  '14.133',
  2021
);

if (verification.exists) {
  console.log('Referência válida!', verification.legislation.title);
} else if (verification.suggestion) {
  console.log('Você quis dizer:', verification.suggestion);
}
```

## 🧪 Testes

```bash
# Rodar testes do RAGService
npm test -- rag.service.spec

# Coverage
npm run test:cov
```

**Cobertura esperada:** ≥80%

## 📊 Métricas de Busca

### Similarity Scores

| Score | Interpretação | Uso |
|-------|---------------|-----|
| 0.90 - 1.00 | Altamente similar | Sugerir como alternativa |
| 0.70 - 0.89 | Similar | Busca com threshold padrão |
| 0.50 - 0.69 | Parcialmente similar | Busca ampla |
| 0.00 - 0.49 | Pouco similar | Desconsiderar |

### Custos OpenAI

- **Indexação:** ~$0.00002 por legislação (text-embedding-3-small)
- **Busca:** ~$0.00002 por query
- **Lei 14.133 completa:** ~$0.00002 (1 documento)

## 🔧 Adicionar Mais Legislação

### Opção 1: Via Script Programático

```typescript
// scripts/seed-custom-legislation.ts
import { Legislation, LegislationType } from '../src/entities/legislation.entity';

const decreto1234 = {
  type: LegislationType.DECRETO,
  number: '1.234',
  year: 2020,
  title: 'Regulamenta...',
  content: 'Art. 1º ...',
  articles: [
    { number: '1', content: '...' }
  ],
  sourceUrl: 'https://...'
};

await ragService.indexLegislation(decreto1234);
```

### Opção 2: Via API (Admin)

```bash
POST /rag/legislation
Authorization: Bearer <admin-token>

{
  "type": "decreto",
  "number": "1.234",
  "year": 2020,
  "title": "...",
  "content": "...",
  "articles": [...]
}
```

## 🔒 Segurança

- **Autenticação:** Todos os endpoints protegidos por `JwtAuthGuard`
- **Rate Limiting:** Aplicado globalmente via ThrottlerModule
- **Validação:** DTOs com class-validator
- **SQL Injection:** TypeORM QueryBuilder com parâmetros

## 📚 Próximos Passos (Issues Desbloqueadas)

✅ **#211** - PoC RAG (CONCLUÍDO)
🔜 **#212** - Integrar RAG no AntiHallucinationAgent
🔜 **#213** - Fact-checking reverso via Perplexity
🔜 **#214** - Melhorar scoring do AntiHallucinationAgent

## 🐛 Troubleshooting

### Erro: `extension "vector" does not exist`

**Solução:** Railway PostgreSQL precisa habilitar pgvector manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Erro: `OpenAI API key not configured`

**Solução:** Adicionar `OPENAI_API_KEY` no `.env`:

```bash
OPENAI_API_KEY=sk-...
```

### Performance lenta na busca

**Solução:** Verificar índice IVFFlat:

```sql
SELECT * FROM pg_indexes WHERE tablename = 'legislation';

-- Recriar índice se necessário
DROP INDEX idx_legislation_embedding;
CREATE INDEX idx_legislation_embedding
ON legislation
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 📖 Referências

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [TypeORM with pgvector](https://orkhan.gitbook.io/typeorm/docs/entities#column-types-for-postgres)
- Lei 14.133/2021: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm
