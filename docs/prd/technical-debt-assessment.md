# Technical Debt Assessment - FINAL

**Data:** 2026-01-29
**Autor:** @architect (Aria) - AIOS v3.10.0
**Status:** CONSOLIDADO - Revisoes incorporadas

> **Documento final** consolidando debitos tecnicos identificados em 3 analises independentes,
> validados por revisoes especializadas de @data-engineer, @ux-design-expert e @qa.
>
> - Arquitetura de Sistema (`docs/architecture/system-architecture.md`)
> - Auditoria de Banco de Dados (`supabase/docs/DB-AUDIT.md`)
> - Especificacao Frontend/UX (`docs/frontend/frontend-spec.md`)
>
> Todos os debitos possuem IDs unificados com prefixo por area: **SYS-**, **DB-**, **FE-**.

---

## Historico de Revisoes

| Data | Fase | Revisor | Status |
|------|------|---------|--------|
| 2026-01-29 | DRAFT inicial | @architect (Aria) | CONCLUIDO |
| 2026-01-29 | Revisao Database | @data-engineer | CONCLUIDO |
| 2026-01-29 | Revisao Frontend/UX | @ux-design-expert | CONCLUIDO |
| 2026-01-29 | Quality Gate | @qa (Quinn) | CONCLUIDO |
| 2026-01-29 | Consolidacao FINAL | @architect (Aria) | CONCLUIDO |

---

## 1. Resumo Executivo

O ETP Express e um sistema maduro com 45+ entidades, 35+ modulos NestJS, ~30 paginas React e integracoes com 6+ servicos externos. A analise cruzada de 3 areas, validada por revisoes especializadas, revelou **51 debitos tecnicos** distribuidos da seguinte forma:

| Area | Quantidade | Alta | Media | Baixa | Info |
|------|-----------|------|-------|-------|------|
| Sistema/Arquitetura | 12 | 4 | 5 | 3 | 0 |
| Database (validado por @data-engineer) | 31 | 5 | 13 | 13 | 0 |
| Frontend/UX (validado por @ux-design-expert) | 8 | 1 | 3 | 3 | 1 |
| **Total** | **51** | **10** | **21** | **19** | **1** |

**Nota sobre contagem:** O DRAFT original declarava "36 debitos" no texto mas somava 43 na tabela (inconsistencia corrigida). Apos revisoes especializadas: 2 debitos de Frontend removidos (FE-03 e FE-06, ja resolvidos no codigo), 8 debitos de Database adicionados (DB-NEW-01 a DB-NEW-08), 3 debitos de Frontend adicionados (FE-08 a FE-10), 1 debito de indexes consolidado (DB-IDX-01), e 2 duplicatas de Database removidas (DB-S05 = DB-07, DB-P01 = DB-01). Total final: 51.

**Nota sobre migrations:** O DRAFT original indicava 57 migrations. O @data-engineer contou **53 migrations** em `src/migrations/`. Todas sao DDL (sem DML). O valor correto e **53 migrations**.

**Esforco total estimado:** ~130h de trabalho tecnico.

**Debitos criticos identificados:**
1. **Eager loading cascateado** (SYS-01/DB-01/DB-NEW-03/DB-NEW-04) - cadeia Ateste->Medicao->Contrato->Edital+Org+3xUser gera 10+ JOINs por query
2. **API Key armazenada sem hash** (DB-S02) - texto plano no banco, risco critico em breach
3. **Password sem `select: false`** (DB-S01) - correcao do DRAFT: User.password usa apenas `@Exclude()`, nao `select: false`. Hash retornado em toda query `find`
4. **Tipos monetarios inconsistentes** (SYS-05/DB-04) - 6 entities afetadas, nao apenas 3
5. **ExportMetadata sem organizationId** (DB-09) - expoe s3Key/s3Uri cross-tenant
6. **Validacao de senha desalinhada** (FE-01) - frontend aceita 6 chars, backend exige 8

---

## 2. Inventario Completo de Debitos

### 2.1 Sistema/Arquitetura (validado por @architect)

