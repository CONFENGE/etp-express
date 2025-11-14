# Disaster Recovery Playbook

## Política de Backup

- **Frequência:** Diária (3h AM UTC)
- **Retenção Railway:** 30 dias
- **Retenção Local:** 7 dias (backups manuais)
- **RTO (Recovery Time Objective):** < 1 hora
- **RPO (Recovery Point Objective):** < 24 horas
- **Responsável:** DevOps/Admin do projeto

---

## Configuração de Backups Automáticos Railway

### Instruções de Configuração

1. **Acesse o Railway Dashboard:**
   - URL: https://railway.app
   - Login com GitHub

2. **Navegue até o PostgreSQL Service:**
   - Projeto: ETP Express
   - Service: PostgreSQL

3. **Configure Backups Automáticos:**
   - Acesse: **Settings > Backups**
   - Configure:
     - **Frequency:** `Daily` (3h AM UTC)
     - **Retention:** `30 days`
     - **Snapshot before migrations:** `Enabled`

4. **Validação:**
   - Aguarde 24h
   - Verifique em **Backups** que snapshot foi criado
   - Confirme tamanho do backup (deve ser > 0 bytes)

### Verificação de Status de Backup

```bash
# No Railway CLI (opcional):
railway ps
railway logs --service postgresql | grep -i backup
```

---

## Procedimentos de Backup Manual

### Backup Manual (On-Demand)

Para criar um backup manual imediato:

```bash
./scripts/backup-db.sh
```

**Output esperado:**
```
🔄 Iniciando backup manual...
✅ Backup criado: backups/etp_express_20251114_143052.sql.gz
```

**Localização:** `backups/etp_express_YYYYMMDD_HHMMSS.sql.gz`

---

## Procedimentos de Restore

### 1. Restore de Backup Local

**Quando usar:** Deleção acidental recente, correção de dados específicos

```bash
./scripts/restore-db.sh backups/etp_express_YYYYMMDD_HHMMSS.sql.gz
```

**⚠️ ATENÇÃO:** Este comando **SOBRESCREVE** o database atual!

**Confirmação obrigatória:** Digite `yes` quando solicitado.

**Tempo estimado:** 5-15 minutos (dependendo do tamanho do backup)

---

### 2. Restore de Backup Railway

**Quando usar:** Disaster recovery de médio/grande porte, corrupção de dados

**Procedimento:**

1. **Acesse Railway Dashboard:**
   - Projeto: ETP Express > PostgreSQL Service

2. **Navegue até Backups:**
   - Clique em **Backups** (menu lateral)

3. **Selecione Snapshot:**
   - Escolha o snapshot desejado (por data/hora)
   - Verifique tamanho e timestamp

4. **Execute Restore:**
   - Clique em **Restore**
   - Confirme ação

5. **Aguarde Conclusão:**
   - Tempo estimado: 5-10 minutos
   - Status: "Restoring..." → "Active"

6. **Validação Pós-Restore:**
   ```bash
   # Conectar ao database
   psql $DATABASE_URL

   # Verificar contagem de registros
   SELECT COUNT(*) FROM etps;
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM sections;

   # Verificar último registro
   SELECT * FROM etps ORDER BY created_at DESC LIMIT 1;
   ```

---

## Verificação de Backup Recente

Para garantir que backups estão sendo executados:

```bash
./scripts/check-backup.sh
```

**Output esperado (backup recente):**
```
✅ Backup recente encontrado
📁 Arquivo: backups/etp_express_20251114_143052.sql.gz
🕒 Idade: 2 horas
```

**Output de falha (backup antigo):**
```
⚠️  Último backup tem mais de 24h!
📁 Arquivo: backups/etp_express_20251113_030000.sql.gz
```

---

## Cenários de Disaster Recovery

### Cenário 1: Deleção Acidental de ETP

**Sintomas:**
- Usuário reporta ETP desaparecido
- Registro não encontrado no sistema

**Diagnóstico:**
```sql
-- Verificar se ETP existe
SELECT * FROM etps WHERE id = '<etp-id>';

-- Verificar histórico de deleções (se audit log implementado)
SELECT * FROM audit_logs WHERE entity_type = 'ETP' AND entity_id = '<etp-id>' AND action = 'DELETE';
```

**Resolução:**

1. **Confirmar horário da deleção** (via logs ou relato do usuário)

2. **Identificar backup anterior ao incidente:**
   ```bash
   ls -lh backups/etp_express_*.sql.gz
   ```

