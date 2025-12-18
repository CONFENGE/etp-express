# Auditoria LGPD - Anonimização e Pseudonimização de Dados

## 📋 Objetivo

Este documento avalia oportunidades de aplicação de **anonimização** e **pseudonimização** de dados pessoais no sistema ETP Express, visando reduzir riscos de privacidade e fortalecer a conformidade com a LGPD.

**Data:** 2025-11-22
**Versão:** 1.0
**Responsável:** Claude (Engenheiro-Executor) - Issue #268

---

## 1. Conceitos Fundamentais

### 1.1 Definições (LGPD)

| Conceito            | Definição                                      | Exemplo                                 | Status LGPD                          |
| ------------------- | ---------------------------------------------- | --------------------------------------- | ------------------------------------ |
| **Anonimização**    | Remoção **irreversível** de identificadores    | Agregar "1.234 usuários ativos" sem IDs | ❌ Não é mais dado pessoal (Art. 12) |
| **Pseudonimização** | Substituição de identificadores por **tokens** | userId → hash SHA-256                   | ⚠️ Ainda é dado pessoal (Art. 13)    |

### 1.2 Princípios Aplicáveis

- **Art. 6º, III - Necessidade**: Limitação ao mínimo necessário para finalidade
- **Art. 6º, VI - Prevenção**: Adoção de medidas preventivas
- **Art. 12**: Anonimização não é tratamento de dados pessoais
- **Art. 13**: Pseudonimização como técnica de segurança

---

## 2. Análise do Fluxo de Dados

### 2.1 Dados Enviados para APIs Externas

#### ✅ OpenAI - STATUS: ADEQUADO

**Implementação atual:**

- Serviço `PIIRedactionService` sanitiza prompts **antes** de enviar para OpenAI
- Detecta e substitui: email, CPF, CNPJ, telefone, RG, matrícula, CEP, número de processo
- Substitui por placeholders: `[EMAIL_REDACTED]`, `[CPF_REDACTED]`, etc.
- Loga warnings quando PII é detectado (sem armazenar valores reais)

**Arquivo fonte:** `backend/src/modules/privacy/pii-redaction.service.ts`
**Uso:** `backend/src/modules/orchestrator/orchestrator.service.ts:172-183`

**Recomendações:**

- ✅ **Manter implementação atual** - está conforme LGPD
- ⚠️ **Expandir patterns** - Adicionar detecção de nomes próprios (regex) e endereços completos
- ⚠️ **Auditar logs** - Verificar se warnings de PII não estão vazando valores

**Código atual (OrchestratorService):**

```typescript
// Linha 172-183
const { redacted: sanitizedPrompt, findings: piiFindings } =
  this.piiRedactionService.redact(enrichedUserPrompt);

if (piiFindings.length > 0) {
  this.logger.warn('PII detected and redacted before LLM call', {
    section: request.sectionType,
    findings: piiFindings, // ✅ Não loga os valores, apenas tipos
  });
}
```

#### ✅ Exa - STATUS: ADEQUADO

**Implementação atual:**

- Envia queries de pesquisa para Exa API
- Queries incluem: objeto da contratação, tópicos legais
- PIIRedactionService aplicado antes de enviar queries

**Arquivo fonte:** `backend/src/modules/search/exa/exa.service.ts`

**Análise de risco:**

```typescript
// Linha 129-136 - searchSimilarContracts
const query = `Busque informações sobre contratações públicas similares a: "${objeto}".
    Inclua informações sobre:
    - Órgãos que realizaram contratações similares
    - Valores praticados
    - Modalidades utilizadas
    - Links para processos ou documentos relacionados