| ID | Debito | Severidade | Horas | Prioridade |
|----|--------|------------|-------|------------|
| SYS-01 | Eager loading excessivo (entidades com `eager: true` em multiplas relacoes) | **ALTA** | 4-8h | P1 |
| SYS-02 | 45+ entities no scan global (`entities: [__dirname + '/**/*.entity{.ts,.js}']`) | **ALTA** | 2-4h | P3 |
| SYS-03 | 53 migrations com auto-run (`migrationsRun: true`) | **ALTA** | 4-8h | P4 |
| SYS-04 | Monorepo sem Turborepo/Nx (npm workspaces basico) | **ALTA** | 16h+ | Backlog |
| SYS-05 | Tipo `string` para campos decimal (inconsistente com `number` em outras entities) | **MEDIA** | 4-8h | P2 |
| SYS-06 | Body parser duplicado (`bodyParser: false` + configuracao manual) | **MEDIA** | 1h | P3 |
| SYS-07 | Guards globais via APP_GUARD (requerem `@Public()` facil de esquecer) | **MEDIA** | 2h | P3 |
| SYS-08 | Feature flags sem persistencia clara | **MEDIA** | 4h | P3 |
| SYS-09 | Chaos module em src/ (risco de deploy acidental) | **MEDIA** | 2h | P3 |
| SYS-10 | tmpfiles no frontend (150+ diretorios `tmpclaude-*-cwd`) | **BAIXA** | 0.5h | P4 |
| SYS-11 | strictBindCallApply: false (TypeScript nao strict completo) | **BAIXA** | 1h | P4 |
| SYS-12 | forceConsistentCasingInFileNames: false (portabilidade cross-platform) | **BAIXA** | 1h | P4 |

### 2.2 Database (validado por @data-engineer)

#### Debitos Tecnicos

| ID | Debito | Severidade | Horas | Prioridade | Notas da Revisao |
|----|--------|------------|-------|------------|------------------|
| DB-01 | Eager loading excessivo/cascateado | **ALTA** | 4-6h | P1 | Cadeia real: Ateste->Medicao->Contrato->Edital+Org+3xUser. Pior caso: 10+ JOINs. |
| DB-02 | Relacionamento polimorfico sem FK (DocumentoFiscalizacao) | **MEDIA** | 8h | P2 | Converter para 3 FKs + CHECK constraint. |
| DB-03 | ApiUsage com PK integer (unica entity sem UUID) | **BAIXA** | 2h | P4 | Confirmado. |
| DB-04 | Tipos monetarios inconsistentes (6 entities, nao 3) | **ALTA** | 8-12h | P1 | Escopo ampliado: string em Contrato/Medicao/Ateste/Edital, number em Etp/TR/ContractPrice. |
| DB-05 | Campos versao/currentVersion duplicados em TermoReferencia | **MEDIA** | 2h | P3 | Manter `currentVersion`, deprecar `versao`. |
| DB-06 | created_by varchar em Etp (sem `type: 'uuid'`) | **MEDIA** | 2h | P3 | Risco menor: ManyToOne garante FK via ORM. |
| DB-07 | ContratoSyncLog.resolution tipado como `any` | **MEDIA** | 2h | P3 | Tambem `ConflictField.localValue`/`remoteValue` sao `any`. |
| DB-08 | Falta de UpdateDateColumn (7 entities) | **BAIXA** | 2h | P4 | EtpVersion, Ateste, DocumentoFiscalizacao, ContratoSyncLog, ExportMetadata, etc. |
| DB-09 | ExportMetadata sem organizationId | **ALTA** | 1h | P1 | **Severidade ELEVADA** (era MEDIA). Expoe s3Key/s3Uri cross-tenant. |
| DB-10 | ApiUsage sem entity name explicito | **BAIXA** | 0.5h | P4 | `@Entity()` vazio. |
| DB-11 | Enum inline em govBrSyncStatus | **BAIXA** | 1h | P4 | **Severidade REBAIXADA** (era MEDIA). Funcional com union type. Questao de convencao. |

#### Preocupacoes de Seguranca

