# Data Mapping - ETP Express

> **LGPD Compliance Document**
> Mapeamento de dados pessoais conforme Lei 13.709/2018 (LGPD)

**Versão:** 1.0.0
**Data:** 2025-11-21
**Responsável:** Equipe de Desenvolvimento
**Issue relacionada:** #261 (sub-issue de #86)

---

## 1. Visão Geral

Este documento mapeia todos os dados pessoais coletados, armazenados e processados pelo sistema ETP Express, identificando:

- Quais dados são coletados
- Finalidade de cada dado
- Base legal para tratamento
- Período de retenção
- Compartilhamento com terceiros

---

## 2. Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE DADOS PESSOAIS                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌─────────────────┐     ┌──────────────────────────────┐
│   USUÁRIO    │────▶│   FRONTEND      │────▶│         BACKEND              │
│  (Titular)   │     │   (React)       │     │         (NestJS)             │
└──────────────┘     └─────────────────┘     └───────────┬──────────────────┘
      │                      │                           │
      │ Dados de entrada:    │ Transmissão:              │ Processamento:
      │ - Nome               │ - HTTPS/TLS               │ - Validação
      │ - Email              │ - JWT Token               │ - Sanitização PII
      │ - Órgão              │                           │ - Hash de senha
      │ - Cargo              │                           │
      │ - Dados do ETP       │                           │
      │                      │                           │
      │                      │                           ▼
      │                      │           ┌──────────────────────────────────┐
      │                      │           │        ARMAZENAMENTO             │
      │                      │           │      (PostgreSQL/Railway)        │
      │                      │           │                                  │
      │                      │           │  Tabelas:                        │
      │                      │           │  - users (dados pessoais)        │
      │                      │           │  - etps (documentos)             │
      │                      │           │  - etp_sections (conteúdo)       │
      │                      │           │  - audit_logs (rastreabilidade)  │
      │                      │           │  - analytics_events (métricas)   │
      │                      │           └──────────────────────────────────┘
      │                      │                           │
      │                      │                           ▼
      │                      │           ┌──────────────────────────────────┐
      │                      │           │   PROCESSAMENTO EXTERNO          │
      │                      │           │   (Transferência Internacional)  │
      │                      │           │                                  │
      │                      │           │  ┌─────────────┐ ┌────────────┐  │
      │                      │           │  │   OpenAI    │ │ Perplexity │  │
      │                      │           │  │   (EUA)     │ │   (EUA)    │  │
      │                      │           │  └─────────────┘ └────────────┘  │
      │                      │           │                                  │
      │                      │           │  Dados enviados:                 │
      │                      │           │  - Conteúdo do ETP (sanitizado)  │
      │                      │           │  - Prompts de geração            │
      │                      │           │  - NÃO: Dados pessoais diretos   │
      │                      │           └──────────────────────────────────┘
      │                      │
      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         MEDIDAS DE PROTEÇÃO                                   │
│  - PII Redaction antes de envio para APIs externas                           │
│  - Criptografia em trânsito (TLS 1.2+)                                       │
│  - Hash de senhas (bcrypt)                                                   │
│  - Consentimento explícito para transferência internacional                  │
│  - Logs de auditoria para rastreabilidade                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Inventário de Dados Pessoais

### 3.1 Tabela `users` (Dados Cadastrais)

| Campo | Tipo | Dado Pessoal | Finalidade | Base Legal | Retenção |
|-------|------|--------------|------------|------------|----------|
| `id` | UUID | Não | Identificador interno | - | Enquanto conta ativa |
| `email` | String | **Sim** (PII) | Autenticação e comunicação | Execução de contrato (Art. 7º, V) | Enquanto conta ativa + 30 dias após exclusão |
| `password` | String (Hash) | **Sim** (Pseudonimizado) | Autenticação | Execução de contrato (Art. 7º, V) | Enquanto conta ativa |
| `name` | String | **Sim** (PII) | Identificação do usuário | Execução de contrato (Art. 7º, V) | Enquanto conta ativa + 30 dias |
| `orgao` | String | **Sim** (Profissional) | Contextualização de documentos | Consentimento (Art. 7º, I) | Enquanto conta ativa |
| `cargo` | String | **Sim** (Profissional) | Contextualização de documentos | Consentimento (Art. 7º, I) | Enquanto conta ativa |
| `role` | Enum | Não | Controle de acesso | - | Enquanto conta ativa |
| `isActive` | Boolean | Não | Controle de acesso | - | Enquanto conta ativa |
| `lastLoginAt` | Timestamp | **Sim** (Comportamental) | Segurança e auditoria | Interesse legítimo (Art. 7º, IX) | 1 ano |
| `lgpdConsentAt` | Timestamp | **Sim** (Metadado) | Comprovação de consentimento | Obrigação legal (Art. 7º, II) | Permanente |
| `lgpdConsentVersion` | String | Não | Rastreabilidade de versão | - | Permanente |
| `internationalTransferConsentAt` | Timestamp | **Sim** (Metadado) | Comprovação transferência int'l | Obrigação legal (Art. 7º, II) | Permanente |
| `deletedAt` | Timestamp | **Sim** (Metadado) | Soft delete LGPD | Obrigação legal (Art. 7º, II) | 30 dias |
| `createdAt` | Timestamp | Não | Auditoria | - | Permanente |
| `updatedAt` | Timestamp | Não | Auditoria | - | Enquanto conta ativa |