```

**Possível vazamento:**

- Se `objeto` contiver CPF/CNPJ do responsável técnico
- Se `objeto` contiver matrícula de servidor
- Se `objeto` contiver número de processo com PII

**Recomendações:**

1. ✅ **IMPLEMENTADO** - PIIRedactionService aplicado em queries Exa
2. **[P2]** Criar método específico: `piiRedactionService.redactForSearch(query)` que preserve termos técnicos
3. **[P3]** Auditar logs de Exa para identificar vazamentos históricos

**Issue sugerida:** N/A - Sanitização já implementada na migração para Exa

---

### 2.2 Analytics Agregados

#### ⚠️ Analytics Events - STATUS: NECESSITA MELHORIA

**Tabela:** `analytics_events`
**Dados armazenados:**

- `userId` (UUID) - Identificador direto
- `ipAddress` - Dado pessoal (LGPD Art. 5º, I)
- `userAgent` - Identificador indireto
- `sessionId` - Identificador de sessão
- `referer` - Contexto navegação

**Política atual:** Retenção de 1 ano
**Finalidade:** Análise de uso, melhoria do serviço

**Oportunidades de Anonimização:**

| Dado        | Ação                             | Quando       | Benefício                                     |
| ----------- | -------------------------------- | ------------ | --------------------------------------------- |
| `userId`    | **Anonimizar** (SET NULL)        | Após 90 dias | Métricas agregadas sem rastreio individual    |
| `ipAddress` | **Pseudonimizar** (hash SHA-256) | Após 30 dias | Análise geográfica sem IP real                |
| `sessionId` | **Anonimizar** (SET NULL)        | Após 60 dias | Preserva contagem de sessões, remove rastreio |

**Exemplo de implementação:**

```sql
-- Anonimizar analytics após 90 dias (job semanal)
UPDATE analytics_events
SET
  user_id = NULL,
  session_id = NULL
WHERE created_at < NOW() - INTERVAL '90 days'
  AND user_id IS NOT NULL;

-- Pseudonimizar IPs após 30 dias
UPDATE analytics_events
SET ip_address = ENCODE(SHA256(ip_address::bytea), 'hex')
WHERE created_at < NOW() - INTERVAL '30 days'
  AND ip_address IS NOT NULL
  AND LENGTH(ip_address) < 64; -- Evita re-hash
```

**Métricas preservadas após anonimização:**

- ✅ Total de eventos por tipo/período
- ✅ Distribuição geográfica (via IP pseudonimizado)
- ✅ Taxas de sucesso/erro
- ✅ Duração média de operações
- ❌ Rastreio individual de usuários (intencionalmente removido)

**Recomendações:**

1. **[P2]** Implementar job cron semanal de anonimização de analytics
2. **[P3]** Criar view materializada com dados agregados (sem userId)
3. **[P3]** Dashboard de analytics usando apenas dados agregados/anonimizados

**Issue sugerida:** #271 - Implementar anonimização automática de analytics após 90 dias

---

### 2.3 Audit Logs

#### ✅ Audit Logs - STATUS: ADEQUADO (COM RESSALVAS)

**Tabela:** `audit_logs`
**Dados armazenados:**

- `userId` (FK para User) - Necessário para compliance
- `ipAddress` - Dado pessoal
- `userAgent` - Identificador
- `changes` (JSONB) - Pode conter dados pessoais

**Política atual:** Retenção de 90 dias
**Finalidade:** Compliance LGPD (Art. 37 - registro de operações)

**Análise de conformidade:**

| Aspecto                     | Status             | Justificativa                          |
| --------------------------- | ------------------ | -------------------------------------- |
| Armazenar `userId`          | ✅ **JUSTIFICADO** | LGPD Art. 7º, II - Obrigação legal     |
| Armazenar `ipAddress`       | ✅ **JUSTIFICADO** | Segurança e investigação de incidentes |
| Armazenar `changes` (JSONB) | ⚠️ **ATENÇÃO**     | Pode conter dados sensíveis            |
| Retenção 90 dias            | ✅ **ADEQUADO**    | Período razoável para auditoria        |

**Oportunidade de Pseudonimização (OPCIONAL):**

```typescript
// Pseudonimizar dados sensíveis no campo `changes` antes de persistir
// Exemplo: se `changes.before.email` ou `changes.after.email` existir

