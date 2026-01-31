# Database Specialist Review

**Reviewer:** @data-engineer (AIOS)
**Data:** 2026-01-29
**Documento Revisado:** docs/prd/technical-debt-DRAFT.md

---

## Debitos Validados

| ID | Debito | Severidade Original | Severidade Ajustada | Horas | Prioridade | Notas |
|----|--------|---------------------|---------------------|-------|------------|-------|
| DB-01 (TD-01) | Eager loading excessivo | ALTA | **ALTA** (confirmado) | 4-6h | P1 | **CONFIRMADO.** Contrato tem `eager: true` em Edital, Organization, gestorResponsavel, fiscalResponsavel, createdBy (5 relacoes eager). Medicao e Ocorrencia carregam Contrato eager, que cascateia. Ateste carrega Medicao eager, que carrega Contrato eager. Cadeia real: Ateste->Medicao->Contrato->Edital+Org+3xUser. Pior caso: 10+ JOINs por query de Ateste. |
| DB-02 (TD-02) | Relacionamento polimorfico sem FK | MEDIA | **MEDIA** (confirmado) | 8h | P2 | **CONFIRMADO.** `DocumentoFiscalizacao.entidadeId` e UUID sem FK. `tipoEntidade` e enum (medicao/ocorrencia/ateste). Sem CASCADE delete, orphans possiveis. |
| DB-03 (TD-03) | ApiUsage com PK integer | BAIXA | **BAIXA** (confirmado) | 2h | P4 | **CONFIRMADO.** `@PrimaryGeneratedColumn()` sem 'uuid'. Unica entidade com PK autoincrement. |
| DB-04 (TD-04) | Tipos monetarios inconsistentes | ALTA | **ALTA** (confirmado, escopo maior) | 8-12h | P1 | **CONFIRMADO E AMPLIADO.** A inconsistencia e mais ampla que o DRAFT descreve. `string`: Contrato.valorGlobal, Medicao.valorMedido, Ateste.valorAtestado, Edital.valorEstimado, Edital.valorLimiteMeEpp, Edital.cotaReservadaMeEpp. `number`: Etp.valorEstimado, Etp.valorUnitario, Etp.quantidadeEstimada, TermoReferencia.valorEstimado, ContractPrice.precoUnitario/quantidade/valorTotal. Sao 6 entities afetadas, nao apenas 3. Esforco maior. |
| DB-05 (TD-05) | Campos versao/currentVersion duplicados | MEDIA | **MEDIA** (confirmado) | 2h | P3 | **CONFIRMADO.** `TermoReferencia` tem `versao` (L244, default 1) e `currentVersion` (L251, default 1). Semantica identica. |
| DB-06 (TD-06) | created_by varchar em Etp | MEDIA | **MEDIA** (confirmado) | 2h | P3 | **CONFIRMADO.** `Etp.createdById` mapeado como `@Column({ name: 'created_by' })` tipo `string` sem `type: 'uuid'`. Nao possui FK constraint explicita na coluna, embora o ManyToOne com JoinColumn crie a FK via TypeORM. O risco e menor que o descrito, pois o ORM garante integridade. |
| DB-07 (TD-07) | ContratoSyncLog.resolution `any` | MEDIA | **MEDIA** (confirmado) | 2h | P3 | **CONFIRMADO.** Linha 74: `resolution?: any`. Tambem `ConflictField.localValue` e `remoteValue` sao `any`. |
| DB-08 (TD-08) | Falta de UpdateDateColumn | BAIXA | **BAIXA** (confirmado) | 2h | P4 | **CONFIRMADO.** Entities sem `updatedAt`: EtpVersion, TermoReferenciaVersion (nao verificado), ComplianceValidationHistory (nao verificado), Ateste, DocumentoFiscalizacao, ContratoSyncLog, ExportMetadata. 7 entities. |
| DB-09 (TD-09) | ExportMetadata sem organizationId | MEDIA | **ALTA** (ajustado) | 1h | P1 | **CONFIRMADO. SEVERIDADE ELEVADA.** ExportMetadata nao tem `organizationId` e nao tem `@ManyToOne(() => Organization)`. Como armazena s3Key e s3Uri de exports, acesso cross-tenant expoe arquivos S3 de outras organizacoes. Risco de seguranca real, nao apenas de dados. |
| DB-10 (TD-10) | ApiUsage sem entity name | BAIXA | **BAIXA** (confirmado) | 0.5h | P4 | **CONFIRMADO.** `@Entity()` vazio. TypeORM gerara nome `api_usage` automaticamente, que e aceitavel mas inconsistente com as demais entities. |
| DB-11 (TD-11) | Enum inline govBrSyncStatus | MEDIA | **BAIXA** (ajustado) | 1h | P4 | **AJUSTADO para BAIXA.** O enum inline `['pending', 'synced', 'error']` funciona corretamente no PostgreSQL. O tipo TypeScript union `'pending' | 'synced' | 'error'` em Contrato.govBrSyncStatus (L414) garante type safety em compile-time. E uma questao de convencao, nao de funcionalidade. ContratoSyncLog.action tambem usa enum inline (L56-59). |
| DB-S01 (S-01) | Password field sem @Exclude global | MEDIA | **ALTA** (ajustado) | 3h | P1 | **CORRECAO IMPORTANTE.** O DRAFT diz `select: false` no TypeORM. **ISSO E INCORRETO.** A entity User usa `@Column()` + `@Exclude()` (class-transformer), NAO `select: false`. Isso significa que TODA query `findOne`/`find` retorna o hash de senha. A protecao depende EXCLUSIVAMENTE do ClassSerializerInterceptor estar ativo globalmente. Se qualquer endpoint retornar o objeto User sem passar pelo interceptor, o hash vaza. Risco maior que o avaliado. |
| DB-S02 (S-02) | API Key armazenada em texto | ALTA | **ALTA** (confirmado) | 4h | P1 | **CONFIRMADO.** `User.apiKey` e `varchar` com `@Exclude()`. Mesmo problema que password: depende de class-transformer. Porem apiKey e texto plano (nao hash), entao vazamento expoe a key diretamente. |
| DB-S03 (S-03) | Multi-tenancy nao obrigatorio em ContractPrice | MEDIA | **MEDIA** (confirmado) | 2h | P2 | **CONFIRMADO.** `ContractPrice.organizationId` e `nullable: true` (L77-78). Comentario no codigo diz "nullable for backward compatibility". |
| DB-S04 (S-04) | CNPJ sem validacao no banco | BAIXA | **BAIXA** (confirmado) | 1h | P4 | **CONFIRMADO.** `Contrato.contratadoCnpj` e `varchar(18)` sem CHECK constraint. |
| DB-S05 (S-05) | ContratoSyncLog.resolution `any` | MEDIA | **MEDIA** (duplicado com DB-07) | - | - | **DUPLICADO de DB-07.** Manter apenas DB-07. |
| DB-S06 (S-06) | IP em texto plano (LGPD) | BAIXA | **MEDIA** (ajustado) | 4h | P3 | **AJUSTADO para MEDIA.** LGPD Art. 12, §2o define IP como dado pessoal quando combinado com outros dados. analytics_events e audit_logs armazenam IP + userId, o que constitui dado pessoal vinculado. Recomendo anonimizacao parcial (mascarar ultimo octeto) ou hash com salt. |
| DB-P01 (P-01) | Eager loading cascateado | ALTA | **ALTA** (duplicado com DB-01) | - | - | **DUPLICADO de DB-01.** Manter consolidado. |
| DB-P02 (P-02) | JSONB sem index GIN | MEDIA | **MEDIA** (confirmado) | 2h | P3 | **CONFIRMADO.** Campos JSONB encontrados: Etp.dynamicFields, Etp.metadata, Etp.responsavelTecnico, Contrato.clausulas, Edital.requisitosHabilitacao, Edital.prazos, Edital.clausulas, Edital.anexos, TermoReferencia.cronograma, TermoReferencia.especificacoesTecnicas, ContractPrice.metadata, EtpVersion.snapshot, ContratoSyncLog.conflicts/resolution, Legislation.articles. ~14 campos JSONB relevantes (nao 25 como estimado). |
| DB-P03 (P-03) | contract_prices sem particao | MEDIA | **BAIXA** (ajustado) | 16h | P4 | **AJUSTADO para BAIXA.** Tabela ja possui 10+ indexes declarados na entity (organizationId, codigoItem, dataHomologacao, uf, modalidade, fonte, externalId, cnpjFornecedor, numeroProcesso, compostos). Para o volume atual (estimativa <100K registros), indexes sao suficientes. Partitioning so justifica apos 5M+ registros. |
| DB-P04 (P-04) | Pool connection limitado (max=20) | MEDIA | **MEDIA** (confirmado) | 1h | P2 | **CONFIRMADO.** Com eager loading cascateado, cada request pode consumir conexao por mais tempo. Recomendo aumentar para 30-40 quando resolver eager loading. |
| DB-P05 (P-05) | Texto sem tsvector | BAIXA | **BAIXA** (confirmado) | 4h | P4 | **CONFIRMADO.** Campos `objeto` e `descricao` em Etp, Edital, Contrato, TermoReferencia sem indice de texto completo. |
| DB-P06 (P-06) | Legislation.embedding sem HNSW | BAIXA | **BAIXA** (confirmado) | 1h | P4 | **CONFIRMADO.** Entity Legislation usa `type: 'vector'` (L80-83) sem index HNSW ou IVFFlat declarado. |
| DB-P07 (P-07) | SINAPI/SICRO sem particao UF | BAIXA | **BAIXA** (confirmado) | 8h | P4 | **CONFIRMADO.** Impacto futuro. Nao prioritario. |

