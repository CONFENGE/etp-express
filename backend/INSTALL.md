# Instalação do Backend ETP Express

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn
- Chaves de API:
 - OpenAI API Key
 - Exa API Key

## Passo a Passo

### 1. Clonar o Repositório

```bash
cd "C:\Users\tj_sa\OneDrive\CONFENGE\Vision\Git Projects\ETP Express\backend"
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar PostgreSQL

#### Opção A: PostgreSQL Local

```bash
# Criar banco de dados
createdb etp_express

# Ou via psql
psql -U postgres
CREATE DATABASE etp_express;
\q
```

#### Opção B: Docker

```bash
docker run --name etp-postgres \
 -e POSTGRES_PASSWORD=postgres \
 -e POSTGRES_DB=etp_express \
 -p 5432:5432 \
 -d postgres:14
```

### 4. Configurar Variáveis de Ambiente

```bash
# Copiar .env.example
cp .env.example .env

# Editar .env com suas credenciais
# Principais configurações:
# - DATABASE_URL
# - JWT_SECRET
# - OPENAI_API_KEY
# - EXA_API_KEY
```

#### Exemplo de .env

```env
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/etp_express
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_SECRET=my-super-secret-key-change-me-in-production
JWT_EXPIRATION=7d

# OpenAI
OPENAI_API_KEY=sk-proj-seu-token-aqui
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Exa
EXA_API_KEY=exa-seu-token-aqui
EXA_TYPE=auto
EXA_NUM_RESULTS=10

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 5. Rodar Migrations (TypeORM)

```bash
# Sincronizar schema (apenas desenvolvimento)
# ATENÇÃO: Isso criará todas as tabelas
npm run start:dev
# O TypeORM criará as tabelas automaticamente se DB_SYNCHRONIZE=true

# OU rodar migrations manualmente
npm run typeorm migration:run
```

### 6. Iniciar Servidor

```bash
# Desenvolvimento (hot reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

### 7. Verificar Instalação

```bash
# Abrir no navegador
http://localhost:3001/api/docs

# Ou via curl
curl http://localhost:3001/api/docs
```

## Verificar que está funcionando

### 1. Health Check

```bash
curl http://localhost:3001
# Deve retornar: { message: "ETP Express API is running" }
```

### 2. Swagger Docs

Abra: `http://localhost:3001/api/docs`

### 3. Registrar Primeiro Usuário

```bash
curl -X POST http://localhost:3001/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{
 "email": "admin@etp.gov.br",
 "password": "Admin123!",
 "name": "Administrador",
 "orgao": "Teste",
 "cargo": "Admin"
 }'
```

### 4. Fazer Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
 -H "Content-Type: application/json" \
 -d '{
 "email": "admin@etp.gov.br",
 "password": "Admin123!"
 }'
```

Copie o `accessToken` da resposta.

### 5. Criar ETP

```bash
curl -X POST http://localhost:3001/api/etps \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer SEU_TOKEN_AQUI" \
 -d '{
 "title": "ETP Teste",
 "objeto": "Contratação de serviços de teste",
 "metadata": {
 "orgao": "Ministério do Teste"
 }
 }'
```

## Problemas Comuns

### Erro: "Cannot connect to database"

```bash
# Verificar se PostgreSQL está rodando
docker ps
# ou
pg_isready

# Verificar credenciais no .env
cat .env | grep DATABASE_URL
```

### Erro: "OpenAI API key invalid"

```bash
# Testar API key
curl https://api.openai.com/v1/models \
 -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Erro: "Port 3001 already in use"

```bash
# Mudar porta no .env
PORT=3002

# Ou matar processo
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Erro: Puppeteer não funciona

```bash
# Windows: Instalar Chrome
# O Puppeteer baixa automaticamente

# Linux: Instalar dependências
sudo apt-get install -y \
 libnss3 \
 libatk-bridge2.0-0 \
 libx11-xcb1 \
 libxcomposite1

# Mac: Instalar Chrome
brew install --cask google-chrome
```

## Estrutura do Banco de Dados

Após rodar migrations/sync, você terá estas tabelas:

- `users` - Usuários do sistema
- `etps` - Estudos Técnicos Preliminares
- `etp_sections` - Seções dos ETPs
- `etp_versions` - Versionamento
- `audit_logs` - Logs de auditoria
- `similar_contracts` - Contratações similares (cache)
- `analytics_events` - Eventos de telemetria
- `section_templates` - Templates de seções

## Próximos Passos

1. Criar usuários adicionais via `/api/users`
2. Criar ETPs via `/api/etps`
3. Gerar seções com IA via `/api/sections/etp/:id/generate`
4. Exportar PDFs via `/api/export/etp/:id/pdf`
5. Buscar contratações similares via `/api/search/similar-contracts`

## Scripts Úteis

```bash
# Desenvolvimento
npm run start:dev # Servidor com hot reload
npm run start:debug # Servidor com debugger

# Build
npm run build # Compilar TypeScript

# Testes
npm run test # Unit tests
npm run test:e2e # End-to-end tests
npm run test:cov # Coverage

# Linting
npm run lint # ESLint
npm run format # Prettier

# Database
npm run typeorm # CLI do TypeORM
npm run migration:generate # Gerar migration
npm run migration:run # Rodar migrations
npm run migration:revert # Reverter última migration
```

## Logs

Os logs aparecem no console com formato colorido:

```
[Nest] 12345 - 11/05/2024, 3:00:00 PM LOG [NestApplication] Nest application successfully started
[Nest] 12345 - 11/05/2024, 3:00:00 PM LOG [BootstrapService]
 ╔═══════════════════════════════════════════════════════════╗
 ║ ║
 ║ ETP EXPRESS BACKEND ║
 ║ ║
 ║ ⚠ Sistema assistivo - Não substitui responsabilidade ║
 ║ administrativa. Validação humana obrigatória. ║
 ║ ║
 ║ Server: http://localhost:3001 ║
 ║ Docs: http://localhost:3001/api/docs ║
 ║ Env: development ║
 ║ ║
 ╚═══════════════════════════════════════════════════════════╝
```

## Deploy em Produção

### Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway add # Adicionar PostgreSQL
railway up
```

### Render

1. Conectar repositório no Render
2. Configurar build command: `npm install && npm run build`
3. Configurar start command: `npm run start:prod`
4. Adicionar variáveis de ambiente
5. Deploy automático

### Heroku

```bash
heroku create etp-express-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set OPENAI_API_KEY=xxx
heroku config:set EXA_API_KEY=xxx
git push heroku main
```

## Suporte

- Documentação: [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)
- README: [README.md](./README.md)
- Swagger: http://localhost:3001/api/docs

---

**Versão**: 1.0.0
**Última atualização**: 2025-11-05