| ID | Debito | Severidade | Horas | Prioridade | Notas da Revisao |
|----|--------|------------|-------|------------|------------------|
| DB-S01 | Password field sem `select: false` | **ALTA** | 3h | P1 | **Severidade ELEVADA** (era MEDIA). DRAFT incorreto: NAO tem `select: false`, apenas `@Exclude()`. Hash retornado em toda query. |
| DB-S02 | API Key armazenada em texto plano | **ALTA** | 4h | P1 | Texto plano com `@Exclude()`. Vazamento expoe key diretamente. |
| DB-S03 | Multi-tenancy nao obrigatorio em ContractPrice | **MEDIA** | 2h | P2 | `organizationId` nullable para backward compat. |
| DB-S04 | CNPJ armazenado sem validacao no banco | **BAIXA** | 1h | P4 | Apenas validacao na aplicacao. |
| DB-S06 | IP address em texto plano (LGPD) | **MEDIA** | 4h | P3 | **Severidade ELEVADA** (era BAIXA). LGPD Art. 12 §2o: IP + userId = dado pessoal vinculado. |

> **Nota:** DB-S05 removido por ser duplicata de DB-07.

#### Preocupacoes de Performance

| ID | Debito | Severidade | Horas | Prioridade | Notas da Revisao |
|----|--------|------------|-------|------------|------------------|
| DB-P02 | Campos JSONB sem indice GIN (~14 campos relevantes, nao 25) | **MEDIA** | 2h | P3 | Criar GIN apenas em Etp.metadata, Etp.dynamicFields, ContractPrice.metadata. |
| DB-P03 | contract_prices sem particao | **BAIXA** | 16h | P4 | **Severidade REBAIXADA** (era MEDIA). Tabela ja tem 10+ indexes. Particionar so apos 5M+ registros. |
| DB-P04 | Pool connection limitado (max=20) | **MEDIA** | 1h | P2 | Railway Starter = 20 max. Resolver eager loading primeiro. |
| DB-P05 | Texto completo sem tsvector | **BAIXA** | 4h | P4 | Campos objeto/descricao sem indice full-text. |
| DB-P06 | Legislation.embedding sem index vetorial | **BAIXA** | 1h | P4 | IVFFlat recomendado (HNSW so apos 100K+ registros). |
| DB-P07 | SINAPI/SICRO sem particao por UF | **BAIXA** | 8h | P4 | Impacto futuro. |

> **Nota:** DB-P01 removido por ser duplicata de DB-01.

#### Indexes Ausentes

| ID | Debito | Severidade | Horas | Prioridade |
|----|--------|------------|-------|------------|
| DB-IDX-01 | 22 indexes ausentes na cadeia de contratacao | **MEDIA** | 2-3h | P1 |

**Detalhamento dos 22 indexes (em ordem de prioridade conforme @data-engineer):**

**Grupo A - Criticos (queries do dia-a-dia):**
1. `contratos(organizationId)` - multi-tenancy
2. `contratos(editalId)` - JOIN Edital->Contrato
3. `contratos(status)` - filtro dashboard
4. `medicoes(contratoId)` - JOIN Contrato->Medicoes
5. `medicoes(status)` - filtro aprovacao
6. `ocorrencias(contratoId)` - JOIN Contrato->Ocorrencias
7. `ocorrencias(status)` - filtro resolucao
8. `termos_referencia(organizationId)` - multi-tenancy
9. `termos_referencia(etpId)` - JOIN ETP->TR
10. `editais(organizationId)` - multi-tenancy

**Grupo B - Importantes:**
11-16. `editais(status)`, `editais(termoReferenciaId)`, `contratos(govBrSyncStatus)`, `atestes(medicaoId)`, `pesquisas_precos(organizationId)`, `pesquisas_precos(etpId)`

**Grupo C - Suporte:**
17-22. `documentos_fiscalizacao[tipoEntidade, entidadeId]`, `contrato_sync_logs(contratoId)`, `export_metadata(etpId)`, `etp_sections[etp_id, order]`, `etp_versions[etp_id, versionNumber]`, `termos_referencia(status)`

#### Debitos Adicionados pelo @data-engineer

