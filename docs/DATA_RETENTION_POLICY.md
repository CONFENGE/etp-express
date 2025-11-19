# Política de Retenção de Dados - ETP Express

Este documento define os períodos de retenção de dados pessoais e institucionais conforme exigido pela Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).

**Status:** Versão 1.0
**Última Atualização:** 2025-11-19
**Responsável:** Controlador de Dados (conforme política de privacidade)

---

## 1. Princípios de Retenção (LGPD)

Conforme Art. 6º da LGPD, o tratamento de dados pessoais deve observar:

- **Finalidade:** Retenção limitada ao cumprimento da finalidade que justificou a coleta
- **Necessidade:** Manter apenas pelo tempo necessário
- **Livre acesso:** Titular pode consultar e requerer eliminação quando aplicável

Conforme **Art. 15 e 16 da LGPD**, ao término do tratamento, os dados devem ser **eliminados**, exceto quando:

1. Cumprimento de obrigação legal ou regulatória
2. Estudo por órgão de pesquisa (anonimização)
3. Transferência a terceiro (com obrigações de LGPD mantidas)
4. Uso exclusivo do controlador (vedado acesso de terceiros, desde que anonimizados)

---

## 2. Períodos de Retenção por Categoria de Dados

### 2.1 Dados de Conta de Usuário

| Tipo de Dado | Tabela/Campo | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|--------------|---------------------|---------------------|-----------------|
| **Nome completo** | `users.name` | **Enquanto conta ativa** + 5 anos após inativação* | Execução de contrato, obrigação fiscal (Código Civil Art. 206) | Art. 7º, V (execução de contrato) |
| **Email** | `users.email` | **Enquanto conta ativa** + 5 anos após inativação* | Execução de contrato, obrigação fiscal | Art. 7º, V |
| **Senha (hash bcrypt)** | `users.password` | **Enquanto conta ativa** | Autenticação necessária para o serviço | Art. 7º, V |
| **Orgão/Instituição** | `users.orgao` | **Enquanto conta ativa** + 5 anos após inativação* | Contextualização institucional, auditoria | Art. 7º, V |
| **Cargo** | `users.cargo` | **Enquanto conta ativa** + 5 anos após inativação* | Contextualização institucional | Art. 7º, V |
| **Papel no sistema** | `users.role` | **Enquanto conta ativa** | Controle de acesso | Art. 7º, V |
| **Último login** | `users.lastLoginAt` | **Enquanto conta ativa** + 90 dias | Auditoria de segurança | Art. 7º, IX (legítimo interesse) |

> *Obrigação fiscal: Código Civil Art. 206, §3º, V (prescrição de 5 anos para prestação de serviços). Permite defesa em eventuais litígios.

**Critério de "conta ativa":**
- Conta é considerada **ativa** enquanto o usuário não solicitar exclusão OU não estiver inativa por mais de **2 anos** sem login.
- Após **2 anos de inatividade** (sem login), o sistema enviará notificação ao email cadastrado informando que a conta será excluída em **30 dias** se não houver resposta.

---

### 2.2 Dados de Conteúdo (ETPs e Seções)

| Tipo de Dado | Tabela/Campo | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|--------------|---------------------|---------------------|-----------------|
| **ETPs criados** | `etps.*` (título, metadata, status, etc.) | **Enquanto conta ativa** | Funcionalidade principal do serviço | Art. 7º, V (execução de contrato) |
| **Seções dos ETPs** | `etp_sections.content`, `etp_sections.userInput` | **Enquanto conta ativa** | Funcionalidade principal do serviço | Art. 7º, V |
| **Versões de ETPs** | `etp_versions.*` | **Enquanto conta ativa** | Controle de versão, auditoria de mudanças | Art. 7º, V, IX |
| **Metadados técnicos** | `createdById`, `updatedById` (FK) | **Enquanto conta ativa** | Rastreabilidade, integridade de dados | Art. 7º, V |

**Exclusão em cascata:**
- Quando o usuário solicita exclusão da conta OU sistema efetua purge por inatividade, todos os ETPs e seções associados são **deletados permanentemente**.
- Não há retenção de ETPs após exclusão do usuário criador.

