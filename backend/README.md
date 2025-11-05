# ETP Express - Backend API

Backend NestJS para o sistema ETP Express - Sistema assistivo de elaboração de Estudos Técnicos Preliminares conforme Lei 14.133/2021.

## Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Rodar o servidor de desenvolvimento
npm run start:dev

# 4. Acessar documentação Swagger
# http://localhost:3001/api/docs
```

## Principais Tecnologias

- **NestJS** - Framework Node.js
- **TypeORM** - ORM para PostgreSQL
- **OpenAI GPT-4** - Geração de conteúdo
- **Perplexity AI** - Busca web inteligente
- **Puppeteer** - Geração de PDFs
- **JWT** - Autenticação

## Estrutura do Projeto

```
src/
├── common/          # Utilitários compartilhados
├── entities/        # Entidades TypeORM
└── modules/         # Módulos funcionais
    ├── auth/        # Autenticação
    ├── users/       # Usuários
    ├── etps/        # ETPs
    ├── sections/    # Seções
    ├── orchestrator/ # Sistema de IA com 5 subagentes
    ├── search/      # Busca de contratações
    ├── export/      # Exportação (PDF/JSON/XML)
    ├── versions/    # Versionamento
    └── analytics/   # Telemetria
```

## Sistema de Orquestração de IA

O coração do sistema é o **OrchestratorService** que coordena 5 agentes especializados:

### 1. Legal Agent
- Valida conformidade com Lei 14.133/2021
- Verifica referências legais

### 2. Fundamentação Agent
- Analisa qualidade da fundamentação
- Verifica elementos essenciais (necessidade, interesse público, benefícios, riscos)

### 3. Clareza Agent
- Calcula legibilidade do texto
- Identifica frases complexas

### 4. Simplificação Agent
- Remove jargão burocrático
- Simplifica linguagem

### 5. Anti-Hallucination Agent
- **CRÍTICO**: Previne invenção de fatos
- Detecta referências não verificadas
- Sinaliza necessidade de validação humana

## Endpoints Principais

### Geração de Seção com IA

```http
POST /api/sections/etp/:etpId/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "justificativa",
  "title": "Justificativa da Contratação",
  "userInput": "Precisamos contratar sistema de gestão...",
  "context": {
    "prazo": "urgente"
  }
}
```

### Exportar para PDF

```http
GET /api/export/etp/:id/pdf
Authorization: Bearer {token}
```

### Buscar Contratações Similares

```http
GET /api/search/similar-contracts?q=sistema de gestão
Authorization: Bearer {token}
```

## Variáveis de Ambiente Essenciais

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/etp_express

# JWT
JWT_SECRET=seu-secret-super-seguro
JWT_EXPIRATION=7d

# OpenAI (Obrigatório)
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4-turbo-preview

# Perplexity (Obrigatório)
PERPLEXITY_API_KEY=pplx-xxxxx

# Frontend
FRONTEND_URL=http://localhost:5173
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev      # Hot-reload
npm run start:debug    # Debug mode

# Produção
npm run build          # Build do projeto
npm run start:prod     # Rodar produção

# Testes
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npm run test:cov       # Coverage

# Database
npm run typeorm        # CLI TypeORM
npm run migration:generate
npm run migration:run
npm run migration:revert

# Qualidade
npm run lint           # ESLint
npm run format         # Prettier
```

## Documentação Completa

Para documentação detalhada da estrutura, veja:
- [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md) - Estrutura completa com todos os arquivos

## Swagger API Docs

Após iniciar o servidor, acesse:

```
http://localhost:3001/api/docs
```

Recursos:
- Interface interativa
- Teste de endpoints
- Autenticação JWT integrada
- Schemas de request/response

## Fluxo de Geração de Seção

```
1. User solicita geração de seção
   ↓
2. SectionsService cria seção (status: GENERATING)
   ↓
3. OrchestratorService recebe request
   ↓
4. Legal Agent enriquece prompt com contexto legal
   ↓
5. Fundamentação Agent adiciona guidance (se aplicável)
   ↓
6. Anti-Hallucination Agent adiciona safety prompts
   ↓
7. OpenAIService gera conteúdo via GPT-4
   ↓
8. Simplificação Agent analisa e simplifica
   ↓
9. Todos os agents validam resultado em paralelo
   ↓
10. Warnings e recommendations são coletados
   ↓
11. Seção é salva com metadata completa
   ↓
12. User recebe seção gerada + validações
```

## Segurança

- Helmet.js ativado
- CORS configurado
- Rate limiting (100 req/min)
- JWT authentication
- Password hashing com bcrypt
- Input validation automática
- SQL injection prevention

## Disclaimer Obrigatório

Todos os endpoints retornam o disclaimer:

```
"O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento."
```

Adicionalmente, todo conteúdo gerado inclui:

```
"Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial."
```

## Deploy

### Railway

```bash
# 1. Instalar Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Adicionar PostgreSQL
railway add

# 5. Deploy
railway up
```

### Render

1. Conecte seu repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

## Troubleshooting

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
docker ps

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

### Erro OpenAI API
```bash
# Verificar API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Puppeteer não funciona
```bash
# Instalar dependências Chrome (Linux)
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1
```

## Arquitetura de Alto Nível

```
┌─────────────┐
│   Client    │ (Frontend React)
└──────┬──────┘
       │ HTTP/HTTPS
       ↓
┌─────────────────────────────────┐
│      NestJS API Gateway         │
│  (Guards, Filters, Interceptors)│
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌────────┐ ┌──────────────┐
│ Auth   │ │ Business     │
│ Layer  │ │ Logic Layer  │
└────────┘ └──────┬───────┘
              │
         ┌────┴────┬──────────┬─────────┐
         ↓         ↓          ↓         ↓
    ┌────────┐ ┌──────────┐ ┌────┐ ┌──────┐
    │ ETP    │ │Orchestra-│ │Sear│ │Expor-│
    │ Service│ │tor + AI  │ │ch  │ │t     │
    └────────┘ └──────────┘ └────┘ └──────┘
         │         │
         ↓         ↓
    ┌────────────────────┐
    │  TypeORM + Postgres│
    └────────────────────┘
              │
         ┌────┴────┐
         ↓         ↓
    ┌────────┐ ┌──────────┐
    │OpenAI  │ │Perplexity│
    │GPT-4   │ │AI        │
    └────────┘ └──────────┘
```

## Contato e Suporte

Para questões sobre implementação:
- Documentação NestJS: https://docs.nestjs.com
- TypeORM: https://typeorm.io
- OpenAI API: https://platform.openai.com/docs

---

**Versão**: 1.0.0
**Status**: ✅ Produção
**Última atualização**: 2025-11-05
