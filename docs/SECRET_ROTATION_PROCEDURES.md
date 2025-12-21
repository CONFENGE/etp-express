# Secret Rotation Procedures

Runbook completo para rotação de secrets do sistema ETP Express.

**Decisão de Arquitetura:** Railway Secrets + Automated Rotation via GitHub Actions

---

## Automated Rotation (Recommended)

A rotação de secrets é automatizada via GitHub Actions. O workflow executa mensalmente no primeiro dia de cada mês.

### GitHub Secrets Necessários

Configure os seguintes secrets no repositório GitHub (Settings → Secrets and variables → Actions):

| Secret | Descrição | Como Obter |
|--------|-----------|------------|
| `RAILWAY_API_TOKEN` | Token de API Railway | Railway Dashboard → Account Settings → Tokens → Create Token |
| `RAILWAY_PROJECT_ID` | ID do projeto Railway | Railway Dashboard → Project Settings → General |
| `RAILWAY_ENVIRONMENT_ID` | ID do environment de produção | Railway GraphQL API ou URL do dashboard |
| `RAILWAY_SERVICE_ID` | ID do serviço backend | Railway Dashboard → Service Settings |
| `SLACK_WEBHOOK_URL` | (Opcional) Webhook para notificações | Slack App → Incoming Webhooks |

### Executar Rotação Manual

1. Vá para **Actions** → **Rotate Secrets**
2. Clique em **Run workflow**
3. Selecione o secret a rotacionar (ou `all`)
4. Opcionalmente, marque **Dry run** para testar sem aplicar
5. Clique em **Run workflow**

### Executar Limpeza de OLD Secrets

Após 48h da rotação (período dual-key):

1. Vá para **Actions** → **Cleanup OLD Secrets**
2. Clique em **Run workflow**
3. Digite `CONFIRM` no campo de confirmação
4. Selecione os secrets a limpar (ou `all`)
5. Clique em **Run workflow**

### Monitoramento

- Issues de audit são criadas automaticamente após cada rotação
- Falhas geram issues P0 e notificações Slack (se configurado)
- Verifique Sentry para erros de autenticação após rotação

---

## Rotation Schedule

| Secret | Frequency | Last Rotated | Next Rotation | Risk Level |
| -------------- | --------- | ------------ | ------------- | ---------- |
| JWT_SECRET | Monthly | 2025-11-18 | 2025-12-18 | HIGH |
| SESSION_SECRET | Monthly | 2025-11-18 | 2025-12-18 | HIGH |
| OPENAI_API_KEY | Quarterly | 2025-11-18 | 2026-02-18 | MEDIUM |
| EXA_API_KEY | Quarterly | 2025-11-18 | 2026-02-18 | MEDIUM |
| DATABASE_URL | On-demand | N/A | N/A | CRITICAL |

**Calendar Reminders:**

- **Day 25 of each month:** Rotate JWT_SECRET + SESSION_SECRET
- **Quarterly dates (Feb, May, Aug, Nov):** Rotate API keys

---

## Dual-Key Rotation (Zero-Downtime)

### Overview

The system supports **dual-key rotation** for JWT_SECRET and SESSION_SECRET. During rotation, the system accepts tokens signed with both the old and new secrets, allowing for zero-downtime rotation.

### How Dual-Key Works

1. **Normal Operation**: Application uses only `JWT_SECRET` (primary)
2. **During Rotation**: Application accepts both `JWT_SECRET` (new) AND `JWT_SECRET_OLD` (old)
3. **After Rotation**: Remove `JWT_SECRET_OLD`, back to single-key mode

**Technical Implementation:**

- `JwtStrategy` validates tokens against both secrets when `JWT_SECRET_OLD` is configured
- New tokens are always generated with the primary `JWT_SECRET`
- Old tokens (signed with `JWT_SECRET_OLD`) remain valid during transition period

### Dual-Key Rotation Process

#### Day 0: Prepare New Secret

```bash
# Generate new secret
./scripts/rotate-secret.sh JWT_SECRET

# Note: Don't apply yet!
```

#### Day 0: Enable Dual-Key Mode

1. Go to Railway Dashboard → Variables
2. **Copy** current `JWT_SECRET` value
3. **Create** new variable `JWT_SECRET_OLD` with the old value
4. **Update** `JWT_SECRET` with the new secret
5. Save changes (triggers redeploy)

