# Frontend/API UX Specification - ETP Express

## Visao Geral

O ETP Express e um **monorepo full-stack** composto por:

- **Backend**: NestJS (TypeScript) com API REST versionada (`/api/v1`)
- **Frontend**: React 18 + Vite + TailwindCSS + Radix UI + Zustand + React Query
- **E2E**: Playwright com testes de acessibilidade (axe-core)

O frontend e uma SPA rica com ~30 paginas, code splitting via `React.lazy`, design system proprio baseado em Radix UI primitives, e sistema de temas (light/dark) com design tokens CSS.

---

## Arquitetura Frontend

### Stack Tecnologica
| Camada | Tecnologia |
|--------|------------|
| Framework | React 18 (SPA) |
| Bundler | Vite 7 |
| Roteamento | React Router 7 (createBrowserRouter) |
| Estado Global | Zustand (persist middleware) |
| Estado Servidor | TanStack React Query |
| Formularios | React Hook Form + Zod |
| UI Primitives | Radix UI (dialog, tabs, select, toast, tooltip, etc.) |
| Estilizacao | TailwindCSS 3.4 + CVA (class-variance-authority) |
| Rich Text | TipTap |
| Graficos | Recharts |
| Icones | Lucide React |
| HTTP | Axios (httpOnly cookie auth) |
| Testes | Vitest + Testing Library + MSW |
| Mutation Testing | Stryker |
| Acessibilidade | axe-core, vitest-axe, eslint-plugin-jsx-a11y |
| Monitoramento | Sentry |

### Estrutura de Diretorios
```
frontend/src/
  components/     # Componentes reutilizaveis (ui/, common/, auth/, etp/, etc.)
  pages/          # Paginas (rotas)
  hooks/          # Custom hooks (~50+ hooks)
  store/          # Zustand stores (~12 stores)
  lib/            # Utilitarios (api, constants, errors, logger, navigation)
  types/          # TypeScript types/interfaces
  styles/         # Design tokens CSS
  assets/         # Ilustracoes SVG
```

### Paginas Principais
| Rota | Pagina | Protecao |
|------|--------|----------|
| `/login`, `/register` | Auth | Public (redirect se autenticado) |
| `/dashboard` | Dashboard | Autenticado |
| `/etps` | Lista de ETPs | Autenticado |
| `/etps/new` | Wizard criacao ETP | Autenticado |
| `/etps/:id` | Editor ETP | Autenticado |
| `/trs/:id` | Editor Termo Referencia | Autenticado |
| `/pesquisa-precos/new` | Wizard Pesquisa Precos | Autenticado |
| `/analytics/market` | Dashboard Market Intelligence | Autenticado |
| `/editais/:id/edit` | Editor Edital | Autenticado |
| `/contratos/dashboard` | Dashboard Contratos | Autenticado |
| `/contracts/:id/fiscalizacao` | Fiscalizacao | Autenticado |
| `/admin/*` | Painel Admin | Admin only |
| `/manager/*` | Painel Gestor | Manager only |

---

## API Design Analysis

### Convencoes REST
- **Versionamento**: URI-based (`/api/v1/`)
- **Prefixo global**: `/api`
- **Autenticacao**: httpOnly cookie (JWT) para API interna + API Key (`X-API-Key`) para API publica de precos
- **Content-Type**: `application/json`
- **CORS**: Configurado com `credentials: true`, origins controladas por env var
- **Body limit**: 10MB (protecao contra payloads grandes)
- **Timeout cliente**: 30s (Axios)

### Swagger/OpenAPI
- Configurado com `DocumentBuilder` (titulo, descricao, tags, versao)
- **Tags organizadas**: auth, etps, sections, versions, export, search, analytics, Public API - Prices
- **Seguranca**: Bearer Auth (JWT) + API Key
- **Desabilitado em producao** (seguranca)
- Acessivel em `/api/docs` em dev/staging

