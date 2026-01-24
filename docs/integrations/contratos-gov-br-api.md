# API Contratos.gov.br - Especificação Técnica

**Versão da API:** 1.0
**Última Atualização:** 2026-01-24
**Licença:** Apache 2.0

---

## 1. Visão Geral

A API Contratos.gov.br (https://contratos.comprasnet.gov.br) é o sistema oficial do governo federal brasileiro para gestão de contratos públicos. Esta API permite a sincronização bidirecional de contratos entre sistemas externos e o portal oficial.

**Base URL:**
```
https://contratos.comprasnet.gov.br
```

**Documentação OpenAPI:**
```
https://contratos.comprasnet.gov.br/docs/api-docs.json
```

**Tecnologia:** Swagger/OpenAPI 3.0

---

## 2. Autenticação

### 2.1 Método de Autenticação

**Tipo:** OAuth 2.0 Bearer Token

**Header obrigatório:**
```http
Authorization: Bearer {access_token}
X-CSRF-TOKEN: {csrf_token}
```

**Fluxo de Autenticação:**
1. Redirecionamento para Login Único (Gov.br)
2. Autorização OAuth2
3. Recebimento de código de autenticação
4. Troca do código por access token
5. Uso do token em todas as requisições subsequentes

**Callback URL:**
```
https://contratos.comprasnet.gov.br/api/oauth2-callback
```

### 2.2 Processo de Habilitação

⚠️ **IMPORTANTE:** O acesso à API requer credenciais OAuth2 que não estão disponíveis publicamente.

**Como obter acesso:**

1. **Habilitação no Sistema:**
   - Solicitar habilitação ao cadastrador local do órgão
   - Aguardar e-mail automático de `contratos@comprasnet.gov.br`
   - E-mail contém link de acesso e credenciais iniciais

2. **Credenciais para Integração (API):**
   - ⚠️ **Não há documentação pública** sobre como obter `client_id` e `client_secret` para OAuth2
   - **Recomendação:** Contatar `contratos@comprasnet.gov.br` para solicitar credenciais de integração
   - Informar: nome do órgão, CNPJ, finalidade da integração, endpoints necessários

3. **Níveis de Acesso:**
   - Acesso via Login Único Gov.br é classificado em: Bronze, Prata, Ouro (SGD/MGI ordinance 11230/2025)
   - **Para API:** Necessário validar nível mínimo requerido com Comprasnet

### 2.3 Ambientes

**Produção:**
```
https://contratos.comprasnet.gov.br
```

**Homologação/Sandbox:**
⚠️ Não identificado na documentação oficial. Requer confirmação com Comprasnet.

---

## 3. Endpoints Disponíveis

### 3.1 Apropriação de Instrumentos de Cobrança

#### POST - Apropriar Instrumento de Cobrança
```http
POST /api/v1/contrato/instrumento_cobranca/apropriar
```

**Descrição:** Apropria instrumento de cobrança a um contrato.

**Autenticação:** Bearer Token (obrigatório)

**Headers:**
```http
Authorization: Bearer {token}
X-CSRF-TOKEN: {csrf_token}
Content-Type: application/json
```

**Request Body (18 campos obrigatórios):**
```json
{
  "nonce": "string",
  "id_inst_cobranca": "integer",
  "cpf_usuario": "string",
  "tipo_dh": "string",
  "cod_ug_emitente": "string",
  "data_emissao_contabil": "date",
  "data_vencimento": "date",
  "taxa_cambio": "number",
  "processo": "string",
  "data_ateste": "date",
  "observacao": "string",
  "informacoes_adicionais": "string",
  "sf_pco": [
    {
      "cod_ug_emitente": "string",
      "cod_situacao": "string",
      "parcela_despesa_antecipada": [],
      "sf_pco_item": []
    }
  ],
  "data_pagamento": "date",
  "sf_centro_custo": [
    {
      "cod_centro_custo": "string",
      "mes": "integer",
      "ano": "integer",
      "item_vlrcc": []
    }
  ],
  "favorecido_ob": {},
  "deducao": [
    {
      "recolhimento": []
    }
  ],
  "predoc_ob": {}
}
```

**Responses:**
- `200` - Apropriação realizada com sucesso
- `401` - Token expirado ou inválido
- `403` - Usuário sem permissão
- `422` - Erro de validação (campos obrigatórios ausentes ou inválidos)

---

#### PUT - Editar Apropriação
```http
PUT /api/v1/contrato/apropriacao/editar
```

**Descrição:** Edita apropriação de instrumento de cobrança existente.

**Request Body:** Similar ao POST + campo `id_apropriacao_inst_cobranca` (integer)

**Responses:** 200, 401, 403, 422

---

#### DELETE - Excluir Apropriação
```http
DELETE /api/v1/contrato/apropriacao/excluir
```

**Descrição:** Exclui apropriação que ainda não foi enviada para o SIAFI.

**Request Body:**
```json
{
  "nonce": "string",
  "id_apropriacao_inst_cobranca": "integer",
  "cpf_usuario": "string"
}
```

**Responses:**
- `200` - Apropriação excluída com sucesso
- `403` - Sem permissão
- `404` - Apropriação não encontrada
- `500` - Erro interno do servidor

---

#### PUT - Cancelar Apropriação
```http
PUT /api/v1/contrato/apropriacao/cancelar
```

**Descrição:** Cancela apropriação existente.

**Request Body:**
```json
{
  "nonce": "string",
  "id_apropriacao_inst_cobranca": "integer",
  "cpf_usuario": "string"
}
```

**Responses:** 200, 403, 404, 500

---

#### GET - Consultar Apropriações por Contrato
```http
GET /api/v1/contrato/apropriacao/consultar/{contrato_id}
```

**Descrição:** Retorna os registros de apropriações por contrato.

**Path Parameters:**
- `contrato_id` (string, UUID ou identificador do contrato)

**Responses:**
- `200` - Lista de apropriações
- `401` - Não autenticado
- `404` - Contrato não encontrado

---

### 3.2 Endpoints Adicionais

⚠️ **Limitação da Documentação Disponível:**

A documentação pública da API Contratos.gov.br está incompleta. Os endpoints identificados acima estão relacionados apenas a **Apropriação de Instrumentos de Cobrança**.

**Endpoints Esperados (não documentados):**
- Criar/Atualizar/Consultar/Deletar Contratos
- Listar Contratos por Órgão
- Buscar Contrato por Número/Processo
- Termos Aditivos
- Rescisões
- Upload de Documentos Anexos
- Gestão de Fiscais e Gestores
- Notificações

**Ação Requerida:**
Para obter especificação completa dos endpoints, é necessário contato direto com a equipe do Comprasnet via `contratos@comprasnet.gov.br` ou consulta ao arquivo OpenAPI completo após autenticação.

---

## 4. Rate Limits e Quotas

⚠️ **Não documentado publicamente.**

**Recomendações:**
- Implementar retry com exponential backoff
- Respeitar headers de rate limiting se presentes (X-RateLimit-*)
- Assumir limite conservador: 100 requests/minuto até confirmação oficial

---

## 5. Mapeamento de Dados: Contrato Entity ↔ API

### 5.1 Campos Sincronizáveis

Análise do `Contrato` entity do ETP Express vs API Contratos.gov.br:

| Campo Entity (ETP Express) | Campo API (presumido) | Tipo | Obrigatório | Observações |
|----------------------------|-----------------------|------|-------------|-------------|
| `numero` | `numero_contrato` | string | ✅ | Identificador único do contrato |
| `numeroProcesso` | `numero_processo` | string | ✅ | Processo administrativo |
| `objeto` | `objeto_contrato` | text | ✅ | Descrição do objeto |
| `descricaoObjeto` | `descricao_detalhada` | text | ❌ | Complemento técnico |
| `contratadoCnpj` | `cnpj_contratado` | string | ✅ | CNPJ do contratado |
| `contratadoRazaoSocial` | `razao_social_contratado` | string | ✅ | Razão social |
| `contratadoNomeFantasia` | `nome_fantasia` | string | ❌ | Nome fantasia |
| `contratadoEndereco` | `endereco_contratado` | text | ❌ | Endereço completo |
| `contratadoTelefone` | `telefone_contratado` | string | ❌ | Telefone |
| `contratadoEmail` | `email_contratado` | string | ❌ | E-mail |
| `valorGlobal` | `valor_global` | decimal | ✅ | Valor total do contrato |
| `valorUnitario` | `valor_unitario` | decimal | ❌ | Valor unitário (se aplicável) |
| `unidadeMedida` | `unidade_medida` | string | ❌ | Unidade de medida |
| `quantidadeContratada` | `quantidade` | decimal | ❌ | Quantidade contratada |
| `vigenciaInicio` | `data_inicio_vigencia` | date | ✅ | Início da vigência |
| `vigenciaFim` | `data_fim_vigencia` | date | ✅ | Término da vigência |
| `prazoExecucao` | `prazo_execucao_dias` | integer | ❌ | Prazo em dias |
| `possibilidadeProrrogacao` | `condicoes_prorrogacao` | text | ❌ | Cláusula de prorrogação |
| `gestorResponsavelId` | `cpf_gestor` | string | ✅ | CPF do gestor (no ETP é UUID) |
| `fiscalResponsavelId` | `cpf_fiscal` | string | ✅ | CPF do fiscal (no ETP é UUID) |
| `dotacaoOrcamentaria` | `dotacao_orcamentaria` | string | ❌ | Dotação orçamentária |
| `fonteRecursos` | `fonte_recursos` | string | ❌ | Fonte de recursos |
| `condicoesPagamento` | `condicoes_pagamento` | text | ❌ | Condições de pagamento |
| `garantiaContratual` | `garantia_contratual` | text | ❌ | Garantia prestada |
| `reajusteContratual` | `indice_reajuste` | text | ❌ | Índice de reajuste |
| `sancoesAdministrativas` | `sancoes` | text | ❌ | Penalidades aplicáveis |
| `fundamentacaoLegal` | `fundamentacao_legal` | text | ❌ | Base legal |
| `localEntrega` | `local_entrega` | text | ❌ | Local de entrega/execução |
| `clausulas` | `clausulas_contratuais` | jsonb | ❌ | Estrutura JSON com cláusulas |
| `status` | `status_contrato` | enum | ✅ | Status do contrato |
| `dataAssinatura` | `data_assinatura` | date | ✅ | Data de assinatura |
| `dataPublicacao` | `data_publicacao` | date | ❌ | Data de publicação |
| `referenciaPublicacao` | `referencia_publicacao` | string | ❌ | Onde foi publicado |
| `versao` | `versao` | integer | ❌ | Versão do contrato |
| `motivoRescisao` | `motivo_rescisao` | text | ❌ | Motivo de rescisão |
| `dataRescisao` | `data_rescisao` | date | ❌ | Data de rescisão |

### 5.2 Transformações Necessárias

#### Gestores e Fiscais (UUID → CPF)
- **ETP Express:** Armazena UUID do User
- **API Gov.br:** Requer CPF do servidor
- **Solução:** Adicionar campo `cpf` na entity User + mapping no DTO

#### Status do Contrato (Enum Mapping)
```typescript
// ETP Express
enum ContratoStatus {
  MINUTA = 'minuta',
  ASSINADO = 'assinado',
  EM_EXECUCAO = 'em_execucao',
  ADITIVADO = 'aditivado',
  SUSPENSO = 'suspenso',
  RESCINDIDO = 'rescindido',
  ENCERRADO = 'encerrado',
}

// API Gov.br (presumido - requer validação)
enum StatusContratoGovBr {
  MINUTA = 1,
  VIGENTE = 2,
  ENCERRADO = 3,
  RESCINDIDO = 4,
  // ... outros
}
```

#### Valores Decimais (string → number)
- **ETP Express:** Armazena como `string` (precision 15, scale 2)
- **API Gov.br:** Espera `number` (decimal)
- **Solução:** Conversão parseFloat() + validação de precisão

---

## 6. Validações Específicas da API

### 6.1 Campos Obrigatórios (Apropriação)
- `nonce` - Token único anti-replay
- `cpf_usuario` - CPF do usuário executante
- `cod_ug_emitente` - Código da Unidade Gestora
- `data_emissao_contabil` - Data de emissão contábil
- `data_vencimento` - Data de vencimento
- `taxa_cambio` - Taxa de câmbio (para contratos em moeda estrangeira)
- `processo` - Número do processo
- `data_ateste` - Data do ateste
- `sf_pco` - Estrutura de Plano de Contas Orçamentário
- `favorecido_ob` - Dados do favorecido (SIAFI)
- `predoc_ob` - Pré-documento bancário

### 6.2 Formatos e Restrições
- **CNPJ:** Formato `XX.XXX.XXX/XXXX-XX` (18 caracteres com pontuação)
- **CPF:** Formato `XXX.XXX.XXX-XX` (14 caracteres com pontuação)
- **Datas:** Formato ISO 8601 `YYYY-MM-DD`
- **Números de Processo:** Padrão `XXXXX.XXXXXX/YYYY-XX`
- **Valores Monetários:** Decimal com 2 casas decimais, sem separadores de milhar

### 6.3 Objetos Nested Complexos
A API utiliza estruturas JSON profundamente aninhadas, especialmente em:
- `sf_pco` - Sistema de Plano de Contas Orçamentário
- `sf_centro_custo` - Centros de Custo
- `deducao` - Deduções com recolhimentos aninhados
- `predoc_ob` - Pré-documento com dados bancários

**Exemplo `sf_pco`:**
```json
{
  "sf_pco": [
    {
      "cod_ug_emitente": "123456",
      "cod_situacao": "1",
      "parcela_despesa_antecipada": [],
      "sf_pco_item": [
        {
          "item": 1,
          "cod_elemento_despesa": "339039",
          "valor": 10000.00
        }
      ]
    }
  ]
}
```

---

## 7. Integrações Relacionadas

### 7.1 Login Único (Gov.br)
- Todas as aplicações que consomem APIs Gov.br devem integrar-se com a Plataforma de Autenticação Digital do Cidadão
- **Documentação:** https://acesso.gov.br/roteiro-tecnico/

### 7.2 API de Assinatura Eletrônica Gov.br
- Contratos devem ser assinados digitalmente via API de Assinatura Avançada
- **Documentação:** https://manual-integracao-assinatura-eletronica.servicos.gov.br/

### 7.3 PNCP - Portal Nacional de Contratações Públicas
- Contratos devem ser publicados no PNCP (obrigatório Lei 14.133/2021)
- **API PNCP:** https://pncp.gov.br/api/consulta/swagger-ui/

### 7.4 Portal da Transparência
- API de Dados para consulta de contratos públicos
- **URL:** https://portaldatransparencia.gov.br/api-de-dados

---

## 8. Considerações de Segurança

### 8.1 Autenticação e Autorização
- ✅ OAuth 2.0 Bearer Token
- ✅ X-CSRF-TOKEN obrigatório em todas as requisições de mutação (POST, PUT, DELETE)
- ⚠️ Tokens devem ser armazenados de forma segura (variáveis de ambiente, vault)
- ⚠️ Implementar refresh token para renovação automática

### 8.2 Dados Sensíveis
- CPF, CNPJ e dados financeiros devem ser tratados conforme LGPD
- Logs não devem registrar tokens ou dados sensíveis
- Criptografia TLS 1.2+ obrigatória (HTTPS)

### 8.3 Validação e Sanitização
- Validar CNPJ/CPF com dígitos verificadores
- Sanitizar inputs para prevenção de injection
- Validar ranges de datas (vigência, assinatura, publicação)

---

## 9. Limitações e Próximos Passos

### 9.1 Limitações Identificadas
1. **Documentação Incompleta:** Apenas endpoints de apropriação documentados publicamente
2. **Credenciais OAuth2:** Processo de obtenção não documentado
3. **Ambiente de Homologação:** Não identificado
4. **Rate Limits:** Não especificados
5. **Webhooks/Notificações:** Sem informações sobre eventos push

### 9.2 Ações Requeridas

| # | Ação | Responsável | Status |
|---|------|-------------|--------|
| 1 | Contatar `contratos@comprasnet.gov.br` para solicitar credenciais OAuth2 | Time Backend | 🔴 Pendente |
| 2 | Solicitar documentação completa da API (endpoints de CRUD de contratos) | Time Backend | 🔴 Pendente |
| 3 | Validar ambiente de homologação/sandbox | DevOps | 🔴 Pendente |
| 4 | Confirmar rate limits e políticas de uso | Time Backend | 🔴 Pendente |
| 5 | Validar mapeamento de campos Entity ↔ API com resposta real da API | Time Backend | 🔴 Pendente |
| 6 | Implementar fluxo OAuth2 no backend (próxima issue #1674) | Time Backend | 🔴 Aguardando |

---

## 10. Referências

### Documentação Oficial
- **API Docs Swagger:** https://contratos.comprasnet.gov.br/api/docs
- **OpenAPI Spec:** https://contratos.comprasnet.gov.br/docs/api-docs.json
- **Manual de Acesso:** https://comprasnet-contratos.readthedocs.io/pt-br/latest/acesso/

### Legislação
- **Lei 14.133/2021:** Lei de Licitações e Contratos Administrativos
  - Art. 90-129: Contratos Administrativos
  - Art. 92: Cláusulas necessárias
  - Art. 117: Gestão e Fiscalização de Contratos

### APIs Relacionadas
- **Login Único Gov.br:** https://acesso.gov.br/roteiro-tecnico/
- **PNCP Swagger:** https://pncp.gov.br/api/consulta/swagger-ui/
- **Assinatura Eletrônica:** https://manual-integracao-assinatura-eletronica.servicos.gov.br/
- **Portal da Transparência:** https://portaldatransparencia.gov.br/api-de-dados

### Suporte
- **E-mail:** contratos@comprasnet.gov.br
- **Repositório (arquivado):** https://gitlab.com/comprasnet/api-comprasnet

---

## Changelog

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-01-24 | ETP Express Team | Versão inicial - Issue #1673 |

---

**Última Revisão:** 2026-01-24
**Issue Parent:** #1289 - Integração com Contratos Gov.br
**Issue Atual:** #1673 - Estudar e documentar API Contratos Gov.br
**Próxima Issue:** #1674 - Implementar autenticação Gov.br OAuth