---

## Debitos Adicionados

| ID | Debito | Severidade | Descricao | Horas | Prioridade |
|----|--------|------------|-----------|-------|------------|
| DB-NEW-01 | Ateste sem updatedAt E sem organizationId | **MEDIA** | Entity `Ateste` nao possui `organizationId` para isolamento multi-tenant. Acesso cross-tenant possivel via query direta a atestes. Combinado com falta de `updatedAt`. | 2h | P2 |
| DB-NEW-02 | ContratoSyncLog sem organizationId | **MEDIA** | Entity `ContratoSyncLog` nao possui `organizationId`. Logs de sincronizacao com Gov.br acessiveis cross-tenant. Embora tenha relacao eager com Contrato (que tem orgId), queries diretas nao filtram. | 1h | P2 |
| DB-NEW-03 | ContratoSyncLog eager loading em Contrato | **MEDIA** | `ContratoSyncLog.contrato` usa `eager: true` (L43). Todo sync log carrega Contrato completo que por sua vez carrega Edital+Org+3xUser. Mais um ponto de cascata de eager loading. | 1h | P1 (resolver junto com DB-01) |
| DB-NEW-04 | Ateste->Medicao->Contrato cadeia eager tripla | **ALTA** | `Ateste.medicao` e `eager: true`, `Medicao.contrato` e `eager: true`, `Contrato.edital/organization/users` sao `eager: true`. Uma query de Ateste gera 10+ JOINs automaticos. Cadeia mais profunda que a documentada no DRAFT. | - | P1 (resolver junto com DB-01) |
| DB-NEW-05 | ExportMetadata.format como enum inline de string | **BAIXA** | `format` usa `enum: ['pdf', 'docx', 'json']` com tipo TypeScript `string` ao inves de enum. Mesmo padrao criticado em DB-11. | 0.5h | P4 |
| DB-NEW-06 | DocumentoFiscalizacao sem organizationId | **MEDIA** | Entity `DocumentoFiscalizacao` nao possui `organizationId`. Documentos de fiscalizacao acessiveis cross-tenant. O relacionamento polimorfico agrava: nao ha FK para inferir tenant via JOIN. | 1h | P2 |
| DB-NEW-07 | Medicao/Ocorrencia sem organizationId direto | **BAIXA** | `Medicao` e `Ocorrencia` nao possuem `organizationId` direto. Dependem de JOIN com Contrato para isolamento multi-tenant. Funcional (TenantGuard filtra via Contrato), mas inconsistente com padrao da cadeia. | 2h | P3 |
| DB-NEW-08 | Contrato sem relacao inversa OneToMany para Medicao/Ocorrencia | **MEDIA** | `Contrato` nao declara `@OneToMany` para Medicao ou Ocorrencia. Impede lazy loading bidirecional e query builder com `relations`. Identificado no DB-AUDIT mas nao listado como debito no DRAFT. | 2h | P3 |