| ID | Debito | Severidade | Horas | Prioridade |
|----|--------|------------|-------|------------|
| DB-NEW-01 | Ateste sem updatedAt E sem organizationId | **MEDIA** | 2h | P2 |
| DB-NEW-02 | ContratoSyncLog sem organizationId | **MEDIA** | 1h | P2 |
| DB-NEW-03 | ContratoSyncLog eager loading em Contrato | **MEDIA** | 1h | P1 (junto com DB-01) |
| DB-NEW-04 | Ateste->Medicao->Contrato cadeia eager tripla (10+ JOINs) | **ALTA** | - | P1 (junto com DB-01) |
| DB-NEW-05 | ExportMetadata.format como enum inline de string | **BAIXA** | 0.5h | P4 |
| DB-NEW-06 | DocumentoFiscalizacao sem organizationId | **MEDIA** | 1h | P2 |
| DB-NEW-07 | Medicao/Ocorrencia sem organizationId direto | **BAIXA** | 2h | P3 |
| DB-NEW-08 | Contrato sem relacao inversa OneToMany para Medicao/Ocorrencia | **MEDIA** | 2h | P3 |

### 2.3 Frontend/UX (validado por @ux-design-expert)

| ID | Debito | Severidade | Horas | Prioridade | Notas da Revisao |
|----|--------|------------|-------|------------|------------------|
| FE-01 | Inconsistencia validacao senha (Login/Register usam min 6, backend exige 8) | **ALTA** | 1h | P1 | Apenas Login.tsx e Register.tsx. PasswordChangeModal ja esta correto. |
| FE-02 | Inconsistencia tipo paginacao (`pagination` vs `meta`) | **MEDIA** | 2h | P2 | Unificar para `meta` (padrao NestJS/JSON:API). |
| FE-04 | SkipLink em ingles ("Skip to main content") | **BAIXA** | 0.5h | P3 | Traduzir para PT-BR. |
| FE-05 | Swagger desabilitado em producao (sem doc API alternativa) | **BAIXA** | 4h | P4 | Decisao intencional. Gerar Redoc estatico como alternativa. |
| FE-07 | Disclaimer em todas as respostas | **INFO** | N/A | N/A | Decisao de design. ~100 bytes/request. |
| FE-08 | aria-labels em ingles em componentes de producao | **MEDIA** | 2h | P2 | LoadingState, QuotaIndicator, MainLayout, AssignManagerDialog, ETPEditor. Violacao WCAG 3.1.1. |
| FE-09 | Inconsistencia validacao senha entre formularios do mesmo sistema | **MEDIA** | 1h | P2 | PasswordChangeModal tem indicador de forca + complexidade. Login/Register nao. |
| FE-10 | Ausencia de teste axe-core por pagina (cobertura parcial WCAG) | **BAIXA** | 4h | P3 |

> **Nota:** FE-03 (SkipLink nao integrado) e FE-06 (ErrorBoundary sem Sentry direto) foram **REMOVIDOS** - ja estao resolvidos no codigo conforme verificacao do @ux-design-expert. SkipLink esta em MainLayout.tsx L21, Sentry.ErrorBoundary esta em main.tsx L17.

---

## 3. Debitos Cross-Area

### 3.1 Eager Loading (SYS-01 + DB-01 + DB-NEW-03 + DB-NEW-04)
- **Backend**: 5+ relacoes `eager: true` em Contrato; cascata via Medicao, Ocorrencia, Ateste, ContratoSyncLog
- **Database**: Pior caso: 10+ JOINs automaticos em query de Ateste (Ateste->Medicao->Contrato->Edital+Org+3xUser)
- **API**: Payloads HTTP inflados com dados desnecessarios
- **Resolucao**: Remover `eager: true` de Contrato, Medicao, Ocorrencia, Ateste, ContratoSyncLog. Usar `relations` explicitas nos repositories/services

### 3.2 Tipos Monetarios (SYS-05 + DB-04)
- **Escopo ampliado**: 6 entities afetadas (Contrato, Medicao, Ateste, Edital usam `string`; Etp, TR, ContractPrice usam `number`)
- **Resolucao**: Padronizar para `string` em TODOS os campos `decimal(15,2)` para evitar floating point. Requer mudanca em Etp, TermoReferencia, ContractPrice

### 3.3 Validacao de Senha (FE-01 + FE-09)
- Login.tsx (L29) e Register.tsx (L30) usam `min(6)` sem complexidade
- PasswordChangeModal.tsx usa `minLength: 8` + indicador de forca + complexidade completa
- **Resolucao**: Extrair componente `PasswordStrengthInput` de PasswordChangeModal e reutilizar em todos os formularios

