# Data Retention Policy - ETP Express

> **LGPD Compliance Document**
> Política de retenção de dados conforme Lei 13.709/2018 (LGPD) - Art. 15 e 16

**Versão:** 2.0.0
**Data:** 2025-11-21
**Responsável:** Equipe de Desenvolvimento
**Issue relacionada:** #264 (sub-issue de #86)

---

## 1. Visão Geral

Este documento define os períodos de retenção de dados pessoais no ETP Express, estabelecendo:

- Prazos de armazenamento por tipo de dado
- Procedimentos de exclusão automática
- Procedimentos de exclusão manual (a pedido do titular)
- Exceções legais e obrigações de guarda

**Base Legal:**
- **LGPD Art. 15:** Término do tratamento de dados
- **LGPD Art. 16:** Eliminação de dados após término do tratamento
- **LGPD Art. 18, VI:** Direito do titular à eliminação de dados

---

## 2. Períodos de Retenção por Tipo de Dado

### 2.1 Dados de Conta Ativa

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| Email | Enquanto conta ativa + 30 dias após exclusão | Autenticação e comunicação | Execução de contrato (Art. 7º, V) |
| Senha (hash) | Enquanto conta ativa | Autenticação | Execução de contrato (Art. 7º, V) |
| Nome | Enquanto conta ativa + 30 dias | Identificação do usuário | Execução de contrato (Art. 7º, V) |
| Órgão | Enquanto conta ativa | Contextualização de documentos | Consentimento (Art. 7º, I) |
| Cargo | Enquanto conta ativa | Contextualização de documentos | Consentimento (Art. 7º, I) |
| Role (perfil) | Enquanto conta ativa | Controle de acesso | Execução de contrato (Art. 7º, V) |
| isActive (status) | Enquanto conta ativa | Controle de acesso | Execução de contrato (Art. 7º, V) |
| lastLoginAt | 1 ano (rolling window)* | Segurança e auditoria | Interesse legítimo (Art. 7º, IX) |

*Nota: `lastLoginAt` é atualizado a cada login. Histórico anterior é sobrescrito.

### 2.2 Dados de Conta Inativa (Soft Deleted)

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| Todos os dados da conta | 30 dias após soft delete | Período de arrependimento (cancelamento de exclusão) | Interesse legítimo (Art. 7º, IX) |
| deletedAt (timestamp) | 30 dias | Rastreabilidade do pedido de exclusão | Obrigação legal (Art. 7º, II) |

**Importante:**
- Durante os 30 dias, o usuário pode cancelar a exclusão via token enviado por email
- Após 30 dias, a exclusão se torna **irreversível** (hard delete automático via cron)

### 2.3 Dados de Documentos (ETPs)

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| ETPs (tabela `etps`) | Enquanto conta ativa | Funcionalidade principal do serviço | Execução de contrato (Art. 7º, V) |
| Seções (tabela `etp_sections`) | Enquanto ETP existir | Conteúdo do documento | Execução de contrato (Art. 7º, V) |
| Metadata de ETPs | Enquanto ETP existir | Rastreabilidade e contextualização | Execução de contrato (Art. 7º, V) |

**Exclusão em cascata:**
- Quando uma conta é **soft deleted**, seus ETPs permanecem por 30 dias
- Quando uma conta é **hard deleted** (após 30 dias), todos os ETPs são removidos permanentemente

### 2.4 Logs de Auditoria

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| audit_logs (tabela) | 2 anos | Requisito de compliance e rastreabilidade | Obrigação legal (Art. 7º, II) + Interesse legítimo (Art. 7º, IX) |
| userId (referência) | 2 anos | Rastreabilidade de ações | Interesse legítimo (Art. 7º, IX) |
| ipAddress | 2 anos | Segurança e prevenção de fraude | Interesse legítimo (Art. 7º, IX) |
| userAgent | 2 anos | Segurança e debug | Interesse legítimo (Art. 7º, IX) |
| action (tipo de operação) | 2 anos | Auditoria de conformidade | Obrigação legal (Art. 7º, II) |
| changes (JSONB) | 2 anos | Histórico de alterações | Interesse legítimo (Art. 7º, IX) |

