# Disaster Recovery Testing Log

## Teste de Restore #1 - 2025-11-15

### Setup
- **Database de Produção:** Railway PostgreSQL (DATABASE_URL)
- **Database de Teste:** PostgreSQL local via Docker (postgres:15)
- **Backup Testado:** `etp_express_20251115_125703.sql.gz` (52 bytes)

### Procedimento Executado

```bash
# 1. Criar database temporário para teste
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15

# 2. Configurar variáveis de ambiente
export DATABASE_URL="<production-database-url>"
export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"

# 3. Executar teste de restore
chmod +x scripts/test-restore.sh
./scripts/test-restore.sh
```

### Resultados Esperados

| Métrica | Produção | Teste | Status |
|---------|----------|-------|--------|
| ETPs | X | X | ✅ |
| Sections | Y | Y | ✅ |
| Users | Z | Z | ✅ |
| Checksum ETPs | abc123 | abc123 | ✅ |

### Timings (RTO Real)

- Backup generation: ~1 min
- Restore execution: ~2-5 min (depende do tamanho)
- Validation: ~30 sec
- **Total RTO: ~5-7 min** (meta: < 60 min) ✅

### RPO Real

- Backups automáticos: Diários (3h AM UTC)
- **RPO: < 24h** (meta: < 24h) ✅

### Validação de Integridade

O script `test-restore.sh` valida:

1. **Contagem de registros**: ETPs, Sections, Users
2. **Checksum MD5**: Hash dos IDs de ETPs (garante ordem e completude)
3. **Comparação automática**: Produção vs Teste

### Issues Encontradas

#### Issue #1: Backup vazio (52 bytes)
- **Causa:** Database de produção ainda não possui dados reais
- **Impacto:** Teste de restore não pode ser executado com dados reais
- **Resolução:** Script validado sintaticamente. Executar teste real após deploy em produção.

### Ações Tomadas

- ✅ Scripts `test-restore.sh` e `validate-backup.sh` criados
- ✅ Workflow CI `backup-validation.yml` configurado
- ✅ Documentação de disaster recovery atualizada
- Teste de restore real aguardando database de produção com dados

---

## Próximo Teste Agendado

- **Data:** Após primeiro deploy em produção (quando houver dados reais)
- **Tipo:** Restore completo manual (via `test-restore.sh`)
- **Automação:** Workflow CI executa validação semanal (segunda-feira 9h UTC)

---

## Instruções para Execução Manual Futura

### Pré-requisitos

1. Database de produção com dados reais
2. Docker instalado
3. PostgreSQL client (`psql`) instalado
4. Variável `DATABASE_URL` configurada

### Comandos

```bash
# 1. Provisionar database temporário
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15

# 2. Configurar variáveis
export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"

# 3. Executar teste
./scripts/test-restore.sh

# 4. Limpar container após teste
docker stop test-postgres
docker rm test-postgres
```

### Output Esperado

```
 Step 1: Gerando backup de produção...
✅ Backup criado: backups/etp_express_YYYYMMDD_HHMMSS.sql.gz
 Backup: backups/etp_express_YYYYMMDD_HHMMSS.sql.gz

 Step 2: Restaurando em database de teste...
(SQL output)

 Step 3: Validando integridade de dados...

 Resultados da Validação:
============================
ETPs: Prod=XX | Test=XX
Sections: Prod=YY | Test=YY
Users: Prod=ZZ | Test=ZZ
Checksum ETPs: Prod=abc123 | Test=abc123

✅ RESTORE VALIDADO COM SUCESSO
✅ Integridade: 100%
```

---

## Validação Automatizada (CI)

### Workflow: `backup-validation.yml`

- **Frequência:** Toda segunda-feira 9h UTC
- **Trigger manual:** Via GitHub Actions `workflow_dispatch`
- **Validações:**
 - Backup existe e tem < 24h
 - Arquivo `.sql.gz` não está corrompido (gunzip -t)
 - Tamanho do backup registrado

### Como Executar Manualmente

1. Acesse GitHub Actions
2. Selecione workflow "Backup Validation"
3. Clique em "Run workflow"
4. Aguarde execução
5. Verifique artifacts (backup salvo por 7 dias)

---

## Critérios de Sucesso

- [x] Scripts de restore e validação criados
- [x] Workflow CI configurado
- [x] Documentação completa
- [ ] Teste de restore real executado (aguardando dados de produção)
- [x] RTO < 60 min (validado teoricamente)
- [x] RPO < 24h (validado pela política de backup diário)

---

## Próximos Passos

1. **Após deploy em produção:** Executar `test-restore.sh` manualmente
2. **Após teste bem-sucedido:** Atualizar este documento com dados reais
3. **Mensalmente:** Executar restore completo manual (além do CI semanal)
4. **Anualmente:** Simular cenário de disaster recovery completo (issue #107)
