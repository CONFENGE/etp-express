# 🚀 ETP EXPRESS

> **⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.**

Sistema assistivo para elaboração de **Estudos Técnicos Preliminares (ETP)** conforme **Lei 14.133/2021** (Nova Lei de Licitações e Contratos), utilizando IA generativa com orquestração de subagentes especializados.

---

## 📋 SOBRE O PROJETO

O **ETP Express** é um **wrapper de LLM** (Large Language Model) projetado para auxiliar servidores públicos, consultores e agentes de contratação na elaboração de Estudos Técnicos Preliminares, conforme exigido pelo **Art. 18 §1º da Lei 14.133/2021**.

### ⚡ Diferenciais

- **Sistema de Subagentes**: 5 agentes especializados trabalhando em pipeline
- **Anti-Hallucination**: Mitigação ativa de alucinações e invenção de fatos
- **Busca Inteligente**: Integração com Perplexity AI para contratações similares
- **Versionamento Completo**: Histórico com diff e restauração de versões
- **Export Profissional**: PDF, JSON e XML com disclaimers obrigatórios
- **Analytics de UX**: Telemetria para melhoria contínua

### 🎯 Funcionalidades Core

1. ✅ Formulário guiado para preenchimento das 13 seções do ETP
2. ✅ Geração assistida por IA (GPT-4) com validação multi-agente
3. ✅ Busca de contratações similares para fundamentação
4. ✅ Versionamento e trilha de auditoria completos
5. ✅ Exportação em PDF (com aviso destacado), JSON e XML
6. ✅ Validação obrigatória de seções mínimas (I, IV, VI, VIII, XIII)
7. ✅ Interface moderna, responsiva e acessível (WCAG 2.1 AA)

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    ETP EXPRESS - STACK                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (React + TypeScript)                               │
│  ├── Vite 5                                                  │
│  ├── Tailwind CSS + shadcn/ui                                │
│  ├── Zustand (state)                                         │
│  └── React Hook Form + Zod                                   │
│                                                               │
│  Backend (NestJS + TypeScript)                               │
│  ├── TypeORM + PostgreSQL                                    │
│  ├── OpenAI GPT-4 (geração)                                  │
│  ├── Perplexity AI (busca)                                   │
│  ├── Puppeteer (PDF)                                         │
│  └── JWT Auth                                                │
│                                                               │
│  Deploy (Railway)                                            │
│  ├── PostgreSQL Database                                     │
│  ├── Backend Service                                         │
│  └── Frontend Service                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Sistema de Subagentes (IA)

```
User Input
    ↓
Orchestrator
    ↓
┌─────────────────────┐
│ 1. Legal Agent      │ → Valida coerência legal (Lei 14.133)
├─────────────────────┤
│ 2. Fundamentação    │ → Busca contratações similares
├─────────────────────┤
│ 3. Clareza          │ → Revisa legibilidade (Flesch index)
├─────────────────────┤
│ 4. Simplificação    │ → Remove jargão burocrático
├─────────────────────┤
│ 5. Anti-Hallucination│ → Previne invenção de fatos
└─────────────────────┘
    ↓
Generated Content + Warnings + References
```

---

## 🚀 QUICK START

### Pré-requisitos

- Node.js 20+ LTS
- PostgreSQL 15+
- OpenAI API Key
- Perplexity API Key

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

---

## 🐳 DESENVOLVIMENTO LOCAL COM DOCKER (RECOMENDADO)

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

| Serviço          | URL                          | Descrição                |
|------------------|------------------------------|--------------------------|
| **Frontend**     | http://localhost:5173        | Interface do usuário     |
| **Backend API**  | http://localhost:3001        | API REST                 |
| **API Docs**     | http://localhost:3001/api/docs | Swagger Documentation |
| **PostgreSQL**   | localhost:5432               | Database (interno)       |

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

| Variável              | Descrição                              | Exemplo                          |
|-----------------------|----------------------------------------|----------------------------------|
| `OPENAI_API_KEY`      | OpenAI API Key (obrigatória)           | `sk-proj-...`                    |
| `POSTGRES_PASSWORD`   | Senha do PostgreSQL                    | `<auto-gerado por setup-local>`  |
| `JWT_SECRET`          | Secret para assinatura de tokens JWT  | `<auto-gerado por setup-local>`  |

