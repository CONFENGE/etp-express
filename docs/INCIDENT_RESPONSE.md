# Production Incident Response Playbook

**Versão:** 1.0
**Última atualização:** 2025-11-15
**Status:** Ativo
**Responsável:** DevOps/Tech Lead

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Escalation Matrix](#escalation-matrix)
3. [Top 10 Failure Scenarios](#top-10-failure-scenarios)
4. [Communication Templates](#communication-templates)
5. [Post-Incident Review Process](#post-incident-review-process)
6. [Quick Reference](#quick-reference)

---

## Visão Geral

### Objetivo

Este runbook fornece **procedimentos step-by-step** para diagnosticar e resolver os 10 cenários de falha mais prováveis no ETP Express em produção.

### Princípios

1. **Ação rápida > diagnóstico perfeito** - Pare o sangramento primeiro
2. **Comunicação clara** - Mantenha usuários e stakeholders informados
3. **Documentação obrigatória** - Toda resolução gera post-mortem
4. **Aprendizado contínuo** - Falhas são oportunidades de melhoria

### Quando usar este playbook

✅ **USE quando:**

- Sistema apresenta comportamento anormal em produção
- Usuários relatam erros ou indisponibilidade
- Alertas de monitoramento disparam
- Deploy falha ou causa regressão

❌ **NÃO USE quando:**

- Desenvolvimento local (use debugging normal)
- Ambientes de staging (exceto validação de procedures)
- Problemas conhecidos com workaround documentado

---

## Escalation Matrix

### Roles e Responsabilidades

| Role                    | Responsabilidade                                             | Quando Atua                                     |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| **First Responder**     | Acknowledge alert, triage inicial, mitigação imediata        | Sempre (24/7 on-call)                           |
| **Escalation Engineer** | Diagnóstico complexo, decisões arquiteturais, código hotfix  | Quando First Responder não resolver em 2x SLA   |
| **Incident Commander**  | Coordenação geral, comunicação externa, decisões de rollback | Incidentes P0 ou quando não resolvido em 4x SLA |

### SLA Response Times

| Severity          | Definição                                                | Response Time  | Escalation Time              |
| ----------------- | -------------------------------------------------------- | -------------- | ---------------------------- |
| **P0 (Critical)** | Sistema completamente fora do ar                         | **15 minutos** | 30 min → Escalation Engineer |
| **P1 (High)**     | Funcionalidade crítica degradada (ex: geração de seções) | **1 hora**     | 2h → Escalation Engineer     |
| **P2 (Medium)**   | Funcionalidade não-crítica afetada                       | **4 horas**    | 8h → Escalation Engineer     |
| **P3 (Low)**      | Issue cosmético ou minor bug                             | **24 horas**   | 48h → Backlog                |

### Escalation Path

```
┌─────────────────────────────────────────────────────────────┐
│                   ESCALATION FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. [Alert Fires]
   │
   ├─> First Responder notified (PagerDuty/Slack)
   │   │
   │   ├─> Acknowledges within SLA (15min/1h/4h)
   │   │
   │   └─> Starts triage (follow runbook)
   │
2. [2x SLA Elapsed]
   │
   ├─> Auto-escalate to Escalation Engineer
   │   │
   │   ├─> Deep diagnosis (logs, DB queries, code review)
   │   │
   │   └─> Apply hotfix or escalate further
   │
3. [4x SLA Elapsed]
   │
   └─> Incident Commander called
       │
       ├─> Coordinate response (multiple engineers if needed)
       ├─> External communication (users, stakeholders)
       └─> Make rollback/go-live decisions
```

### Contact List

**⚠️ TEMPLATE - A ser preenchido pela equipe:**

| Role                    | Name   | Phone    | Slack   | Email          | Timezone |
| ----------------------- | ------ | -------- | ------- | -------------- | -------- |
| **First Responder**     | [Nome] | [+55...] | @handle | pessoa@dominio | UTC-3    |
| **Escalation Engineer** | [Nome] | [+55...] | @handle | pessoa@dominio | UTC-3    |
| **Incident Commander**  | [Nome] | [+55...] | @handle | pessoa@dominio | UTC-3    |
| **Product Owner**       | [Nome] | [+55...] | @handle | pessoa@dominio | UTC-3    |

**Notification Channels:**

- **Primary:** Slack `#alerts-production`
- **Secondary:** Email + SMS (PagerDuty/similar)
- **Emergency:** Phone call cascade

---

## Top 10 Failure Scenarios

### Scenario 1: Database Down

**Severity:** P0 (Critical)

**Symptoms:**

- ❌ Backend retorna `500 Internal Server Error` em todos os endpoints
- ❌ Frontend exibe "Erro ao carregar dados" em todas as páginas
- ❌ Health check endpoint `/api/health` retorna erro
- 📊 **Monitoring:** Error rate 100%, latency infinita

**Diagnosis:**

1. **Verificar health check:**

   ```bash
   curl https://backend.railway.app/api/health
   # Esperado: {"status":"ok","database":"healthy"}
   # Se erro: Database connection failed
   ```

2. **Verificar logs backend:**

   ```bash
   railway logs --service backend | grep -i "database\|postgres\|connection"
   # Look for: "Connection refused", "timeout", "max connections"
   ```

3. **Verificar Railway PostgreSQL status:**
   - Acesse Railway Dashboard > PostgreSQL Service
   - Status deve estar "Running" (verde)
   - Se "Crashed" (vermelho) → crash do database

**Resolution:**

**Immediate Action (mitigar impacto):**

1. **Verificar Railway Database Status:**
   - Se crashed → Restart service via Railway UI
   - Se "max connections" → Ver Scenario 2 (High Latency)

2. **Se restart falhou:**

   ```bash
   # Rollback para deploy anterior
   ./scripts/rollback.sh

   # Verificar se restaurou
   curl https://backend.railway.app/api/health
   ```

**Root Cause Fix:**

- **Se crash foi por migration malformada:**

  ```bash
  # Reverter migration problemática
  railway run npm run migration:revert

  # Deploy fix
  git revert <commit-hash-migration>
  git push origin master
  ```

- **Se foi por falta de recursos:**
  - Upgrade Railway plan (mais memória/CPU)
  - Ver `DISASTER_RECOVERY.md` para restore de backup

**Verification:**

```bash
# 1. Health check OK
curl https://backend.railway.app/api/health

# 2. Endpoint crítico funciona
curl https://backend.railway.app/api/etps -H "Authorization: Bearer <token>"

# 3. Frontend carrega
curl -I https://frontend.railway.app/
```

**Rollback Plan:**

- Se resolution falhar → Executar `./scripts/rollback.sh` (restaura deploy anterior ~30s)
- Se rollback falhar → Restore backup via `DISASTER_RECOVERY.md` (~1h)

**Escalation:**

- If unresolved after **30 min** → Escalate to Escalation Engineer
- If unresolved after **1h** → Incident Commander + considerar restore de backup

---

### Scenario 2: API Timeout (High Latency)

**Severity:** P1 (High)

**Symptoms:**

- ⚠️ Requests lentos (>5s response time)
- ⚠️ Frontend exibe "Carregando..." por muito tempo
- ⚠️ Alguns requests timeout (504 Gateway Timeout)
- 📊 **Monitoring:** Latency p95 > 5s, error rate 10-30%

**Diagnosis:**

1. **Verificar latency de endpoints:**

   ```bash
   # Testar endpoint lento
   time curl https://backend.railway.app/api/etps
   # Se > 5s → confirma latência alta
   ```

2. **Verificar logs de performance:**

   ```bash
   railway logs --service backend | grep "Slow query\|Timeout\|exceeded"
   # Look for: "Query took 5000ms", "Connection timeout"
   ```

3. **Verificar database connections:**
   ```bash
   railway run psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   # Se count > 80% do max (default: 100) → connection pool esgotado
   ```

**Resolution:**

**Immediate Action:**

1. **Liberar connections idle:**

   ```bash
   railway run psql $DATABASE_URL -c "
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';
   "
   ```

2. **Se não resolver → Restart backend:**
   ```bash
   railway service backend
   railway restart
   ```

**Root Cause Fix:**

- **Se problema for N+1 queries:**
  - Identificar queries lentas nos logs
  - Criar issue para adicionar eager loading
  - Exemplo: `SELECT * FROM etps` + 100x `SELECT * FROM sections WHERE etp_id = ?`

- **Se problema for falta de índices:**
  - Executar `EXPLAIN ANALYZE` nas queries lentas
  - Criar migration para adicionar índices

- **Se problema for traffic spike:**
  - Upgrade Railway plan (mais replicas)
  - Implementar rate limiting (#38)

**Verification:**

```bash
# 1. Latency normalizada
time curl https://backend.railway.app/api/etps
# Esperado: < 500ms

# 2. Error rate reduzida
# Verificar monitoring: error rate < 5%
```

**Rollback Plan:**

- Se restart causou instabilidade → `./scripts/rollback.sh`

**Escalation:**

- If unresolved after **2h** → Escalate to Escalation Engineer (diagnóstico de queries)

---

### Scenario 3: OpenAI API Failure

**Severity:** P1 (High)

**Symptoms:**

- ❌ Geração de seções falha com "Erro ao gerar conteúdo"
- ❌ Usuários não conseguem usar funcionalidade principal
- 📊 **Monitoring:** Endpoint `/api/sections/:etpId/generate` com 100% error rate

**Diagnosis:**

1. **Verificar logs de erro OpenAI:**

   ```bash
   railway logs --service backend | grep -i "openai\|gpt-4"
   # Look for: "Rate limit", "Invalid API key", "Service unavailable"
   ```

2. **Testar OpenAI API diretamente:**

   ```bash
   # Copiar OPENAI_API_KEY do Railway
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   # Se erro → problema na API key ou OpenAI status
   ```

3. **Verificar OpenAI Status:**
   - Acesse https://status.openai.com/
   - Se "Major outage" → confirma problema externo

**Resolution:**

**Immediate Action:**

**Caso 1: Rate Limit (429 Too Many Requests)**

```bash
# Nada a fazer - aguardar rate limit reset (~60s)
# Comunicar usuários via template incident-notification.md
```

**Caso 2: API Key Inválida**

```bash
# Regenerar API key no OpenAI Dashboard
# Atualizar no Railway:
railway variables set OPENAI_API_KEY=<nova-key>
railway restart
```

**Caso 3: OpenAI Downtime (503 Service Unavailable)**

- **Sem ação imediata possível**
- Comunicar usuários: "Serviço de IA temporariamente indisponível"
- Monitorar https://status.openai.com/ para resolução

**Root Cause Fix:**

- **Se rate limit frequente:**
  - Implementar exponential backoff
  - Implementar queueing system (BullMQ)
  - Upgrade OpenAI plan (higher rate limits)

- **Se API key expirou:**
  - Adicionar monitoring de API key expiration
  - Criar processo de rotação preventiva

**Verification:**

```bash
# Testar geração de seção
curl -X POST https://backend.railway.app/api/sections/1/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
# Esperado: Status 201, seção gerada
```

**Rollback Plan:**

- Não aplicável (problema externo)

**Escalation:**

- If OpenAI downtime > **2h** → Incident Commander (comunicação oficial aos usuários)

---

### Scenario 4: Memory Leak (OOM - Out of Memory)

**Severity:** P0 (Critical)

**Symptoms:**

- ❌ Backend crashes com "JavaScript heap out of memory"
- ❌ Railway restart automático constante (crash loop)
- 📊 **Monitoring:** Memory usage 100%, container restarts

**Diagnosis:**

1. **Verificar crashes recentes:**

   ```bash
   railway logs --service backend | grep -i "heap\|memory\|oom"
   # Look for: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed"
   ```

2. **Verificar memory usage:**

   ```bash
   railway ps
   # Look for: Memory column > 90% (ex: 450MB/512MB)
   ```

3. **Identificar leak pattern:**
   - Se crash após deploy → bug introduzido recentemente
   - Se crash gradual (horas/dias) → memory leak acumulativo

**Resolution:**

**Immediate Action:**

1. **Rollback para deploy anterior estável:**

   ```bash
   ./scripts/rollback.sh
   # Restaura versão sem memory leak
   ```

2. **Aumentar memória temporariamente (Railway):**
   - Railway Dashboard > Backend Service > Settings
   - Upgrade para plano com mais RAM (short-term fix)

**Root Cause Fix:**

- **Identificar leak:**

  ```bash
  # Enable Node.js heap snapshots (localmente)
  node --inspect backend/dist/main.js
  # Chrome DevTools > Memory > Take heap snapshot
  # Comparar snapshots antes/depois de operação suspeita
  ```

- **Common culprits:**
  - EventEmitters não limpos (listeners acumulam)
  - Database connections não fechadas
  - Large objects em cache sem TTL
  - File descriptors não fechados (PDF generation)

**Verification:**

```bash
# Após fix:
# 1. Deploy versão corrigida
git push origin master

# 2. Monitorar memory usage por 1h
railway ps
# Memory deve estabilizar < 70%
```

**Rollback Plan:**

- Já executado na immediate action

**Escalation:**

- If leak não identificado em **1h** → Escalation Engineer (heap profiling)

---

### Scenario 5: Frontend Down (White Screen)

**Severity:** P0 (Critical)

**Symptoms:**

- ❌ Frontend exibe tela branca ou "Cannot GET /"
- ❌ Console browser exibe erros JavaScript
- ❌ Railway frontend service status "Crashed"

**Diagnosis:**

1. **Verificar Railway frontend status:**

   ```bash
   railway service frontend
   railway ps
   # Se "Crashed" → confirma crash
   ```

2. **Verificar logs frontend:**

   ```bash
   railway logs --service frontend | tail -50
   # Look for: Build errors, runtime errors
   ```

3. **Testar acesso direto:**
   ```bash
   curl -I https://frontend.railway.app/
   # Se 502/503 → frontend não está servindo
   ```

**Resolution:**

**Immediate Action:**

1. **Rollback frontend deploy:**

   ```bash
   # Via Railway CLI
   railway service frontend
   railway rollback
   ```

2. **Se rollback falhou → Redeploy versão estável:**
   ```bash
   git checkout <commit-hash-estável>
   git push -f origin master
   ```

**Root Cause Fix:**

**Caso 1: Build error (TypeScript/Vite)**

```bash
# Verificar erro de build nos logs
# Corrigir TypeScript errors localmente
npm run build
# Fix e redeploy
```

**Caso 2: Environment variable missing**

```bash
# Verificar VITE_API_URL está configurada no Railway
railway variables --service frontend
# Se missing:
railway variables set VITE_API_URL=https://backend.railway.app
railway restart
```

**Caso 3: Vite config error**

- Reverter mudanças em `vite.config.ts`
- Testar build localmente antes de push

**Verification:**

```bash
# 1. Frontend carrega
curl -I https://frontend.railway.app/
# Esperado: 200 OK

# 2. Testar funcionalidade básica
# Acessar https://frontend.railway.app/ no browser
# Login deve funcionar
```

**Rollback Plan:**

- Já executado na immediate action

**Escalation:**

- If unresolved after **30 min** → Escalation Engineer

---

### Scenario 6: Authentication Broken

**Severity:** P1 (High)

**Symptoms:**

- ❌ Usuários não conseguem fazer login
- ❌ Sessões expiram imediatamente
- ❌ Erro "Invalid token" ou "Unauthorized"

**Diagnosis:**

1. **Testar login:**

   ```bash
   curl -X POST https://backend.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"senha123"}'
   # Se erro → confirma problema de auth
   ```

2. **Verificar logs de auth:**

   ```bash
   railway logs --service backend | grep -i "auth\|jwt\|token\|unauthorized"
   # Look for: "JWT malformed", "Invalid signature", "Token expired"
   ```

3. **Verificar JWT_SECRET:**
   ```bash
   railway variables --service backend | grep JWT_SECRET
   # Se mudou recentemente → todos os tokens antigos invalidaram
   ```

**Resolution:**

**Immediate Action:**

**Caso 1: JWT_SECRET mudou acidentalmente**

```bash
# Reverter JWT_SECRET para valor anterior
railway variables set JWT_SECRET=<valor-antigo>
railway restart

# ⚠️ Isso invalida todos os tokens atuais
# Usuários precisarão fazer login novamente
```

**Caso 2: Database auth table corrompida**

```bash
# Verificar tabela users
railway run psql $DATABASE_URL -c "SELECT count(*) FROM users;"
# Se erro → restaurar backup (DISASTER_RECOVERY.md)
```

**Caso 3: Passport strategy bug**

```bash
# Rollback para versão estável
./scripts/rollback.sh
```

**Root Cause Fix:**

- **Se JWT_SECRET vazou:**
  - Regenerar: `openssl rand -base64 32`
  - Atualizar Railway + Redeploy
  - Forçar logout de todos os usuários (invalidar tokens)

- **Se bug em auth service:**
  - Identificar commit que quebrou
  - Reverter e criar issue para fix

**Verification:**

```bash
# 1. Login funciona
curl -X POST https://backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'
# Esperado: {"access_token":"..."}

# 2. Token válido
curl https://backend.railway.app/api/etps \
  -H "Authorization: Bearer <token>"
# Esperado: 200 OK
```

**Rollback Plan:**

- `./scripts/rollback.sh` (restore auth service anterior)

**Escalation:**

- If unresolved after **2h** → Escalation Engineer

---

### Scenario 7: Data Corruption

**Severity:** P1 (High)

**Symptoms:**

- ❌ ETPs exibem conteúdo embaralhado ou inválido
- ❌ Seções com texto corrompido (caracteres estranhos)
- ❌ Foreign key violations nos logs

**Diagnosis:**

1. **Verificar dados corrompidos:**

   ```bash
   railway run psql $DATABASE_URL -c "
   SELECT id, title, created_at FROM etps ORDER BY created_at DESC LIMIT 10;
   "
   # Verificar se titles estão corrompidos
   ```

2. **Verificar logs de migration:**

   ```bash
   railway logs --service backend | grep -i "migration\|foreign key\|constraint"
   # Look for: Migration errors, constraint violations
   ```

3. **Identificar escopo:**
   - Corrupção total (todos os registros) → provável migration malformada
   - Corrupção parcial (registros específicos) → provável bug em endpoint

**Resolution:**

**Immediate Action:**

1. **Stop the bleeding:**

   ```bash
   # Rollback deploy que causou corrupção
   ./scripts/rollback.sh
   ```

2. **Criar backup imediato:**
   ```bash
   ./scripts/backup-db.sh
   # Backup PRÉ-restore (safety net)
   ```

**Root Cause Fix:**

**Caso 1: Migration malformada corrompeu dados**

```bash
# Restore backup anterior à migration
# Ver DISASTER_RECOVERY.md > Restore de Backup Railway

# Após restore:
# 1. Reverter migration
railway run npm run migration:revert

# 2. Fix migration localmente
# 3. Test migration em staging
# 4. Redeploy
```

**Caso 2: Bug em endpoint corrompeu registros específicos**

```bash
# Identificar registros corrompidos
railway run psql $DATABASE_URL -c "
SELECT id FROM etps WHERE title LIKE '%�%' OR title = '';
"

# Fix manual via SQL (se poucos registros):
railway run psql $DATABASE_URL -c "
UPDATE etps SET title = 'ETP Corrompido - Aguardando Recuperação'
WHERE id IN (1,2,3);
"
```

**Verification:**

```bash
# 1. Dados restaurados corretamente
railway run psql $DATABASE_URL -c "
SELECT id, title FROM etps ORDER BY created_at DESC LIMIT 5;
"

# 2. Frontend exibe dados corretos
curl https://backend.railway.app/api/etps/<id> | jq '.title'
```

**Rollback Plan:**

- Restore backup via `DISASTER_RECOVERY.md`

**Escalation:**

- If data loss significativo > **1h** → Incident Commander (decisão de comunicar usuários)

---

### Scenario 8: Rate Limit Hit (OpenAI)

**Severity:** P2 (Medium)

**Symptoms:**

- ⚠️ Geração de seções falha intermitentemente
- ⚠️ Erro "Rate limit exceeded" nos logs
- 📊 **Monitoring:** Endpoint `/api/sections/generate` com 50% error rate

**Diagnosis:**

1. **Verificar logs de rate limit:**

   ```bash
   railway logs --service backend | grep -i "rate limit\|429\|too many requests"
   # Look for: "Rate limit exceeded for organization"
   ```

2. **Verificar OpenAI usage:**
   - Acesse https://platform.openai.com/usage
   - Verificar RPM (requests per minute) e TPM (tokens per minute)

**Resolution:**

**Immediate Action:**

1. **Comunicar usuários:**
   - Usar template `incident-notification.md`
   - Mensagem: "Geração de seções temporariamente lenta devido a volume de uso"

2. **Aguardar reset (1-2 minutos):**
   - Rate limits OpenAI resetam a cada minuto
   - Não há ação técnica necessária

**Root Cause Fix:**

**Opção 1: Implementar queueing**

```typescript
// Adicionar BullMQ para queue de geração
// Controlar throughput para ficar abaixo do rate limit
```

**Opção 2: Upgrade OpenAI plan**

- Tier 1: 500 RPM, 40K TPM
- Tier 2: 5000 RPM, 200K TPM

**Opção 3: Implementar rate limiting no backend (#38)**

```typescript
// Limitar usuários para max 5 gerações/min
// Prevenir abuse e evitar rate limit
```

**Verification:**

```bash
# Após aguardar reset:
curl -X POST https://backend.railway.app/api/sections/1/generate \
  -H "Authorization: Bearer <token>"
# Esperado: 201 Created (após ~60s)
```

**Rollback Plan:**

- Não aplicável (problema de quota)

**Escalation:**

- If rate limit constante (>3x/dia) → Escalation Engineer (implementar queue)

---

### Scenario 9: Deploy Failed (Rollback Needed)

**Severity:** P1 (High)

**Symptoms:**

- ❌ Deploy falha com build error
- ❌ Railway deploy status "Failed"
- ❌ Sistema em estado inconsistente (backend novo + frontend antigo)

**Diagnosis:**

1. **Verificar Railway deploy logs:**

   ```bash
   railway logs --service backend | head -100
   # Look for: Build errors, npm install errors, TypeScript errors
   ```

2. **Verificar último deploy:**
   ```bash
   railway deployments
   # Identificar deployment falhado
   ```

**Resolution:**

**Immediate Action:**

1. **Executar rollback automatizado:**

   ```bash
   ./scripts/rollback.sh

   # Script executa:
   # 1. Identifica deployment anterior
   # 2. Railway rollback
   # 3. Valida health check
   # 4. Smoke tests

   # Tempo estimado: ~30s
   ```

**Root Cause Fix:**

**Caso 1: Build error (TypeScript)**

```bash
# Corrigir erros localmente
npm run build
npm test

# Redeploy após fix
git push origin master
```

**Caso 2: Dependency install error**

```bash
# Verificar package.json
# Fix dependency conflicts
npm install
git add package-lock.json
git commit -m "fix: resolve dependency conflicts"
git push origin master
```

**Caso 3: Migration failure**

```bash
# Ver Scenario 7 (Data Corruption)
# Reverter migration problemática
```

**Verification:**

```bash
# Após rollback:
# 1. Health check OK
curl https://backend.railway.app/api/health

# 2. Deployment status "Running"
railway ps
```

**Rollback Plan:**

- Script `./scripts/rollback.sh` já é o rollback

**Escalation:**

- If rollback falhou → **IMMEDIATE** Escalation Engineer

---

### Scenario 10: Security Breach Suspected

**Severity:** P0 (Critical)

**Symptoms:**

- 🚨 Acesso não autorizado detectado
- 🚨 Data exfiltration suspeita
- 🚨 Logs mostram atividade anômala
- 🚨 Usuários relatam ações que não fizeram

**Diagnosis:**

1. **Verificar logs de auth:**

   ```bash
   railway logs --service backend | grep -i "login\|auth\|unauthorized"
   # Look for: Multiple failed logins, unusual IPs, brute force
   ```

2. **Verificar database access logs:**

   ```bash
   railway run psql $DATABASE_URL -c "
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   "
   # Verificar queries suspeitas
   ```

3. **Verificar Railway access logs:**
   - Railway Dashboard > Project Settings > Audit Log
   - Verificar mudanças não autorizadas em env vars, deployments

**Resolution:**

**IMMEDIATE ACTION (PRIORITÁRIO):**

1. **Rotate all secrets IMMEDIATELY:**

   ```bash
   # 1. Gerar novos secrets
   NEW_JWT_SECRET=$(openssl rand -base64 32)

   # 2. Atualizar Railway
   railway variables set JWT_SECRET=$NEW_JWT_SECRET
   railway variables set DATABASE_PASSWORD=<novo-password>
   railway variables set OPENAI_API_KEY=<nova-key>

   # 3. Force logout de TODOS os usuários
   # (JWT_SECRET mudou = todos os tokens invalidam)
   ```

2. **Backup database AGORA:**

   ```bash
   ./scripts/backup-db.sh
   # Safety net antes de qualquer ação
   ```

3. **Bloquear acesso suspeito:**
   ```bash
   # Se IP suspeito identificado:
   # Adicionar firewall rule no Railway (se disponível)
   # Ou implementar IP blocking no NestJS
   ```

**Root Cause Investigation:**

1. **Identificar vetor de ataque:**
   - SQL Injection? (verificar logs de query errors)
   - JWT token vazou? (verificar secrets no código)
   - Credentials vazaram? (verificar commits recentes)

2. **Assess damage:**
   - Quais dados foram acessados?
   - Dados foram modificados/deletados?
   - Dados foram exfiltrados?

**Post-Incident Actions:**

1. **Comunicar stakeholders:**
   - Usar template `incident-notification.md`
   - Se dados pessoais vazaram → **OBRIGATÓRIO notificar ANPD** (LGPD)

2. **Patch vulnerability:**
   - Fix code vulnerability
   - Deploy hotfix
   - Security audit completo (#85, #86, #87)

3. **Mandatory post-mortem:**
   - Documentar vetor de ataque
   - Documentar ações tomadas
   - Criar action items para prevenir recorrência

**Verification:**

```bash
# 1. Secrets rotacionados
railway variables | grep -E "JWT_SECRET|DATABASE_PASSWORD|OPENAI_API_KEY"
# Verificar que valores mudaram

# 2. Acesso bloqueado
# Verificar logs não mostram mais atividade suspeita

# 3. Sistema funcional
curl https://backend.railway.app/api/health
```

**Rollback Plan:**

- **NÃO FAZER ROLLBACK** sem investigação completa
- Rollback pode destruir evidências

**Escalation:**

- **IMMEDIATE** → Incident Commander + Security specialist
- **Se breach confirmado** → Notificar legal team + ANPD (LGPD compliance)

---

## Communication Templates

### Template Locations

Todos os templates estão disponíveis em:

```
docs/templates/
├── incident-notification.md    # Comunicar início de incidente
├── incident-resolved.md         # Comunicar resolução
└── post-mortem-template.md      # Post-mortem interno
```

### Quando usar cada template

| Template                     | Quando Usar                            | Destinatário                  |
| ---------------------------- | -------------------------------------- | ----------------------------- |
| **incident-notification.md** | Incidente confirmado afetando usuários | Usuários finais, stakeholders |
| **incident-resolved.md**     | Incidente resolvido completamente      | Mesmos que foram notificados  |
| **post-mortem-template.md**  | Após resolução (obrigatório P0/P1)     | Equipe interna, management    |

### Exemplo: Notificação de Incidente

```markdown
Assunto: [ETP Express] Sistema Temporariamente Indisponível

Prezados usuários,

Identificamos um problema técnico que está impedindo o acesso ao sistema ETP Express.

**Impacto:** Sistema completamente indisponível
**Status:** Nossa equipe está trabalhando na resolução
**Previsão:** Estimamos normalização em até 1 hora

Atualizações serão enviadas a cada 30 minutos.

Pedimos desculpas pelo transtorno.

Equipe ETP Express
```

**⚠️ Ver templates completos em `docs/templates/`**

---

## Post-Incident Review Process

### Obrigatório para

- ✅ Todos os incidentes **P0**
- ✅ Todos os incidentes **P1**
- ⚠️ Incidentes P2 se recorrentes (>2x em 30 dias)

### Timeline

1. **Incidente resolvido** → +24h → **Post-mortem draft** criado
2. **Draft** → +48h → **Review meeting** agendado
3. **Meeting** → +7 dias → **Action items** implementados

### Post-Mortem Template

**Localização:** `docs/templates/post-mortem-template.md`

**Estrutura:**

```markdown
# Post-Mortem: [Título do Incidente]

**Data:** YYYY-MM-DD
**Duração:** X horas
**Severity:** P0/P1/P2
**Incident Commander:** [Nome]

## Timeline

- [HH:MM] Incident detected
- [HH:MM] First responder acknowledged
- [HH:MM] Root cause identified
- [HH:MM] Incident resolved

## Impact

- Users affected: [X users ou %]
- Downtime: [X minutes]
- Data loss: [Yes/No - detalhes]

## Root Cause

[Explicação técnica detalhada]

## Resolution

[O que foi feito para resolver]

## What Went Well

- [Ponto positivo 1]
- [Ponto positivo 2]

## What Went Wrong

- [Ponto negativo 1]
- [Ponto negativo 2]

## Action Items

- [ ] [Medida preventiva 1] - Owner: [Nome] - Due: [Data] - Priority: P0/P1/P2
- [ ] [Medida preventiva 2] - Owner: [Nome] - Due: [Data] - Priority: P0/P1/P2
```

### Blameless Culture

⚠️ **IMPORTANTE:** Post-mortems devem ser **blameless**.

- ✅ Foco em **processos**, não em pessoas
- ✅ Objetivo é **aprender e melhorar**
- ❌ Nunca culpar indivíduos
- ❌ Nunca usar post-mortem para performance reviews

---

## Quick Reference

### Emergency Commands

```bash
# ROLLBACK (recuperação rápida)
./scripts/rollback.sh

# BACKUP IMEDIATO
./scripts/backup-db.sh

# HEALTH CHECK
curl https://backend.railway.app/api/health

# LOGS RECENTES
railway logs --service backend | tail -50

# STATUS SERVICES
railway ps

# RESTART SERVICE
railway restart
```

### Railway Dashboard URLs

- **Production Project:** https://railway.app/project/etp-express
- **Backend Service:** https://railway.app/project/etp-express/service/backend
- **Frontend Service:** https://railway.app/project/etp-express/service/frontend
- **PostgreSQL Service:** https://railway.app/project/etp-express/service/postgres

### External Status Pages

- **OpenAI Status:** https://status.openai.com/
- **Railway Status:** https://railway.statuspage.io/
- **GitHub Status:** https://www.githubstatus.com/

### Critical Contacts

- **Slack:** `#alerts-production`
- **On-call Phone:** [Preencher]
- **Incident Commander:** [Preencher]

---

## Appendix: Related Documentation

- **Deployment Guide:** `DEPLOY.md`
- **Zero-Downtime Deployment:** `docs/ZERO_DOWNTIME_DEPLOY.md`
- **Disaster Recovery:** `DISASTER_RECOVERY.md`
- **Architecture:** `ARCHITECTURE.md`
- **Rollback Script:** `scripts/rollback.sh`
- **Deploy Script:** `scripts/deploy.sh`

---

**Última atualização:** 2025-11-15
**Próxima revisão:** Após primeiro incidente P0/P1 (validar procedures)
**Versão:** 1.0
