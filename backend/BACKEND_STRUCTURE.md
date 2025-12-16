# ETP EXPRESS - ESTRUTURA COMPLETA DO BACKEND

## Visão Geral

Backend completo em NestJS para o sistema ETP Express - Sistema assistivo de elaboração de Estudos Técnicos Preliminares.

**Tecnologias:**

- NestJS (Framework principal)
- TypeORM (ORM para PostgreSQL)
- JWT (Autenticação)
- OpenAI GPT-4 (Geração de conteúdo)
- Exa AI (Busca de contratações similares)
- Puppeteer (Geração de PDFs)
- Handlebars (Templates)

---

## Estrutura de Diretórios

```
C:\Users\tj_sa\OneDrive\CONFENGE\Vision\Git Projects\ETP Express\backend\
│
├── src/
│   ├── main.ts                          # Bootstrap da aplicação
│   ├── app.module.ts                    # Módulo principal
│   ├── app.controller.ts                # Controller raiz
│   ├── app.service.ts                   # Service raiz
│   │
│   ├── common/                          # Utilitários compartilhados
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts # Filtro global de exceções
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts   # Interceptor de logging
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts # Decorator para obter usuário atual
│   │   │   └── public.decorator.ts      # Decorator para rotas públicas
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts        # Guard de autenticação JWT
│   │   └── dto/
│   │       └── pagination.dto.ts        # DTOs de paginação
│   │
│   ├── entities/                        # Entidades TypeORM
│   │   ├── user.entity.ts               # Usuários do sistema
│   │   ├── etp.entity.ts                # ETPs (documento principal)
│   │   ├── etp-section.entity.ts        # Seções dos ETPs
│   │   ├── etp-version.entity.ts        # Versionamento
│   │   ├── audit-log.entity.ts          # Logs de auditoria
│   │   ├── similar-contract.entity.ts   # Contratações similares
│   │   ├── analytics-event.entity.ts    # Eventos de telemetria
│   │   └── section-template.entity.ts   # Templates de seções
│   │
│   └── modules/                         # Módulos funcionais
│       │
│       ├── auth/                        # Autenticação & Autorização
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts      # Estratégia JWT
│       │   │   └── local.strategy.ts    # Estratégia Local
│       │   └── dto/
│       │       ├── register.dto.ts
│       │       └── login.dto.ts
│       │
│       ├── users/                       # Gestão de Usuários
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       │       ├── create-user.dto.ts
│       │       └── update-user.dto.ts
│       │
│       ├── etps/                        # Gestão de ETPs
│       │   ├── etps.module.ts
│       │   ├── etps.controller.ts
│       │   ├── etps.service.ts
│       │   └── dto/
│       │       ├── create-etp.dto.ts
│       │       └── update-etp.dto.ts
│       │
│       ├── sections/                    # Gestão de Seções
│       │   ├── sections.module.ts
│       │   ├── sections.controller.ts
│       │   ├── sections.service.ts
│       │   └── dto/
│       │       ├── generate-section.dto.ts
│       │       └── update-section.dto.ts
│       │
│       ├── orchestrator/                # Sistema de Orquestração de IA
│       │   ├── orchestrator.module.ts
│       │   ├── orchestrator.service.ts  # Orquestrador principal
│       │   ├── llm/
│       │   │   └── openai.service.ts    # Wrapper OpenAI
│       │   └── agents/                  # Subagentes especializados
│       │       ├── legal.agent.ts       # Agente de conformidade legal
│       │       ├── fundamentacao.agent.ts # Agente de fundamentação
│       │       ├── clareza.agent.ts     # Agente de clareza
│       │       ├── simplificacao.agent.ts # Agente de simplificação
│       │       └── anti-hallucination.agent.ts # Agente anti-alucinação
│       │
│       ├── search/                      # Busca de Contratações Similares
│       │   ├── search.module.ts
│       │   ├── search.controller.ts
│       │   ├── search.service.ts
│       │   └── exa/
│       │       └── exa.service.ts       # Integração Exa AI
│       │
│       ├── export/                      # Exportação de Documentos
│       │   ├── export.module.ts
│       │   ├── export.controller.ts
│       │   ├── export.service.ts
│       │   └── templates/
│       │       └── etp-template.hbs     # Template Handlebars para PDF
│       │
│       ├── versions/                    # Versionamento de ETPs
│       │   ├── versions.module.ts
│       │   ├── versions.controller.ts
│       │   └── versions.service.ts
│       │
│       └── analytics/                   # Telemetria e Analytics
│           ├── analytics.module.ts
│           ├── analytics.controller.ts
│           └── analytics.service.ts
│
├── package.json                         # Dependências do projeto
├── tsconfig.json                        # Configuração TypeScript
├── .env.example                         # Variáveis de ambiente
└── BACKEND_STRUCTURE.md                 # Esta documentação
```