**Exceção - Dados institucionais:**
- Se ETPs contêm dados de **interesse público** (ex: contratos licitados publicados), o controlador pode manter cópia anonimizada (sem vínculo ao userId) para fins de pesquisa/transparência, conforme Art. 7º, IV (estudos por órgão de pesquisa).

---

### 2.3 Logs de Auditoria e Segurança

| Tipo de Dado | Tabela/Campo | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|--------------|---------------------|---------------------|-----------------|
| **Audit Logs gerais** | `audit_logs.*` (userId, action, IP, userAgent) | **90 dias** | Segurança, detecção de fraudes, investigação de incidentes | Art. 7º, II (obrigação legal - segurança da informação) |
| **Secret Access Logs** | `secret_access_logs.*` (accessedBy, secretName, IP) | **90 dias** | Auditoria de segurança crítica, compliance SOC2 | Art. 7º, II |
| **Logs de aplicação** (Railway) | Stderr/Stdout da aplicação | **7 dias** (padrão Railway) | Debug, troubleshooting | Art. 7º, IX (legítimo interesse) |

**Justificativa para 90 dias:**
- NIST Cybersecurity Framework recomenda 90 dias como período mínimo para detecção de incidentes e investigação forense.
- Alinhado com práticas de mercado para SaaS.

**Processo de purge:**
- Cron job automatizado executa diariamente às 00:00 UTC
- DELETE permanente de registros com `createdAt < NOW() - INTERVAL '90 days'`

---

### 2.4 Dados de Analytics e Comportamento

| Tipo de Dado | Tabela/Campo | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|--------------|---------------------|---------------------|-----------------|
| **Analytics Events** | `analytics_events.*` (userId, eventType, IP, userAgent, sessionId, metadata) | **1 ano** (anonimizado após 30 dias) | Melhoria do serviço, análise de usabilidade | Art. 7º, IX (legítimo interesse) |
| **Analytics agregados** | Dashboards, métricas (não-pessoalizadas) | **Indefinido** | Análise de tendências (sem vínculo a indivíduos) | Não se aplica (anonimizado) |

**Anonimização após 30 dias:**
- Após 30 dias da coleta, o campo `userId` é substituído por hash irreversível: `SHA256(userId + salt)`.
- IP é truncado: `192.168.1.XXX` → `192.168.0.0/16`
- UserAgent é generalizado: versão específica removida

**Justificativa para 1 ano:**
- Análise de tendências sazonais requer pelo menos 12 meses de histórico.
- Anonimização torna os dados não-pessoais (Art. 12 LGPD), permitindo retenção estendida.

---

### 2.5 Backups e Disaster Recovery

| Tipo de Dado | Localização | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|-------------|---------------------|---------------------|-----------------|
| **Backups do PostgreSQL** | Railway backup storage (USA) | **30 dias** (rolling window) | Continuidade de negócio, disaster recovery | Art. 7º, V (execução de contrato), Art. 7º, IX |
| **Snapshots de banco** | Railway Point-in-Time Recovery | **7 dias** | Recuperação de falhas operacionais | Art. 7º, V |

**Implicações LGPD:**
- Quando um usuário solicita exclusão, os dados são removidos do banco **ativo** imediatamente.
- Dados podem persistir em **backups por até 30 dias adicionais**.
- Essa retenção residual é justificada por **legítimo interesse** em preservar integridade do backup para outros usuários.
- Após 30 dias, backups antigos são sobrescritos automaticamente (rolling window).

**Notificação ao titular:**
- Ao confirmar exclusão, sistema informa: "Seus dados foram removidos do sistema ativo. Backups técnicos podem conter dados por até 30 dias adicionais para garantir recuperação em caso de falha."

---

### 2.6 Dados de Comunicação (Emails, Notificações)

| Tipo de Dado | Localização | Período de Retenção | Justificativa Legal | Base Legal LGPD |
|--------------|-------------|---------------------|---------------------|-----------------|
| **Emails transacionais enviados** | Provedor de email (Railway/SMTP) | **Não armazenado pelo ETP Express** | N/A - gerenciado pelo provedor | N/A |
| **Histórico de notificações in-app** | Não implementado atualmente | N/A | N/A | N/A |