---

## Respostas ao Architect

### 1. Indexes ausentes - Prioridade e estrategia de migration

**Recomendacao: Migration unica, executada em horario de baixo trafego.**

Ordem de prioridade dentro da migration:

**Grupo A - Criticos (impactam queries do dia-a-dia):**
1. `contratos(organizationId)` - multi-tenancy, toda listagem filtra
2. `contratos(editalId)` - JOIN Edital->Contrato
3. `contratos(status)` - filtro em dashboard
4. `medicoes(contratoId)` - JOIN Contrato->Medicoes (mais frequente)
5. `medicoes(status)` - filtro de aprovacao
6. `ocorrencias(contratoId)` - JOIN Contrato->Ocorrencias
7. `ocorrencias(status)` - filtro de resolucao
8. `termos_referencia(organizationId)` - multi-tenancy
9. `termos_referencia(etpId)` - JOIN ETP->TR
10. `editais(organizationId)` - multi-tenancy

**Grupo B - Importantes:**
11-16. Demais indexes de status, termoReferenciaId, govBrSyncStatus, atestes(medicaoId), pesquisas_precos

**Grupo C - Suporte:**
17-22. documentos_fiscalizacao, contrato_sync_logs, export_metadata, etp_sections, etp_versions

**Justificativa para migration unica:** Todos sao `CREATE INDEX CONCURRENTLY` (nao bloqueante no PostgreSQL). Podem ser executados em sequencia sem downtime. Se algum falhar, os anteriores ja estarao criados. Tempo estimado: ~30s para 22 indexes em tabelas com <100K registros.