**Nota:** Logs de auditoria NÃO são removidos quando a conta é excluída, pois são necessários para compliance e investigação de incidentes.

### 2.5 Analytics

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| analytics_events (tabela) | 1 ano | Melhoria do serviço | Consentimento (Art. 7º, I) |
| sessionId | 1 ano | Rastreamento de sessão | Consentimento (Art. 7º, I) |
| ipAddress (analytics) | 1 ano | Geolocalização agregada | Consentimento (Art. 7º, I) |
| userAgent (analytics) | 1 ano | Análise de dispositivos | Consentimento (Art. 7º, I) |

**Nota:** Dados de analytics são **opcionais** e coletados apenas com consentimento explícito.

### 2.6 Comprovantes de Consentimento (Metadados LGPD)

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| lgpdConsentAt | Permanente | Comprovação de consentimento | Obrigação legal (Art. 7º, II) |
| lgpdConsentVersion | Permanente | Rastreabilidade de versão aceita | Obrigação legal (Art. 7º, II) |
| internationalTransferConsentAt | Permanente | Comprovação transferência internacional | Obrigação legal (Art. 7º, II) + Art. 33 |

**Nota:** Mesmo após exclusão de conta, os comprovantes de consentimento são preservados para defesa em eventual disputa legal.

### 2.7 Backups

| Tipo de Dado | Período de Retenção | Justificativa | Base Legal |
|--------------|---------------------|---------------|------------|
| Backups do PostgreSQL | 90 dias | Disaster recovery | Interesse legítimo (Art. 7º, IX) |
| Backups criptografados | 90 dias | Segurança da informação | Interesse legítimo (Art. 7º, IX) |

**Importante:**
- Backups contêm cópias de todos os dados do sistema (incluindo dados excluídos recentemente)
- Após 90 dias, backups antigos são **removidos permanentemente**
- Backups NÃO podem ser usados para "ressuscitar" contas excluídas após o período de retenção

---

## 3. Procedimentos de Exclusão

### 3.1 Exclusão Automática (Soft Delete → Hard Delete)

**Frequência:** Diária às 02:00 AM (BRT)
**Cron Job:** `@Cron(CronExpression.EVERY_DAY_AT_2AM)`
**Arquivo:** `backend/src/modules/users/users.service.ts:331`

**Processo:**
1. Sistema identifica contas com `deletedAt < (agora - 30 dias)`
2. Para cada conta identificada:
   - Remove permanentemente o registro da tabela `users`
   - Remove em cascata todos os ETPs e seções associados
   - Cria registro em `audit_logs` com ação `ACCOUNT_HARD_DELETED`
   - Preserva logs de auditoria anteriores (2 anos)
   - Preserva comprovantes de consentimento (permanente)
3. Loga estatísticas: `purgedCount`, `purgedAt`, `purgedUserIds`

**Código:**
```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async purgeDeletedAccounts(): Promise<{
  purgedCount: number;
  purgedAt: Date;
  purgedUserIds: string[];
}> {
  // Lógica implementada em users.service.ts:331
}
```

**Status de Implementação:** ✅ IMPLEMENTADO

### 3.2 Exclusão Manual (Pedido do Titular)

**Endpoint:** `DELETE /users/me`
**Autenticação:** JWT obrigatório
**Arquivo:** `backend/src/modules/users/users.controller.ts:214`

**Processo:**
1. Usuário autenticado solicita exclusão da conta via API
2. Sistema valida token de confirmação (dupla verificação)
3. Sistema realiza **soft delete**:
   - Define `deletedAt = now()`
   - Define `isActive = false`
   - Calcula `scheduledDeletionDate = deletedAt + 30 dias`
4. Sistema envia email de confirmação com:
   - Data agendada para exclusão permanente
   - Token para cancelamento de exclusão (válido por 30 dias)
5. Usuário tem 30 dias para cancelar via `POST /users/cancel-deletion`
6. Após 30 dias, exclusão permanente automática via cron

**Código:**
```typescript
async softDeleteAccount(
  userId: string,
  confirmationToken: string,
): Promise<{ scheduledDeletionDate: Date }> {
  // Lógica implementada em users.service.ts:212
}
```