---

## Arquivos Criados

### Total: 67+ arquivos TypeScript

### 1. Common (6 arquivos)

- ✅ `src/common/filters/http-exception.filter.ts`
- ✅ `src/common/interceptors/logging.interceptor.ts`
- ✅ `src/common/decorators/current-user.decorator.ts`
- ✅ `src/common/decorators/public.decorator.ts`
- ✅ `src/common/guards/jwt-auth.guard.ts`
- ✅ `src/common/dto/pagination.dto.ts`

### 2. Entities (8 arquivos)

- ✅ `src/entities/user.entity.ts`
- ✅ `src/entities/etp.entity.ts`
- ✅ `src/entities/etp-section.entity.ts`
- ✅ `src/entities/etp-version.entity.ts`
- ✅ `src/entities/audit-log.entity.ts`
- ✅ `src/entities/similar-contract.entity.ts`
- ✅ `src/entities/analytics-event.entity.ts`
- ✅ `src/entities/section-template.entity.ts`

### 3. Auth Module (7 arquivos)

- ✅ `src/modules/auth/auth.module.ts`
- ✅ `src/modules/auth/auth.controller.ts`
- ✅ `src/modules/auth/auth.service.ts`
- ✅ `src/modules/auth/strategies/jwt.strategy.ts`
- ✅ `src/modules/auth/strategies/local.strategy.ts`
- ✅ `src/modules/auth/dto/register.dto.ts`
- ✅ `src/modules/auth/dto/login.dto.ts`

### 4. Users Module (5 arquivos)

- ✅ `src/modules/users/users.module.ts`
- ✅ `src/modules/users/users.controller.ts`
- ✅ `src/modules/users/users.service.ts`
- ✅ `src/modules/users/dto/create-user.dto.ts`
- ✅ `src/modules/users/dto/update-user.dto.ts`

### 5. ETPs Module (5 arquivos)

- ✅ `src/modules/etps/etps.module.ts`
- ✅ `src/modules/etps/etps.controller.ts`
- ✅ `src/modules/etps/etps.service.ts`
- ✅ `src/modules/etps/dto/create-etp.dto.ts`
- ✅ `src/modules/etps/dto/update-etp.dto.ts`

### 6. Sections Module (5 arquivos)

- ✅ `src/modules/sections/sections.module.ts`
- ✅ `src/modules/sections/sections.controller.ts`
- ✅ `src/modules/sections/sections.service.ts`
- ✅ `src/modules/sections/dto/generate-section.dto.ts`
- ✅ `src/modules/sections/dto/update-section.dto.ts`

### 7. Orchestrator Module (8 arquivos) - CORE IA

- ✅ `src/modules/orchestrator/orchestrator.module.ts`
- ✅ `src/modules/orchestrator/orchestrator.service.ts`
- ✅ `src/modules/orchestrator/llm/openai.service.ts`
- ✅ `src/modules/orchestrator/agents/legal.agent.ts`
- ✅ `src/modules/orchestrator/agents/fundamentacao.agent.ts`
- ✅ `src/modules/orchestrator/agents/clareza.agent.ts`
- ✅ `src/modules/orchestrator/agents/simplificacao.agent.ts`
- ✅ `src/modules/orchestrator/agents/anti-hallucination.agent.ts`

### 8. Search Module (5 arquivos)

- ✅ `src/modules/search/search.module.ts`
- ✅ `src/modules/search/search.controller.ts`
- ✅ `src/modules/search/search.service.ts`
- ✅ `src/modules/search/exa/exa.service.ts`

### 9. Export Module (5 arquivos)