**Variáveis OPCIONAIS:**

| Variável              | Descrição                              | Default                          |
|-----------------------|----------------------------------------|----------------------------------|
| `PERPLEXITY_API_KEY`  | Perplexity API (busca avançada)        | ` ` (disabled)                   |
| `SENTRY_DSN`          | Sentry error tracking                  | ` ` (disabled)                   |
| `NODE_ENV`            | Node environment                       | `development`                    |
| `BACKEND_PORT`        | Backend port                           | `3001`                           |
| `FRONTEND_PORT`       | Frontend port                          | `5173`                           |

**Validação:**

```bash
# Validar .env antes de iniciar
bash scripts/validate-env.sh

# Output:
# ✓ All validations passed!
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

## 📦 DEPLOY EM PRODUÇÃO (RAILWAY)

Consulte o guia completo: **[DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)**

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

**URLs de exemplo**:

- Backend: `https://etp-express-backend.up.railway.app`
- Frontend: `https://etp-express-frontend.up.railway.app`
- Swagger: `https://etp-express-backend.up.railway.app/api/docs`

---

## 📚 ESTRUTURA DO PROJETO

```
ETP Express/
├── docs/                       # Documentação adicional
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── common/            # Filters, Guards, Decorators
│   │   ├── config/            # Configurações
│   │   ├── entities/          # Entidades TypeORM
│   │   └── modules/
│   │       ├── auth/          # Autenticação
│   │       ├── users/         # Usuários
│   │       ├── etps/          # ETPs
│   │       ├── sections/      # Seções
│   │       ├── orchestrator/  # ⭐ Sistema de IA
│   │       ├── search/        # Busca Perplexity
│   │       ├── export/        # Exportação PDF/JSON/XML
│   │       ├── versions/      # Versionamento
│   │       └── analytics/     # Telemetria
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Header, Sidebar, Layout
│   │   │   ├── etp/          # Componentes de ETP
│   │   │   ├── common/       # WarningBanner, Loading, etc
│   │   │   └── search/       # Busca e referências
│   │   ├── pages/            # Páginas principais
│   │   ├── store/            # Zustand stores
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # API client, utils
│   │   └── types/            # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── ARCHITECTURE.md             # Arquitetura completa
├── DATABASE_SCHEMA.sql         # Schema PostgreSQL
├── DEPLOY_RAILWAY.md           # Guia de deploy
├── README.md                   # Este arquivo
└── railway.json                # Config Railway
```

---

## 🔑 VARIÁVEIS DE AMBIENTE

### Backend (.env)