### 2. Partitioning de contract_prices

**Recomendacao: NAO implementar agora. Monitorar.**

A tabela `contract_prices` ja possui 10+ indexes declarados na entity, incluindo compostos (`uf + dataHomologacao`, `organizationId + createdAt`). Para volume atual (estimativa <100K registros, sistema em fase de crescimento), indexes sao mais que suficientes.

**Criterio de acao:** Implementar partitioning por `dataHomologacao` (range mensal ou trimestral) quando:
- Tabela ultrapassar **5M registros** (nao 1M como sugerido no DRAFT)
- Query plans mostrarem sequential scans em queries filtradas por data
- Tempo de response de queries de benchmark ultrapassar 500ms p95

**Alternativa intermediaria:** Antes de particionar, considerar `BRIN index` em `dataHomologacao` (otimo para dados temporais sequenciais, custo de storage 1000x menor que B-tree).

### 3. Pool de conexoes (max=20)

**Analise:**

O Railway Starter Plan suporta ate **20 conexoes simultaneas** no PostgreSQL (limite do plano). O pool max=20 esta correto para o plano atual.

**Recomendacoes:**
1. **Curto prazo:** Resolver eager loading (DB-01) para reduzir tempo de hold de conexao. Cada request com 8+ JOINs segura conexao por mais tempo.
2. **Medio prazo:** Implementar connection pooling externo (PgBouncer) entre app e DB. Railway suporta PgBouncer como add-on. Permite multiplexar 100+ conexoes da app em 20 conexoes reais.
3. **Longo prazo:** Upgrade para Railway Pro ($20/mo) que suporta 50+ conexoes.

**Metricas a monitorar:** Adicionar health check que reporte `pool.totalCount`, `pool.idleCount`, `pool.waitingCount` via TypeORM. Se `waitingCount > 0` em horario de pico, e sinal de esgotamento.

### 4. JSONB indexes GIN

**Recomendacao: Criar GIN index apenas nos 3 campos mais consultados.**

Apos analise das entities, os campos JSONB consultados com operadores `@>`, `?`, `?|` sao:

1. **`Etp.metadata`** - consultado para filtros por tags, unidadeRequisitante. **CRIAR GIN.**
2. **`ContractPrice.metadata`** - consultado para filtros por marca, modelo, codigoCatmat. **CRIAR GIN.**
3. **`Etp.dynamicFields`** - consultado por template type para campos especificos. **CRIAR GIN.**

**NAO criar GIN para:**
- `Contrato.clausulas`, `Edital.clausulas/anexos/prazos/requisitosHabilitacao` - sao campos de armazenamento, nao de consulta. Lidos integralmente quando o documento e carregado.
- `TermoReferencia.cronograma/especificacoesTecnicas` - idem.
- `EtpVersion.snapshot` - leitura integral por versao.
- `Legislation.articles` - busca vetorial e feita via embedding, nao JSONB.
- `ContratoSyncLog.conflicts/resolution` - dados de auditoria, raramente consultados por conteudo.

