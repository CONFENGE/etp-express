# Regras Gerais

- sempre que uma tarefa impactar na evolução do projeto, ROADMAP.md deve ser atualizado.
- Sempre que houver recomendação de execução fundamentada, executar a recomendação sem solicitar aprovação manual

# Execução Proativa de Commands

## Regra Geral

Antes de qualquer tarefa, verificar se existe um command relevante. Se existir, executá-lo proativamente usando a skill `proactive-orchestration`.

## Mapeamentos Obrigatórios (AUTO-EXECUTE)

| Contexto Detectado              | Command          | Ativação                       |
| ------------------------------- | ---------------- | ------------------------------ |
| Início de sessão / após /clear  | `/catchup`       | Sempre no início               |
| Erro de build/lint/type         | `/smart-fix`     | Ao detectar erro               |
| Arquivos modificados + tests OK | `/commit`        | Após completar tarefa          |
| Antes de PR/deploy              | `/test-coverage` | Antes de criar PR              |
| Antes de PR/deploy              | `/security-scan` | Antes de criar PR              |
| PR mencionado para review       | `/review-pr`     | Quando usuário menciona PR     |
| Problemas em produção           | `/health-check`  | Quando mencionado Railway/prod |
| Entity editada                  | `/db-migrate`    | Ao editar arquivos .entity.ts  |
| Pré-deploy                      | `/deploy-check`  | Antes de deploy Railway        |
| Drift ROADMAP vs Issues         | `/audit-roadmap` | Inconsistência detectada       |

## Ativação Contextual (SUGGEST - Perguntar)

| Contexto          | Command         | Quando Sugerir                    |
| ----------------- | --------------- | --------------------------------- |
| Feature complexa  | `/brainstorm`   | Antes de implementar feature nova |
| Plano necessário  | `/write-plan`   | 3+ tarefas ou design não-trivial  |
| Múltiplas tarefas | `/execute-plan` | Com plano criado, pronto executar |

## Integração com Skills

A execução proativa de commands complementa `using-superpowers`:

- **Skills** = HOW (como fazer algo)
- **Commands** = WHAT (o que executar automaticamente)

Ambos devem ser verificados antes de cada tarefa.

# Comandos de Desenvolvimento

## Backend (NestJS)

```bash
cd backend && npm run start:dev      # Dev server (port 3001)
cd backend && npm run test           # Jest unit tests
cd backend && npm run test:cov       # Coverage report
cd backend && npm run test:e2e       # Integration tests
cd backend && npm run build          # Production build
```

## Frontend (React + Vite)

```bash
cd frontend && npm run dev           # Vite dev server (port 5173)
cd frontend && npm run test          # Vitest unit tests
cd frontend && npm run test:coverage # Coverage report
cd frontend && npm run build         # Production build
```

## E2E Tests (Playwright)

```bash
npx playwright test                              # Todos os testes (chromium)
npx playwright test e2e/auth/login-flow.spec.ts # Arquivo único
npx playwright test --grep "should login"       # Por nome do teste
npx playwright test --project=chromium          # Browser específico
npx playwright test --ui                         # UI interativa
npx playwright test --debug                      # Debug mode
npx playwright show-report                       # Ver relatório HTML
```

## Database (TypeORM)

```bash
cd backend && npm run migration:generate -- -n NomeMigracao  # Gerar migration
cd backend && npm run migration:run                           # Aplicar migrations
cd backend && npm run migration:revert                        # Reverter última
cd backend && npm run seed:admin                              # Criar usuário admin
cd backend && npm run reset:demo                              # Limpar dados demo
```

## Security & Quality

```bash
npm run security:scan               # Gitleaks scan
cd backend && npm run lint          # ESLint backend
cd frontend && npm run lint         # ESLint frontend
```

# Arquitetura

## Stack Técnica

| Camada   | Tecnologia                               | Versão |
| -------- | ---------------------------------------- | ------ |
| Backend  | NestJS + TypeORM + PostgreSQL + pgvector | 11.x   |
| Frontend | React + Vite + TailwindCSS + Radix UI    | 18.x   |
| E2E      | Playwright                               | 1.x    |
| CI/CD    | GitHub Actions + Railway                 | -      |

## Estrutura do Monorepo

```
etp-express/
├── backend/           # NestJS API (port 3001)
│   ├── src/modules/   # Módulos: auth, etps, sections, orchestrator, rag
│   ├── migrations/    # TypeORM migrations
│   └── test/          # Integration tests
├── frontend/          # React SPA (port 5173)
│   ├── src/pages/     # Páginas principais
│   ├── src/components/ # Componentes (ui/, etp/, admin/)
│   └── src/hooks/     # Custom hooks
└── e2e/               # Playwright E2E tests
    ├── auth/          # Login, logout, password
    ├── etp/           # CRUD, edit, lifecycle
    ├── admin/         # Dashboard, domains, audit
    └── utils/         # Helpers compartilhados
```

## Credenciais de Teste (CI/seed)

| Role    | Email                   | Password    |
| ------- | ----------------------- | ----------- |
| Admin   | admin@confenge.com.br   | Admin@123   |
| Manager | manager@confenge.com.br | Manager@123 |
| User    | user@confenge.com.br    | User@123    |

# Padrões E2E

## Anti-Patterns a EVITAR

```typescript
// ❌ NUNCA usar hard waits
await page.waitForTimeout(500);

// ✅ USAR waits semânticos
await page.waitForResponse((resp) => resp.url().includes('/api/etps'));
await expect(page.locator('[role="status"]')).toBeVisible();
await page.waitForURL(/\/dashboard/);
```

```typescript
// ❌ NUNCA usar seletores CSS frágeis
page.locator('[class*="Skeleton"]');
page.locator('.hover\\:shadow-md');

// ✅ USAR data-testid ou roles
page.locator('[data-testid="loading-spinner"]');
page.locator('[role="dialog"]');
page.locator('button:has-text("Criar ETP")');
```

## Helpers Compartilhados (e2e/utils/)

```typescript
import { login, TEST_USERS } from './utils/auth';
import { waitForToast, waitForApiResponse } from './utils/waits';

// Login com role específico
await login(page, 'admin');

// Esperar toast de sucesso
await waitForToast(page, 'sucesso');

// Esperar resposta de API
await waitForApiResponse(page, /\/api\/etps/, 'POST');
```