**Result:** System now accepts both old and new tokens

#### Day 1-2: Dual-Key Period

- Monitor for authentication errors
- Verify new logins work correctly
- Old tokens (signed with `JWT_SECRET_OLD`) still work
- All new tokens are signed with new `JWT_SECRET`

#### Day 3+: Remove Old Secret

1. Go to Railway Dashboard → Variables
2. **Delete** `JWT_SECRET_OLD`
3. Save changes

**Result:** Only new secret is valid, rotation complete

### Validation Commands

```bash
# Check if dual-key is active (look for warning in logs)
# "Dual-key rotation mode active: accepting both JWT_SECRET and JWT_SECRET_OLD"

# Test with old token (should work during dual-key period)
curl -H "Authorization: Bearer <old-token>" https://api.etp-express.com/auth/me

# Test with new token (should always work)
curl -H "Authorization: Bearer <new-token>" https://api.etp-express.com/auth/me
```

---

## JWT_SECRET Rotation

### Overview

JWT_SECRET is used to sign authentication tokens. With dual-key support, rotation no longer invalidates active user sessions.

### Pre-requisites

- [ ] Access to Railway Dashboard
- [ ] Backup of current secret value (store securely)
- [ ] Low-traffic period preferred (for monitoring, not required)

### Rotation Steps

#### 1. Generate New Secret

```bash
# Use the helper script
./scripts/rotate-secret.sh JWT_SECRET

# Or manually generate
openssl rand -base64 32
```

#### 2. Update in Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select **etp-express** project
3. Click on the **backend** service
4. Navigate to **Variables** tab
5. Find `JWT_SECRET` and click to edit
6. Paste the new value
7. Click **Save Changes**

#### 3. Wait for Redeploy

Railway automatically redeploys when variables change.

- Check deployment status in Railway Dashboard
- Wait for "Deployed" status (usually 30-60 seconds)

#### 4. Validate

- [ ] Check Railway logs for startup errors
- [ ] Test login: `POST /auth/login`
- [ ] Verify existing sessions still work (grace period)
- [ ] No 401 Unauthorized errors

#### 5. Update Documentation

Update the "Last Rotated" and "Next Rotation" dates in this document.

### Rollback Procedure

If rotation causes issues:

1. Go to Railway Dashboard → Variables
2. Update JWT_SECRET back to the old value
3. Save changes (triggers redeploy)
4. Investigate root cause before retrying

### Impact

- **Users affected:** None (dual-key rotation allows seamless transition)
- **Downtime:** Zero (Railway hot-swaps variables + dual-key support)
- **Risk:** Low (tokens signed with both secrets are valid during transition)

---

## SESSION_SECRET Rotation

### Overview

SESSION_SECRET is used for session management. Similar procedure to JWT_SECRET.

### Pre-requisites

- [ ] Access to Railway Dashboard
- [ ] Backup of current secret value

### Rotation Steps

#### 1. Generate New Secret

```bash
./scripts/rotate-secret.sh SESSION_SECRET
```

#### 2. Update in Railway Dashboard

Same as JWT_SECRET:

1. Railway Dashboard → Project → Service → Variables
2. Update `SESSION_SECRET`
3. Save Changes

#### 3. Validate

- [ ] Application starts without errors
- [ ] User sessions work correctly
- [ ] No errors in Railway logs

### Rollback

Revert to old value in Railway Dashboard.

---

## OPENAI_API_KEY Rotation

### Overview

OpenAI API key used for GPT-4 section generation.

### Pre-requisites

- [ ] Access to OpenAI Dashboard
- [ ] Access to Railway Dashboard

### Rotation Steps

#### 1. Create New API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Name it: `etp-express-prod-YYYY-MM`
4. Copy the key (shown only once!)

#### 2. Update in Railway Dashboard

1. Railway Dashboard → Project → Backend Service → Variables
2. Update `OPENAI_API_KEY`
3. Save Changes

#### 3. Validate

- [ ] Test section generation: `POST /sections/etp/:id/generate`
- [ ] Check Railway logs for OpenAI errors
- [ ] Verify response quality

#### 4. Revoke Old Key

**IMPORTANT:** Only after validation!

