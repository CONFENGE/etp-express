# Smoke Test Report - ETP Express

**Data de Execucao:** 2025-12-14 19:28 UTC
**Ambiente:** Production (Railway)
**Executado por:** Claude Code (Issue #674)

---

## Resumo Executivo

| Categoria      | Status         | Itens Passando | Total   |
| -------------- | -------------- | -------------- | ------- |
| Backend Health | ⚠️ PARCIAL     | 2/4            | 50%     |
| Frontend       | ✅ PASSOU      | 3/4            | 75%     |
| Integracao     | ❌ FALHOU      | 0/4            | 0%      |
| **Total**      | **⚠️ PARCIAL** | **5/12**       | **42%** |

**Veredicto:** Sistema NAO ESTA pronto para go-live. Correcoes necessarias.

---

## URLs de Producao

| Servico  | URL                                                    |
| -------- | ------------------------------------------------------ |
| Backend  | https://etp-express-backend-production.up.railway.app  |
| Frontend | https://etp-express-frontend-production.up.railway.app |

> **IMPORTANTE:** URLs legado (`etp-express-backend.railway.app`) NAO funcionam - retornam pagina padrao do Railway.

---

## 1. Backend Health Checks

### 1.1 Liveness Check

| Endpoint      | Esperado | Resultado     | Status    |
| ------------- | -------- | ------------- | --------- |
| `/api/health` | 200 OK   | 404 Not Found | ❌ FALHOU |

**Evidencia:**

```json
{
  "statusCode": 404,
  "message": "Cannot GET /api/health",
  "disclaimer": "O ETP Express pode cometer erros..."
}
```

**Acao Necessaria:** Verificar se HealthController esta registrado corretamente com VERSION_NEUTRAL.

### 1.2 API Responde

| Endpoint             | Esperado           | Resultado        | Status    |
| -------------------- | ------------------ | ---------------- | --------- |
| `/api/v1/etps`       | 401 (Unauthorized) | 401 Unauthorized | ✅ PASSOU |
| `/api/v1/auth/login` | Resposta JSON      | Resposta JSON    | ✅ PASSOU |

**Evidencia:**

```json
{
  "statusCode": 401,
  "message": "Token invalido ou expirado"
}
```

### 1.3 Database Connection

| Check      | Esperado  | Resultado                   | Status            |
| ---------- | --------- | --------------------------- | ----------------- |
| Migrations | Aplicadas | Sem endpoint para verificar | ⚠️ NAO VERIFICADO |

**Acao Necessaria:** Criar endpoint `/api/health/ready` que verifica migrations.

### 1.4 External Services

| Servico      | Esperado  | Resultado                  | Status            |
| ------------ | --------- | -------------------------- | ----------------- |
| Exa API      | 200 OK    | 401 Unauthorized           | ❌ FALHOU         |
| Redis/BullMQ | Conectado | Nao verificado diretamente | ⚠️ NAO VERIFICADO |

**Evidencia (logs Railway):**

```
ERROR [ExaService] Exa ping failed after 57ms
ERROR Request failed with status code 401
```

**Acao Necessaria:** Renovar/corrigir EXA_API_KEY em Railway Variables.

### 1.5 Observabilidade

| Servico        | Esperado    | Resultado       | Status     |
| -------------- | ----------- | --------------- | ---------- |
| Sentry Backend | Configurado | NAO configurado | ⚠️ WARNING |
| SMTP Email     | Configurado | NAO configurado | ⚠️ WARNING |

**Evidencia (logs Railway):**

```
WARN [EmailService] SMTP configuration not found. Emails will be logged to console only.
WARN [SentryConfig] SENTRY_DSN not configured. Error tracking disabled.
```

---

## 2. Frontend Checks

### 2.1 Carregamento

| Check          | Esperado         | Resultado                                     | Status    |
| -------------- | ---------------- | --------------------------------------------- | --------- |
| App carrega    | Pagina de login  | Pagina de login                               | ✅ PASSOU |
| Titulo         | "ETP Express..." | "ETP Express - Estudos Tecnicos Preliminares" | ✅ PASSOU |
| Console errors | Nenhum critico   | Warning Sentry apenas                         | ✅ PASSOU |

**Console Warning:**

```
[WARNING] [Sentry] VITE_SENTRY_DSN not configured. Error tracking disabled.
```

### 2.2 Elementos da Pagina de Login

| Elemento            | Esperado | Resultado                   | Status    |
| ------------------- | -------- | --------------------------- | --------- |
| Campo Email         | Presente | Presente com placeholder    | ✅ PASSOU |
| Campo Senha         | Presente | Presente com toggle         | ✅ PASSOU |
| Botao Entrar        | Presente | Presente                    | ✅ PASSOU |
| Link Esqueceu Senha | Presente | Presente (/forgot-password) | ✅ PASSOU |
| Link Cadastre-se    | Presente | Presente (/register)        | ✅ PASSOU |

### 2.3 Login Flow

| Check           | Esperado                | Resultado                 | Status    |
| --------------- | ----------------------- | ------------------------- | --------- |
| Login funcional | Redirect para dashboard | NAO TESTADO (sem usuario) | ❌ FALHOU |

**Acao Necessaria:** Executar seed:admin em producao.

---

## 3. Integracao (Auth + CRUD)

### 3.1 Autenticacao JWT

| Check       | Esperado  | Resultado                   | Status    |
| ----------- | --------- | --------------------------- | --------- |
| Login admin | Token JWT | 401 - Credenciais invalidas | ❌ FALHOU |
| Login demo  | Token JWT | 401 - Credenciais invalidas | ❌ FALHOU |

**Credenciais Testadas:**

- `demoetp@confenge.com.br` / `teste2026` - FALHOU
- `tiago@confenge.com.br` / `[senha]` - NAO TESTADO (sensivel)

**Evidencia:**

```json
{
  "statusCode": 401,
  "message": "Email ou senha incorretos. Verifique suas credenciais e tente novamente."
}
```

**Acao Necessaria:** Executar `npm run seed:admin:prod` em Railway.

### 3.2 CRUD ETP

| Check      | Esperado                 | Resultado              | Status       |
| ---------- | ------------------------ | ---------------------- | ------------ |
| Create ETP | ETP criado               | NAO TESTADO (sem auth) | ❌ BLOQUEADO |
| List ETPs  | Lista vazia ou com dados | NAO TESTADO (sem auth) | ❌ BLOQUEADO |

### 3.3 Geracao de Secoes

| Check          | Esperado        | Resultado                         | Status       |
| -------------- | --------------- | --------------------------------- | ------------ |
| Generate sync  | Secao gerada    | NAO TESTADO (sem auth + Exa down) | ❌ BLOQUEADO |
| Generate async | JobId retornado | NAO TESTADO (sem auth)            | ❌ BLOQUEADO |

### 3.4 Export

| Check      | Esperado    | Resultado                        | Status       |
| ---------- | ----------- | -------------------------------- | ------------ |
| Export PDF | PDF baixado | NAO TESTADO (sem auth + sem ETP) | ❌ BLOQUEADO |

---

## 4. Problemas Criticos Encontrados

### P0 - BLOQUEADORES

| #   | Problema                     | Impacto                  | Acao                                  |
| --- | ---------------------------- | ------------------------ | ------------------------------------- |
| 1   | **Seed admin NAO executado** | Login impossivel         | `railway run npm run seed:admin:prod` |
| 2   | **Exa API 401**              | Geracao de secoes falha  | Renovar EXA_API_KEY                   |
| 3   | **Health endpoints 404**     | Monitoramento impossivel | Verificar HealthModule                |

### P1 - WARNINGS

| #   | Problema                  | Impacto                    | Acao                        |
| --- | ------------------------- | -------------------------- | --------------------------- |
| 4   | Sentry NAO configurado    | Sem error tracking         | Definir SENTRY_DSN          |
| 5   | SMTP NAO configurado      | Emails apenas console      | Definir variaveis SMTP      |
| 6   | URLs legado nao funcionam | Documentacao desatualizada | Atualizar DEPLOY_RAILWAY.md |

---

## 5. Acoes Imediatas Requeridas

### Antes do Go-Live (OBRIGATORIO)

1. **Executar seed de usuarios**

   ```bash
   railway run npm run seed:admin:prod --service etp-express-backend
   ```

2. **Renovar Exa API Key**

   ```bash
   railway variables set EXA_API_KEY=<nova-key> --service etp-express-backend
   ```

3. **Verificar HealthController**
   - Investigar porque `/api/health` retorna 404
   - Verificar registro do HealthModule em AppModule

### Recomendado

4. **Configurar Sentry**

   ```bash
   railway variables set SENTRY_DSN=<dsn> --service etp-express-backend
   railway variables set VITE_SENTRY_DSN=<dsn> --service etp-express-frontend
   ```

5. **Atualizar documentacao**
   - URLs de producao corretas em DEPLOY_RAILWAY.md
   - Remover referencias a URLs legado

---

## 6. Re-teste Apos Correcoes

Apos aplicar as correcoes acima, re-executar este smoke test com:

```bash
/pick-next-issue  # Se houver issue de fix criada
# OU
# Re-executar checklist manualmente
```

### Checklist de Re-teste

- [ ] Health check `/api/health` retorna 200
- [ ] Login com admin funciona
- [ ] Login com demo funciona
- [ ] Create ETP funciona
- [ ] Generate Section funciona (Exa)
- [ ] Export PDF funciona
- [ ] Sentry captura erros de teste

---

## Historico

| Data       | Versao | Resultado  | Notas                                              |
| ---------- | ------ | ---------- | -------------------------------------------------- |
| 2025-12-14 | 1.0    | 42% (5/12) | Primeira execucao - problemas criticos encontrados |

---

**Proximos Passos:**

1. Criar issue P0 para correcoes criticas
2. Executar correcoes
3. Re-executar smoke test
4. Aprovar para go-live quando 100%
