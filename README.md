# ETP EXPRESS

> **⚠ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.**

Sistema assistivo para elaboração de **Estudos Técnicos Preliminares (ETP)** conforme **Lei 14.133/2021** (Nova Lei de Licitações e Contratos), utilizando IA generativa com orquestração de subagentes especializados.

---

[![CI Lint](https://github.com/tjsasakifln/etp-express/actions/workflows/ci-lint.yml/badge.svg)](https://github.com/tjsasakifln/etp-express/actions/workflows/ci-lint.yml)
[![CI Tests](https://github.com/tjsasakifln/etp-express/actions/workflows/ci-tests.yml/badge.svg)](https://github.com/tjsasakifln/etp-express/actions/workflows/ci-tests.yml)
[![E2E Tests](https://github.com/tjsasakifln/etp-express/actions/workflows/playwright.yml/badge.svg)](https://github.com/tjsasakifln/etp-express/actions/workflows/playwright.yml)
[![Security Audit](https://github.com/tjsasakifln/etp-express/actions/workflows/security-audit.yml/badge.svg)](https://github.com/tjsasakifln/etp-express/actions/workflows/security-audit.yml)
[![Secret Scan](https://github.com/tjsasakifln/etp-express/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/tjsasakifln/etp-express/actions/workflows/secret-scan.yml)
[![Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](https://github.com/tjsasakifln/etp-express/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Zero%20Errors-blue)]()
[![Coverage](https://img.shields.io/badge/coverage-backend%2078%25%20%7C%20frontend%2076%25-green)]()
[![LGPD](https://img.shields.io/badge/LGPD-100%25%20Compliant-green)]()
[![Production Ready](https://img.shields.io/badge/status-Production%20Ready-brightgreen)]()

---

## SOBRE O PROJETO

O **ETP Express** é um **wrapper de LLM** (Large Language Model) projetado para auxiliar servidores públicos, consultores e agentes de contratação na elaboração de Estudos Técnicos Preliminares, conforme exigido pelo **Art. 18 §1º da Lei 14.133/2021**.

### Diferenciais

- **Sistema de Subagentes**: 5 agentes especializados trabalhando em pipeline
- **Anti-Hallucination**: Mitigacao ativa de alucinacoes e invencao de fatos
- **Busca Inteligente**: Integracao com Exa AI para contratacoes similares
- **APIs Governamentais**: PNCP, Compras.gov.br, SINAPI, SICRO como fontes primarias
- **Versionamento Completo**: Historico com diff e restauracao de versoes
- **Export Profissional**: PDF, JSON, XML e DOCX com disclaimers obrigatorios
- **Import & Analise**: Upload PDF/DOCX para analise e conversao em ETP
- **SSE/Streaming**: Feedback em tempo real durante geracao de secoes
- **Analytics de UX**: Telemetria para melhoria continua
- **Cache LLM Inteligente**: OpenAI (24h TTL) + Exa (7d TTL) - economia ~80% custos
- **Circuit Breaker Resiliente**: Opossum para OpenAI/Exa - degradacao graciosa
- **RAG com pgvector**: Fact-checking contra Lei 14.133/2021 vetorizada
- **Performance Otimizada**: 4-5x speedup paralelizacao, 75% reducao queries DB
- **LGPD 100% Compliance**: Export/delete completo, audit trail, soft delete
- **Zero-Downtime Deployment**: Blue-green deployment Railway, health checks
- **CI/CD Otimizado**: GitHub Actions cache, -68% reducao CI minutes
- **1,879 Testes Automatizados**: 78% backend, 76% frontend, zero erros TypeScript
- **Auditorias Arquiteturais**: Orchestrator (95%), User (92%), Sections (83%)

### Funcionalidades Core

1. ✅ Formulário guiado para preenchimento das 13 seções do ETP
2. ✅ Geração assistida por IA (GPT-4) com validação multi-agente
3. ✅ Busca de contratações similares para fundamentação
4. ✅ Versionamento e trilha de auditoria completos
5. ✅ Exportação em PDF (com aviso destacado), JSON e XML
6. ✅ Validação obrigatória de seções mínimas (I, IV, VI, VIII, XIII)
7. ✅ Interface moderna, responsiva e acessível (WCAG 2.1 AA)

---

## ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│ ETP EXPRESS - STACK │
├─────────────────────────────────────────────────────────────┤
│ │
│ Frontend (React + TypeScript) │
│ ├── Vite 7.2.7 │
│ ├── Tailwind CSS + shadcn/ui │
│ ├── Zustand (state) │
│ └── React Hook Form + Zod │
│ │
│ Backend (NestJS 11.1.9 + TypeScript) │
│ ├── TypeORM + PostgreSQL │
│ ├── OpenAI GPT-4 (geracao + cache 24h TTL) │
│ ├── Exa AI (busca + cache 7d TTL) │
│ ├── Gov-APIs (PNCP, SINAPI, SICRO) │
│ ├── pgvector (RAG Lei 14.133/2021) │
│ ├── Opossum (Circuit Breaker) │
│ ├── node-cache (LLM response caching) │
│ ├── Puppeteer (PDF generation) │
│ ├── mammoth + pdf-parse (document extraction) │
│ └── JWT Auth │
│ │
│ Deploy (Railway) │
│ ├── PostgreSQL Database + pgvector extension │
│ ├── Backend Service (zero-downtime) │
│ └── Frontend Service │
│ │
└─────────────────────────────────────────────────────────────┘
```

### Sistema de Subagentes (IA)

```
User Input
 ↓
Orchestrator
 ↓
┌─────────────────────┐
│ 1. Legal Agent │ → Valida coerencia legal (Lei 14.133)
├─────────────────────┤
│ 2. Fundamentacao │ → Busca contratacoes (Gov-APIs + Exa)
├─────────────────────┤
│ 3. Clareza │ → Revisa legibilidade (Flesch index)
├─────────────────────┤
│ 4. Simplificacao │ → Remove jargao burocratico
├─────────────────────┤
│ 5. Anti-Hallucination│ → Previne invencao de fatos
└─────────────────────┘
 ↓
Generated Content + Warnings + References
```

---

## QUICK START

### Pre-requisitos

- Node.js 20+ LTS
- PostgreSQL 15+
- OpenAI API Key
- Exa API Key

### Instalação Local

```bash
# 1. Clone o repositório
git clone <seu-repo>
cd "ETP Express"

# 2. Configurar Backend
cd backend
npm install
cp .env.example .env
# Edite .env com suas API keys e configurações

# 3. Configurar Database
# Criar database PostgreSQL
createdb etp_express

# Executar schema
psql -d etp_express -f ../DATABASE_SCHEMA.sql

# 4. Iniciar Backend
npm run start:dev
# Backend rodará em http://localhost:3001
# Swagger em http://localhost:3001/api/docs

# 5. Configurar Frontend (novo terminal)
cd ../frontend
npm install
cp .env.example .env
# Edite .env se necessário (padrão: http://localhost:3001/api)

# 6. Iniciar Frontend
npm run dev
# Frontend rodará em http://localhost:5173
```

### Primeiro Acesso

1. Acesse `http://localhost:5173`
2. Clique em "Registrar"
3. Crie sua conta
4. Faça login
5. Crie seu primeiro ETP!

### Configuração de Segurança (Gitleaks)

Para proteger contra vazamento de secrets (API keys, senhas, tokens), instale o **Gitleaks**:

**Windows (Chocolatey):**

```bash
choco install gitleaks
```

**Windows (Scoop):**

```bash
scoop install gitleaks
```

**macOS (Homebrew):**

```bash
brew install gitleaks
```

**Linux:**

```bash
# Baixe a versão mais recente do GitHub
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

**Verificar instalação:**

```bash
gitleaks version
```

O pre-commit hook detectará automaticamente o Gitleaks e escaneará seus commits antes de permitir o commit. Para mais detalhes, consulte `docs/SECURITY.md`.

---

## DESENVOLVIMENTO LOCAL COM DOCKER (RECOMENDADO)

### Pré-requisitos

- **Docker Engine** 20.10+
- **Docker Compose** V2
- **OpenAI API Key** (obrigatório)

### Setup Automático (One Command)

```bash
# Clone o repositório
git clone <seu-repo>
cd "ETP Express"

# Setup completo (recomendado para novos desenvolvedores)
bash scripts/setup-local.sh

# Siga as instruções interativas:
# - Será solicitada sua OpenAI API Key
# - Secrets serão gerados automaticamente (JWT, database password)
# - Docker images serão buildadas (~5-10 min na primeira vez)
# - Services serão iniciados automaticamente
```

**Resultado:**

- ✅ PostgreSQL rodando com volumes persistentes
- ✅ Backend NestJS com hot-reload
- ✅ Frontend React + Vite com hot-reload
- ✅ Environment variables configuradas automaticamente

### Setup Manual

```bash
# 1. Criar .env a partir do template
cp .env.template .env

# 2. Editar .env e adicionar sua OpenAI API Key
# OPENAI_API_KEY=sk-...your_api_key_here...

# 3. Validar environment variables (opcional mas recomendado)
bash scripts/validate-env.sh

# 4. Iniciar stack completa
docker-compose up

# Ou em background:
docker-compose up -d
```

### URLs de Acesso

| Serviço         | URL                            | Descrição             |
| --------------- | ------------------------------ | --------------------- |
| **Frontend**    | http://localhost:5173          | Interface do usuário  |
| **Backend API** | http://localhost:3001          | API REST              |
| **API Docs**    | http://localhost:3001/api/docs | Swagger Documentation |
| **PostgreSQL**  | localhost:5432                 | Database (interno)    |

### Comandos Docker Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: limpa database)
docker-compose down -v

# Rebuild images (após mudanças no Dockerfile)
docker-compose build

# Rebuild e restart
docker-compose up --build

# Executar comandos dentro de um container
docker-compose exec backend npm run migration:run
docker-compose exec postgres psql -U etp_user -d etp_express

# Entrar no shell de um container
docker-compose exec backend sh
docker-compose exec frontend sh

# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats
```

### Hot-Reload Habilitado

**Backend:**

- Source code montado como volume em `/app/src`
- NestJS watch mode ativado
- Mudanças refletem automaticamente (2-3s)

**Frontend:**

- Source code montado como volume em `/app/src`
- Vite dev server com HMR (Hot Module Replacement)
- Mudanças refletem instantaneamente (<1s)

### Environment Variables

As variáveis de ambiente são gerenciadas via arquivo `.env` na raiz do projeto.

**Arquivo:** `.env.template` (copiar para `.env`)

**Variáveis OBRIGATÓRIAS:**

| Variável            | Descrição                            | Exemplo                         |
| ------------------- | ------------------------------------ | ------------------------------- |
| `OPENAI_API_KEY`    | OpenAI API Key (obrigatória)         | `sk-proj-...`                   |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL                  | `<auto-gerado por setup-local>` |
| `JWT_SECRET`        | Secret para assinatura de tokens JWT | `<auto-gerado por setup-local>` |

**Variáveis OPCIONAIS:**

| Variável                  | Descrição                | Default        |
| ------------------------- | ------------------------ | -------------- |
| `EXA_API_KEY`             | Exa API (busca avancada) | ` ` (disabled) |
| `SENTRY_DSN`              | Sentry error tracking    | ` ` (disabled) |
| `NODE_ENV`                | Node environment         | `development`  |
| `BACKEND_PORT`            | Backend port             | `3001`         |
| `FRONTEND_PORT`           | Frontend port            | `5173`         |
| `DB_POOL_MIN`             | Connection pool mínimo   | `5`            |
| `DB_POOL_MAX`             | Connection pool máximo   | `20`           |
| `DB_POOL_ACQUIRE_TIMEOUT` | Timeout aquisição (ms)   | `30000`        |
| `DB_POOL_IDLE_TIMEOUT`    | Timeout idle (ms)        | `10000`        |

**Validação:**

```bash
# Validar .env antes de iniciar
bash scripts/validate-env.sh

# Output:
# All validations passed!
# Your .env file is ready. You can now run: docker-compose up
```

### Troubleshooting

#### "Cannot connect to database"

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# View PostgreSQL logs
docker-compose logs postgres
```

#### "Port already in use"

```bash
# Identificar processo usando a porta
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9

# Ou alterar porta no .env:
FRONTEND_PORT=5174
BACKEND_PORT=3002
```

#### "Hot-reload not working"

```bash
# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

#### "Out of disk space"

```bash
# Limpar images e containers não usados
docker system prune -a

# Ver uso de disco
docker system df
```

### Arquitetura Docker

**Arquivos principais:**

- `docker-compose.yml` - Orquestração dos 3 services
- `backend/Dockerfile` - Multi-stage build (development + production)
- `frontend/Dockerfile` - Multi-stage build (development + production)
- `frontend/nginx.conf` - Nginx config para production stage

**Multi-stage builds:**

- **Development stage:** Hot-reload, debug, dev dependencies
- **Production stage:** Optimized, minimal, security-hardened

**Documentação completa:** [docs/INFRASTRUCTURE.md](./docs/INFRASTRUCTURE.md)

---

## CI/CD E GITHUB ACTIONS

**M2 (Issues #18-#20, #252-#257)**

### Workflows Automatizados

1. **ci-lint.yml** - ESLint/Prettier + Cache NPM
2. **ci-tests.yml** - Jest + Vitest (78%/76% coverage)
3. **playwright.yml** - E2E + Cache browsers
4. **secret-scan.yml** - Gitleaks (weekly + incremental PRs)
5. **validate-lockfile.yml** - Dependency validation

### Otimizações (2025-11-30)

**Economia**: **-68% redução minutos** (~8000 min/mês)

**Quick Wins**:

- ✅ Cache NPM: ~100s/job economizados
- ✅ Cache Playwright: ~4 min/execução
- ✅ Secret scanning: Daily → Weekly (~560 min/mês)
- ✅ Path filters: ~2900 min/mês (evita 146 runs/docs)

**Resultados**:

- Pré: ~12000 min/mês (~25 min/ciclo)
- Pós: ~4000 min/mês (~10 min/ciclo cache HIT)
- ROI: 2h implementação → 131h/mês economizadas

[ROADMAP.md - CI/CD](./ROADMAP.md#-otimização-de-infraestrutura)

---

## E2E TESTS (PUPPETEER)

**M5 (Issue #22)** - Infraestrutura completa de testes end-to-end com Puppeteer + Jest.

### Visão Geral

O projeto possui suite de testes E2E automatizados que validam fluxos críticos da aplicação:

- ✅ Fluxo de autenticação (login/logout)
- ✅ Criação de ETPs
- ✅ Navegação entre páginas
- ✅ Validação de formulários
- ✅ Integração frontend-backend

### Pré-requisitos

```bash
# Frontend DEVE estar rodando
cd frontend
npm run dev
# Aguardar: http://localhost:5173
```

### Executar Testes E2E

```bash
# Na raiz do projeto (monorepo)
npm run test:e2e

# Ou diretamente no diretório e2e/
cd e2e
npx tsx run-tests.ts
```

### Estrutura de Arquivos

```
e2e/
├── puppeteer.config.js # Configuração do Puppeteer (base URL, timeouts, viewport)
├── jest.config.js # Configuração do Jest (TypeScript, environment node)
├── utils/
│ └── setup.ts # Helpers (setupBrowser, login, createETP, screenshots)
├── login.spec.ts # Suite de testes do fluxo de login (6 casos)
├── run-tests.ts # Test runner customizado (verifica servidor, executa specs)
└── .gitignore # Ignora screenshots/, test-results/, temp files

Gerado em runtime:
├── screenshots/ # Screenshots de falhas (auto-capturados)
│ └── YYYY-MM-DD_HH-MM-SS_test-name.png
└── test-results/ # Relatórios XML (Jest JUnit)
 └── e2e-test-results.xml
```

### Configuração (puppeteer.config.js)

| Configuração        | Padrão                  | Variável de Ambiente | Descrição                          |
| ------------------- | ----------------------- | -------------------- | ---------------------------------- |
| `baseUrl`           | `http://localhost:5173` | `E2E_BASE_URL`       | URL da aplicação                   |
| `headless`          | `true`                  | `E2E_HEADLESS=false` | Modo headless (true para CI)       |
| `devtools`          | `false`                 | `E2E_DEVTOOLS=true`  | Abrir DevTools (debug)             |
| `slowMo`            | `0`                     | `E2E_SLOW_MO=250`    | Slow motion (ms) para debug visual |
| `viewport.width`    | `1920`                  | -                    | Largura do browser                 |
| `viewport.height`   | `1080`                  | -                    | Altura do browser                  |
| `testTimeout`       | `60000` (60s)           | -                    | Timeout padrão por teste           |
| `testUser.email`    | `test@confenge.com.br`  | `E2E_TEST_EMAIL`     | Usuário padrão para testes         |
| `testUser.password` | `Test@123456`           | `E2E_TEST_PASSWORD`  | Senha padrão para testes           |

### Helpers Disponíveis (utils/setup.ts)

```typescript
// Inicializar browser e page
const { browser, page } = await setupBrowser();

// Fazer login
await login(page, 'user@example.com', 'password123');

// Criar ETP
await createETP(page, { title: 'Projeto Teste', description: 'Descrição' });

// Capturar screenshot em falha
await takeScreenshotOnFailure(page, 'test-name');

// Obter texto de elemento
const text = await getTextContent(page, '.error-message');

// Aguardar URL conter path
await waitForUrlContains(page, '/dashboard');

// Teardown
await teardownBrowser(browser);
```

### Exemplo de Teste (login.spec.ts)

```typescript
import { setupBrowser, teardownBrowser, login } from './utils/setup';

describe('Login Flow E2E', () => {
  let browser, page;

  beforeEach(async () => {
    ({ browser, page } = await setupBrowser());
  });

  afterEach(async () => {
    await teardownBrowser(browser);
  });

  test('deve fazer login com credenciais válidas', async () => {
    try {
      await page.goto('http://localhost:5173/login');
      await page.type('#email', 'test@confenge.com.br');
      await page.type('#password', 'Test@123456');
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // Validações
      expect(page.url()).toContain('/dashboard');
    } catch (error) {
      await takeScreenshotOnFailure(page, 'login-valid-credentials');
      throw error;
    }
  }, 60000);
});
```

### Executar com Opções de Debug

```bash
# Modo visual (browser visível)
E2E_HEADLESS=false npm run test:e2e

# Com DevTools aberto
E2E_DEVTOOLS=true npm run test:e2e

# Slow motion (250ms entre ações)
E2E_SLOW_MO=250 E2E_HEADLESS=false npm run test:e2e

# Combinar opções
E2E_HEADLESS=false E2E_SLOW_MO=500 npm run test:e2e
```

### Criar Novos Testes

1. Criar arquivo `e2e/<nome>.spec.ts`
2. Importar helpers de `./utils/setup`
3. Seguir padrão Jest (describe, test, expect)
4. Adicionar try-catch com `takeScreenshotOnFailure` em caso de erro
5. Executar `npm run test:e2e` para validar

### CI/CD Integration (Futuro)

```yaml
# .github/workflows/e2e-tests.yml (exemplo)
name: E2E Tests
on: [pull_request]
jobs:
 e2e:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v4
 - uses: actions/setup-node@v4
 with:
 node-version: '20'
 cache: 'npm'

 # Instalar dependências
 - run: npm ci
 - run: cd frontend && npm ci
 - run: cd backend && npm ci

 # Iniciar aplicação em background
 - run: cd frontend && npm run dev &
 - run: cd backend && npm run start:dev &

 # Aguardar servidor (health check)
 - run: npx wait-on http://localhost:5173 http://localhost:3001/health

 # Executar testes E2E
 - run: npm run test:e2e
 env:
 E2E_HEADLESS: true
 E2E_BASE_URL: http://localhost:5173

 # Upload screenshots de falhas
 - uses: actions/upload-artifact@v4
 if: failure()
 with:
 name: e2e-screenshots
 path: e2e/screenshots/
```

### Troubleshooting

#### "Servidor não está rodando"

```bash
# Certifique-se de que o frontend está rodando
cd frontend
npm run dev

# Verificar porta 5173
curl http://localhost:5173
```

#### "Timeout aguardando navegação"

- Aumentar timeout em `puppeteer.config.js` → `timeouts.navigation`
- Verificar se backend está rodando (frontend pode carregar mas API falhar)
- Usar `E2E_SLOW_MO=500` para debug visual

#### "Element not found"

- Capturar screenshot: `await page.screenshot({ path: 'debug.png' })`
- Verificar seletores no frontend (ID, classes, data-testid)
- Usar `page.waitForSelector('#elemento', { visible: true })`

#### "Browser não abre (headless=false)"

- Verificar instalação do Chromium: `npx puppeteer browsers install chrome`
- Linux: Instalar dependências: `sudo apt-get install -y libx11-xcb1 libxcomposite1`

### Referências

- [Documentação Puppeteer](https://pptr.dev/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Issue #22 - Configure Puppeteer E2E](https://github.com/tjsasakifln/etp-express/issues/22)
- [Issue #23 - E2E Critical Flow Tests](https://github.com/tjsasakifln/etp-express/issues/23)
- [Issue #24 - Accessibility Tests (Axe-core)](https://github.com/tjsasakifln/etp-express/issues/24)

---

## DEPLOY EM PRODUÇÃO (RAILWAY)

Consulte o guia completo: **[DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)**

### Pré-requisitos

1. **Railway CLI**: `npm i -g @railway/cli`
2. **Token**: `railway login` ou `export RAILWAY_TOKEN=...`
3. **Variáveis obrigatórias**:

- `OPENAI_API_KEY`
- `JWT_SECRET` (gerar: `openssl rand -base64 32`)

4. **Connection pooling** (recomendado):

- `DB_POOL_MIN=5`
- `DB_POOL_MAX=20`

---

**Resumo**:

```bash
# 1. Criar projeto Railway
railway init

# 2. Adicionar PostgreSQL
# Via dashboard: Add Database → PostgreSQL

# 3. Deploy Backend
# Via dashboard: Add Service → Select backend/ directory

# 4. Deploy Frontend
# Via dashboard: Add Service → Select frontend/ directory

# 5. Configurar variáveis de ambiente
# Adicionar API keys, DATABASE_URL, CORS, etc
```

**URLs de produção**:

- Backend: `https://etp-express-backend-production.up.railway.app`
- Frontend: `https://etp-express-frontend-production.up.railway.app`
- Swagger: `https://etp-express-backend-production.up.railway.app/api/docs`

---

## ESTRUTURA DO PROJETO

```
ETP Express/
├── docs/ # Documentação adicional
├── backend/ # NestJS Backend
│ ├── src/
│ │ ├── common/ # Filters, Guards, Decorators
│ │ ├── config/ # Configurações
│ │ ├── entities/ # Entidades TypeORM
│ │ └── modules/
│ │ ├── auth/ # Autenticação
│ │ ├── users/ # Usuários
│ │ ├── etps/ # ETPs
│ │ ├── sections/ # Seções
│ │ ├── orchestrator/ # Sistema de IA
│ │ ├── rag/ # RAG + pgvector (Lei 14.133)
│ │ ├── search/ # Busca Exa + Gov-APIs
│ │ ├── export/ # Exportação PDF/JSON/XML/DOCX
│ │ ├── document-extraction/ # Extração texto (PDF/DOCX)
│ │ ├── versions/ # Versionamento
│ │ └── analytics/ # Telemetria
│ ├── package.json
│ ├── tsconfig.json
│ └── .env.example
├── frontend/ # React Frontend
│ ├── src/
│ │ ├── components/
│ │ │ ├── ui/ # shadcn/ui components
│ │ │ ├── layout/ # Header, Sidebar, Layout
│ │ │ ├── etp/ # Componentes de ETP
│ │ │ ├── common/ # WarningBanner, Loading, etc
│ │ │ └── search/ # Busca e referências
│ │ ├── pages/ # Páginas principais
│ │ ├── store/ # Zustand stores
│ │ ├── hooks/ # Custom hooks
│ │ ├── lib/ # API client, utils
│ │ └── types/ # TypeScript types
│ ├── package.json
│ ├── vite.config.ts
│ └── .env.example
├── ARCHITECTURE.md # Arquitetura completa
├── DATABASE_SCHEMA.sql # Schema PostgreSQL
├── DEPLOY_RAILWAY.md # Guia de deploy
├── README.md # Este arquivo
└── railway.json # Config Railway
```

---

## PERFORMANCE E OTIMIZAÇÕES

**Implementações M4 (Issues #339-#343)**

### Cache LLM (node-cache)

**OpenAI Cache (TTL 24h)**:

- Economia: ~80% custos (~$40/1000 gerações)
- Latência: 25s redução (5-30s → <5s cache HIT)
- Hit rate: 80-90% produção

**Exa Cache (TTL 7d)**:

- Hit rate: 70%
- Graceful degradation se indisponivel

### Paralelização de Agentes

- Speedup: 4-5x vs sequencial
- Tempo: 60s → 12-15s por geração

### Selective Loading

- Redução queries: 75% (15 → 5.7 avg/request)
- Latência: -42%

### Connection Pooling

- Min: 5, Max: 20 (Railway optimized)
- Suporta 100+ usuários simultâneos

### Circuit Breaker

- Biblioteca: Opossum
- Retry: Exponential backoff (1s → 8s)

### Métricas (Antes vs Depois)

| Métrica          | Antes  | Depois | Melhoria |
| ---------------- | ------ | ------ | -------- |
| Latência geração | 60s    | 35s    | -42%     |
| Cache hit OpenAI | 0%     | 80-90% | +80-90%  |
| Queries/request  | 15     | 5.7    | -62%     |
| Cost reduction   | $50/1k | $10/1k | -80%     |

[PERFORMANCE_BOTTLENECK_ANALYSIS.md](./PERFORMANCE_BOTTLENECK_ANALYSIS.md)

---

## VARIÁVEIS DE AMBIENTE

### Backend (.env)

```bash
# Essenciais
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-aqui
OPENAI_API_KEY=sk-proj-...
EXA_API_KEY=exa-...

# URLs
FRONTEND_URL=https://seu-frontend.railway.app
CORS_ORIGINS=https://seu-frontend.railway.app

# Opcional
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### Frontend (.env)

```bash
VITE_API_URL=https://seu-backend.railway.app/api
VITE_APP_NAME=ETP Express
```

---

## COMANDOS ÚTEIS

### Backend

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Produção
npm run start:prod

# Migrations
npm run migration:generate -- NomeDaMigration
npm run migration:run

# Testes
npm run test
npm run test:e2e
npm run test:cov

# Lint
npm run lint
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

---

## DOCUMENTAÇÃO

| Documento                                                      | Descrição                                         |
| -------------------------------------------------------------- | ------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                           | Arquitetura completa do sistema                   |
| [docs/INFRASTRUCTURE.md](./docs/INFRASTRUCTURE.md)             | **Infrastructure as Code - Docker, Railway, DR**  |
| [DEPLOY.md](./DEPLOY.md)                                       | Guia de deploy em produção (Railway)              |
| [docs/INCIDENT_RESPONSE.md](./docs/INCIDENT_RESPONSE.md)       | **Playbook de resposta a incidentes em produção** |
| [docs/ZERO_DOWNTIME_DEPLOY.md](./docs/ZERO_DOWNTIME_DEPLOY.md) | Estratégia de deploy sem downtime                 |
| [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)                 | Backup e disaster recovery procedures             |
| [docs/MONITORING.md](./docs/MONITORING.md)                     | Monitoramento e alertas com Sentry                |
| [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql)                   | Schema completo do banco                          |
| [backend/README.md](./backend/README.md)                       | Documentação do backend                           |
| [frontend/README.md](./frontend/README.md)                     | Documentação do frontend                          |

### Auditorias Arquiteturais

**M4 (Issues #78-#81)** - Validação contra [ARCHITECTURE.md](./ARCHITECTURE.md)

| Módulo           | Conformidade | Status                   | Relatório                                                                  | Data       |
| ---------------- | ------------ | ------------------------ | -------------------------------------------------------------------------- | ---------- |
| **Orchestrator** | 95%          | ✅ **Aprovado produção** | [ORCHESTRATOR_MODULE_AUDIT.md](./docs/audits/ORCHESTRATOR_MODULE_AUDIT.md) | 2025-11-30 |
| **User**         | 92%          | ⚠ Aprovado (cond. RBAC)  | [USER_MODULE_AUDIT.md](./docs/audits/USER_MODULE_AUDIT.md)                 | 2025-11-30 |
| **Sections**     | 83%          | ⚠ Recomendações          | [SECTIONS_MODULE_AUDIT.md](./docs/audits/SECTIONS_MODULE_AUDIT.md)         | 2025-11-30 |

**Highlights**:

- **Orchestrator**: RAG fact-checking, cache 24h, paralelização 4-5x
- **User**: LGPD 100%, 86 testes, soft/hard delete
- **Sections**: 6 melhorias implementadas

---

## GUIA DE USO

### Para Servidores Públicos

1. **Criar Conta**: Registre-se com email institucional
2. **Novo ETP**: Clique em "Criar ETP" e preencha título e objeto
3. **Preencher Seções**: Navegue pelas 13 seções usando as tabs
4. **Usar IA**: Clique em "Gerar com IA" para sugestões automáticas
5. **Revisar Criticamente**: ⚠ **SEMPRE** revise antes de aceitar
6. **Buscar Referências**: Use "Buscar Similares" para fundamentação
7. **Validar**: Verifique se seções obrigatórias estão completas (I, IV, VI, VIII, XIII)
8. **Exportar**: Gere PDF/JSON/XML quando completo

### Seções Obrigatórias (Lei 14.133/2021)

Para exportar, você **DEVE** preencher:

- ✅ **I** - Descrição da necessidade da contratação
- ✅ **IV** - Justificativa da solução escolhida
- ✅ **VI** - Requisitos da contratação
- ✅ **VIII** - Justificativa do parcelamento ou não da contratação
- ✅ **XIII** - Declaração de viabilidade

---

## ⚠ AVISOS IMPORTANTES

### Natureza do Sistema

O ETP Express é um **sistema assistivo**. Isso significa:

❌ **NÃO substitui** responsabilidade administrativa
❌ **NÃO é** ato conclusivo
❌ **NÃO exime** conferência humana
❌ **NÃO garante** conformidade legal absoluta
❌ **NÃO dispensa** análise jurídica especializada

✅ **É uma ferramenta** de apoio
✅ **Acelera** o processo de elaboração
✅ **Sugere** conteúdo baseado em IA
✅ **Auxilia** na estruturação do documento
✅ **Rastreia** contratações similares

### Limitações da IA

O sistema utiliza **LLMs (Large Language Models)** que podem:

- ❌ Inventar fatos (alucinação)
- ❌ Interpretar leis incorretamente
- ❌ Sugerir valores desatualizados
- ❌ Fazer afirmações imprecisas
- ❌ Ter vieses nos dados de treinamento

**Por isso**:

- ✅ Sempre revise criticamente
- ✅ Valide referências legais
- ✅ Confirme valores com mercado atual
- ✅ Consulte setor jurídico quando necessário
- ✅ Use como **ponto de partida**, não como produto final

---

## SEGURANÇA E PRIVACIDADE

### Dados Processados

- ✅ PostgreSQL TLS 1.3, JWT HS256
- ✅ Rate limiting (5 req/min)
- ✅ Backups Railway (diário, 7d retention)
- ✅ Secret scanning (Gitleaks pre-commit + CI/CD)

### LGPD Compliance (100% Exemplar)

**Auditoria**: [USER_MODULE_AUDIT.md](./docs/audits/USER_MODULE_AUDIT.md) - **100% LGPD**

#### Direitos do Titular (Art. 18)

**Exportação de Dados** (Issue #233):

- Endpoint: `GET /users/me/export`
- Formato: JSON completo
- Self-service

**Exclusão de Dados** (Issues #234-#236):

- **Soft Delete**: `DELETE /users/me` (preserva histórico)
- **Hard Delete**: Cron job 90 dias após
- **Cascade**: ETPs, seções, versões

**Audit Trail** (Issue #238):

- Toda operação logada
- Retention: 5 anos (LGPD Art. 16)

#### Mapeamento de Dados

| Dado          | Finalidade    | Base Legal | Retenção     | Transfer.            |
| ------------- | ------------- | ---------- | ------------ | -------------------- |
| Email         | Autenticação  | Art. 7º, V | Até exclusão | Não                  |
| Nome          | Identificação | Art. 7º, V | Até exclusão | Não                  |
| Conteúdo ETPs | Geração IA    | Art. 7º, I | Até exclusão | **Sim** (OpenAI-EUA) |

Documentação LGPD:

- [LGPD_DATA_MAPPING.md](./docs/LGPD_DATA_MAPPING.md)
- [LGPD_COMPLIANCE_REPORT.md](./docs/LGPD_COMPLIANCE_REPORT.md)
- [PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md)

**Status**: ✅ **Sistema APROVADO para processamento de dados pessoais**

---

## MONITORAMENTO E ANALYTICS

### Métricas Coletadas (Telemetria)

- Seções com mais dificuldade de preenchimento
- Tempo médio por seção
- Taxa de uso de geração por IA
- Taxa de aceitação de sugestões
- Solicitações de ajuda/tooltips

### Finalidade

- Identificar seções que causam mais dúvida
- Melhorar UX iterativamente
- Otimizar prompts de IA
- Priorizar melhorias de produto

### Privacidade

- ✅ Dados anonimizados
- ✅ Sem PII (Personally Identifiable Information)
- ✅ Agregação estatística apenas
- ✅ Usuário pode opt-out (futura feature)

---

## CONTRIBUINDO

Este é um projeto assistivo para benefício público. Contribuições são bem-vindas!

Para guia completo, consulte: **[CONTRIBUTING.md](./CONTRIBUTING.md)**

### Quick Start para Contribuidores

```bash
# 1. Fork e clone
git clone https://github.com/SEU-USUARIO/etp-express.git
cd "ETP Express"

# 2. Instale dependências
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Crie uma branch (seguir padrão)
git checkout -b feat/123-minha-feature # Para features
git checkout -b fix/456-corrigir-bug # Para bugfixes
git checkout -b docs/789-atualizar-docs # Para docs

# 4. Rode os testes antes de commitar
npm run test:all
```

### Conventional Commits (Obrigatório)

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para histórico padronizado:

| Tipo       | Descrição                                   |
| ---------- | ------------------------------------------- |
| `feat`     | Nova funcionalidade                         |
| `fix`      | Correção de bug                             |
| `docs`     | Apenas documentação                         |
| `test`     | Adição/correção de testes                   |
| `refactor` | Refatoração (sem mudança de funcionalidade) |
| `perf`     | Melhoria de performance                     |
| `chore`    | Tarefas de manutenção (deps, configs)       |
| `security` | Correção de vulnerabilidade                 |

**Formato:** `tipo(escopo): descrição (#issue)`

**Exemplos:**

```bash
git commit -m "feat(backend): add rate limiting to auth endpoints (#42)"
git commit -m "fix(frontend): resolve memory leak in ETP editor (#156)"
git commit -m "docs: update README badges and contributing guide (#36)"
```

### Checklist de PR (Obrigatório)

Antes de abrir um PR, verifique:

- [ ] Branch nomeada corretamente (`feat/`, `fix/`, `docs/`)
- [ ] Commit messages seguem Conventional Commits
- [ ] Testes passando (`npm run test:all`)
- [ ] Lint passando (`npm run lint`)
- [ ] Coverage não diminuiu
- [ ] PR descreve contexto, mudanças e riscos
- [ ] Issue relacionada linkada (`Closes #XX`)

### Rodando Testes

```bash
# Testes Backend (NestJS + Jest)
cd backend
npm test # Unitários
npm run test:e2e # Integração
npm run test:cov # Com coverage (meta: 78%+)

# Testes Frontend (React + Vitest)
cd frontend
npm test # Unitários
npm run test:coverage # Com coverage (meta: 60%+)

# Testes E2E (Playwright)
cd e2e
npm test # Requer frontend rodando em localhost:5173

# Todos os testes
npm run test:all # Na raiz do projeto
```

### Áreas que Precisam de Ajuda

- [ ] Testes de integração para seções 5-13 (#83, #84)
- [ ] UAT sessions com servidores públicos (#92-#95)
- [ ] Prompt externalization para YAML (#215-#218)
- [ ] Templates por órgão/setor
- [ ] Integração com sistemas oficiais (COMPRASNET, PNCP)
- [ ] Traduções (i18n)

---

## LICENÇA

**LICENÇA PROPRIETÁRIA**

Copyright (c) 2025 CONFENGE AVALIAÇÕES E INTELIGÊNCIA ARTIFICIAL LTDA.
TODOS OS DIREITOS RESERVADOS.

Este software é propriedade exclusiva da CONFENGE. É expressamente proibido copiar, modificar, distribuir ou utilizar este software sem autorização prévia e por escrito.

**⚠ DISCLAIMER**: O uso deste sistema é por conta e risco do usuário. A CONFENGE não se responsabiliza por decisões administrativas baseadas nas saídas do sistema.

---

## SUPORTE

### Problemas Técnicos

- Abra uma issue no GitHub
- Consulte a documentação em `/docs`
- Verifique os logs do Railway

### Dúvidas de Uso

- Consulte o README
- Acesse a ajuda contextual no sistema (tooltips)
- Entre em contato com suporte interno do seu órgão

### Melhorias e Sugestões

- Abra uma issue com tag `enhancement`
- Descreva o problema que a feature resolve
- Se possível, sugira uma solução

---

## ROADMAP

**Ultima Atualizacao**: 2025-12-20 | [ROADMAP.md completo](./ROADMAP.md)

### Progresso Global: 91.1% (408/448 issues)

```
M1: ████████████████████ 35/35 (100%) ✅ Foundation
M2: ████████████████████ 18/18 (100%) ✅ CI/CD Pipeline
M3: ████████████████████ 60/60 (100%) ✅ Quality & Security
M4: ████████████████████ 44/44 (100%) ✅ Refactoring & Performance
M5: █████████████████░░░ 25/29 (86%) E2E & Documentation
M6: ██████████████████░░ 77/85 (91%) Maintenance
M7: ████████████████████ 6/6 (100%) ✅ Multi-Tenancy B2G
M8: ████████████████████ 24/24 (100%) ✅ Domain Management
M9: ████████████████████ 16/16 (100%) ✅ Export/Import Sprint
```

### ✅ M1-M4: Foundation, CI/CD, Quality, Performance (100%)

- ✅ 1,879 testes passando (Jest + Vitest + Playwright)
- ✅ Coverage: Backend 78%, Frontend 76%
- ✅ Zero erros TypeScript
- ✅ OWASP Top 10 + LGPD 100%
- ✅ Cache LLM (80% economia)
- ✅ Paralelização 4-5x speedup

### M5: E2E Testing & Documentation (86%)

- ✅ E2E critical flow tests (Playwright)
- ✅ Accessibility tests (WCAG 2.1 AA)
- ✅ Frontend logging service (Sentry)
- ✅ Load testing k6 (100 users)
- [ ] Staged rollout, Production SLA

### M6: Maintenance (91%)

- ✅ Redis + BullMQ async processing
- ✅ Async UX polling frontend
- ✅ UX Enterprise Polish (breadcrumbs, skeleton, confetti)
- ✅ N+1 query fix, LLM cache memory leak fix
- [ ] pgvector migration (#387)

### ✅ M7: Multi-Tenancy B2G (100%)

- ✅ Column-based isolation (organizationId)
- ✅ TenantGuard + RolesGuard
- ✅ Domain whitelist registration
- ✅ Kill switch para organizacoes

### ✅ M8: Domain Management (100%)

- ✅ System Admin dashboard completo
- ✅ Domain CRUD + AssignManager
- ✅ Authorization policies

### ✅ M9: Export/Import (100%)

- ✅ Export DOCX (docx library)
- ✅ Document text extraction (mammoth, pdf-parse)
- ✅ ETPAnalysisService (AI agents)
- ✅ Frontend Import & Analysis page

[ROADMAP.md](./ROADMAP.md) para detalhes completos

---

### Próximas Features (Pós M6)

#### Versão 1.1

- [ ] Templates por órgão/setor
- [ ] Modo colaborativo (múltiplos usuários)
- [ ] Integração com PNCP (Painel Nacional de Contratações Públicas)
- [ ] Upload de documentos anexos
- [ ] Dark mode
- [ ] PWA (Progressive Web App)

#### Versão 2.0

- [ ] Suporte a modelos on-premise (Llama, Mistral)
- [ ] IA híbrida (local + cloud)
- [ ] Workflow de aprovação
- [ ] Assinatura eletrônica
- [ ] Integração com sistemas oficiais (COMPRASNET)
- [ ] API pública
- [ ] Sistema RBAC completo (Roles-Based Access Control)

---

## AGRADECIMENTOS

Este projeto foi criado para auxiliar servidores públicos na elaboração de ETPs conforme a **Lei 14.133/2021**, contribuindo para:

- ✅ Transparência nas contratações públicas
- ✅ Eficiência administrativa
- ✅ Redução de tempo de elaboração
- ✅ Qualidade dos estudos técnicos
- ✅ Democratização do acesso a tecnologias avançadas (IA)

Desenvolvido com para o serviço público brasileiro.

---

**⚠ LEMBRETE FINAL**

Este sistema pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento oficial.

A responsabilidade final é sempre do servidor/agente público responsável.

---

**Ultima atualizacao**: 2025-12-20
**Versao**: 1.0.0 (Production Ready)
**Progresso**: 91.1% (408/448 issues concluidas)
**Milestones**: M1-M4 ✅ | M5 (86%) | M6 (91%) | M7-M9 ✅