### 3.2 Tabela `etps` (Documentos)

| Campo | Tipo | Dado Pessoal | Finalidade | Base Legal | Retenção |
|-------|------|--------------|------------|------------|----------|
| `id` | UUID | Não | Identificador interno | - | Enquanto ETP existir |
| `title` | String | Não | Título do documento | - | Enquanto ETP existir |
| `description` | Text | Possível* | Descrição do projeto | Execução de contrato | Enquanto ETP existir |
| `objeto` | String | Possível* | Objeto da contratação | Execução de contrato | Enquanto ETP existir |
| `numeroProcesso` | String | Não | Rastreabilidade | - | Enquanto ETP existir |
| `valorEstimado` | Decimal | Não | Informação do projeto | - | Enquanto ETP existir |
| `metadata.orgao` | String | **Sim** (Profissional) | Contextualização | Execução de contrato | Enquanto ETP existir |
| `metadata.responsavelTecnico` | String | **Sim** (PII) | Identificação de responsável | Execução de contrato | Enquanto ETP existir |
| `createdById` | UUID | **Sim** (Identificador) | Vínculo com usuário | Execução de contrato | Enquanto ETP existir |

*Nota: Campos de texto livre podem conter dados pessoais inseridos pelo usuário.

### 3.3 Tabela `etp_sections` (Seções de Conteúdo)

| Campo | Tipo | Dado Pessoal | Finalidade | Base Legal | Retenção |
|-------|------|--------------|------------|------------|----------|
| `content` | Text | Possível* | Conteúdo gerado/editado | Execução de contrato | Enquanto ETP existir |
| `userInput` | Text | Possível* | Input do usuário para IA | Execução de contrato | Enquanto ETP existir |
| `metadata.agentsUsed` | JSONB | Não | Rastreabilidade de IA | - | Enquanto ETP existir |

*Nota: Conteúdo é sanitizado via PIIRedactionService antes de envio para APIs externas.

### 3.4 Tabela `audit_logs` (Logs de Auditoria)

| Campo | Tipo | Dado Pessoal | Finalidade | Base Legal | Retenção |
|-------|------|--------------|------------|------------|----------|
| `userId` | UUID | **Sim** (Identificador) | Rastreabilidade | Interesse legítimo (Art. 7º, IX) | 2 anos |
| `action` | Enum | Não | Tipo de operação | - | 2 anos |
| `entityType` | String | Não | Tipo de entidade | - | 2 anos |
| `entityId` | UUID | Não | ID da entidade | - | 2 anos |
| `changes` | JSONB | Possível* | Histórico de alterações | Interesse legítimo | 2 anos |
| `ipAddress` | String | **Sim** (PII) | Segurança | Interesse legítimo (Art. 7º, IX) | 2 anos |
| `userAgent` | String | **Sim** (Técnico) | Segurança e debug | Interesse legítimo (Art. 7º, IX) | 2 anos |

### 3.5 Tabela `analytics_events` (Métricas)

| Campo | Tipo | Dado Pessoal | Finalidade | Base Legal | Retenção |
|-------|------|--------------|------------|------------|----------|
| `userId` | UUID | **Sim** (Identificador) | Analytics | Consentimento (Art. 7º, I) | 1 ano |
| `sessionId` | String | **Sim** (Comportamental) | Rastreamento de sessão | Consentimento | 1 ano |
| `ipAddress` | String | **Sim** (PII) | Geolocalização agregada | Consentimento | 1 ano |
| `userAgent` | String | **Sim** (Técnico) | Análise de dispositivos | Consentimento | 1 ano |
| `referer` | String | **Sim** (Comportamental) | Origem do tráfego | Consentimento | 1 ano |
| `properties` | JSONB | Possível* | Dados de evento | Consentimento | 1 ano |

---

## 4. Compartilhamento com Terceiros

### 4.1 OpenAI (Estados Unidos)

| Aspecto | Detalhes |
|---------|----------|
| **Serviço** | Geração de conteúdo via GPT-4 |
| **Dados enviados** | Prompts do sistema + input sanitizado do usuário |
| **Dados NÃO enviados** | Email, nome, CPF, telefone, endereço (sanitizados via PIIRedactionService) |
| **Base legal** | Consentimento explícito (Art. 33, VIII-a) |
| **Proteção** | TLS 1.2+, API Key segura, Circuit Breaker |
| **Política de dados** | OpenAI não usa dados de API para treinamento (API Terms) |