3. **Restaurar apenas a row específica** (sem sobrescrever todo o DB):
   ```bash
   # Descompactar backup
   gunzip -c backups/etp_express_YYYYMMDD_HHMMSS.sql.gz > /tmp/backup_temp.sql

   # Extrair INSERT statement do ETP específico
   grep -A 50 "INSERT INTO etps" /tmp/backup_temp.sql | grep '<etp-id>' > /tmp/restore_etp.sql

   # Executar insert no database atual
   psql $DATABASE_URL < /tmp/restore_etp.sql

   # Limpar arquivos temporários
   rm /tmp/backup_temp.sql /tmp/restore_etp.sql
   ```

**Tempo de Recovery:** 10-15 minutos
**RTO:** ✅ < 1 hora

---

### Cenário 2: Migration Defeituosa

**Sintomas:**
- Aplicação quebrada após deploy
- Erros de schema: "column does not exist", "relation not found"
- Logs de erro no backend

**Diagnóstico:**
```bash
# Verificar logs do deploy
railway logs --service backend | tail -100

# Verificar migration aplicada
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;"
```

**Resolução:**

1. **Rollback imediato do deploy:**
   ```bash
   # Rollback para versão anterior (via Railway ou Git)
   git revert <commit-hash-da-migration>
   git push origin master
   ```

2. **Restore do snapshot Railway pré-migration:**
   - Acesse Railway Dashboard > PostgreSQL > Backups
   - Identifique snapshot **antes** do deploy defeituoso
   - Execute restore (ver seção "Restore de Backup Railway")

3. **Investigar falha na migration:**
   ```bash
   # Revisar arquivo de migration
   cat backend/src/migrations/<migration-file>.ts

   # Testar migration em database local
   npm run migration:run
   ```

4. **Corrigir migration e testar em staging:**
   ```bash
   # Criar nova migration corrigida
   npm run migration:generate -- -n FixBrokenMigration

   # Testar em staging
   DATABASE_URL=$STAGING_DATABASE_URL npm run migration:run
   ```

5. **Re-deploy após validação:**
   ```bash
   git add .
   git commit -m "fix(database): correct broken migration"
   git push origin master
   ```

**Tempo de Recovery:** 30-45 minutos
**RTO:** ✅ < 1 hora

---

### Cenário 3: Corrupção Total de Database

**Sintomas:**
- PostgreSQL não inicia
- Erros de corrupção: "invalid page header", "corrupted data"
- Database inacessível

**Diagnóstico:**
```bash
# Tentar conectar ao database
psql $DATABASE_URL

# Verificar logs do PostgreSQL no Railway
railway logs --service postgresql | grep -i error
```

**Resolução (Disaster Recovery Completo):**

1. **Provisionar novo PostgreSQL service no Railway:**
   - Railway Dashboard > New Service > PostgreSQL
   - Nome: `postgresql-recovery`

2. **Obter nova $DATABASE_URL:**
   ```bash
   railway variables --service postgresql-recovery
   ```

3. **Restore do último backup válido:**
   ```bash
   # Baixar último backup manual
   export NEW_DATABASE_URL="<nova-url-postgresql>"

   # Restore de backup local
   gunzip -c backups/etp_express_YYYYMMDD_HHMMSS.sql | psql $NEW_DATABASE_URL
   ```

   **OU restore de snapshot Railway:**
   - Railway Dashboard > postgresql-recovery > Backups
   - Restore do snapshot mais recente

4. **Atualizar $DATABASE_URL no backend:**
   ```bash
   # Railway Dashboard > Backend Service > Variables
   # Atualizar DATABASE_URL para nova conexão

   railway variables --service backend
   railway redeploy --service backend
   ```

5. **Verificar integridade de dados:**
   ```sql
   -- Conectar ao novo database
   psql $NEW_DATABASE_URL

   -- Verificar contagens
   SELECT
     (SELECT COUNT(*) FROM etps) as total_etps,
     (SELECT COUNT(*) FROM users) as total_users,
     (SELECT COUNT(*) FROM sections) as total_sections;

   -- Verificar datas de criação
   SELECT MIN(created_at), MAX(created_at) FROM etps;
   ```

6. **Retomar operação:**
   - Confirmar aplicação funcional
   - Notificar usuários sobre restore
   - Documentar incidente em post-mortem