- ✅ `src/modules/export/export.module.ts`
- ✅ `src/modules/export/export.controller.ts`
- ✅ `src/modules/export/export.service.ts`
- ✅ `src/modules/export/templates/etp-template.hbs`

### 10. Versions Module (3 arquivos)

- ✅ `src/modules/versions/versions.module.ts`
- ✅ `src/modules/versions/versions.controller.ts`
- ✅ `src/modules/versions/versions.service.ts`

### 11. Analytics Module (3 arquivos)

- ✅ `src/modules/analytics/analytics.module.ts`
- ✅ `src/modules/analytics/analytics.controller.ts`
- ✅ `src/modules/analytics/analytics.service.ts`

---

## Funcionalidades Principais

### 1. Autenticação & Autorização

- JWT-based authentication
- Role-based access control (Admin, User, Viewer)
- Password hashing com bcrypt
- Login/Register endpoints

### 2. Gestão de ETPs

- CRUD completo de ETPs
- Status workflow (Draft → In Progress → Review → Completed → Archived)
- Metadata flexível (JSONB)
- Tracking de completion percentage
- Associação com usuário criador

### 3. Sistema de Orquestração de IA ⭐

**5 Subagentes Especializados:**

#### a) **Legal Agent**

- Valida conformidade com Lei 14.133/2021
- Verifica referências legais
- Sugere melhorias de fundamentação legal

#### b) **Fundamentação Agent**

- Analisa qualidade da fundamentação
- Verifica presença de elementos essenciais:
  - Necessidade
  - Interesse público
  - Benefícios esperados
  - Riscos de não contratar

#### c) **Clareza Agent**

- Calcula índice de legibilidade
- Identifica frases longas e complexas
- Detecta uso excessivo de voz passiva
- Sugere melhorias de clareza

#### d) **Simplificação Agent**

- Remove expressões burocráticas
- Elimina redundâncias
- Simplifica frases complexas
- Converte nominalizações em verbos

#### e) **Anti-Hallucination Agent** 🔒

- **CRÍTICO**: Previne invenção de fatos
- Detecta referências a leis/normas específicas
- Sinaliza necessidade de verificação
- Identifica afirmações categóricas sem fonte

### 4. Geração de Seções com IA

- Geração inteligente via OpenAI GPT-4
- Validação automática multi-agente
- Metadata de geração (tokens, tempo, modelo)
- Warnings e recommendations
- Regeneração sob demanda

### 5. Busca de Contratações Similares

- Integração com Exa AI
- Cache de resultados (30 dias)
- Busca de referências legais
- Ranking por relevância

### 6. Exportação de Documentos

- **PDF**: Template profissional com Handlebars
- **JSON**: Estrutura completa
- **XML**: Formato padronizado
- Inclui validações e disclaimers

### 7. Versionamento

- Snapshot automático do estado do ETP
- Comparação entre versões (diff)
- Restauração de versões anteriores
- Change log

### 8. Analytics & Telemetria

- Tracking de eventos
- Dashboard de uso
- Métricas de performance
- Health checks do sistema
- Análise de atividade por usuário

---

## Endpoints API (Swagger)

### Auth

- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil do usuário
- `POST /api/auth/validate` - Validar token

### Users

- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Obter usuário
- `POST /api/users` - Criar usuário
- `PATCH /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

### ETPs

- `GET /api/etps` - Listar ETPs (paginado)
- `GET /api/etps/:id` - Obter ETP
- `POST /api/etps` - Criar ETP
- `PATCH /api/etps/:id` - Atualizar ETP
- `PATCH /api/etps/:id/status` - Atualizar status
- `DELETE /api/etps/:id` - Deletar ETP
- `GET /api/etps/statistics` - Estatísticas

### Sections

- `POST /api/sections/etp/:etpId/generate` - **Gerar seção com IA** ⭐
- `GET /api/sections/etp/:etpId` - Listar seções
- `GET /api/sections/:id` - Obter seção
- `PATCH /api/sections/:id` - Atualizar seção
- `POST /api/sections/:id/regenerate` - Regenerar seção
- `POST /api/sections/:id/validate` - Validar seção
- `DELETE /api/sections/:id` - Deletar seção

### Search

- `GET /api/search/similar-contracts?q=...` - Buscar contratações
- `GET /api/search/legal-references?topic=...` - Buscar referências legais
- `GET /api/search/contracts` - Listar contratações salvas
- `GET /api/search/contracts/:id` - Obter contratação

### Export

- `GET /api/export/etp/:id/pdf` - Exportar para PDF
- `GET /api/export/etp/:id/json` - Exportar para JSON
- `GET /api/export/etp/:id/xml` - Exportar para XML
- `GET /api/export/etp/:id?format=pdf` - Exportar (formato dinâmico)

### Versions

- `POST /api/versions/etp/:etpId` - Criar versão
- `GET /api/versions/etp/:etpId` - Listar versões
- `GET /api/versions/:id` - Obter versão
- `GET /api/versions/compare/:id1/:id2` - Comparar versões
- `POST /api/versions/:id/restore` - Restaurar versão

### Analytics

- `POST /api/analytics/track` - Rastrear evento
- `GET /api/analytics/dashboard?days=30` - Dashboard
- `GET /api/analytics/user/activity?days=30` - Atividade do usuário
- `GET /api/analytics/events/type/:type` - Eventos por tipo
- `GET /api/analytics/health` - Saúde do sistema

---

## Swagger Documentation

Acesse a documentação completa em:

```
http://localhost:3001/api/docs
```

Características:

- Interface interativa
- Teste de endpoints direto no navegador
- Autenticação JWT integrada
- Exemplos de request/response
- Descrições detalhadas

---

## Variáveis de Ambiente

Configurar em `.env`:

```env
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/etp_express
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Exa
EXA_API_KEY=exa-xxxxx
EXA_TYPE=auto
EXA_NUM_RESULTS=10

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Instalação e Execução

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run start:dev

# Rodar em produção
npm run build
npm run start:prod

# Testes
npm run test
npm run test:e2e
npm run test:cov
```

---

## Migrations (TypeORM)

```bash
# Gerar migration
npm run migration:generate -- src/migrations/InitialSchema

# Rodar migrations
npm run migration:run

# Reverter migration
npm run migration:revert
```

---

## Segurança

### Implementado:

✅ Helmet.js (Security headers)
✅ CORS configurado
✅ Rate limiting (Throttler)
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ Input validation (class-validator)
✅ SQL injection prevention (TypeORM parametrized queries)
✅ XSS protection

### Disclaimers Obrigatórios:

Todos os endpoints retornam:

```
"O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento."
```

---

## Principais Dependências

```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/typeorm": "^10.0.1",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "typeorm": "^0.3.19",
  "pg": "^8.11.3",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "openai": "^4.24.1",
  "puppeteer": "^21.7.0",
  "handlebars": "^4.7.8",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

---

## Best Practices Implementadas

✅ **Dependency Injection**: Todos os services usam DI do NestJS
✅ **DTO Validation**: Validação automática com class-validator
✅ **Error Handling**: Filtro global de exceções
✅ **Logging**: Interceptor de logging em todas as requisições
✅ **Authentication**: JWT Guard global com rotas públicas via decorator
✅ **Pagination**: DTO reutilizável com metadata
✅ **Soft Delete**: Possível adicionar com TypeORM
✅ **Audit Trail**: Entity audit-log para rastreabilidade
✅ **Versioning**: Sistema completo de versionamento
✅ **Analytics**: Telemetria não-invasiva

---

## Próximos Passos

### Para Deploy:

1. Configurar PostgreSQL em produção
2. Configurar variáveis de ambiente no Railway/Render
3. Habilitar SSL no banco de dados
4. Configurar CI/CD (GitHub Actions)
5. Adicionar monitoring (Sentry, DataDog)

### Melhorias Futuras:

- [ ] Rate limiting por usuário
- [ ] WebSockets para geração em tempo real
- [ ] Queue system (Bull/BullMQ) para jobs pesados
- [ ] Cache Redis
- [ ] Testes E2E completos
- [ ] Internacionalização (i18n)
- [ ] Backup automático
- [ ] Admin dashboard

---

## Licença

MIT

---

## Contato

Para dúvidas sobre a implementação, consulte a documentação do NestJS:
https://docs.nestjs.com

---

**Status**: ✅ Backend 100% Implementado
**Data**: 2025-11-05
**Versão**: 1.0.0