### 4.2 Perplexity (Estados Unidos)

| Aspecto | Detalhes |
|---------|----------|
| **Serviço** | Pesquisa de mercado e fundamentação |
| **Dados enviados** | Queries de pesquisa sanitizadas |
| **Dados NÃO enviados** | Dados pessoais identificáveis |
| **Base legal** | Consentimento explícito (Art. 33, VIII-a) |
| **Proteção** | TLS 1.2+, API Key segura |

### 4.3 Railway (Estados Unidos)

| Aspecto | Detalhes |
|---------|----------|
| **Serviço** | Hospedagem de infraestrutura (PostgreSQL, Backend, Frontend) |
| **Dados armazenados** | Todos os dados do sistema |
| **Base legal** | Consentimento explícito para transferência internacional |
| **Proteção** | Criptografia em repouso, backups criptografados, SOC 2 |

---

## 5. Medidas de Proteção Implementadas

### 5.1 Sanitização de PII (PIIRedactionService)

O sistema sanitiza automaticamente os seguintes tipos de dados antes de enviar para APIs externas:

| Tipo | Padrão | Substituição |
|------|--------|--------------|
| Email | `usuario@dominio.com` | `[EMAIL_REDACTED]` |
| CPF | `123.456.789-00` | `[CPF_REDACTED]` |
| CNPJ | `12.345.678/0001-90` | `[CNPJ_REDACTED]` |
| Telefone | `(11) 98765-4321` | `[PHONE_REDACTED]` |
| RG | `MG-12.345.678-9` | `[RG_REDACTED]` |
| CEP | `12345-678` | `[CEP_REDACTED]` |
| Matrícula | `matrícula 123456` | `[MATRICULA_REDACTED]` |
| Processo | `Processo nº 1234/2024` | `[PROCESSNUMBER_REDACTED]` |

**Arquivo:** `backend/src/modules/privacy/pii-redaction.service.ts`

### 5.2 Criptografia

| Camada | Tecnologia | Status |
|--------|------------|--------|
| Em trânsito | TLS 1.2+ (HTTPS) | Implementado |
| Senhas | bcrypt (hash) | Implementado |
| Em repouso (DB) | Railway PostgreSQL encryption | Provedor |
| API Keys | Variáveis de ambiente | Implementado |

### 5.3 Consentimento LGPD

| Tipo | Campo | Implementação |
|------|-------|---------------|
| Termos gerais | `lgpdConsentAt` | Checkbox obrigatório no registro |
| Versão dos termos | `lgpdConsentVersion` | Rastreabilidade de versão aceita |
| Transferência int'l | `internationalTransferConsentAt` | Checkbox obrigatório no registro |

**Arquivo:** `backend/src/modules/auth/dto/register.dto.ts`

### 5.4 Auditoria

| Evento | Tabela | Dados registrados |
|--------|--------|-------------------|
| Login/Logout | `audit_logs` | userId, ipAddress, userAgent, timestamp |
| CRUD de ETPs | `audit_logs` | action, entityId, changes |
| Export de dados | `audit_logs` | action=USER_DATA_EXPORT |
| Exclusão de conta | `audit_logs` | action=ACCOUNT_DELETION_* |

---

## 6. Bases Legais Utilizadas

| Base Legal | Artigo LGPD | Uso no Sistema |
|------------|-------------|----------------|
| Consentimento | Art. 7º, I | Dados opcionais (órgão, cargo), analytics, transferência internacional |
| Execução de contrato | Art. 7º, V | Email, nome, dados do ETP (necessários para o serviço) |
| Obrigação legal | Art. 7º, II | Registros de consentimento, logs de auditoria |
| Interesse legítimo | Art. 7º, IX | Segurança (IP, userAgent), prevenção de fraude |

---

## 7. Períodos de Retenção

| Categoria de Dados | Período | Justificativa |
|--------------------|---------|---------------|
| Dados de conta ativa | Enquanto ativo | Necessário para serviço |
| Dados de conta excluída (soft) | 30 dias | Período de arrependimento |
| Dados de conta excluída (hard) | Removido permanentemente | Após 30 dias |
| Logs de auditoria | 2 anos | Requisito de compliance |
| Analytics | 1 ano | Melhoria do serviço |
| Comprovantes de consentimento | Permanente | Obrigação legal |
| Backups | 90 dias | Disaster recovery |

---

## 8. Referências

- **LGPD:** Lei 13.709/2018 - https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- **Art. 7º:** Bases legais para tratamento
- **Art. 33:** Transferência internacional de dados
- **Art. 37:** Registro das operações de tratamento
- **Art. 46:** Medidas de segurança

---

## 9. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0.0 | 2025-11-21 | Claude Code | Versão inicial - Mapeamento completo |

---

**Este documento deve ser revisado a cada alteração significativa no tratamento de dados pessoais.**