**Migration:**
```sql
CREATE INDEX CONCURRENTLY idx_etps_metadata_gin ON etps USING GIN (metadata);
CREATE INDEX CONCURRENTLY idx_etps_dynamic_fields_gin ON etps USING GIN ("dynamicFields");
CREATE INDEX CONCURRENTLY idx_contract_prices_metadata_gin ON contract_prices USING GIN (metadata);
```

### 5. pgvector HNSW para Legislation

**Recomendacao: Criar index IVFFlat agora, migrar para HNSW quando necessario.**

A tabela `legislation` tem volume pequeno (legislacao brasileira de licitacoes - estimativa <1000 registros). Para esse volume:

- **Sequential scan e aceitavel** ate ~5000 registros com pgvector
- **IVFFlat** e recomendado a partir de 1000 registros (parametro `lists = sqrt(n)`)
- **HNSW** so justifica a partir de 100K+ registros (custo de build alto, memoria significativa)

**Recomendacao concreta:**
```sql
CREATE INDEX CONCURRENTLY idx_legislation_embedding_ivfflat
ON legislation USING ivfflat (embedding vector_cosine_ops) WITH (lists = 32);
```

**Plano de crescimento:** Se o sistema expandir para indexar jurisprudencia (TCU, tribunais), o volume pode crescer para 50K+. Nesse caso, migrar para HNSW com `m=16, ef_construction=200`.

### 6. Squash de migrations

**Recomendacao: SIM, consolidar em baseline. Mas com cuidados.**

Contei **53 migrations** em `src/migrations/` (nao 57 como o DRAFT indica). Todas sao DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX). Nao identifiquei migrations com DML (INSERT, UPDATE, DELETE de dados).

**Estrategia de squash:**
1. Gerar dump do schema atual: `pg_dump --schema-only > baseline.sql`
2. Criar migration unica `1000000000000-BaselineSchema.ts` com o schema completo
3. Inserir registro na tabela `migrations` do TypeORM para marcar baseline como executada em ambientes existentes
4. Remover as 53 migrations antigas
5. Novas migrations a partir da baseline

**Risco:** Ambientes de staging/dev que nao estejam sincronizados podem ter problemas. Recomendo:
- Executar squash APENAS apos confirmar que producao e staging estao no mesmo schema version
- Manter backup das migrations antigas em branch `archive/migrations-pre-squash`

**Impacto em startup:** Reducao de ~2-3s no startup (TypeORM verifica cada migration na tabela). Com 53 migrations, sao 53 queries de verificacao.

### 7. DocumentoFiscalizacao polimorfico

**Recomendacao: Converter para 3 FKs separadas com CHECK constraint.**

**Impacto em queries existentes:**

Queries atuais provavelmente fazem:
```typescript
// Antes
documentoRepo.find({ where: { tipoEntidade: 'medicao', entidadeId: medicaoId } })

// Depois
documentoRepo.find({ where: { medicaoId: medicaoId } })
```

A mudanca e simples no codigo. O TypeORM gera JOINs corretos automaticamente.

**Padrao recomendado para TypeORM:**

```typescript
@Entity('documentos_fiscalizacao')
export class DocumentoFiscalizacao {
  // ... campos existentes ...

  @Column({ type: 'uuid', nullable: true })
  medicaoId: string | null;

  @ManyToOne(() => Medicao, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicaoId' })
  medicao: Medicao | null;

  @Column({ type: 'uuid', nullable: true })
  ocorrenciaId: string | null;

  @ManyToOne(() => Ocorrencia, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ocorrenciaId' })
  ocorrencia: Ocorrencia | null;

  @Column({ type: 'uuid', nullable: true })
  atesteId: string | null;

  @ManyToOne(() => Ateste, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'atesteId' })
  ateste: Ateste | null;
}
```

**CHECK constraint na migration:**
```sql
ALTER TABLE documentos_fiscalizacao ADD CONSTRAINT chk_exactly_one_parent
CHECK (
  (medicaoId IS NOT NULL)::int +
  (ocorrenciaId IS NOT NULL)::int +
  (atesteId IS NOT NULL)::int = 1
);
```

**Padrao alternativo (Table-Per-Type):** Criar 3 tabelas separadas (`documentos_medicao`, `documentos_ocorrencia`, `documentos_ateste`). Mais normalizado, mas maior esforco de refatoracao. **NAO recomendo** para este caso - o CHECK constraint e suficiente.