### 3.4 Multi-tenancy Incompleto (DB-09 + DB-S03 + DB-NEW-01 + DB-NEW-02 + DB-NEW-06 + DB-NEW-07)
- Entities sem `organizationId`: ExportMetadata, Ateste, ContratoSyncLog, DocumentoFiscalizacao
- Entities com `organizationId` nullable: ContractPrice
- Medicao/Ocorrencia dependem de JOIN com Contrato para isolamento
- **Resolucao**: Adicionar `organizationId` NOT NULL + indexes + backfill via entidades pai

### 3.5 API Key Security (DB-S02)
- API Key armazenada como varchar em texto plano
- Protecao depende apenas de `@Exclude()` (class-transformer)
- **Resolucao**: Ver secao "Plano de Migracao - API Key Hash" abaixo

---

## 4. Matriz de Priorizacao Final

Consolidacao de todas as revisoes com severidade ajustada e dependencias.

### P1 - Critico (resolver em Sprint 1, 1-2 dias)

| # | ID(s) | Debito | Horas | Dependencias |
|---|-------|--------|-------|--------------|
| 1 | FE-01 + FE-09 | Validacao senha: alinhar front/back + componente unificado | 2h | Nenhuma |
| 2 | DB-S01 | Password: adicionar `select: false` + manter `@Exclude()` | 3h | Nenhuma |
| 3 | DB-S02 | Hashear apiKey (ver plano de migracao abaixo) | 4h | Plano de comunicacao com usuarios |
| 4 | DB-09 | ExportMetadata: adicionar organizationId NOT NULL | 1h | Backfill via ETP associado |
| 5 | SYS-01/DB-01/DB-NEW-03/DB-NEW-04 | Remover eager loading de toda a cadeia | 6h | Mapeamento de pontos de consumo + testes regressao |
| 6 | DB-IDX-01 | Criar 22 indexes ausentes (migration unica com CONCURRENTLY) | 2-3h | Nenhuma (paralelo com #5) |
| 7 | DB-04/SYS-05 | Padronizar tipos monetarios (string para todos decimal) | 8-12h | Decisao arquitetural: usar `string`. Apos estabilizar eager loading |

### P2 - Importante (resolver em Sprint 2, 2-3 dias)

| # | ID(s) | Debito | Horas | Dependencias |
|---|-------|--------|-------|--------------|
| 8 | DB-NEW-01/02/06 | organizationId em Ateste, ContratoSyncLog, DocumentoFiscalizacao | 4h | Apos DB-09 |
| 9 | DB-S03 | ContractPrice organizationId NOT NULL | 2h | Backfill |
| 10 | FE-02 | Unificar paginacao para `meta` | 2h | Nenhuma |
| 11 | FE-08 | Traduzir aria-labels para PT-BR | 2h | Nenhuma |
| 12 | DB-02 | Refatorar DocumentoFiscalizacao polimorfico (3 FKs + CHECK) | 8h | Apos DB-NEW-06 |
| 13 | DB-P04 | Ajustar pool (apos resolver eager loading) | 1h | Apos #5 |
| 14 | DB-S06 | Anonimizar IPs (LGPD) | 4h | Nenhuma |

### P3 - Medio prazo (Sprint 3+)

| # | ID(s) | Debito | Horas |
|---|-------|--------|-------|
| 15 | DB-05 | Unificar versao/currentVersion | 2h |
| 16 | DB-06 | created_by UUID tipado em Etp | 2h |
| 17 | DB-07 | Tipar ContratoSyncLog.resolution | 2h |
| 18 | DB-NEW-07 | organizationId direto em Medicao/Ocorrencia | 2h |
| 19 | DB-NEW-08 | OneToMany em Contrato para Medicao/Ocorrencia | 2h |
| 20 | DB-P02 | GIN indexes (3 campos JSONB) | 2h |
| 21 | SYS-06 a SYS-09 | Body parser, guards, feature flags, chaos module | 9h |
| 22 | FE-04 | Traduzir SkipLink para PT-BR | 0.5h |
| 23 | FE-10 | Testes axe-core por pagina | 4h |

### P4 - Backlog

| # | ID(s) | Debito | Horas |
|---|-------|--------|-------|
| 24 | SYS-03 | Squash 53 migrations -> baseline | 4h |
| 25 | SYS-02 | Refatorar entity scan modular | 2-4h |
| 26 | SYS-04 | Turborepo/Nx (esforco alto) | 16h+ |
| 27 | DB-03/DB-10 | ApiUsage PK + entity name | 2.5h |
| 28 | DB-08 | updatedAt em 7 entities | 2h |
| 29 | DB-11/DB-NEW-05 | Enum inline (govBrSyncStatus, ExportMetadata.format) | 1.5h |
| 30 | DB-S04 | CHECK constraint para CNPJ | 1h |
| 31 | DB-P05 | tsvector para busca textual | 4h |
| 32 | DB-P06 | IVFFlat para Legislation | 1h |
| 33 | DB-P07 | Particao SINAPI/SICRO por UF | 8h |
| 34 | DB-P03 | Particao contract_prices (so apos 5M+ registros) | 16h |
| 35 | SYS-10/11/12 | tmpfiles, strict TS configs | 2.5h |
| 36 | FE-05 | Redoc estatico para doc API | 4h |

---

## 5. Plano de Resolucao (com dependencias)

Ordem de resolucao validada pelo @qa, considerando dependencias tecnicas:

```
                    ┌─────────────────────────────────────┐
                    │  BASELINE DE METRICAS (prerequisito) │
                    └──────────────┬──────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
    ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
    │ FE-01 + FE-09│    │  DB-S01 (select  │    │ DB-IDX-01 (22    │
    │ Validacao    │    │  false + Exclude)│    │ indexes)         │
    │ senha (2h)   │    │  (3h)           │    │ (2-3h)           │
    └──────────────┘    └─────────────────┘    └──────────────────┘
                                                        │
            ┌───────────────────────┐                   │ (paralelo)
            ▼                       │                   │
    ┌──────────────────┐            │           ┌───────▼──────────┐
    │ DB-S02 (apiKey   │            │           │ SYS-01/DB-01     │
    │ hash) (4h)       │            │           │ Eager loading    │
    │ Ver plano abaixo │            │           │ (6h)             │
    └──────────────────┘            │           └───────┬──────────┘
                                    │                   │
                            ┌───────▼───────┐   ┌──────▼───────────┐
                            │ DB-09 (export │   │ DB-04/SYS-05     │
                            │ metadata orgId│   │ Tipos monetarios  │
                            │ (1h)          │   │ (8-12h)          │
                            └───────┬───────┘   └──────────────────┘
                                    │
                            ┌───────▼───────────────┐
                            │ DB-NEW-01/02/06        │
                            │ orgId em Ateste,       │
                            │ SyncLog, DocFisc (4h)  │
                            └───────┬───────────────┘
                                    │
                            ┌───────▼───────┐
                            │ DB-02 refator │
                            │ polimorfico   │
                            │ (8h)          │
                            └───────────────┘

    ... Demais itens P3/P4 conforme backlog ...

    ┌─────────────────────────────────────────┐
    │ SYS-03 (squash migrations) - POR ULTIMO │
    │ Maior risco de breaking change          │
    └─────────────────────────────────────────┘
```

**Bloqueadores identificados pelo @qa:**
- **Nenhuma tarefa pode ser iniciada sem baseline de testes.** Se a cobertura atual for baixa, criar testes para os fluxos afetados ANTES de refatorar.
- A resolucao de DB-S02 (apiKey hash) bloqueia qualquer melhoria na API publica de precos.

---

## 6. Riscos e Mitigacoes

| Risco | Areas Afetadas | Severidade | Mitigacao |
|-------|---------------|------------|-----------|
| Resolver eager loading pode quebrar codigo que depende de carregamento automatico | Backend, Frontend, Testes | **ALTA** | Mapear TODOS os pontos que consomem entidades com eager antes de remover. Criar testes de regressao para cada endpoint afetado. |
| Padronizar tipos monetarios requer migration de dados existentes | Database, Backend, Frontend | **ALTA** | Migration reversivel. Validar calculos com dados reais de producao (anonimizados). Testar roundtrip DB->Service->API->Frontend. |
| Hashear apiKey invalida TODAS as API keys existentes | Database, API publica, Clientes | **ALTA** | Plano de migracao gradual (ver secao dedicada abaixo). |
| Adicionar organizationId em ExportMetadata requer backfill | Database, Backend | **MEDIA** | Inferir organizationId via ETP associado. Validar que nenhum export fica orfao. |
| 22 indexes novos podem causar lock prolongado | Database, Producao | **MEDIA** | Usar `CREATE INDEX CONCURRENTLY` (ver nota dedicada abaixo). |
| Squash de migrations pode causar incompatibilidade com ambientes existentes | Database, DevOps | **MEDIA** | Fazer POR ULTIMO. Apenas novos ambientes usam baseline. Ambientes existentes mantem migrations ja executadas. |
| Alterar validacao de senha | Frontend, UX | **BAIXA** | Apenas afeta novos registros. Usuarios existentes nao impactados (senhas ja em hash). |

---

## 7. Criterios de Sucesso

### Testes Requeridos por Debito

| Debito | Testes Necessarios |
|--------|-------------------|
| SYS-01/DB-01 (eager loading) | Testes de integracao para CADA endpoint de Contrato, Edital, Medicao, Ocorrencia, Ateste. Verificar payloads sem dados desnecessarios. Benchmark antes/depois. |
| DB-S02 (apiKey hash) | Teste de autenticacao via API Key apos migracao. Teste de que texto plano nao persiste. Teste de comparacao via hash. |
| DB-04/SYS-05 (tipos monetarios) | Testes unitarios com valores limites (0.01, 999999999999.99). Roundtrip DB->Service->API->Frontend. Verificar que conversoes nao perdem precisao. |
| FE-01 (validacao senha) | E2E: registro com 6 chars deve falhar no front. E2E: 8+ chars com complexidade deve passar. Mensagem de erro correta. |
| DB-IDX-01 (indexes) | `EXPLAIN ANALYZE` antes/depois. Verificar que queries de listagem usam novos indexes. |
| DB-09 (ExportMetadata orgId) | Teste de isolamento multi-tenant: usuario A nao ve exports de B. Backfill: 100% dos registros com organizationId. |
| DB-S03 (ContractPrice orgId NOT NULL) | Insercao sem organizationId deve falhar. Backfill completo. |
| SYS-03 (squash) | Fresh install com baseline. Upgrade em ambiente com migrations existentes. |

### Testes de Regressao Globais
- Suite completa de testes unitarios e E2E apos cada resolucao
- Smoke test da cadeia: ETP -> TR -> Edital -> Contrato -> Medicao -> Ateste
- P95 das rotas principais nao deve degradar

### Metas Pos-Resolucao

| Metrica | Meta |
|---------|------|
| Cobertura testes unitarios backend | >= 80% |
| P95 de rotas de listagem | < 500ms |
| Payload medio de listagem | Reducao de 50%+ (apos remover eager) |
| Campos monetarios inconsistentes | Zero |
| Entities principais sem organizationId NOT NULL | Zero |
| API keys em texto plano | Zero |
| 22 indexes verificados via EXPLAIN | 100% |
| Frontend e backend com mesma validacao de senha | Sim |

---

## 8. Plano de Migracao - API Key Hash (DB-S02)

A migracao de apiKey de texto plano para hash **nao pode ser feita como "flip switch"**. Requer transicao gradual:

### Fase 1: Preparacao (sem impacto em producao)
1. Adicionar coluna `apiKeyHash` (varchar, nullable) na tabela `users`
2. Implementar funcao de hash com bcrypt/argon2 (mesmo padrao de password)
3. Atualizar servico de autenticacao para suportar **dual-read**: verificar `apiKeyHash` primeiro, fallback para `apiKey` texto plano

### Fase 2: Migracao silenciosa
4. Script de backfill: para cada usuario com `apiKey` preenchida, gerar `apiKeyHash`
5. Deploy do dual-read em producao
6. Monitorar: verificar que autenticacao via hash funciona (logs)

### Fase 3: Comunicacao
7. Notificar usuarios da API publica sobre regeneracao de keys (se necessario)
8. Definir deadline para remocao do texto plano (ex: 30 dias)

### Fase 4: Cutover
9. Remover coluna `apiKey` (texto plano)
10. Atualizar servico para usar apenas `apiKeyHash`
11. Verificar que nenhum endpoint retorna apiKey (mesmo com `@Exclude`)

**Tempo total estimado:** 4h de desenvolvimento + 30 dias de transicao.

---

## 9. Nota: CREATE INDEX CONCURRENTLY

**CRITICO para evitar downtime em producao.**

O TypeORM **NAO usa `CREATE INDEX CONCURRENTLY`** por padrao em migrations. O `CREATE INDEX` padrao **bloqueia escrita na tabela** durante a criacao do indice.

### Abordagem recomendada

A migration dos 22 indexes (DB-IDX-01) DEVE usar SQL raw com `CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY idx_contratos_organization_id ON contratos(organization_id);
CREATE INDEX CONCURRENTLY idx_contratos_edital_id ON contratos(edital_id);
CREATE INDEX CONCURRENTLY idx_contratos_status ON contratos(status);
-- ... demais indexes
```

### Restricoes do CONCURRENTLY
- **NAO pode rodar dentro de transacao.** A migration TypeORM deve usar `queryRunner.query()` com cada statement separado, e a migration NAO deve ter `await queryRunner.startTransaction()`
- Se o index falhar (ex: timeout), ele fica em estado `INVALID`. Verificar com `SELECT * FROM pg_indexes WHERE indexdef LIKE '%INVALID%'` e recriar se necessario
- Tempo estimado: ~30s para 22 indexes em tabelas com <100K registros

### Exemplo de migration TypeORM

```typescript
export class AddMissingIndexes1706500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // NAO usar transacao - CONCURRENTLY nao suporta
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_org_id ON contratos("organizationId")`);
    await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contratos_edital_id ON contratos("editalId")`);
    // ... demais indexes
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contratos_org_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contratos_edital_id`);
    // ...
  }
}
```

---

## 10. Baseline de Metricas (a coletar ANTES de iniciar resolucoes)

Conforme recomendacao do @qa, as seguintes metricas devem ser coletadas como baseline antes de iniciar qualquer resolucao de debito tecnico:

| Metrica | Como Medir | Ferramenta | Status |
|---------|-----------|------------|--------|
| Cobertura de testes unitarios | `npm test -- --coverage` | Jest/Vitest | A coletar |
| Cobertura de testes E2E | Paginas cobertas vs total (~30) | Playwright | A coletar |
| Tempo de startup backend | Log do NestJS bootstrap | Winston logs | A coletar |
| P95 latencia rotas principais | `/api/v1/etps`, `/api/v1/contratos` | Prometheus/Sentry | A coletar |
| Tamanho medio de payload | Endpoints de listagem com eager loading | Network / Sentry | A coletar |
| Numero de queries por request | Slow query subscriber | TypeORM logger | A coletar |
| Taxa de erro 5xx (ultimos 30 dias) | Dashboard de erros | Sentry | A coletar |
| Vulnerabilidades npm | `npm audit` | npm | A coletar |
| Indexes utilizados vs ausentes | `pg_stat_user_indexes` | PostgreSQL | A coletar |

> **IMPORTANTE:** Sem essas metricas de baseline, nao sera possivel medir o impacto real das resolucoes. A coleta de baseline e **pre-requisito** para iniciar o Sprint 1.

---

## 11. Riscos Nao Cobertos por Este Assessment

Conforme identificado pelo @qa, os seguintes topicos NAO foram auditados neste assessment e devem ser endereados em futuras analises:

1. **Redis/BullMQ** - configuracao de filas, retry policies, dead letter queues, persistencia de jobs
2. **Backup e Disaster Recovery** - estrategia de backup PostgreSQL no Railway, RPO/RTO
3. **Pipeline CI/CD** - diagnostico do pipeline atual, tempo de build, steps existentes
4. **Cobertura de testes** - baseline detalhado (ver secao 10)

---

*Documento FINAL gerado em 2026-01-29 por @architect (Aria) - AIOS v3.10.0*
*Revisoes de @data-engineer, @ux-design-expert e @qa incorporadas e marcadas como CONCLUIDAS.*
*Proximo passo: coletar baseline de metricas (secao 10) e iniciar Sprint 1 de resolucao.*