### Validacao (Backend)
- **ValidationPipe global** com `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- DTOs usam `class-validator` com mensagens em **portugues**: `"Senha deve ter no minimo 8 caracteres"`
- Decoradores Swagger (`@ApiProperty`, `@ApiPropertyOptional`) com examples e descriptions
- ~65 DTOs cobrindo todos os modulos

---

## DTO & Validation Patterns

### Backend (class-validator + Swagger)
```typescript
// Exemplo: RegisterDto
@ApiProperty({ example: 'usuario@exemplo.gov.br' })
@IsEmail()
email: string;

@ApiProperty({ minLength: 8, maxLength: 128 })
@MinLength(8, { message: 'Senha deve ter no minimo 8 caracteres' })
@Matches(/regex/, { message: 'Senha deve conter: maiuscula, minuscula, numero e especial' })
password: string;
```

### Frontend (Zod + React Hook Form)
- Validacao client-side com Zod schemas
- Mensagens de validacao centralizadas em `lib/constants.ts`:
  ```typescript
  VALIDATION_MESSAGES = {
    REQUIRED_FIELD: 'Este campo e obrigatorio',
    INVALID_EMAIL: 'Email invalido',
    PASSWORD_MIN_LENGTH: 'A senha deve ter no minimo 6 caracteres',
    // ...
  }
  ```
- **Inconsistencia detectada**: Frontend valida senha com minimo 6 chars, backend exige 8 chars

### Paginacao
- DTO padrao `PaginationDto` com `page` (min 1) e `limit` (min 1, max 100)
- Resposta padronizada `PaginatedResult<T>`:
  ```json
  {
    "data": [...],
    "meta": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 },
    "disclaimer": "..."
  }
  ```
- Frontend define tipo `PaginatedResponse<T>` com campo `pagination` (nao `meta`)

---

## Error Handling

### Backend - HttpExceptionFilter
Formato padrao de resposta de erro:
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/etps",
  "method": "POST",
  "message": "Mensagem do erro",
  "disclaimer": "..."
}
```
- Captura **todas** as exceptions (`@Catch()`)
- Inclui `disclaimer` legal em todas as respostas de erro
- Logging estruturado com stack trace

### Frontend - Sistema de Erros em Camadas
1. **Interceptor Axios**: Trata 401 (redirect login), erros de rede, erros de validacao (400)
2. **HTTP_ERROR_MESSAGES**: Mapeamento status code -> mensagem amigavel em PT-BR (400-504)
3. **ERROR_PATTERNS**: Regex matching para erros tecnicos -> mensagens amigaveis (network, CORS, timeout, DB, AI services)
4. **Auth Error Codes**: Codigos estruturados (`INVALID_CREDENTIALS`, `USER_INACTIVE`, `ACCOUNT_LOCKED`, etc.)
5. **API Health Check**: Diagnostico de conectividade com API (`checkApiHealth()`)
6. **ErrorBoundary**: Componente React class para erros de renderizacao
7. **Filtro de mensagens tecnicas**: `isUserFriendlyMessage()` previne exposicao de stack traces

### Pontos Fortes
- Mensagens 100% em portugues
- Erros contextuais (`getContextualErrorMessage('carregar', 'ETPs', error)`)
- Diagnostico de saude da API
- Tratamento especifico para servicos de IA e busca (Exa, OpenAI)
- Rate limiting com mensagem amigavel

---

## Response Patterns

### Paginacao
- Backend: `{ data: T[], meta: { total, page, limit, totalPages }, disclaimer }`
- Frontend espera: `{ data: T[], pagination: { page, limit, total, totalPages } }`
- **Inconsistencia**: campo `meta` (backend) vs `pagination` (frontend type)

### Filtros e Busca
- Frontend define `QueryParams`: `{ page, limit, sort, order, search, filters }`
- Suporte a ordenacao (`asc`/`desc`)
- Busca textual via `search`
- Filtros genericos via `Record<string, unknown>`

### Status de ETPs
- Workflow: `draft` -> `in_progress` -> `review` -> `completed`
- Labels e cores centralizados em `constants.ts`
- Cores seguem Apple HIG 2025 Semantic Colors com suporte dark mode

---

## Acessibilidade (a11y)