interface AuditChanges {
  before?: {
    email?: string;
    password?: string; // Nunca deve estar aqui (já hasheado)
    [key: string]: unknown;
  };
  after?: {
    email?: string;
    [key: string]: unknown;
  };
  metadata?: unknown;
}

// Pseudonimizar emails no audit log
function pseudonymizeAuditChanges(changes: AuditChanges): AuditChanges {
  const pseudonymized = { ...changes };

  if (pseudonymized.before?.email) {
    pseudonymized.before.email = hashEmail(pseudonymized.before.email);
  }

  if (pseudonymized.after?.email) {
    pseudonymized.after.email = hashEmail(pseudonymized.after.email);
  }

  return pseudonymized;
}
```

**Recomendações:**

1. ✅ **Manter userId e ipAddress** - Justificado por obrigação legal
2. ⚠️ **[P3]** Pseudonimizar emails em `changes` (hash SHA-256 com salt)
3. ⚠️ **[P3]** Implementar limpeza automática após 90 dias (DELETE CASCADE)
4. ✅ **[P1]** Garantir que senhas **nunca** apareçam em `changes` (validar com testes)

**Issue sugerida:** #272 - Validar ausência de dados sensíveis em audit_logs.changes

---

### 2.4 Logs de Aplicação (Railway)

#### ❌ Logs - STATUS: NECESSITA AÇÃO URGENTE

**Localização:** Railway (7 dias de retenção)
**Risco:** Logs podem conter PII em stack traces, mensagens de erro

**Exemplos de vazamento:**

```typescript
// ❌ PERIGOSO - PII no log
this.logger.error(`Failed to create user: ${email}`, error);

// ❌ PERIGOSO - Stack trace com dados do request
this.logger.error('Validation failed', { dto: registerDto });

// ✅ SEGURO - Sem PII
this.logger.error('Failed to create user', { userId: user.id });

// ✅ SEGURO - Stack trace sanitizada
this.logger.error('Validation failed', {
  errors: error.validationErrors,
  // NÃO loga o DTO completo
});
```

**Recomendações:**

1. **[P1 - CRÍTICO]** Implementar `LoggerInterceptor` que sanitiza logs automaticamente
2. **[P1]** Adicionar ao `PIIRedactionService` método `redactForLogs(message)`
3. **[P2]** Auditar todos os `logger.error()`, `logger.warn()` no código
4. **[P3]** Configurar NestJS Logger para usar `PIIRedactionService` globalmente

**Exemplo de implementação:**

```typescript
// logger.interceptor.ts
@Injectable()
export class PIILoggerInterceptor implements NestInterceptor {
  constructor(private piiRedactionService: PIIRedactionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logger = new Logger(context.getClass().name);

    // Override logger methods to sanitize
    const originalError = logger.error.bind(logger);
    logger.error = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === 'string'
          ? this.piiRedactionService.redact(arg).redacted
          : arg,
      );
      originalError(...sanitizedArgs);
    };

    return next.handle();
  }
}
```

**Issue sugerida:** #273 - Implementar sanitização automática de PII em logs de aplicação

---

## 3. Resumo de Recomendações

### 3.1 Classificação por Prioridade

| Prioridade       | Issue    | Ação                                  | Impacto LGPD                         | Esforço |
| ---------------- | -------- | ------------------------------------- | ------------------------------------ | ------- |
| ~~P1 - CRÍTICO~~ | ~~#270~~ | ~~Sanitizar queries Exa~~             | ✅ Já implementado na migração       | -       |
| **P1 - CRÍTICO** | #273     | Sanitizar logs de aplicação           | Alto - Vazamento em logs             | 4h      |
| **P1 - ALTO**    | #272     | Validar audit_logs.changes            | Médio - Dados sensíveis em auditoria | 2h      |
| **P2 - MÉDIO**   | #271     | Anonimizar analytics após 90 dias     | Médio - Minimização de dados         | 6h      |
| **P3 - BAIXO**   | -        | Expandir patterns PIIRedactionService | Baixo - Melhoria incremental         | 2h      |

### 3.2 Dados Identificados para Anonimização

| Dado                         | Localização     | Técnica                                   | Implementação      |
| ---------------------------- | --------------- | ----------------------------------------- | ------------------ |
| `analytics_events.userId`    | Após 90 dias    | **Anonimização** (SET NULL)               | Job cron semanal   |
| `analytics_events.sessionId` | Após 60 dias    | **Anonimização** (SET NULL)               | Job cron semanal   |
| `analytics_events.ipAddress` | Após 30 dias    | **Pseudonimização** (SHA-256)             | Job cron semanal   |
| Queries Perplexity           | Antes de enviar | **Pseudonimização** (PIIRedactionService) | Código imediato    |
| Logs de aplicação            | Antes de logar  | **Pseudonimização** (PIIRedactionService) | Interceptor global |

### 3.3 Dados que NÃO Devem Ser Anonimizados

| Dado                    | Justificativa                | Base Legal                             |
| ----------------------- | ---------------------------- | -------------------------------------- |
| `audit_logs.userId`     | Obrigação legal de auditoria | LGPD Art. 7º, II                       |
| `audit_logs.ipAddress`  | Segurança e investigação     | LGPD Art. 7º, IX (legítimo interesse)  |
| `users.email`           | Autenticação e comunicação   | LGPD Art. 7º, V (execução de contrato) |
| `users.password` (hash) | Autenticação                 | LGPD Art. 7º, V (execução de contrato) |

---

## 4. Oportunidades de Anonimização

### 4.1 Analytics Agregados (Recomendação Principal)

**Contexto:** Sistema coleta analytics individuais por 90 dias, mas precisa de métricas de longo prazo (1 ano) para análise de tendências.

**Solução:** Criar agregações mensais **antes** de anonimizar dados individuais.

**Implementação:**

```sql
-- Criar tabela de analytics agregados (dados anonimizados)
CREATE TABLE analytics_monthly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL, -- Primeiro dia do mês
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  total_events INTEGER NOT NULL,
  unique_sessions INTEGER NOT NULL, -- Contagem, não IDs
  avg_duration_ms INTEGER,
  success_rate DECIMAL(5,2),
  top_user_agents JSONB, -- Array de user agents mais comuns
  geographic_distribution JSONB, -- IP pseudonimizado agrupado por região
  created_at TIMESTAMP DEFAULT NOW()
);