1. Go to OpenAI Dashboard → API Keys
2. Find the old key (by name or date)
3. Click delete/revoke
4. Confirm revocation

### Rollback

Create a new key (old one cannot be recovered after revocation).

---

## EXA_API_KEY Rotation

### Overview

Exa API key used for web search and research queries.

### Pre-requisites

- [ ] Access to Exa Dashboard
- [ ] Access to Railway Dashboard

### Rotation Steps

#### 1. Create New API Key

1. Go to [Exa Dashboard](https://dashboard.exa.ai/api-keys)
2. Generate new key
3. Copy immediately

#### 2. Update in Railway Dashboard

1. Update `EXA_API_KEY` in Railway
2. Save Changes

#### 3. Validate

- [ ] Test web search queries work
- [ ] Check logs for Exa API errors

#### 4. Revoke Old Key

After validation, revoke the old key in Exa dashboard.

---

## DATABASE_URL Rotation

### Overview

Database credentials rotation. **CRITICAL** - requires careful planning.

### Pre-requisites

- [ ] Database backup completed
- [ ] Low-traffic period
- [ ] Access to Railway PostgreSQL plugin

### Rotation Steps

#### 1. Access PostgreSQL Plugin

1. Railway Dashboard → Project → PostgreSQL plugin
2. Navigate to Settings or Credentials

#### 2. Generate New Credentials

Railway manages PostgreSQL internally. Options:

- Create new database user with permissions
- Update password for existing user

#### 3. Update DATABASE_URL

1. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
2. Update in Railway backend service variables
3. Save Changes

#### 4. Validate

- [ ] Application connects to database
- [ ] Test CRUD operations
- [ ] Check for connection errors in logs

### Rollback

Keep old credentials available until new ones validated.

### Warning

- DATABASE_URL rotation is rare
- Only rotate if credentials may be compromised
- Always backup database first

---

## Emergency Rotation Procedure

For compromised secrets:

### Immediate Actions

1. **Identify scope:** Which secret(s) compromised?
2. **Assess impact:** What data/systems affected?
3. **Rotate immediately:** Follow rotation steps above
4. **Audit logs:** Check for unauthorized access
5. **Notify:** Inform team and stakeholders

### Timeline

- **Detection:** Immediate action required
- **Rotation:** Within 15 minutes
- **Validation:** Within 30 minutes
- **Post-mortem:** Within 24 hours

### Incident Tracking

Create GitHub issue:

```
Title: [SEC][INCIDENT] Secret Compromise - SECRET_NAME
Labels: security, incident
```

---

## Audit Trail

### How to Track Rotations

1. **GitHub Issues:** Create issue for each rotation
 - Use template: `.github/ISSUE_TEMPLATE/rotate-secret.md`
 - Close when rotation complete

2. **This Document:** Update schedule table

3. **Railway Deployment Logs:** Automatic timestamp

### Monthly Rotation Report

At end of each month, create summary:

```markdown
## Secrets Rotation Report - MONTH YEAR

### Rotations Performed

- [ ] JWT_SECRET - Date - By: @username
- [ ] SESSION_SECRET - Date - By: @username

### Issues Encountered

- None / Description of issues

### Next Scheduled

- JWT_SECRET: Next month, Day 25
- API Keys: Quarterly date
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures After Rotation

**Cause:** JWT_SECRET changed, old tokens invalid
**Solution:** Users must re-login (expected behavior)

#### 2. API Calls Failing

**Cause:** API key invalid or not propagated
**Solution:**

- Verify key is correct in Railway
- Check Railway deployment completed
- Verify key active in provider dashboard

#### 3. Database Connection Errors

**Cause:** DATABASE_URL credentials incorrect
**Solution:**

- Verify format is correct
- Check PostgreSQL user permissions
- Rollback to old credentials if needed

#### 4. Railway Deployment Stuck

**Cause:** Invalid variable format
**Solution:**

- Check variable value for special characters
- Ensure no trailing whitespace
- Try re-saving the variable

---

## References

- [Railway Environment Variables](https://docs.railway.app/guides/variables)
- [OpenAI API Key Management](https://platform.openai.com/docs/guides/security)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- Decision Document: `docs/SECRETS_MANAGEMENT_EVALUATION.md`

---

**Last Updated:** 2025-11-19
**Maintainer:** Engineering Team
