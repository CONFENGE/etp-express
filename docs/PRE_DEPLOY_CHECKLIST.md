# Pre-Deploy Checklist - ETP Express

**Executar antes de:** Cada deploy para producao ou staging
**Responsavel:** Desenvolvedor ou DevOps
**Tempo estimado:** 15-20 minutos

---

## 1. Testes Automatizados

### 1.1 Backend (NestJS)

```bash
cd backend
npm test
```

- [ ] Todos testes unitarios passando
- [ ] Zero testes pulados (skipped)
- [ ] Cobertura >= 80% (verificar com `npm run test:cov`)

### 1.2 Frontend (React)

```bash
cd frontend
npm test
```

- [ ] Todos testes unitarios passando
- [ ] Zero testes pulados (skipped)
- [ ] Cobertura >= 70% (verificar com `npm run test:coverage`)

### 1.3 Testes E2E (Playwright)

```bash
npm run test:e2e
```

- [ ] Fluxo de login funciona
- [ ] CRUD de ETP funciona
- [ ] Export PDF/DOCX funciona

---

## 2. Build

### 2.1 Backend Build

```bash
cd backend
npm run build
```

- [ ] Build completa sem erros
- [ ] Zero warnings de TypeScript
- [ ] Arquivos `.hbs` copiados para `dist/`

### 2.2 Frontend Build

```bash
cd frontend
npm run build
```

- [ ] Build completa sem erros
- [ ] Zero warnings de Vite
- [ ] Bundle size aceitavel (< 500KB gzipped)

---

## 3. Linting e Formatacao

### 3.1 ESLint

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

- [ ] Zero erros de ESLint
- [ ] Zero warnings criticos (max 5 warnings totais)

### 3.2 Prettier

```bash
npm run format:check
```

- [ ] Formatacao consistente em todos arquivos
- [ ] Se houver diferencas, executar `npm run format`

### 3.3 TypeScript Strict

```bash
# Backend
cd backend && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```

- [ ] Zero erros de tipagem
- [ ] Todas interfaces corretamente tipadas

---

## 4. Security Scan

### 4.1 Dependencias (npm audit)

```bash
# Backend
cd backend && npm audit --audit-level=high

# Frontend
cd frontend && npm audit --audit-level=high
```

- [ ] Zero vulnerabilidades HIGH ou CRITICAL
- [ ] Vulnerabilidades MODERATE documentadas e aceitas

### 4.2 Secrets Scan (Gitleaks)

```bash
gitleaks detect --source . --verbose
```

- [ ] Nenhum secret exposto no codigo
- [ ] Nenhuma API key hardcoded
- [ ] Arquivos `.env` no `.gitignore`

### 4.3 OWASP Top 10

- [ ] Nenhuma SQL injection possivel (usar TypeORM queries)
- [ ] Inputs sanitizados (class-validator)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo em endpoints criticos

---

## 5. Migrations

### 5.1 Verificar Pending Migrations

```bash
cd backend
npm run typeorm migration:show -d src/config/typeorm.config.ts
```

- [ ] Migrations pendentes identificadas
- [ ] Migrations reversiveis (tem `down()` implementado)

### 5.2 Testar Migration Local

```bash
# Rodar migration em database local/dev
npm run migration:run

# Verificar integridade
npm run typeorm schema:log -d src/config/typeorm.config.ts
```

- [ ] Migration executa sem erros
- [ ] Schema atualizado corretamente
- [ ] Rollback testado (`npm run migration:revert`)

---

## 6. Smoke Test Local

### 6.1 Iniciar Servicos

```bash
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 6.2 Validacoes Manuais

- [ ] Health check: `curl http://localhost:3000/api/health` retorna 200
- [ ] Login funciona com credenciais de teste
- [ ] Criar ETP e salvar
- [ ] Gerar secao com IA (modo sync)
- [ ] Exportar PDF

---

## 7. Pre-Flight Checks

### 7.1 Variaveis de Ambiente

- [ ] Todas vars de producao configuradas no Railway
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` aponta para URL correta do frontend
- [ ] API keys validas (OpenAI, Exa)
- [ ] `JWT_SECRET` diferente de desenvolvimento

### 7.2 Infraestrutura

- [ ] Railway project ativo e saudavel
- [ ] PostgreSQL com conexoes disponiveis
- [ ] Redis (se usado) operacional
- [ ] 2+ replicas backend configuradas

### 7.3 Backup

- [ ] Backup do database antes de deploy com breaking changes
- [ ] Procedimento de rollback documentado
- [ ] Rollback testado em ambiente de staging

---

## 8. Documentacao

- [ ] CHANGELOG atualizado com novas features
- [ ] ROADMAP.md reflete estado atual
- [ ] Breaking changes documentados
- [ ] API changes refletidos no Swagger

---

## Resultado

| Categoria      | Status |
| -------------- | ------ |
| Testes         | [ ]    |
| Build          | [ ]    |
| Lint           | [ ]    |
| Security       | [ ]    |
| Migrations     | [ ]    |
| Smoke Test     | [ ]    |
| Pre-Flight     | [ ]    |
| Documentacao   | [ ]    |

**Aprovado para Deploy:** [ ] SIM / [ ] NAO

---

## Notas

**Se algum item falhar:**
1. Corrigir o problema antes de prosseguir
2. Re-executar o checklist completo
3. Documentar excecoes aceitas com justificativa

**Referencia:**
- [SMOKE_TEST.md](../.github/SMOKE_TEST.md) - Validacao pos-deploy
- [DEPLOY_RAILWAY.md](../DEPLOY_RAILWAY.md) - Processo de deploy

---

**Executado em:** _______________
**Executado por:** _______________
**Aprovador:** _______________