**Nota:** Sistema atualmente não armazena histórico de emails enviados. Se implementado no futuro, retenção deve ser de **90 dias**.

---

## 3. Processo de Purge Automatizado

### 3.1 Cronograma de Execução

| Frequência | Hora (UTC) | Alvo | Critério de Purge |
|------------|-----------|------|-------------------|
| **Diário** | 00:00 | `audit_logs` | `createdAt < NOW() - INTERVAL '90 days'` |
| **Diário** | 00:05 | `secret_access_logs` | `createdAt < NOW() - INTERVAL '90 days'` |
| **Diário** | 00:10 | `analytics_events` (anonimização) | `createdAt < NOW() - INTERVAL '30 days'` AND userId IS NOT NULL |
| **Diário** | 00:15 | `analytics_events` (purge completo) | `createdAt < NOW() - INTERVAL '1 year'` |
| **Semanal** | Domingo 01:00 | `users` (contas inativas) | `lastLoginAt < NOW() - INTERVAL '2 years'` AND `deletionNotificationSentAt < NOW() - INTERVAL '30 days'` |

### 3.2 Implementação Técnica

**Tecnologia:** Cron jobs via Railway ou node-cron

**Pseudocódigo:**

```typescript
// Exemplo: Purge de audit logs
async function purgeAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await auditLogRepository.delete({
    createdAt: LessThan(cutoffDate)
  });

  logger.info(`Purged ${result.affected} audit logs older than 90 days`);

  // Auditoria do próprio purge
  await auditLogRepository.save({
    action: 'PURGE_AUDIT_LOGS',
    performedBy: 'SYSTEM_CRON',
    metadata: { recordsDeleted: result.affected, cutoffDate }
  });
}
```

**Anonimização de analytics:**

```typescript
async function anonymizeAnalytics() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  await analyticsRepository
    .createQueryBuilder()
    .update()
    .set({
      userId: () => "SHA256(CONCAT(userId, :salt))",
      ipAddress: () => "CONCAT(SPLIT_PART(ipAddress, '.', 1), '.', SPLIT_PART(ipAddress, '.', 2), '.0.0')",
      userAgent: () => "REGEXP_REPLACE(userAgent, '[0-9]+\\.[0-9]+\\.[0-9]+', 'X.X.X')"
    })
    .where('createdAt < :cutoffDate', { cutoffDate })
    .andWhere('userId IS NOT NULL')
    .execute();
}
```

### 3.3 Verificação Pré-Purge

**Checklist antes de deletar:**
- [ ] Verificar se não há obrigação legal de retenção estendida (ex: processo judicial em andamento - **legal hold**)
- [ ] Confirmar que período de retenção foi respeitado
- [ ] Log de auditoria do purge foi registrado

---

## 4. Exceções à Política de Retenção

### 4.1 Legal Hold (Retenção por Litígio)

**Cenário:** Processo judicial, investigação criminal, ou solicitação de autoridade competente.

**Procedimento:**
1. DPO/Controlador recebe notificação oficial
2. Sistema marca usuário/dados com flag `legalHold: true`
3. Cron jobs de purge **ignoram** registros com legal hold
4. Dados são mantidos até resolução do processo + 30 dias

**Fundamentação legal:** Art. 7º, II (cumprimento de obrigação legal)

### 4.2 Obrigações Regulatórias Específicas

**Cenário:** Futura integração com órgãos governamentais que exijam retenção superior a 5 anos.

**Ação:**
- Atualizar esta política com justificativa específica
- Notificar titulares afetados
- Implementar controles de acesso restritos para dados retidos

### 4.3 Consentimento do Titular para Retenção Estendida

**Cenário:** Usuário solicita manutenção de dados além do período padrão (ex: para fins de portfólio profissional).

**Procedimento:**
1. Consentimento deve ser **livre, informado e inequívoco** (Art. 8º LGPD)
2. Finalidade específica deve ser documentada
3. Titular pode revogar a qualquer momento

---

## 5. Direito de Exclusão do Titular (Right to Erasure)

### 5.1 Término da Finalidade

**Art. 16, I LGPD:** Dados devem ser eliminados quando término da finalidade for verificado.