### Implementacao Atual
- **SkipLink**: Componente para pular navegacao (WCAG 2.4.1)
- **ARIA attributes**: `role="status"`, `aria-label` em EmptyState e outros componentes
- **eslint-plugin-jsx-a11y**: Linting de acessibilidade
- **axe-core**: Testes automatizados de a11y (e2e + vitest-axe)
- **Testes de touch targets**: Validacao de tamanhos minimos para toque
- **Design tokens CSS**: Variaveis CSS para temas (light/dark)
- **Focus management**: Tratamento de foco em SkipLink e modais

### Lacunas Identificadas
- SkipLink nao esta integrado no `RootLayout` (App.tsx)
- Label do SkipLink em ingles ("Skip to main content") enquanto app e PT-BR
- Sem `<main id="main-content">` visivel no layout principal

---

## Seguranca Frontend

- **httpOnly cookies**: JWT nunca acessivel via JavaScript (previne XSS)
- **Zustand persist**: Apenas dados nao-sensiveis do usuario (nome, email, role)
- **Sentry**: Monitoramento com user context (sem dados sensiveis)
- **Logger estruturado**: Breadcrumbs para depuracao
- **LGPD**: Consentimento obrigatorio no registro (lgpdConsent + internationalTransferConsent)
- **Helmet**: Headers de seguranca no backend
- **Rate limiting**: Protecao contra brute force com mensagem amigavel

---

## Technical Debts

| ID | Debt | Severidade | Descricao |
|----|------|------------|-----------|
| TD-01 | Inconsistencia validacao senha | **Alta** | Frontend valida minimo 6 chars (`constants.ts` L56), backend exige 8 chars (`register.dto.ts`). Usuario pode preencher formulario com senha invalida para o backend. |
| TD-02 | Inconsistencia tipo paginacao | **Media** | Frontend `PaginatedResponse` usa campo `pagination`, backend `PaginatedResult` usa campo `meta`. Pode causar bugs de integracao. |
| TD-03 | SkipLink nao integrado | **Media** | Componente `SkipLink` existe mas nao esta no `RootLayout`/`App.tsx`. Sem `<main id="main-content">`. WCAG 2.4.1 parcialmente cumprido. |
| TD-04 | SkipLink em ingles | **Baixa** | Label "Skip to main content" deveria ser "Pular para o conteudo principal" para consistencia com o idioma do app. |
| TD-05 | Swagger desabilitado em producao | **Baixa** | Decisao intencional de seguranca, mas dificulta integracao por terceiros. Considerar endpoint separado com autenticacao ou documentacao estatica. |
| TD-06 | ErrorBoundary sem Sentry | **Baixa** | `ErrorBoundary.componentDidCatch` usa `logger.error` que integra com Sentry, mas nao tem `Sentry.withScope` para contexto adicional. Ja funcional via logger. |
| TD-07 | Disclaimer em todas as respostas | **Info** | Tanto respostas de sucesso (paginacao) quanto erro incluem disclaimer legal. Overhead de payload pequeno mas constante. |

---

## Recomendacoes (por prioridade)

### 1. [Alta] Alinhar validacao de senha frontend/backend
Atualizar `VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH` de 6 para 8 caracteres e adicionar validacao de complexidade no Zod schema do frontend para match com o backend regex.

### 2. [Media] Alinhar tipo de resposta paginada
Unificar `PaginatedResponse` (frontend) com `PaginatedResult` (backend) - usar mesmo nome de campo (`meta` ou `pagination`). Verificar se os hooks ja fazem o mapeamento correto.

### 3. [Media] Integrar SkipLink no layout
Adicionar `<SkipLink />` no `RootLayout` (App.tsx) e `id="main-content"` no `<main>` do layout. Traduzir label para PT-BR.

### 4. [Baixa] Publicar documentacao API estatica
Gerar OpenAPI JSON em CI e publicar como pagina estatica (Redoc ou SwaggerUI standalone) para permitir integracao por terceiros sem expor Swagger em producao.

### 5. [Baixa] Adicionar testes de acessibilidade por pagina
Expandir testes axe-core do e2e para cobrir todas as paginas principais, nao apenas as atualmente testadas.