**Status de Implementação:** ✅ IMPLEMENTADO

### 3.3 Cancelamento de Exclusão (Arrependimento)

**Endpoint:** `POST /users/cancel-deletion`
**Período:** Até 30 dias após soft delete
**Arquivo:** `backend/src/modules/users/users.service.ts:279`

**Processo:**
1. Usuário clica no link de cancelamento no email
2. Sistema valida token JWT
3. Sistema verifica se `deletedAt` ainda é `< 30 dias`
4. Sistema **reverte soft delete**:
   - Define `deletedAt = null`
   - Define `isActive = true`
   - Restaura acesso completo à conta
5. Cria registro em `audit_logs` com ação `ACCOUNT_DELETION_CANCELLED`

**Status de Implementação:** ✅ IMPLEMENTADO

### 3.4 Purge Manual (Admin - Testing)

**Endpoint:** `POST /users/admin/purge-deleted`
**Autenticação:** JWT + Role `ADMIN` obrigatório
**Arquivo:** `backend/src/modules/users/users.controller.ts:383`

**Processo:**
- Dispara manualmente o cron job de purge
- Útil para testes ou limpeza imediata sem aguardar cron
- **⚠️ ATENÇÃO:** Remove permanentemente todos os dados de usuários soft-deleted há mais de 30 dias

**Status de Implementação:** ✅ IMPLEMENTADO

---

## 4. Gaps de Implementação Identificados

### 4.1 ❌ GAP: Purge de Analytics Events

**Problema:**
- Tabela `analytics_events` tem retenção de 1 ano (conforme DATA_MAPPING.md)
- **NÃO** existe cron job para purge automático de eventos antigos

**Impacto:** Violação potencial da LGPD (retenção além do prazo definido)

**Solução Proposta:**
```typescript
// backend/src/modules/analytics/analytics.service.ts
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async purgeOldAnalyticsEvents(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // 1 ano atrás

  await this.analyticsEventsRepository.delete({
    createdAt: LessThan(cutoffDate),
  });
}
```

**Issue recomendada:** Criar issue para implementação de purge de analytics

### 4.2 ❌ GAP: Purge de Audit Logs

**Problema:**
- Tabela `audit_logs` tem retenção de 2 anos (conforme DATA_MAPPING.md)
- **NÃO** existe cron job para purge automático de logs antigos

**Impacto:** Violação potencial da LGPD (retenção além do prazo definido)

**Solução Proposta:**
```typescript
// backend/src/modules/audit/audit.service.ts
@Cron(CronExpression.EVERY_WEEK)
async purgeOldAuditLogs(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // 2 anos atrás

  await this.auditLogsRepository.delete({
    createdAt: LessThan(cutoffDate),
  });
}
```

**Issue recomendada:** Criar issue para implementação de purge de audit logs

### 4.3 ❌ GAP: Purge de lastLoginAt

**Problema:**
- Campo `lastLoginAt` tem retenção de 1 ano (rolling window)
- Atualmente, o campo é **sobrescrito** a cada login (comportamento correto)
- No entanto, para usuários inativos (sem login há >1 ano), o campo **não é limpo**

**Impacto:** Baixo (dados de login antigos em contas inativas)

**Solução Proposta:**
```typescript
// backend/src/modules/users/users.service.ts
@Cron(CronExpression.EVERY_MONTH)
async purgeOldLastLoginDates(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // 1 ano atrás

  await this.usersRepository.update(
    { lastLoginAt: LessThan(cutoffDate) },
    { lastLoginAt: null },
  );
}
```

**Issue recomendada:** Criar issue para limpeza de lastLoginAt em contas inativas

### 4.4 ✅ OK: Purge de Backups

**Status:** Railway gerencia backups automaticamente
- Backups são removidos após 90 dias pelo provedor
- Não requer implementação no código da aplicação

### 4.5 ✅ OK: Soft Delete de Usuários

**Status:** IMPLEMENTADO
- Cron diário às 02:00 AM
- Purge automático de contas soft-deleted há >30 dias
- Arquivo: `backend/src/modules/users/users.service.ts:331`

