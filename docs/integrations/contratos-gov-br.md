# Integração Contratos Gov.br

Guia completo de integração com o sistema federal **Contratos Gov.br** para sincronização bidirecional de contratos.

---

## Visão Geral

A integração com Contratos Gov.br permite:

- **Push Sync:** Enviar contratos locais para o portal Gov.br
- **Pull Sync:** Importar contratos do Gov.br para o sistema local
- **Conflict Resolution:** Resolução automática de conflitos usando estratégia Last-Write-Wins (LWW)
- **Sync Logs:** Auditoria completa de todas as operações de sincronização

**Issues Relacionadas:**
- Issue #1289 (Parent) - Integração com Contratos Gov.br
- Issue #1674 - Autenticação Gov.br OAuth
- Issue #1675 - Sincronização Push
- Issue #1676 - Sincronização Pull
- Issue #1677 - Tratamento de conflitos
- Issue #1678 - Testes de integração e documentação

---

## Arquitetura

```
┌─────────────────────┐         ┌──────────────────────┐
│  Sistema ETP        │         │  Contratos Gov.br    │
│  Express            │         │  (API Federal)       │
├─────────────────────┤         ├──────────────────────┤
│                     │         │                      │
│  ContratosGovBr     │ ◄────── │  OAuth 2.0 Auth      │
│  SyncService        │   Push  │                      │
│                     │ ──────► │  REST API v1         │
│                     │   Pull  │                      │
└─────────────────────┘         └──────────────────────┘
         │
         │ Persiste
         ▼
┌─────────────────────┐
│  PostgreSQL         │
│  - Contratos        │
│  - ContratoSyncLog  │
└─────────────────────┘
```

**Componentes:**

- **ContratosGovBrSyncService:** Serviço principal de sincronização
- **ContratosGovBrAuthService:** Autenticação OAuth 2.0 com Gov.br
- **ContratoSyncLog Entity:** Log de sincronização e resolução de conflitos
- **Contrato Entity:** Entidade de contrato com campos de sincronização

---

## 1. Configuração de Credenciais

### 1.1. Obter Credenciais Gov.br