7. **Remover database corrompido:**
   - Railway Dashboard > postgresql (antigo) > Delete Service

**Tempo de Recovery:** 30-45 minutos
**RTO:** ✅ < 1 hora
**RPO:** < 24 horas (último backup)

---

## Escalation Matrix

### Níveis de Severity

| Severity | Descrição | Exemplo | Tempo de Resposta |
|----------|-----------|---------|-------------------|
| **P0** | Sistema completamente fora do ar | Database corrompido, aplicação inacessível | **15 minutos** |
| **P1** | Funcionalidade crítica quebrada | Login não funciona, geração de ETP falha | **1 hora** |
| **P2** | Funcionalidade secundária afetada | Validação de seção lenta | **4 horas** |
| **P3** | Bug menor, não bloqueia usuário | Typo em mensagem de erro | **24 horas** |

### Responsáveis

- **First Responder:** DevOps Engineer (monitora alertas)
- **Escalation Engineer:** Backend Tech Lead
- **Incident Commander:** CTO/Tech Manager
- **Database Specialist:** PostgreSQL DBA (se necessário)

### Contatos (24/7)

- **DevOps Engineer:** [Nome] - [Email] - [Telefone]
- **Backend Tech Lead:** [Nome] - [Email] - [Telefone]
- **CTO:** [Nome] - [Email] - [Telefone]

---

## Communication Templates

### Template 1: Incident in Progress

```
🚨 INCIDENT REPORT

Status: INVESTIGATING / IN PROGRESS / RESOLVED
Severity: P0 / P1 / P2 / P3

Impact:
- [Descrição do impacto nos usuários]

Root Cause:
- [Causa raiz identificada ou "ainda investigando"]

Current Actions:
- [Ações sendo tomadas]

ETA for Resolution:
- [Estimativa de tempo para resolução]

Next Update:
- [Horário do próximo update]

Contact: [Nome do Incident Commander]
```

### Template 2: Incident Resolved

```
✅ INCIDENT RESOLVED

Incident ID: [ID]
Duration: [Tempo total de downtime]
Severity: P0 / P1 / P2 / P3

Summary:
- [Breve descrição do que aconteceu]

Root Cause:
- [Causa raiz confirmada]

Resolution:
- [Como foi resolvido]

Preventive Measures:
- [Ações para evitar recorrência]

Post-Mortem:
- [Link para documento de post-mortem se disponível]

Apologies for any inconvenience caused.
```

---

## Notas Importantes

### ⚠️ Avisos de Segurança

1. **NUNCA** commitar backups no Git (`.gitignore` previne isso)
2. **SEMPRE** validar integridade de dados pós-restore
3. **NUNCA** executar restore em produção sem confirmação explícita
4. **SEMPRE** testar restore em staging antes de produção (quando possível)

### 📋 Checklist Pré-Restore

- [ ] Confirmar horário exato do incidente
- [ ] Identificar último backup válido (anterior ao incidente)
- [ ] Notificar stakeholders sobre restore planejado
- [ ] Criar snapshot do estado atual (mesmo que corrompido)
- [ ] Documentar todos os passos executados
- [ ] Validar integridade de dados pós-restore

---

## Testes Regulares de Disaster Recovery

**Frequência:** Trimestral (a cada 3 meses)

**Procedimento de Teste (Staging):**

1. Criar database de teste Railway
2. Popular com dados de exemplo
3. Fazer backup manual
4. Dropar database de teste
5. Restaurar de backup
6. Validar que dados voltaram
7. Documentar tempo de recovery
8. Atualizar este playbook se necessário

**Responsável:** DevOps Engineer
**Próximo Teste Agendado:** [Data]

---

## Auditoria de Backups

### Verificação Semanal Automatizada

Adicionar ao cron ou GitHub Actions:

```yaml
# .github/workflows/backup-audit.yml
name: Backup Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Toda segunda-feira, 9h AM UTC

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check backup age
        run: ./scripts/check-backup.sh
      - name: Notify if backup old
        if: failure()
        run: |
          echo "⚠️ ALERTA: Backup desatualizado!"
          # Enviar notificação (Slack, email, etc.)
```

---

## Versionamento

- **Versão:** 1.0.0
- **Data de Criação:** 2025-11-14
- **Última Atualização:** 2025-11-14
- **Próxima Revisão:** 2026-02-14 (trimestral)

---

**Documento criado em conformidade com issue #45**
**Milestone:** M2: CI/CD Pipeline
