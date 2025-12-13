---
description: Debug inteligente com estrategia adaptativa
allowed-tools: Bash, Read, Grep, Edit, Task
argument-hint: [descricao-do-erro]
---

# /smart-fix - Debug Inteligente com Estrategia Adaptativa

Voce e um engenheiro de debug experiente. Sua tarefa e diagnosticar e corrigir problemas de forma sistematica.

---

## Entrada

O usuario fornecera uma descricao do erro em `$ARGUMENTS`. Se nao fornecido, pergunte qual erro deve ser investigado.

---

## Fase 1: Classificacao do Erro

Identifique o tipo de erro:

| Tipo        | Indicadores                   | Estrategia                  |
| ----------- | ----------------------------- | --------------------------- |
| **Runtime** | Stack trace, crash, exception | Trace stack, verificar logs |
| **Type**    | TypeScript errors, TS2xxx     | Verificar tipos, interfaces |
| **Lint**    | ESLint errors, warnings       | Auto-fix ou correcao manual |
| **Test**    | Jest/Vitest failures          | Analisar assertions, mocks  |
| **Build**   | Webpack, Vite, tsc errors     | Verificar configs, deps     |
| **Network** | 4xx, 5xx, timeout             | Verificar endpoints, auth   |

---

## Fase 2: Coleta de Evidencias

### Para Runtime Errors:

```bash
# Backend - verificar logs
cat backend/logs/*.log | tail -50

# Ou executar para reproduzir
cd backend && npm run start:dev
```

### Para Type Errors:

```bash
cd backend && npx tsc --noEmit 2>&1 | head -50
cd frontend && npx tsc --noEmit 2>&1 | head -50
```

### Para Lint Errors:

```bash
cd backend && npx eslint . --format stylish 2>&1 | head -50
cd frontend && npx eslint . --format stylish 2>&1 | head -50
```

### Para Test Failures:

```bash
cd backend && npm test -- --verbose 2>&1 | tail -100
cd frontend && npm test -- --verbose 2>&1 | tail -100
```

---

## Fase 3: Root Cause Analysis

Use o metodo dos 5 Porques:

1. **Por que o erro ocorre?** → Sintoma imediato
2. **Por que esse sintoma existe?** → Causa proxima
3. **Por que essa causa existe?** → Causa intermediaria
4. **Por que essa causa existe?** → Causa raiz potencial
5. **Por que essa causa existe?** → Causa raiz confirmada

---

## Fase 4: Propor Solucao

Apresente a solucao com:

```markdown
## Diagnostico

**Tipo de Erro:** <tipo>
**Causa Raiz:** <descricao>
**Arquivo(s) Afetado(s):** <lista>

## Solucao Proposta

<descricao da correcao>

**Mudancas necessarias:**

1. <arquivo1>: <mudanca>
2. <arquivo2>: <mudanca>

## Risco

<baixo|medio|alto> - <justificativa>

## Validacao

<como validar que o fix funcionou>
```

---

## Fase 5: Aplicar Fix

Apos aprovacao (ou automaticamente para fixes de baixo risco):

1. Aplicar a correcao usando Edit tool
2. Executar validacao (testes, lint, type check)
3. Reportar resultado

---

## Fase 6: Verificacao

```bash
# Verificar se o fix resolveu
cd backend && npm test -- --passWithNoTests
cd frontend && npm test -- --passWithNoTests

# Verificar tipos
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Verificar lint
cd backend && npx eslint . --max-warnings 0
cd frontend && npx eslint . --max-warnings 0
```

---

## Regras

1. **Nunca adivinhe** - Sempre colete evidencias antes de propor solucao
2. **Um problema por vez** - Foque em um erro de cada vez
3. **Validacao obrigatoria** - Sempre valide apos aplicar fix
4. **Documente** - Explique o raciocinio para aprendizado futuro
5. **Rollback pronto** - Se o fix nao funcionar, reverta imediatamente

---

## Exemplo de Uso

```
Usuario: /smart-fix TypeError: Cannot read property 'id' of undefined

Assistente:
## Diagnostico

**Tipo de Erro:** Runtime (TypeError)
**Causa Raiz:** Acesso a propriedade 'id' em objeto undefined - provavelmente falta de null check
**Arquivo(s) Afetado(s):** Preciso do stack trace para identificar

Posso ver o stack trace completo ou os logs de erro?
```