---

## 5. Exceções Legais

### 5.1 Dados Preservados Permanentemente

Os seguintes dados **NÃO** são removidos mesmo após exclusão de conta, devido a obrigações legais:

| Dado | Período | Justificativa Legal |
|------|---------|---------------------|
| lgpdConsentAt | Permanente | Comprovação de consentimento (defesa legal) |
| lgpdConsentVersion | Permanente | Rastreabilidade de versão aceita |
| internationalTransferConsentAt | Permanente | Comprovação de transferência internacional (Art. 33) |
| Logs de auditoria | 2 anos | Requisito de compliance (Art. 37 - registro de operações) |

**Base Legal:**
- **LGPD Art. 16, I:** Obrigação legal ou regulatória
- **LGPD Art. 16, III:** Uso exclusivo do controlador (vedado acesso a terceiros)

### 5.2 Casos Especiais

**Investigação de Fraude:**
- Logs podem ser preservados além de 2 anos se houver investigação em andamento
- Requer decisão judicial ou ordem de autoridade competente

**Disputa Judicial:**
- Dados podem ser preservados até conclusão do processo judicial
- Requer notificação ao titular e à ANPD

---

## 6. Procedimento de Verificação de Conformidade

### 6.1 Checklist de Auditoria (Trimestral)

- [ ] Verificar execução do cron de purge de usuários (logs diários)
- [ ] Verificar se há contas soft-deleted há >30 dias (deve ser zero)
- [ ] Verificar se há audit logs com >2 anos (deve ser zero após implementação)
- [ ] Verificar se há analytics events com >1 ano (deve ser zero após implementação)
- [ ] Verificar backups antigos no Railway (devem ser <90 dias)
- [ ] Revisar política de retenção em caso de mudanças no sistema

### 6.2 Relatório de Compliance

**Frequência:** Trimestral
**Responsável:** Equipe de Desenvolvimento + DPO (quando designado)
**Formato:** Documento com evidências de conformidade

**Conteúdo:**
1. Total de purges executados no trimestre
2. Total de usuários removidos permanentemente
3. Total de cancelamentos de exclusão
4. Total de audit logs removidos (após implementação)
5. Total de analytics events removidos (após implementação)
6. Evidências de logs de cron jobs

---

## 7. Responsabilidades

| Atividade | Responsável |
|-----------|-------------|
| Execução automática de purges | Sistema (cron jobs) |
| Monitoramento de cron jobs | DevOps / SRE |
| Auditoria trimestral | Equipe de Desenvolvimento |
| Revisão anual da política | DPO + Jurídico |
| Resposta a pedidos de titulares | Suporte ao Usuário |
| Investigação de incidentes | Equipe de Segurança |

---

## 8. Revisão da Política

**Frequência de revisão:** Anual ou quando houver mudanças significativas no sistema

**Critérios para revisão:**
- Novas funcionalidades que coletam dados pessoais
- Mudanças na LGPD ou regulamentações correlatas
- Decisões da ANPD que impactem retenção de dados
- Incidentes de segurança que revelem gaps
- Recomendações de auditoria externa

---

## 9. Referências

- **LGPD:** Lei 13.709/2018 - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- **Art. 15:** Término do tratamento de dados
- **Art. 16:** Eliminação de dados
- **Art. 18, VI:** Direito à eliminação
- **Art. 37:** Registro das operações de tratamento
- **ANPD Guia de Boas Práticas:** https://www.gov.br/anpd/pt-br

**Documentos relacionados:**
- `docs/DATA_MAPPING.md` - Mapeamento de fluxo de dados pessoais (#261)
- `backend/src/modules/users/users.service.ts` - Implementação de soft/hard delete
- `ARCHITECTURE.md` - Arquitetura do sistema

---

## 10. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0.0 | 2025-11-19 | Claude Code | Versão inicial (Issue #194) |
| 2.0.0 | 2025-11-21 | Claude Code | Revisão completa baseada no DATA_MAPPING.md (#261) - Issue #264 |

---

**Este documento deve ser revisado anualmente ou quando houver alterações significativas no tratamento de dados pessoais.**
