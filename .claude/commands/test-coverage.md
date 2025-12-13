---
description: Analise de cobertura de testes com recomendacoes
allowed-tools: Bash(npm run test:cov:*), Bash(npm test:*), Read, Grep
---

# /test-coverage - Analise de Cobertura de Testes

Voce e um engenheiro de qualidade responsavel por analisar e melhorar a cobertura de testes do projeto ETP Express.

---

## Targets do Projeto

| Componente | Target | Minimo Aceitavel |
| ---------- | ------ | ---------------- |
| Backend    | 70%    | 60%              |
| Frontend   | 60%    | 50%              |

---

## Fluxo de Execucao

### 1. Executar Cobertura do Backend

```bash
cd backend && npm run test:cov -- --coverageReporters=text --coverageReporters=json-summary 2>&1
```

### 2. Executar Cobertura do Frontend

```bash
cd frontend && npm run test:coverage -- --reporter=text 2>&1
```

### 3. Analisar Resultados

Para cada componente, extraia:

- Cobertura total (statements, branches, functions, lines)
- Arquivos com menor cobertura
- Arquivos criticos sem testes

### 4. Identificar Gaps Criticos

Arquivos criticos que DEVEM ter alta cobertura:

- `backend/src/auth/*.ts` - Autenticacao
- `backend/src/modules/etps/*.ts` - Core business logic
- `backend/src/modules/sections/*.ts` - Geracao de secoes
- `frontend/src/store/*.ts` - State management
- `frontend/src/pages/*.tsx` - Paginas principais

### 5. Gerar Relatorio

```markdown
## Relatorio de Cobertura - ETP Express

### Backend

| Metrica    | Atual | Target | Status   |
| ---------- | ----- | ------ | -------- |
| Statements | X%    | 70%    | ✅/⚠️/❌ |
| Branches   | X%    | 70%    | ✅/⚠️/❌ |
| Functions  | X%    | 70%    | ✅/⚠️/❌ |
| Lines      | X%    | 70%    | ✅/⚠️/❌ |

#### Arquivos com Menor Cobertura

1. `src/modules/X.ts` - X% (critico)
2. `src/modules/Y.ts` - X%
3. `src/modules/Z.ts` - X%

### Frontend

| Metrica    | Atual | Target | Status   |
| ---------- | ----- | ------ | -------- |
| Statements | X%    | 60%    | ✅/⚠️/❌ |
| Branches   | X%    | 60%    | ✅/⚠️/❌ |
| Functions  | X%    | 60%    | ✅/⚠️/❌ |
| Lines      | X%    | 60%    | ✅/⚠️/❌ |

#### Arquivos com Menor Cobertura

1. `src/pages/X.tsx` - X%
2. `src/components/Y.tsx` - X%
3. `src/store/Z.ts` - X%

### Recomendacoes

1. **Prioridade Alta:** <arquivo> - <razao>
2. **Prioridade Media:** <arquivo> - <razao>
3. **Prioridade Baixa:** <arquivo> - <razao>

### Proximo Passo

Para aumentar cobertura em +5%, recomendo:

- Criar testes para `<arquivo>` focando em `<funcionalidade>`
```

---

## Criterios de Status

- ✅ **OK:** >= Target
- ⚠️ **Warning:** >= Minimo e < Target
- ❌ **Critico:** < Minimo

---

## Exemplo de Uso

```
Usuario: /test-coverage

Assistente:
## Relatorio de Cobertura - ETP Express

### Backend

| Metrica | Atual | Target | Status |
|---------|-------|--------|--------|
| Statements | 72% | 70% | ✅ |
| Branches | 65% | 70% | ⚠️ |
| Functions | 78% | 70% | ✅ |
| Lines | 71% | 70% | ✅ |

#### Arquivos com Menor Cobertura
1. `src/modules/orchestrator/orchestrator.service.ts` - 45% (critico)
2. `src/modules/export/pdf.service.ts` - 52%
3. `src/modules/rag/embedding.service.ts` - 55%

### Recomendacoes

1. **Prioridade Alta:** orchestrator.service.ts - Core do sistema de IA
2. **Prioridade Media:** pdf.service.ts - Exportacao critica
3. **Prioridade Baixa:** embedding.service.ts - RAG module

Para aumentar cobertura de branches em +5%, adicione testes para:
- Casos de erro no orchestrator (timeouts, fallbacks)
- Edge cases de formatacao no PDF export
```

---

## Regras

1. **Sempre execute os testes** antes de reportar - nao use dados antigos
2. **Foque no impacto** - Priorize arquivos de business logic
3. **Sugira acoes concretas** - Nao apenas "aumente cobertura"
4. **Considere complexidade** - Arquivos maiores precisam de mais testes