1. Acesse o portal [Contratos Gov.br](https://contratos.comprasnet.gov.br/)
2. Navegue para **Configurações → Integrações → API**
3. Crie uma nova aplicação OAuth 2.0
4. Anote as credenciais:
   - **Client ID**
   - **Client Secret**
   - **Redirect URI**

### 1.2. Configurar Variáveis de Ambiente

Adicione as credenciais no arquivo `.env`:

```bash
# API Contratos Gov.br
CONTRATOS_GOVBR_API_URL=https://contratos.comprasnet.gov.br/api/v1
CONTRATOS_GOVBR_CLIENT_ID=seu-client-id-aqui
CONTRATOS_GOVBR_CLIENT_SECRET=seu-client-secret-aqui
CONTRATOS_GOVBR_REDIRECT_URI=https://seu-dominio.com/auth/govbr/callback

# OAuth 2.0 Endpoints
GOVBR_OAUTH_URL=https://sso.acesso.gov.br/oauth2
GOVBR_TOKEN_URL=https://sso.acesso.gov.br/oauth2/token
```

### 1.3. Verificar Configuração

Execute o comando de verificação:

```bash
npm run check:govbr-config
```

Se tudo estiver correto, você verá:

```
✅ Contratos Gov.br API URL configurada
✅ Credenciais OAuth encontradas
✅ Conexão com API Gov.br: OK
```

---

## 2. Sincronização Manual

### 2.1. Push Sync - Enviar Contrato para Gov.br

**Quando usar:**
- Após criar ou editar um contrato no sistema local
- Para sincronizar contratos existentes pela primeira vez

**Endpoint REST:**

```http
POST /api/contratos/:id/sync/push
Authorization: Bearer <token>
```

**Exemplo com curl:**

```bash
curl -X POST https://api.etp-express.com/api/contratos/uuid-do-contrato/sync/push \
  -H "Authorization: Bearer $TOKEN"
```

**Exemplo com interface:**

1. Acesse o contrato em **Contratos → Detalhes**
2. Clique em **Sincronizar com Gov.br**
3. Aguarde confirmação de sucesso

**Validações Obrigatórias:**

O contrato deve conter os seguintes campos obrigatórios:

- ✅ `numero` - Número do contrato
- ✅ `objeto` - Objeto do contrato
- ✅ `contratadoCnpj` - CNPJ do contratado
- ✅ `contratadoRazaoSocial` - Razão social
- ✅ `valorGlobal` - Valor global do contrato
- ✅ `vigenciaInicio` - Data de início da vigência
- ✅ `vigenciaFim` - Data de fim da vigência
- ✅ `gestorResponsavel` com CPF no campo `cargo` (formato: `XXX.XXX.XXX-XX`)
- ✅ `fiscalResponsavel` com CPF no campo `cargo`
- ✅ `dataAssinatura` - Para contratos não-minuta

**Fluxo de Push:**

```
1. Validar campos obrigatórios
2. Mapear entity local → formato API Gov.br
3. Enviar POST para /contratos
4. Receber govBrId da API
5. Atualizar contrato local:
   - govBrId = ID retornado
   - govBrSyncStatus = 'synced'
   - govBrSyncedAt = timestamp atual
```

**Tratamento de Erros:**

| Erro                      | Status | Solução                                    |
| ------------------------- | ------ | ------------------------------------------ |
| Campos obrigatórios faltando | 400    | Completar campos antes de sincronizar      |
| CPF de gestor/fiscal não encontrado | 400    | Adicionar CPF no campo `cargo` do usuário |
| API Gov.br indisponível   | 500    | Aguardar e tentar novamente                |
| Credenciais inválidas     | 401    | Verificar Client ID/Secret no `.env`       |

### 2.2. Pull Sync - Importar Contratos do Gov.br

**Quando usar:**
- Para importar contratos criados diretamente no portal Gov.br
- Para sincronizar atualizações feitas no Gov.br
- Execução periódica via cron job (recomendado: diário)

**Endpoint REST:**

```http
POST /api/contratos/sync/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "organizationId": "uuid-da-organizacao"
}
```

**Exemplo com curl:**

```bash
curl -X POST https://api.etp-express.com/api/contratos/sync/pull \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "uuid-da-org"}'
```

**Fluxo de Pull:**

```
1. Buscar contratos da organização na API Gov.br
2. Para cada contrato remoto:
   a. Buscar contrato local por número
   b. Se NÃO existe: criar novo contrato
   c. Se existe: atualizar campos (upsert)
3. Retornar estatísticas:
   - created: contratos novos criados
   - updated: contratos atualizados
   - errors: erros durante sincronização
```

**Resposta de Exemplo:**

```json
{
  "success": true,
  "stats": {
    "created": 5,
    "updated": 12,
    "errors": 0
  },
  "message": "Pull sync completed successfully"
}
```

### 2.3. Sincronização Automática (Cron Job)

Configure um job periódico para sincronização automática:

**Usando NestJS Scheduler:**

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ContratosGovBrCronService {
  constructor(
    private readonly syncService: ContratosGovBrSyncService,
    private readonly orgRepository: Repository<Organization>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyPullSync() {
    const organizations = await this.orgRepository.find({ isActive: true });

    for (const org of organizations) {
      try {
        const stats = await this.syncService.pullContratos(org.id);
        this.logger.log(
          `Pull sync for org ${org.name}: ${stats.created} created, ${stats.updated} updated`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to pull contracts for org ${org.name}`,
          error.stack,
        );
      }
    }
  }
}
```

---

## 3. Resolução de Conflitos

### 3.1. Estratégia Last-Write-Wins (LWW)

A integração detecta conflitos quando:
- Contrato foi editado localmente **E** remotamente desde a última sincronização
- Campos críticos divergem: `valorGlobal`, `vigenciaFim`, `status`, `objeto`, `contratadoCnpj`

**Lógica de Resolução:**

```
Se (govBrSyncedAt > updatedAt):
  → Remote Wins (Gov.br mais recente)
  → Aplicar valores do Gov.br
Senão:
  → Local Wins (dados locais editados após último sync)
  → Preservar valores locais
  → Agendar Push automático para sincronizar Gov.br
```

### 3.2. Campos Monitorados para Conflito

| Campo            | Descrição                  | Crítico? |
| ---------------- | -------------------------- | -------- |
| `valorGlobal`    | Valor total do contrato    | ✅ Sim   |
| `vigenciaFim`    | Data fim vigência          | ✅ Sim   |
| `status`         | Status do contrato         | ✅ Sim   |
| `objeto`         | Objeto contratual          | ✅ Sim   |
| `contratadoCnpj` | CNPJ do contratado         | ✅ Sim   |
| `descricaoObjeto`| Descrição detalhada        | ❌ Não   |
| `observacoes`    | Observações gerais         | ❌ Não   |

### 3.3. Auditoria de Conflitos

Todos os conflitos são registrados em `ContratoSyncLog`:

```sql
SELECT
  csl.id,
  csl.action,
  csl.conflicts,
  csl.resolution,
  csl."createdAt",
  c.numero AS contrato_numero
FROM contrato_sync_logs csl
JOIN contratos c ON csl."contratoId" = c.id
WHERE csl.action = 'conflict_resolved'
ORDER BY csl."createdAt" DESC;
```

**Exemplo de Log de Conflito:**

```json
{
  "id": "uuid-do-log",
  "contratoId": "uuid-do-contrato",
  "action": "conflict_resolved",
  "conflicts": [
    {
      "field": "valorGlobal",
      "localValue": "100000.00",
      "remoteValue": "150000.00"
    },
    {
      "field": "vigenciaFim",
      "localValue": "2024-12-31T00:00:00.000Z",
      "remoteValue": "2025-06-30T00:00:00.000Z"
    }
  ],
  "resolution": {
    "valorGlobal": "150000.00",
    "vigenciaFim": "2025-06-30T00:00:00.000Z"
  },
  "createdAt": "2024-01-25T10:30:00.000Z"
}
```

---

## 4. Monitoramento de Logs

### 4.1. Status de Sincronização

Cada contrato possui campos de sincronização:

| Campo                   | Tipo      | Descrição                              |
| ----------------------- | --------- | -------------------------------------- |
| `govBrId`               | string    | ID do contrato no Gov.br               |
| `govBrSyncStatus`       | enum      | 'synced' \| 'error' \| 'pending' \| null |
| `govBrSyncedAt`         | timestamp | Data/hora da última sincronização      |
| `govBrSyncErrorMessage` | text      | Mensagem de erro (se houver)           |

### 4.2. Consultar Contratos Pendentes

```sql
SELECT
  id,
  numero,
  "govBrSyncStatus",
  "govBrSyncErrorMessage",
  "updatedAt"
FROM contratos
WHERE "govBrSyncStatus" = 'error'
   OR ("govBrSyncStatus" IS NULL AND status != 'minuta')
ORDER BY "updatedAt" DESC;
```

### 4.3. Logs de Sincronização

Ver últimas sincronizações:

```sql
SELECT
  csl.action,
  c.numero AS contrato,
  csl."createdAt",
  CASE
    WHEN csl.conflicts IS NOT NULL THEN jsonb_array_length(csl.conflicts)
    ELSE 0
  END AS num_conflicts
FROM contrato_sync_logs csl
JOIN contratos c ON csl."contratoId" = c.id
ORDER BY csl."createdAt" DESC
LIMIT 50;
```

### 4.4. Monitoramento com Logs Estruturados

O serviço emite logs estruturados:

```typescript
[ContratosGovBrSyncService] Starting push sync for contrato <uuid>
[ContratosGovBrSyncService] Contrato <uuid> successfully synced to Gov.br with ID <govbr-id>
[ContratosGovBrSyncService] Failed to push contrato <uuid> to Gov.br
[ContratosGovBrSyncService] Starting pull sync for organization <org-id>
[ContratosGovBrSyncService] Found 25 contracts in Gov.br for organization <org-id>
[ContratosGovBrSyncService] Pull sync completed: 5 created, 12 updated, 0 errors
[ContratosGovBrSyncService] Contract <numero> updated from Gov.br with conflict resolution: 2 conflicts resolved
```

**Filtrar logs no terminal:**

```bash
# Apenas erros de sincronização
npm run logs | grep "Failed to.*Gov.br"

# Sucessos de push
npm run logs | grep "successfully synced to Gov.br"

# Conflitos resolvidos
npm run logs | grep "conflict resolution"
```

---

## 5. Troubleshooting

### Problema: "Contract validation failed for Gov.br sync"

**Causa:** Campos obrigatórios estão faltando no contrato.

**Solução:**

1. Verificar mensagem de erro completa:

```json
{
  "message": "Contract validation failed for Gov.br sync",
  "errors": [
    "gestorResponsavel CPF could not be determined (add CPF to cargo field)"
  ]
}
```

2. Adicionar CPF no campo `cargo` do gestor/fiscal:

```sql
UPDATE users
SET cargo = 'Gestor de Contratos - CPF: 123.456.789-01'
WHERE id = '<uuid-do-gestor>';
```

3. Tentar sincronizar novamente.

---

### Problema: "Failed to sync contrato to Gov.br: API Gov.br unavailable"

**Causa:** API Gov.br está indisponível ou com timeout.

**Solução:**

1. Verificar status da API Gov.br:

```bash
curl -I https://contratos.comprasnet.gov.br/api/v1/health
```

2. Verificar conectividade de rede:

```bash
ping contratos.comprasnet.gov.br
```

3. Aguardar alguns minutos e tentar novamente.

4. Se persistir, verificar se houve mudanças na API Gov.br (consultar changelog oficial).

---

### Problema: "Credenciais inválidas" (401 Unauthorized)

**Causa:** Client ID ou Client Secret incorretos, ou token expirado.

**Solução:**

1. Verificar credenciais no `.env`:

```bash
echo $CONTRATOS_GOVBR_CLIENT_ID
echo $CONTRATOS_GOVBR_CLIENT_SECRET
```

2. Regenerar credenciais no portal Gov.br se necessário.

3. Atualizar `.env` e reiniciar aplicação:

```bash
npm run restart
```

---

### Problema: Conflitos não sendo resolvidos

**Causa:** Timestamps de sincronização desatualizados.

**Solução:**

1. Verificar timestamps do contrato:

```sql
SELECT
  numero,
  "updatedAt",
  "govBrSyncedAt",
  "govBrSyncStatus"
FROM contratos
WHERE numero = '<numero-do-contrato>';
```

2. Se `govBrSyncedAt` estiver desatualizado, forçar novo pull:

```bash
curl -X POST https://api.etp-express.com/api/contratos/sync/pull \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "<org-id>"}'
```

---

### Problema: Muitos contratos com status 'error'

**Causa:** Falha sistemática na sincronização (pode ser configuração ou API).

**Solução:**

1. Identificar padrão de erros:

```sql
SELECT
  "govBrSyncErrorMessage",
  COUNT(*) AS total
FROM contratos
WHERE "govBrSyncStatus" = 'error'
GROUP BY "govBrSyncErrorMessage"
ORDER BY total DESC;
```

2. Se erros forem os mesmos, corrigir causa raiz (credenciais, validação, etc.).

3. Após correção, re-sincronizar em lote:

```typescript
const contratosComErro = await contratoRepository.find({
  where: { govBrSyncStatus: 'error' },
});

for (const contrato of contratosComErro) {
  try {
    await syncService.pushContrato(contrato.id);
  } catch (error) {
    console.error(`Retry failed for ${contrato.numero}`, error.message);
  }
}
```

---

## 6. Referências

### 6.1. Documentação Oficial

- **Manual Contratos Gov.br:** https://www.gov.br/compras/pt-br/acesso-a-informacao/manuais/manual-contratos-gov-br
- **API Reference:** https://contratos.comprasnet.gov.br/api/docs
- **Portal Acesso Gov.br (OAuth):** https://sso.acesso.gov.br/docs

### 6.2. Código-Fonte

- **ContratosGovBrSyncService:** `backend/src/modules/contratos/services/contratos-govbr-sync.service.ts`
- **ContratosGovBrAuthService:** `backend/src/modules/gov-api/services/contratos-govbr-auth.service.ts`
- **Entidades:**
  - `backend/src/entities/contrato.entity.ts`
  - `backend/src/entities/contrato-sync-log.entity.ts`
- **Testes de Integração:** `backend/test/integration/contratos-govbr-sync.spec.ts`

### 6.3. Issues GitHub

- **Issue #1289** - Integração com Contratos Gov.br (Parent)
- **Issue #1673** - Pesquisa e documentação API
- **Issue #1674** - Autenticação OAuth Gov.br
- **Issue #1675** - Sincronização Push
- **Issue #1676** - Sincronização Pull
- **Issue #1677** - Tratamento de conflitos
- **Issue #1678** - Testes e documentação

---

## 7. Perguntas Frequentes (FAQ)

### O que acontece se eu editar um contrato localmente e no Gov.br ao mesmo tempo?

O sistema detectará o conflito e aplicará a estratégia Last-Write-Wins (LWW). Se o contrato foi editado localmente após a última sincronização, os dados locais prevalecerão e será agendado um push automático para atualizar o Gov.br. Caso contrário, os dados do Gov.br serão aplicados.

### Posso desabilitar a sincronização automática?

Sim. Remova ou comente o cron job de Pull Sync no arquivo `contratos-govbr-cron.service.ts`. A sincronização manual via API continuará funcionando.

### Como sincronizar contratos em lote?

Use o endpoint de Pull Sync, que importa todos os contratos da organização de uma vez. Para Push em lote, crie um script que itera sobre os contratos e chama `pushContrato()` para cada um.

### A integração funciona com contratos de dispensa e inexigibilidade?

Sim. A integração suporta todos os tipos de contratação previstos na Lei 14.133/2021, incluindo licitação, dispensa e inexigibilidade.

### Os logs de sincronização são mantidos indefinidamente?

Sim. Por padrão, todos os logs são mantidos para auditoria. Você pode configurar uma rotina de limpeza periódica se necessário (ex: excluir logs > 2 anos).

---

**Última atualização:** 2026-01-25
**Versão do documento:** 1.0
**Responsável:** Time de Desenvolvimento ETP Express
