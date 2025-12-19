# QUICKSTART - ETP EXPRESS

> **⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.**

Guia rápido para rodar o **ETP Express** em 10 minutos.

---

## PRÉ-REQUISITOS

Certifique-se de ter instalado:

- ✅ **Node.js** 20+ LTS ([download](https://nodejs.org))
- ✅ **PostgreSQL** 15+ ([download](https://www.postgresql.org/download/))
- ✅ **Git** ([download](https://git-scm.com/))

E tenha em mãos:

- ✅ **OpenAI API Key** ([gerar](https://platform.openai.com/api-keys))
- ✅ **Perplexity API Key** ([gerar](https://www.perplexity.ai/settings/api))

---

## INSTALAÇÃO LOCAL (10 MINUTOS)

### 1. Clone o Repositório

```bash
git clone <seu-repositorio>
cd "ETP Express"
```

### 2. Configure o Database

```bash
# Criar database PostgreSQL
createdb etp_express

# Executar schema
psql -d etp_express -f DATABASE_SCHEMA.sql
```

**Ou via GUI** (TablePlus, pgAdmin):

1. Conecte ao PostgreSQL local
2. Crie database `etp_express`
3. Execute o arquivo `DATABASE_SCHEMA.sql`

### 3. Configure o Backend

```bash
cd backend

# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Editar .env com suas configurações
# Abra .env em um editor e preencha:
```

**.env** mínimo para rodar:

```bash
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/etp_express

JWT_SECRET=meu-super-secret-jwt-change-this-123

OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview

PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

```bash
# Iniciar backend
npm run start:dev
```

✅ **Backend rodando em**: `http://localhost:3001`
✅ **Swagger docs em**: `http://localhost:3001/api/docs`

### 4. Configure o Frontend (Novo Terminal)

```bash
cd frontend

# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Editar .env (opcional - já vem configurado)
```

**.env** padrão (já funciona):

```bash
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=ETP Express
```

```bash
# Iniciar frontend
npm run dev
```

✅ **Frontend rodando em**: `http://localhost:5173`

---

## 🎉 PRIMEIRO ACESSO

### 5️⃣ Criar Conta

1. Abra: `http://localhost:5173`
2. Clique em **"Registrar"**
3. Preencha:
   - **Nome**: Seu nome
   - **Email**: seu@email.com
   - **Senha**: senha123
   - **Órgão**: (opcional) Nome do seu órgão
4. Clique **"Criar Conta"**

### 6️⃣ Fazer Login

1. Na tela de login, digite:
   - **Email**: seu@email.com
   - **Senha**: senha123
2. Clique **"Entrar"**

✅ Você será redirecionado para o **Dashboard**

### 7️⃣ Criar Seu Primeiro ETP

1. No Dashboard, clique **"+ Novo ETP"**
2. Preencha:
   - **Título**: "Sistema de Gestão de Documentos"
   - **Objeto**: "Contratação de sistema de gestão eletrônica de documentos para modernização administrativa"
3. Clique **"Criar"**

✅ Você será levado ao **Editor de ETP**

### 8️⃣ Gerar Seção com IA

1. No Editor, clique na **Seção I** (Descrição da Necessidade)
2. Você verá o painel lateral **"Gerar com IA"**
3. Clique no botão **"🤖 Gerar com IA"**
4. Aguarde 5-10 segundos...
5. A IA gerará uma sugestão baseada no objeto do ETP
6. **Revise criticamente** a sugestão! ⚠️
7. Clique **"✅ Aceitar"** ou **"✏️ Editar"**

### 9️⃣ Buscar Contratações Similares

1. No painel lateral, clique em **"Buscar Similares"**
2. Digite: "gestão eletrônica documentos"
3. Aguarde a busca no Perplexity...
4. Você verá referências de contratações reais
5. **Verifique as fontes** antes de usar! ⚠️

### 🔟 Exportar PDF

1. Preencha pelo menos as **seções obrigatórias**:
   - ✅ I - Descrição da necessidade
   - ✅ IV - Justificativa da solução
   - ✅ VI - Requisitos
   - ✅ VIII - Justificativa parcelamento
   - ✅ XIII - Declaração de viabilidade

2. Clique em **"Exportar"** → **"PDF"**
3. O PDF será gerado com:
   - ⚠️ Aviso destacado no topo
   - Todas as seções preenchidas
   - Referências anexadas
   - Metadados (data, autor, versão)

---

## 🔍 VERIFICAÇÃO DE FUNCIONAMENTO

### Backend Health Check

```bash
# Via browser
http://localhost:3001/api

# Via curl
curl http://localhost:3001/api

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2025-11-05T...",
  "warning": "⚠️ O ETP Express pode cometer erros...",
  "message": "ETP Express Backend is running"
}
```

### Frontend Health Check

```bash
# Abra o browser
http://localhost:5173

# Você deve ver:
- Página de login
- WarningBanner no topo (amarelo/laranja)
- Formulário de login/registro
```

### Database Health Check

```bash
# Conecte ao PostgreSQL
psql -d etp_express

# Liste as tabelas
\dt

# Você deve ver:
- users
- etps
- etp_sections
- etp_versions
- audit_logs
- similar_contracts
- analytics_events
- section_templates
```

---

## 🛠️ TROUBLESHOOTING

### ❌ "Cannot connect to database"

**Solução**:

```bash
# Verificar se PostgreSQL está rodando
# Windows:
services.msc → PostgreSQL

# Linux/Mac:
sudo systemctl status postgresql

# Verificar DATABASE_URL no .env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/etp_express
```

### ❌ "OpenAI API error: 401 Unauthorized"

**Solução**:

1. Verifique `OPENAI_API_KEY` no `.env`
2. Confirme que a key é válida em: https://platform.openai.com/api-keys
3. Verifique se tem créditos disponíveis

### ❌ "Perplexity API error"

**Solução**:

1. Verifique `PERPLEXITY_API_KEY` no `.env`
2. Confirme que a key é válida em: https://www.perplexity.ai/settings/api
3. Verifique rate limits

### ❌ "Port 3001 already in use"

**Solução**:

```bash
# Windows: Matar processo na porta
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :3001
kill -9 <PID>

# Ou altere PORT no .env
PORT=3002
```

### ❌ "Port 5173 already in use"

**Solução**:

```bash
# Altere em vite.config.ts
server: {
  port: 5174,  // Ou outra porta livre
}
```

### ❌ "CORS error"

**Solução**:

1. Verifique `FRONTEND_URL` no backend `.env`
2. Verifique `CORS_ORIGINS` no backend `.env`
3. Ambos devem ser: `http://localhost:5173`

---

## 📚 PRÓXIMOS PASSOS

Agora que você tem tudo rodando:

1. 📖 **Leia a documentação completa**: [README.md](./README.md)
2. 🏗️ **Entenda a arquitetura**: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. 🚀 **Deploy em produção**: [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)
4. 🧪 **Explore a API**: `http://localhost:3001/api/docs`
5. 🎨 **Customize a UI**: Edite componentes em `frontend/src/components/`
6. 🤖 **Melhore os prompts**: Edite em `backend/src/modules/orchestrator/agents/`

---

## 🎓 USANDO O SISTEMA

### Fluxo Recomendado

```
1. Criar ETP → 2. Gerar Seções (IA) → 3. Revisar Criticamente
    ↓
4. Buscar Similares → 5. Fundamentar → 6. Ajustar Conteúdo
    ↓
7. Validar Completude → 8. Exportar PDF → 9. Usar Oficialmente
```

### Dicas de Uso

💡 **Sempre revise** as sugestões da IA antes de aceitar
💡 **Busque referências** para fundamentar valores e soluções
💡 **Use tooltips** para entender termos jurídicos
💡 **Salve versões** antes de grandes mudanças
💡 **Exporte JSON** para backup antes de finalizar

### Seções Obrigatórias (Lei 14.133/2021)

Para poder exportar, você **DEVE** preencher:

- ✅ **I** - Descrição da necessidade da contratação
- ✅ **IV** - Justificativa da solução escolhida
- ✅ **VI** - Requisitos da contratação
- ✅ **VIII** - Justificativa do parcelamento ou não
- ✅ **XIII** - Declaração de viabilidade

---

## 🔒 AVISOS IMPORTANTES

### ⚠️ Sistema Assistivo

O ETP Express **NÃO substitui**:

- ❌ Responsabilidade administrativa
- ❌ Análise jurídica especializada
- ❌ Decisão técnica do servidor
- ❌ Validação humana final

### ⚠️ Limitações da IA

A IA **PODE**:

- ❌ Inventar fatos (alucinação)
- ❌ Interpretar leis incorretamente
- ❌ Sugerir valores desatualizados
- ❌ Fazer afirmações imprecisas

**POR ISSO**:

- ✅ Sempre revise criticamente
- ✅ Valide referências legais
- ✅ Confirme valores com mercado
- ✅ Consulte setor jurídico

---

## 📊 COMANDOS ÚTEIS

### Backend

```bash
# Desenvolvimento (watch mode)
npm run start:dev

# Build para produção
npm run build

# Rodar produção
npm run start:prod

# Migrations
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
# Desenvolvimento (hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

### Database

```bash
# Conectar ao database
psql -d etp_express

# Listar tabelas
\dt

# Ver dados de uma tabela
SELECT * FROM users;
SELECT * FROM etps;

# Contar registros
SELECT COUNT(*) FROM etp_sections;

# Sair
\q
```

---

## 🎯 CHECKLIST DE FUNCIONAMENTO

Antes de usar em produção, verifique:

- [ ] ✅ Backend iniciando sem erros
- [ ] ✅ Frontend acessível no browser
- [ ] ✅ Database conectado e populado
- [ ] ✅ Registro de usuário funcionando
- [ ] ✅ Login funcionando
- [ ] ✅ Criação de ETP funcionando
- [ ] ✅ Geração de seção com IA funcionando
- [ ] ✅ Busca de similares funcionando
- [ ] ✅ Exportação PDF funcionando
- [ ] ✅ Versionamento funcionando
- [ ] ✅ WarningBanner visível em todas as páginas
- [ ] ✅ Responsividade mobile testada
- [ ] ✅ Swagger acessível e funcional

---

## 📞 PRECISA DE AJUDA?

- 📖 **Documentação**: [README.md](./README.md)
- 🏗️ **Arquitetura**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🚀 **Deploy**: [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)
- 📊 **Sumário**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- 🐛 **Issues**: GitHub Issues
- 💬 **Suporte**: suporte@etpexpress.gov.br (exemplo)

---

## ✅ TUDO PRONTO!

Agora você tem o **ETP Express** rodando localmente e pode:

1. ✅ Criar ETPs
2. ✅ Gerar conteúdo com IA
3. ✅ Buscar contratações similares
4. ✅ Exportar PDFs profissionais
5. ✅ Versionar e auditar

**Bom trabalho! 🚀**

---

**⚠️ LEMBRE-SE**: Sempre revise as saídas da IA antes de usar oficialmente.

A responsabilidade final é do servidor/agente público responsável.

---

**Criado em**: 2025-11-05
**Versão**: 1.0.0
**Tempo estimado**: 10 minutos
