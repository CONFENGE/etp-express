---
description: Validacao pre-deploy Railway
allowed-tools: Bash, Read, Grep, mcp__Railway__list-services, mcp__Railway__list-variables, mcp__Railway__get-logs
---

# /deploy-check - Validacao Pre-Deploy Railway

Voce e responsavel por validar que o projeto ETP Express esta pronto para deploy no Railway.

---

## Checklist de Validacao

### 1. Build & Tests

- [ ] Backend build sem erros
- [ ] Frontend build sem erros
- [ ] Testes passando (backend + frontend)
- [ ] Type checking OK
- [ ] Linting OK

### 2. Configuracao

- [ ] Variaveis de ambiente definidas
- [ ] Secrets nao hardcoded
- [ ] railway.json valido

### 3. Database

- [ ] Migrations pendentes identificadas
- [ ] Backup strategy documentada

### 4. Seguranca

- [ ] npm audit sem vulnerabilidades criticas
- [ ] Helmet configurado
- [ ] Rate limiting ativo

---

## Fluxo de Execucao

### Fase 1: Build Validation

```bash
# Backend build
cd backend && npm run build 2>&1 | tail -20

# Frontend build
cd frontend && npm run build 2>&1 | tail -20
```

### Fase 2: Test Validation

```bash
# Backend tests
cd backend && npm test -- --passWithNoTests 2>&1 | tail -30

# Frontend tests
cd frontend && npm test -- --passWithNoTests 2>&1 | tail -30
```

### Fase 3: Type & Lint Check

```bash
# TypeScript
cd backend && npx tsc --noEmit 2>&1 | head -20
cd frontend && npx tsc --noEmit 2>&1 | head -20

# ESLint
cd backend && npx eslint . --ext .ts --max-warnings 0 2>&1 | head -20
cd frontend && npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | head -20
```

### Fase 4: Environment Variables

Verificar variaveis obrigatorias no Railway:

```bash
# Usando Railway MCP
# Listar variaveis configuradas
```

Variaveis obrigatorias:

- `DATABASE_URL` - Conexao PostgreSQL
- `REDIS_URL` - Conexao Redis
- `JWT_SECRET` - Secret para JWT
- `OPENAI_API_KEY` - API OpenAI
- `PERPLEXITY_API_KEY` - API Perplexity
- `SENTRY_DSN` - Sentry monitoring
- `NODE_ENV` - production

### Fase 5: Security Audit

```bash
cd backend && npm audit --audit-level=critical 2>&1 | head -30
cd frontend && npm audit --audit-level=critical 2>&1 | head -30
```

### Fase 6: Railway Config

```bash
cat railway.json 2>&1
```

Verificar:

- `healthcheckPath` configurado
- `restartPolicyType` definido

---

## Formato do Relatorio

```markdown
## Deploy Check Report - ETP Express

**Data:** <data>
**Branch:** <branch>
**Commit:** <hash>

### Build Status

| Componente     | Status | Detalhes   |
| -------------- | ------ | ---------- |
| Backend Build  | ✅/❌  | <detalhes> |
| Frontend Build | ✅/❌  | <detalhes> |

### Test Status

| Componente | Passed | Failed | Skipped |
| ---------- | ------ | ------ | ------- |
| Backend    | X      | Y      | Z       |
| Frontend   | X      | Y      | Z       |

### Code Quality

| Check      | Backend | Frontend |
| ---------- | ------- | -------- |
| TypeScript | ✅/❌   | ✅/❌    |
| ESLint     | ✅/❌   | ✅/❌    |

### Environment Variables

| Variable       | Status        |
| -------------- | ------------- |
| DATABASE_URL   | ✅ Configured |
| JWT_SECRET     | ✅ Configured |
| OPENAI_API_KEY | ⚠️ Missing    |

### Security

| Audit    | Critico | Alto | Medio |
| -------- | ------- | ---- | ----- |
| Backend  | 0       | X    | Y     |
| Frontend | 0       | X    | Y     |

### Railway Config

| Setting        | Value       | Status |
| -------------- | ----------- | ------ |
| Health Check   | /api/health | ✅     |
| Restart Policy | always      | ✅     |

---

## Deploy Decision

✅ **READY TO DEPLOY** - Todos os checks passaram

ou

❌ **NOT READY** - Corrigir issues antes de deploy:

1. <issue 1>
2. <issue 2>
```

---

## Criterios de Bloqueio

Deploy e **BLOQUEADO** se:

- ❌ Build falhar (backend ou frontend)
- ❌ Testes falharem
- ❌ Type errors existirem
- ❌ Vulnerabilidades criticas em deps
- ❌ Variaveis obrigatorias faltando

Deploy pode prosseguir com **WARNING** se:

- ⚠️ Warnings de lint (nao errors)
- ⚠️ Vulnerabilidades medias/baixas
- ⚠️ Coverage abaixo do target

---

## Exemplo de Output

```
## Deploy Check Report - ETP Express

**Data:** 2025-01-15 14:30
**Branch:** master
**Commit:** abc123

### Build Status

| Componente | Status | Detalhes |
|------------|--------|----------|
| Backend Build | ✅ | 45s |
| Frontend Build | ✅ | 32s |

### Test Status

| Componente | Passed | Failed | Skipped |
|------------|--------|--------|---------|
| Backend | 156 | 0 | 2 |
| Frontend | 89 | 0 | 0 |

### Code Quality

| Check | Backend | Frontend |
|-------|---------|----------|
| TypeScript | ✅ 0 errors | ✅ 0 errors |
| ESLint | ✅ 0 errors | ✅ 0 errors |

### Environment Variables

| Variable | Status |
|----------|--------|
| DATABASE_URL | ✅ |
| JWT_SECRET | ✅ |
| OPENAI_API_KEY | ✅ |
| NODE_ENV | ✅ |

### Security

| Audit | Critico | Alto | Medio |
|-------|---------|------|-------|
| Backend | 0 | 0 | 2 |
| Frontend | 0 | 1 | 3 |

⚠️ 1 vulnerabilidade alta no frontend (lodash) - recomendado corrigir

---

## Deploy Decision

✅ **READY TO DEPLOY**

Comando: `railway up` ou push para branch master
```

---

## Regras

1. **Nunca ignore builds falhando** - E bloqueador absoluto
2. **Testes falhando = nao deploy** - Sem excecoes
3. **Vulnerabilidades criticas = bloqueador** - Corrigir antes
4. **Documente warnings** - Para follow-up pos-deploy