**Implementação:**
- Usuário pode solicitar exclusão a qualquer momento via **painel de configurações** (quando implementado - #113)
- Exclusão é **efetivada em até 15 dias úteis**
- Dados são removidos de forma irreversível (sem soft delete)

### 5.2 Exceções ao Direito de Exclusão

O sistema pode **recusar** exclusão se:

1. **Cumprimento de obrigação legal** (Art. 16, II LGPD)
   - Exemplo: Dados sob legal hold por processo judicial

2. **Exercício regular de direitos** (Art. 16, IV LGPD)
   - Exemplo: Defesa em litígio até prescrição (5 anos)

3. **Estudo por órgão de pesquisa** (Art. 16, III LGPD)
   - Apenas se anonimizado

**Notificação ao titular:**
- Se exclusão for recusada, titular é **notificado formalmente** com justificativa legal específica e prazo estimado para eliminação posterior.

---

## 6. Deleção em Cascata (Cascading Delete)

### 6.1 Entidades Dependentes

Quando um `User` é deletado, as seguintes entidades são deletadas **automaticamente** (ON DELETE CASCADE):

```sql
-- Configuração TypeORM
@Entity('etps')
export class Etp {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdBy: User;
}

@Entity('etp_sections')
export class EtpSection {
  @ManyToOne(() => Etp, { onDelete: 'CASCADE' })
  etp: Etp;
}

@Entity('etp_versions')
export class EtpVersion {
  @ManyToOne(() => Etp, { onDelete: 'CASCADE' })
  etp: Etp;
}
```

**Entidades deletadas em cascata:**
- `etps` (todos os ETPs criados pelo usuário)
- `etp_sections` (todas as seções dos ETPs)
- `etp_versions` (todas as versões dos ETPs)
- `analytics_events` (eventos de analytics associados - opcional, pode ser anonimizado)

### 6.2 Entidades Preservadas (Anonimizadas)

Algumas entidades **não** devem ser deletadas, mas sim **anonimizadas**:

- `audit_logs`: `userId` substituído por `NULL` ou hash, preservando histórico de ações do sistema
- `secret_access_logs`: `accessedBy` substituído por `"DELETED_USER_<hash>"`

**Justificativa:** Integridade de logs de segurança para auditoria futura (Art. 7º, II).

---

## 7. Anonimização vs Pseudonimização

### 7.1 Definições (LGPD Art. 5º)

| Técnica | Definição | Reversível? | Ainda é dado pessoal? | Exemplo no ETP Express |
|---------|-----------|-------------|----------------------|------------------------|
| **Anonimização** | Dados não podem mais ser associados ao titular | Não | Não (sai do escopo LGPD) | Analytics após hash irreversível + salt |
| **Pseudonimização** | Dados associados via identificador indireto | Sim (com info adicional) | Sim (ainda é pessoal) | userId em audit logs |

### 7.2 Aplicação no Sistema

**Anonimização (preferencial quando possível):**
- Analytics após 30 dias: userId → `SHA256(userId + salt_aleatório_descartado)`
- IP truncado: `192.168.1.123` → `192.168.0.0`

**Pseudonimização (quando rastreabilidade é necessária):**
- Audit logs mantêm userId (FK), mas acesso restrito a administradores
- Exclusão após 90 dias para evitar retenção indefinida

---

## 8. Monitoramento e Auditoria da Política

### 8.1 Indicadores de Conformidade

| Métrica | Frequência | Meta | Responsável |
|---------|-----------|------|-------------|
| % de registros purgados no prazo | Semanal | 100% | DBA/DevOps |
| Tempo médio de atendimento a exclusão | Mensal | < 15 dias úteis | Suporte |
| Falhas no cron de purge | Diário | 0 falhas | DevOps |
| Auditorias internas de retenção | Trimestral | 100% conformidade | DPO |

### 8.2 Logs de Purge

Cada execução de purge gera entrada em `audit_logs`:

```json
{
  "action": "PURGE_AUDIT_LOGS",
  "performedBy": "SYSTEM_CRON",
  "timestamp": "2025-11-19T00:00:00Z",
  "metadata": {
    "recordsDeleted": 1542,
    "cutoffDate": "2025-08-21",
    "tableName": "audit_logs"
  }
}
```

---

## 9. Notificações ao Titular

### 9.1 Conta Inativa (2 anos sem login)

**Trigger:** `lastLoginAt < NOW() - INTERVAL '2 years'`

**Email automático:**
```
Assunto: Sua conta ETP Express está inativa há 2 anos

Olá [nome],

Sua conta no ETP Express não é acessada desde [data último login].

Conforme nossa Política de Retenção de Dados, contas inativas por mais de 2 anos são excluídas automaticamente para proteger sua privacidade.

Sua conta será EXCLUÍDA em 30 dias se você não fizer login.

Para manter sua conta, basta acessar: [link de login]

Para excluir imediatamente: [link de exclusão]

Dúvidas? Contate [email suporte]
```

### 9.2 Confirmação de Exclusão

**Após exclusão efetivada:**
```
Assunto: Confirmação de exclusão de conta - ETP Express

Olá [nome],

Sua conta e todos os dados associados foram permanentemente excluídos do ETP Express.

Dados excluídos:
- Informações de perfil (nome, email, orgão, cargo)
- [X] ETPs criados
- [Y] seções geradas
- Histórico de ações

Dados residuais (serão removidos automaticamente):
- Backups técnicos: até 30 dias
- Logs anonimizados: até 90 dias

Se não solicitou esta exclusão, contate imediatamente: [email suporte]
```

---

## 10. Revisão e Atualização da Política

### 10.1 Gatilhos para Revisão

Esta política deve ser revisada quando:

1. **Mudanças na LGPD** ou regulamentações complementares
2. **Novas funcionalidades** que processam dados pessoais
3. **Integração com novos terceiros** (ex: novos provedores de LLM)
4. **Incidentes de segurança** que exponham limitações da política
5. **Auditoria anual** de compliance

### 10.2 Processo de Atualização

1. DPO/Controlador identifica necessidade de mudança
2. Revisão técnica com time de desenvolvimento
3. Revisão jurídica (se aplicável)
4. Atualização do versionamento do documento
5. Notificação aos titulares se mudança materialmente impactar direitos

---

## 11. Conformidade com LGPD - Checklist

- [x] **Art. 15:** Termo do tratamento - dados eliminados ao fim da finalidade ✅
- [x] **Art. 16:** Exceções claras (obrigação legal, litígio, anonimização) ✅
- [x] **Art. 18, VI:** Direito de exclusão implementável ✅
- [x] **Art. 6º, III:** Necessidade - dados mantidos pelo mínimo necessário ✅
- [x] **Art. 6º, V:** Transparência - política pública e acessível ✅

---

## 12. Referências Cruzadas

### 12.1 Issues Relacionadas

- **#191** - LGPD Data Mapping (inventário de dados) ✅
- **#192** - LGPD Consentimento e Termos de Uso
- **#193** - LGPD Criptografia de Dados
- **#194** - **ESTA ISSUE** - Política de Retenção ✅
- **#195** - LGPD Direitos do Titular
- **#196** - Política de Privacidade e Termos de Uso
- **#197** - Relatório Final de Conformidade LGPD
- **#113** - Automação de Export/Deletion (implementação técnica futura)

### 12.2 Documentos Relacionados

- `docs/LGPD_DATA_MAPPING.md` - Inventário de dados pessoais
- `docs/PRIVACY_POLICY.md` - (a criar em #196)
- `docs/TERMS_OF_SERVICE.md` - (a criar em #196)
- `ARCHITECTURE.md` - Padrões técnicos de implementação

---

## 13. Histórico de Versões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2025-11-19 | Claude (Engenheiro-Executor) | Versão inicial - Política completa de retenção conforme LGPD |

---

**Documento criado como parte da auditoria LGPD - Issue #194**

**Próximos Passos:**
1. Implementar cron jobs de purge automatizado (#113 - automação)
2. Adicionar campos de controle (`legalHold`, `deletionNotificationSentAt`) em `users` entity
3. Implementar endpoint de self-service de exclusão de conta (#113)
4. Referenciar esta política em `PRIVACY_POLICY.md` (#196)