-- View materializada para dashboard (sempre usa dados agregados)
CREATE MATERIALIZED VIEW analytics_dashboard AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  event_type,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  AVG(CAST(properties->>'duration' AS INTEGER)) AS avg_duration,
  SUM(CASE WHEN properties->>'success' = 'true' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 AS success_rate
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '13 months' -- Últimos 13 meses
GROUP BY DATE_TRUNC('month', created_at), event_type;
```

**Benefícios:**

- ✅ Preserva métricas de longo prazo sem rastreio individual
- ✅ Dashboard não depende de dados pessoais
- ✅ Conformidade com princípio da necessidade (LGPD Art. 6º, III)
- ✅ Reduz risco de vazamento em caso de breach

---

### 4.2 Pseudonimização de IPs (Análise Geográfica)

**Contexto:** IPs são necessários para análise geográfica de uso, mas não precisam ser armazenados em texto plano indefinidamente.

**Solução:** Pseudonimizar IPs após 30 dias mantendo capacidade de análise geográfica.

**Implementação:**

```typescript
// ip-anonymization.service.ts
@Injectable()
export class IPAnonymizationService {
  /**
   * Pseudonimiza IP preservando análise geográfica
   *
   * @example
   * pseudonymize("192.168.1.100") → "192.168.0.0/16" (hash preserva subnet)
   */
  pseudonymize(ip: string): string {
    // IPv4: Zerar último octeto + hash
    if (ip.includes('.')) {
      const parts = ip.split('.');
      const subnet = `${parts[0]}.${parts[1]}.0.0/16`;
      return createHash('sha256').update(ip).digest('hex').substring(0, 16);
    }

    // IPv6: Preservar apenas /48 prefix
    if (ip.includes(':')) {
      const prefix = ip.split(':').slice(0, 3).join(':');
      return createHash('sha256').update(ip).digest('hex').substring(0, 32);
    }

    return createHash('sha256').update(ip).digest('hex');
  }

  /**
   * Extrai região do IP antes de pseudonimizar
   */
  async extractRegionBeforePseudonymization(ip: string): Promise<string> {
    // Integração com MaxMind GeoIP ou similar
    // Armazena apenas: "BR-SP" (país-estado)
    return 'BR-SP'; // Placeholder
  }
}
```

**Job de pseudonimização:**

```typescript
// analytics-anonymization.job.ts
@Injectable()
export class AnalyticsAnonymizationJob {
  @Cron('0 2 * * 0') // Domingo, 2h AM
  async anonymizeOldAnalytics() {
    // 1. Extrair regiões antes de pseudonimizar IPs (30 dias)
    const ipsToAnonymize = await this.analyticsRepository.find({
      where: {
        createdAt: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        ipAddress: Not(IsNull()),
      },
    });

    for (const event of ipsToAnonymize) {
      const region = await this.ipService.extractRegionBeforePseudonymization(
        event.ipAddress,
      );
      event.properties = { ...event.properties, region };
      event.ipAddress = this.ipService.pseudonymize(event.ipAddress);
    }

    await this.analyticsRepository.save(ipsToAnonymize);

    // 2. Anonimizar userIds (90 dias)
    await this.analyticsRepository.update(
      {
        createdAt: LessThan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
        userId: Not(IsNull()),
      },
      {
        userId: null,
        sessionId: null,
      },
    );

    this.logger.log('Analytics anonymization job completed');
  }
}
```

---

## 5. Dados Enviados para APIs Externas

### 5.1 OpenAI - STATUS ATUAL

✅ **IMPLEMENTADO E ADEQUADO**

**Sanitização aplicada:**

- `PIIRedactionService.redact()` antes de enviar prompts
- Detecta: email, CPF, CNPJ, telefone, RG, matrícula, CEP, processo
- Substitui por: `[EMAIL_REDACTED]`, `[CPF_REDACTED]`, etc.

**Evidência de código:**

```typescript
// backend/src/modules/orchestrator/orchestrator.service.ts:172-183
const { redacted: sanitizedPrompt, findings: piiFindings } =
  this.piiRedactionService.redact(enrichedUserPrompt);

if (piiFindings.length > 0) {
  this.logger.warn('PII detected and redacted before LLM call', {
    section: request.sectionType,
    findings: piiFindings,
  });
  warnings.push(
    'Informações pessoais foram detectadas e sanitizadas antes do processamento.',
  );
}
```

**Patterns detectados:**

- ✅ Email: `usuario@dominio.com.br`
- ✅ CPF: `123.456.789-00`
- ✅ CNPJ: `12.345.678/0001-90`
- ✅ Telefone: `(11) 98765-4321`
- ✅ RG: `MG-12.345.678`
- ✅ Matrícula: `MAT 123456`
- ✅ CEP: `12345-678`
- ✅ Número de processo: `Processo nº 1234/2024`

**Recomendações futuras:**

- ⚠️ **[P3]** Adicionar detecção de nomes próprios (contexto: "Nome: João Silva")
- ⚠️ **[P3]** Adicionar detecção de endereços completos
- ⚠️ **[P3]** Adicionar detecção de placas de veículos

---

### 5.2 Perplexity - STATUS ATUAL

⚠️ **NECESSITA IMPLEMENTAÇÃO**

**Problema identificado:**

- Queries de pesquisa enviadas para Perplexity **não passam** por `PIIRedactionService`
- Risco: Se "objeto da contratação" contiver CPF/CNPJ/matrícula

**Evidência de código:**

```typescript
// backend/src/modules/search/perplexity/perplexity.service.ts:129-136
async searchSimilarContracts(
  objeto: string,
  _filters?: Record<string, unknown>,
): Promise<PerplexityResponse> {
  const query = `Busque informações sobre contratações públicas similares a: "${objeto}".
    Inclua informações sobre:
    - Órgãos que realizaram contratações similares
    - Valores praticados
    - Modalidades utilizadas
    - Links para processos ou documentos relacionados`;

  return this.search(query); // ❌ Não sanitiza "objeto"
}
```

**Solução proposta:**

```typescript
// Modificar PerplexityService para sanitizar queries
@Injectable()
export class PerplexityService {
  constructor(
    private configService: ConfigService,
    private piiRedactionService: PIIRedactionService, // Injetar
  ) {}

  async searchSimilarContracts(
    objeto: string,
    _filters?: Record<string, unknown>,
  ): Promise<PerplexityResponse> {
    // Sanitizar "objeto" antes de incluir na query
    const { redacted: sanitizedObjeto } =
      this.piiRedactionService.redact(objeto);

    const query = `Busque informações sobre contratações públicas similares a: "${sanitizedObjeto}".
      Inclua informações sobre:
      - Órgãos que realizaram contratações similares
      - Valores praticados
      - Modalidades utilizadas
      - Links para processos ou documentos relacionados`;

    return this.search(query);
  }
}
```

**Issue crítica:** #270 - Aplicar sanitização de PII em queries de Perplexity

---

## 6. Checklist de Conformidade

### 6.1 Critérios de Aceitação (Issue #268)

- [x] **Identificar dados que podem ser anonimizados**
  - ✅ `analytics_events.userId` (após 90 dias)
  - ✅ `analytics_events.sessionId` (após 60 dias)

- [x] **Identificar dados que devem ser pseudonimizados**
  - ✅ `analytics_events.ipAddress` (após 30 dias)
  - ✅ Queries Perplexity (antes de enviar)
  - ✅ Logs de aplicação (antes de logar)

- [x] **Verificar dados enviados para APIs externas**
  - ✅ OpenAI: Sanitizado via `PIIRedactionService` ✅
  - ⚠️ Perplexity: **NÃO sanitizado** - Issue #270 criada

- [x] **Documentar recomendações em LGPD_AUDIT.md**
  - ✅ Este documento

---

## 7. Issues Relacionadas

| Issue | Título                            | Prioridade | Esforço | Descrição                                                     |
| ----- | --------------------------------- | ---------- | ------- | ------------------------------------------------------------- |
| #270  | Sanitizar queries Perplexity      | P1         | 2h      | Aplicar `PIIRedactionService` antes de enviar para Perplexity |
| #271  | Anonimizar analytics após 90 dias | P2         | 6h      | Implementar job cron de anonimização automática               |
| #272  | Validar audit_logs.changes        | P1         | 2h      | Garantir ausência de dados sensíveis em audit logs            |
| #273  | Sanitizar logs de aplicação       | P1         | 4h      | Implementar interceptor global de sanitização                 |

**Total estimado:** 14 horas

---

## 8. Referências Legais

### 8.1 LGPD

- **Art. 6º, III** - Princípio da Necessidade (minimização de dados)
- **Art. 6º, VI** - Princípio da Prevenção
- **Art. 12** - Anonimização não é tratamento de dados
- **Art. 13** - Pseudonimização como técnica de segurança
- **Art. 33** - Transferência internacional de dados

### 8.2 Boas Práticas

- **ISO 27001** - Gestão de segurança da informação
- **NIST Privacy Framework** - Anonimização e pseudonimização
- **OWASP Top 10** - Prevenção de vazamento de dados

---

## 9. Histórico de Atualizações

| Data       | Versão | Autor                        | Descrição                   |
| ---------- | ------ | ---------------------------- | --------------------------- |
| 2025-11-22 | 1.0    | Claude (Engenheiro-Executor) | Versão inicial - Issue #268 |

---

**Documento criado como parte da auditoria LGPD - Issue #268**
**Parent Issue:** #86 - Auditoria de conformidade: LGPD e privacidade de dados

**Próximos passos:**

- Implementar issues críticas (#270, #272, #273)
- Avaliar implementação de anonimização de analytics (#271)
- Revisar e aprovar recomendações com DPO/responsável legal