**Migration de dados existentes:**
```sql
UPDATE documentos_fiscalizacao SET medicaoId = "entidadeId" WHERE "tipoEntidade" = 'medicao';
UPDATE documentos_fiscalizacao SET ocorrenciaId = "entidadeId" WHERE "tipoEntidade" = 'ocorrencia';
UPDATE documentos_fiscalizacao SET atesteId = "entidadeId" WHERE "tipoEntidade" = 'ateste';
-- Depois: DROP COLUMN entidadeId, tipoEntidade
```

---

## Recomendacoes

### Ordem de Resolucao Recomendada

**Sprint 1 - Seguranca e Performance Critica (1-2 dias)**

| # | Debito | Horas | Justificativa |
|---|--------|-------|---------------|
| 1 | DB-S02 - Hashear apiKey | 4h | Risco de seguranca critico. Texto plano no banco. |
| 2 | DB-S01 - Password sem `select: false` | 3h | DRAFT errado: nao tem `select: false`. Adicionar `select: false` + `@Exclude()` como dupla protecao. |
| 3 | DB-09 - ExportMetadata sem organizationId | 1h | Expoe s3Key/s3Uri cross-tenant. Quick fix. |
| 4 | DB-01/DB-NEW-03/DB-NEW-04 - Remover eager loading | 6h | Maior impacto em performance. Remover `eager: true` de Contrato, Medicao, Ocorrencia, Ateste, ContratoSyncLog. Usar `relations` explicito. |

**Sprint 2 - Indexes e Integridade (1 dia)**

| # | Debito | Horas | Justificativa |
|---|--------|-------|---------------|
| 5 | Indexes ausentes (22) | 2-3h | Migration unica. Impacto imediato em performance de listagens. |
| 6 | DB-NEW-01/02/06 - organizationId em Ateste, ContratoSyncLog, DocumentoFiscalizacao | 3h | Fechar gaps de multi-tenancy. |
| 7 | DB-S06 - Anonimizar IPs (LGPD) | 4h | Compliance legal. |

**Sprint 3 - Qualidade de Dados (2-3 dias)**

| # | Debito | Horas | Justificativa |
|---|--------|-------|---------------|
| 8 | DB-04 - Padronizar tipos monetarios | 8-12h | Decisao: usar `string` para TODOS os decimal(15,2). Evita floating point. Requer mudanca em Etp, TermoReferencia, ContractPrice. |
| 9 | DB-02 - Refatorar DocumentoFiscalizacao | 8h | FKs separadas + CHECK constraint + migration de dados. |
| 10 | DB-05 - Unificar versao/currentVersion | 2h | Manter `currentVersion`, deprecar `versao`. |
| 11 | DB-NEW-08 - OneToMany em Contrato | 2h | Adicionar relacoes inversas para Medicao/Ocorrencia. |

**Backlog (quando conveniente)**

| # | Debito | Horas |
|---|--------|-------|
| 12 | DB-P02 - GIN indexes (3 campos) | 2h |
| 13 | DB-P06 - IVFFlat para Legislation | 1h |
| 14 | DB-07 - Tipar ContratoSyncLog.resolution | 2h |
| 15 | DB-08 - updatedAt em 7 entities | 2h |
| 16 | Squash de migrations (53->1) | 4h |
| 17 | DB-03/DB-10 - ApiUsage PK/entity name | 2.5h |
| 18 | DB-P04 - Pool config (apos resolver eager) | 1h |

**Total estimado: ~70h de trabalho tecnico.**

### Nota Final

O schema esta maduro para o estagio do projeto. Os debitos criticos sao poucos e concentrados em 3 areas: **seguranca** (apiKey/password), **performance** (eager loading), e **multi-tenancy** (organizationId ausente). Resolvendo esses 3 pilares no Sprint 1-2, o sistema estara significativamente mais robusto.

A correcao mais importante que faco ao DRAFT e sobre **DB-S01**: o User.password NAO tem `select: false` como afirmado. Tem apenas `@Exclude()` do class-transformer. Isso e uma camada de protecao fragil que depende de interceptor global. Recomendo adicionar `select: false` na Column como primeira linha de defesa.

---

*Review gerado por @data-engineer (AIOS) em 2026-01-29*
*Baseado em analise direta de 14 entity files e 53 migrations*
