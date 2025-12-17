# Smoke Test Checklist - ETP Express

**Executar antes de:** Deploy final para go-live B2G
**Responsável:** DevOps + QA
**Tempo estimado:** 30-45 minutos

## 1. Backend Health

### 1.1 Health Check Endpoint
```bash
curl https://etp-express-backend.railway.app/api/health
```
- [ ] Response 200 OK
- [ ] JSON válido retornado
- [ ] `status: "ok"`
- [ ] `database: "up"`
- [ ] `redis: "up"`

### 1.2 Database Connectivity
```bash
railway run psql -c "SELECT COUNT(*) FROM etps;"
```
- [ ] Query executa sem erros
- [ ] Conexão estabelecida <2s

### 1.3 Redis Connectivity
```bash
railway logs --service etp-express-backend --tail 50 | grep "BullMQ"
```
- [ ] Log mostra "BullMQ Worker started"
- [ ] Sem erros de conexão Redis

## 2. Frontend

### 2.1 Load Without Errors
- [ ] Acessar https://etp-express-frontend.railway.app
- [ ] Página carrega <3s
- [ ] Zero erros no console (F12)
- [ ] Sem warnings críticos

### 2.2 Assets Loading
- [ ] Logo CONFENGE visível
- [ ] Fontes carregadas corretamente
- [ ] CSS aplicado (sem FOUC)
- [ ] Ícones Lucide renderizando

## 3. Autenticação JWT

### 3.1 Login Flow
- [ ] Navegar para /login
- [ ] Preencher credenciais admin
- [ ] Submeter formulário
- [ ] Redirect para /dashboard
- [ ] Token armazenado em localStorage

### 3.2 Protected Routes
- [ ] Tentar acessar /dashboard sem login → redirect para /login
- [ ] Após login, acessar /dashboard → OK

## 4. CRUD ETP

### 4.1 Create ETP
- [ ] Clicar "Novo ETP"
- [ ] Preencher título e descrição
- [ ] Criar ETP
- [ ] ETP aparece na listagem

### 4.2 Read ETP
- [ ] Clicar no ETP criado
- [ ] Detalhes do ETP carregam
- [ ] Dados corretos exibidos

### 4.3 Update ETP
- [ ] Editar título do ETP
- [ ] Salvar alterações
- [ ] Mudanças persistidas

### 4.4 Delete ETP
- [ ] Deletar ETP de teste
- [ ] Confirmação exibida
- [ ] ETP removido da listagem

## 5. Geração AI

### 5.1 Geração Síncrona
- [ ] Criar seção com AI (modo sync)
- [ ] Loading state exibido
- [ ] Seção gerada em <30s
- [ ] Conteúdo válido retornado

### 5.2 Geração Assíncrona (BullMQ)
- [ ] Criar seção com AI (modo async)
- [ ] jobId retornado
- [ ] Job completa em <60s
- [ ] Resultado disponível

## 6. Export PDF/DOCX

### 6.1 Export PDF
- [ ] Clicar "Exportar PDF"
- [ ] Loading state exibido
- [ ] PDF baixado
- [ ] Arquivo válido (abrir com Adobe Reader)
- [ ] Tamanho >10KB

### 6.2 Export DOCX
- [ ] Clicar "Exportar DOCX"
- [ ] DOCX baixado
- [ ] Arquivo válido (abrir com Word/LibreOffice)
- [ ] Tamanho >10KB

## 7. Gov-APIs

### 7.1 PNCP Search
```bash
curl "https://etp-express-backend.railway.app/api/gov-search?query=obras"
```
- [ ] Response 200 OK
- [ ] Resultados PNCP incluídos
- [ ] Dados estruturados corretamente

### 7.2 SINAPI Data
- [ ] Gov-API retorna preços SINAPI
- [ ] Dados atualizados (mês corrente)

## 8. Sentry Monitoring

### 8.1 Zero Erros Críticos
- [ ] Acessar Sentry dashboard
- [ ] Filtrar: últimas 24h, severity: error/fatal
- [ ] Confirmar: 0 erros críticos
- [ ] Warnings <5 (aceitável)

## 9. Railway Status

### 9.1 Services Running
- [ ] Backend: ONLINE
- [ ] Frontend: ONLINE
- [ ] PostgreSQL: ONLINE
- [ ] Redis: ONLINE

### 9.2 Réplicas Backend
- [ ] 2+ réplicas ativas
- [ ] Health check OK em todas réplicas

## 10. Performance

### 10.1 Response Time
```bash
curl -w "@curl-format.txt" -o /dev/null -s https://etp-express-backend.railway.app/api/health
```
- [ ] Time total <2s
- [ ] P95 <3s (aceitável)

---

## Resultado Final

- [ ] **PASS:** Todos os itens acima confirmados ✅
- [ ] **FAIL:** Um ou mais itens falharam ❌ (documentar no GitHub)

**Executado em:** _______________
**Executado por:** _______________
**Assinatura:** _______________