```bash
# Essenciais
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-aqui
OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...

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

## 🛠️ COMANDOS ÚTEIS

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

## 📖 DOCUMENTAÇÃO

| Documento                                                      | Descrição                                            |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                           | Arquitetura completa do sistema                      |
| [docs/INFRASTRUCTURE.md](./docs/INFRASTRUCTURE.md)             | 🏗️ **Infrastructure as Code - Docker, Railway, DR**  |
| [DEPLOY.md](./DEPLOY.md)                                       | Guia de deploy em produção (Railway)                 |
| [docs/INCIDENT_RESPONSE.md](./docs/INCIDENT_RESPONSE.md)       | 🚨 **Playbook de resposta a incidentes em produção** |
| [docs/ZERO_DOWNTIME_DEPLOY.md](./docs/ZERO_DOWNTIME_DEPLOY.md) | Estratégia de deploy sem downtime                    |
| [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)                 | Backup e disaster recovery procedures                |
| [docs/MONITORING.md](./docs/MONITORING.md)                     | Monitoramento e alertas com Sentry                   |
| [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql)                   | Schema completo do banco                             |
| [backend/README.md](./backend/README.md)                       | Documentação do backend                              |
| [frontend/README.md](./frontend/README.md)                     | Documentação do frontend                             |

---

## 🎓 GUIA DE USO

### Para Servidores Públicos

1. **Criar Conta**: Registre-se com email institucional
2. **Novo ETP**: Clique em "Criar ETP" e preencha título e objeto
3. **Preencher Seções**: Navegue pelas 13 seções usando as tabs
4. **Usar IA**: Clique em "Gerar com IA" para sugestões automáticas
5. **Revisar Criticamente**: ⚠️ **SEMPRE** revise antes de aceitar
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

## ⚠️ AVISOS IMPORTANTES

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

## 🔒 SEGURANÇA E PRIVACIDADE

### Dados Processados

- ✅ Armazenados em PostgreSQL (criptografado em trânsito)
- ✅ Autenticação via JWT
- ✅ Validação de inputs (class-validator)
- ✅ Rate limiting configurado
- ✅ CORS restrito
- ✅ Backups automáticos (Railway)

### Dados Enviados para APIs Externas

**OpenAI GPT-4**:

- Conteúdo das seções para geração
- Contexto do ETP (título, objeto)
- **NÃO** enviamos dados sensíveis (CPFs, CNPJs, valores exatos)

**Perplexity AI**:

- Queries de busca de contratações similares
- Termos de pesquisa (objeto da contratação)

### Compliance

- ✅ LGPD-friendly (dados podem ser exportados/deletados)
- ✅ Logs sanitizados (sem tokens, senhas)
- ✅ Analytics anonimizado
- ✅ Trilha de auditoria completa

---

## 📊 MONITORAMENTO E ANALYTICS

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

## 🤝 CONTRIBUINDO

Este é um projeto assistivo para benefício público. Contribuições são bem-vindas!

### Como Contribuir

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Minha feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Áreas que precisam de ajuda

- [ ] Testes unitários e E2E
- [ ] Melhorias de UX
- [ ] Otimização de prompts de IA
- [ ] Integração com sistemas oficiais (COMPRASNET, PNCP)
- [ ] Templates por órgão/setor
- [ ] Documentação de uso
- [ ] Traduções (i18n)

---

## 📝 LICENÇA

Este projeto é open-source sob licença **MIT**.

Pode ser usado, modificado e distribuído livremente, inclusive para fins comerciais, desde que mantida a atribuição aos autores originais.

**⚠️ DISCLAIMER**: O uso deste sistema é por conta e risco do usuário. Os autores não se responsabilizam por decisões administrativas baseadas nas saídas do sistema.

---

## 📞 SUPORTE

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

## 🎯 ROADMAP

### Versão 1.0 (Atual) ✅

- [x] Core: Formulário + LLM + PDF
- [x] Busca de contratações similares
- [x] Versionamento completo
- [x] Autenticação de usuários
- [x] Deploy na Railway

### Versão 1.1 (Próxima)

- [ ] Templates por órgão/setor
- [ ] Modo colaborativo (múltiplos usuários)
- [ ] Integração com PNCP (Painel Nacional de Contratações Públicas)
- [ ] Upload de documentos anexos
- [ ] Dark mode
- [ ] PWA (Progressive Web App)

### Versão 2.0 (Futuro)

- [ ] Suporte a modelos on-premise (Llama, Mistral)
- [ ] IA híbrida (local + cloud)
- [ ] Workflow de aprovação
- [ ] Assinatura eletrônica
- [ ] Integração com sistemas oficiais
- [ ] API pública

---

## 🌟 AGRADECIMENTOS

Este projeto foi criado para auxiliar servidores públicos na elaboração de ETPs conforme a **Lei 14.133/2021**, contribuindo para:

- ✅ Transparência nas contratações públicas
- ✅ Eficiência administrativa
- ✅ Redução de tempo de elaboração
- ✅ Qualidade dos estudos técnicos
- ✅ Democratização do acesso a tecnologias avançadas (IA)

Desenvolvido com ❤️ para o serviço público brasileiro.

---

**⚠️ LEMBRETE FINAL**

Este sistema pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento oficial.

A responsabilidade final é sempre do servidor/agente público responsável.

---

**Última atualização**: 2025-11-12
**Versão**: 0.1.0 (Core MVP)
**Progresso**: 32% (25/77 issues concluídas)
