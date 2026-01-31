# Database Audit - ETP Express

**Data:** 2026-01-29
**Auditor:** @data-engineer (AIOS)
**Escopo:** 40 entities, 52 migrations, configuracao TypeORM

---

## Resumo da Auditoria

| Metrica | Valor |
|---------|-------|
| Total de Entities | 40 |
| Total de Migrations | 52 |
| Tabelas com Multi-tenancy (organizationId) | ~15 |
| Indexes explicitamente declarados | ~60+ |
| Relacionamentos CASCADE | ~15 |
| Relacionamentos SET NULL | ~8 |
| Campos JSONB | ~25+ |
| Enums PostgreSQL | ~20+ |
| Entidades sem indexes | ~10 |

**Veredicto Geral:** O schema esta maduro e bem estruturado para a complexidade do dominio (licitacoes publicas Lei 14.133/2021). Existem debitos tecnicos pontuais que devem ser priorizados antes de escalar.

---

## Debitos Tecnicos

| ID | Debito | Severidade | Area | Descricao |
|----|--------|------------|------|-----------|
| TD-01 | Eager loading excessivo | ALTA | Performance | Contrato carrega Edital (eager) que carrega Organization (eager). Cadeia em cascata: Contrato->Edital->Organization->... Medicao e Ocorrencia tambem carregam Contrato eager. Resultado: queries com 5+ JOINs automaticos. |
| TD-02 | Relacionamento polimorfico sem FK | MEDIA | Integridade | `DocumentoFiscalizacao.entidadeId` e polimorfico (pode apontar para medicao, ocorrencia ou ateste), sem Foreign Key real. Orphans possiveis. |
| TD-03 | ApiUsage com PK integer | BAIXA | Consistencia | Unica entidade com PK autoincrement (int). Todas as outras usam UUID. Inconsistencia no padrao. |
| TD-04 | Tipos inconsistentes para valores monetarios | ALTA | Dados | `Contrato.valorGlobal` e `string`, `Medicao.valorMedido` e `string`, mas `Etp.valorEstimado` e `number`. Tipo TypeScript inconsistente para `decimal(15,2)`. |
| TD-05 | Campos `versao` e `currentVersion` duplicados | MEDIA | Design | `TermoReferencia` tem ambos `versao` e `currentVersion` com default 1. Semantica ambigua. |
| TD-06 | User com campo `created_by` varchar | MEDIA | Integridade | Em `Etp`, `created_by` e varchar ao inves de uuid FK explicitamente tipada. |
| TD-07 | ContratoSyncLog.resolution tipado como `any` | MEDIA | Type Safety | O campo `resolution` usa `any` ao inves de tipo estruturado. Perde type safety. |
| TD-08 | Falta de UpdateDateColumn em varias entities | BAIXA | Auditoria | `EtpVersion`, `TermoReferenciaVersion`, `ComplianceValidationHistory`, `Ateste`, `DocumentoFiscalizacao`, `ContratoSyncLog`, `ExportMetadata` nao possuem updatedAt. |
| TD-09 | ExportMetadata sem organizationId | MEDIA | Multi-tenancy | Entidade nao possui isolamento multi-tenant. Um usuario poderia acessar exports de outra organization via query direta. |
| TD-10 | ApiUsage sem entity name no decorator | BAIXA | Convencao | `@Entity()` sem nome de tabela explicito. Nome sera gerado automaticamente pelo TypeORM. |
| TD-11 | Enum inline em Contrato.govBrSyncStatus | MEDIA | Design | Usa array inline `['pending', 'synced', 'error']` ao inves de enum TypeScript declarado. |

---

## Indexes Ausentes (Recomendacoes)

| # | Tabela | Colunas Sugeridas | Justificativa |
|---|--------|-------------------|---------------|
| 1 | `termos_referencia` | `[organizationId]` | Filtro obrigatorio em queries multi-tenant |
| 2 | `termos_referencia` | `[etpId]` | JOIN frequente ETP -> TR |
| 3 | `termos_referencia` | `[status]` | Filtro comum em listagens |
| 4 | `editais` | `[organizationId]` | Multi-tenancy |
| 5 | `editais` | `[status]` | Filtro de listagem |
| 6 | `editais` | `[termoReferenciaId]` | JOIN TR -> Edital |
| 7 | `contratos` | `[organizationId]` | Multi-tenancy |
| 8 | `contratos` | `[editalId]` | JOIN Edital -> Contrato |
| 9 | `contratos` | `[status]` | Filtro de listagem |
| 10 | `contratos` | `[govBrSyncStatus]` | Filtro de sincronizacao |
| 11 | `medicoes` | `[contratoId]` | JOIN Contrato -> Medicoes |
| 12 | `medicoes` | `[status]` | Filtro de aprovacao |
| 13 | `ocorrencias` | `[contratoId]` | JOIN Contrato -> Ocorrencias |
| 14 | `ocorrencias` | `[status]` | Filtro de resolucao |
| 15 | `atestes` | `[medicaoId]` | Ja tem unique, mas verificar se eh index |
| 16 | `documentos_fiscalizacao` | `[tipoEntidade, entidadeId]` | Relacionamento polimorfico |
| 17 | `pesquisas_precos` | `[organizationId]` | Multi-tenancy |
| 18 | `pesquisas_precos` | `[etpId]` | JOIN ETP -> Pesquisa |
| 19 | `contrato_sync_logs` | `[contratoId]` | JOIN Contrato -> Logs |
| 20 | `export_metadata` | `[etpId]` | JOIN ETP -> Exports |
| 21 | `etp_sections` | `[etp_id, order]` | Ordenacao de secoes |
| 22 | `etp_versions` | `[etp_id, versionNumber]` | Busca de versoes |

---

## Problemas de Relacionamento

### 1. Eager Loading em Cadeia (CRITICO)

```
Medicao (eager: Contrato)
  -> Contrato (eager: Edital, Organization, gestorResponsavel, fiscalResponsavel, createdBy)
    -> Edital (eager: Organization, createdBy)
```

Uma query de Medicao pode disparar 8+ JOINs automaticamente. Isso causa:
- N+1 queries quando listando medicoes
- Payload HTTP inflado com dados desnecessarios
- Lentidao progressiva conforme dados crescem

**Recomendacao:** Remover `eager: true` de Contrato->Edital e usar `relations` explicito nas queries.

### 2. DocumentoFiscalizacao - Relacionamento Polimorfico

O campo `entidadeId` pode apontar para `medicoes`, `ocorrencias` ou `atestes`, mas nao ha FK real. Isso significa:
- Nenhuma protecao contra orphans no banco
- Nenhum CASCADE delete automatico
- Queries de JOIN requerem logica condicional

**Recomendacao:** Considerar 3 colunas FK separadas (`medicaoId`, `ocorrenciaId`, `atesteId`) com check constraint.

### 3. Contrato sem Relacao Inversa para Medicao/Ocorrencia

`Contrato` nao declara `OneToMany` para Medicao ou Ocorrencia. Isso impede `relations` bidirecional e lazy loading.

---

## Preocupacoes de Seguranca

| # | Preocupacao | Severidade | Descricao |
|---|-------------|------------|-----------|
| S-01 | Password field sem @Exclude | MEDIA | `User.password` tem `select: false` no TypeORM, mas depende de queries corretas. Considerar transformer/interceptor global. |
| S-02 | API Key armazenada em texto | ALTA | `User.apiKey` e armazenada como varchar. Deveria ser hash (bcrypt/argon2) como password. |
| S-03 | Multi-tenancy nao obrigatorio | MEDIA | `ContractPrice.organizationId` e nullable. Registros sem organizationId podem vazar dados cross-tenant. |
| S-04 | CNPJ armazenado sem validacao | BAIXA | `Contrato.contratadoCnpj` e varchar(18) sem regex constraint. |
| S-05 | ContratoSyncLog.resolution usa `any` | MEDIA | Dados Gov.br armazenados sem tipagem. Possivel armazenar dados inesperados. |
| S-06 | IP address em texto plano | BAIXA | `AnalyticsEvent.ipAddress` e `AuditLog.ipAddress` armazenam IPs sem anonimizacao (LGPD). |

---

## Preocupacoes de Performance

| # | Preocupacao | Severidade | Impacto |
|---|-------------|------------|---------|
| P-01 | Eager loading cascateado | ALTA | Queries de Medicao/Ocorrencia carregam cadeia completa ate Organization. 5+ JOINs por query. |
| P-02 | Campos JSONB sem indice GIN | MEDIA | ~25 campos JSONB nao possuem indexes GIN. Queries `jsonb @>` serao full scan. |
| P-03 | Tabela contract_prices sem particao | MEDIA | Tabela de market intelligence pode crescer para milhoes de registros. Sem partitioning por data. |
| P-04 | Pool connection limitado | MEDIA | max=20 (Railway Starter). Com 40 tabelas e queries eager, pool pode esgotar em picos. |
| P-05 | Texto completo sem tsvector | BAIXA | Campos `descricao`, `objeto` usados em busca textual sem indice tsvector. |
| P-06 | Legislation.embedding sem HNSW | BAIXA | Index pgvector nao declarado na entity. Busca vetorial sera sequential scan. |
| P-07 | SinapiItem/SicroItem sem particao por UF | BAIXA | Dados por estado sem particao horizontal. |

---

## Recomendacoes (Ordenadas por Prioridade)

### Prioridade 1 - CRITICA (Fazer Agora)

1. **[TD-01/P-01] Remover eager loading de Contrato->Edital**
   - Impacto: Reduz queries de Medicao/Ocorrencia de 8+ JOINs para 2-3
   - Esforco: Baixo (1-2h)
   - Risco: Pode quebrar codigo que depende do eager

2. **[S-02] Hashear apiKey no User**
   - Impacto: Previne vazamento de API keys em caso de breach
   - Esforco: Medio (4h)

3. **[TD-04] Padronizar tipo de campos monetarios**
   - Decidir entre `string` ou `number` para `decimal(15,2)` e aplicar consistentemente
   - Esforco: Medio (4-8h)

### Prioridade 2 - ALTA (Proximo Sprint)

4. **[Indexes] Criar indexes nas tabelas de cadeia de contratacao**
   - TR, Edital, Contrato, Medicao, Ocorrencia - todos precisam de index em organizationId e status
   - Migration unica com ~15 indexes
   - Esforco: Baixo (2h)

5. **[TD-09] Adicionar organizationId em ExportMetadata**
   - Esforco: Baixo (1h)

6. **[TD-02] Refatorar DocumentoFiscalizacao para FKs separadas**
   - Esforco: Alto (8h)

### Prioridade 3 - MEDIA (Backlog)

7. **[P-02] Criar indexes GIN para campos JSONB frequentemente consultados**
   - Especialmente: `Etp.dynamicFields`, `Etp.metadata`, `ContractPrice.metadata`
   - Esforco: Baixo (2h)

8. **[P-03] Implementar partitioning em contract_prices por dataHomologacao**
   - Quando tabela ultrapassar 1M registros
   - Esforco: Alto (16h)

9. **[P-06] Criar index HNSW para Legislation.embedding**
   - Esforco: Baixo (1h)

10. **[TD-05] Unificar campos versao/currentVersion em TermoReferencia**
    - Esforco: Medio (4h)

### Prioridade 4 - BAIXA (Melhoria Continua)

11. **[S-06] Anonimizar IPs em conformidade com LGPD**
12. **[TD-03] Migrar ApiUsage.id para UUID**
13. **[TD-08] Adicionar updatedAt nas entities ausentes**
14. **[TD-10] Adicionar nome de tabela explicito ao ApiUsage**
15. **[TD-11] Extrair enum govBrSyncStatus para TypeScript enum**

---

## Metricas de Saude do Schema

| Metrica | Valor | Status |
|---------|-------|--------|
| Cobertura de indexes em FKs | ~60% | ATENCAO |
| Consistencia de tipos monetarios | ~70% | ATENCAO |
| Multi-tenancy completo | ~85% | BOM |
| Auditoria (createdAt/updatedAt) | ~80% | BOM |
| CASCADE/SET NULL definidos | 100% das FKs | OTIMO |
| Uso de enums PostgreSQL | 100% dos status | OTIMO |
| Documentacao nas entities | 95%+ | OTIMO |

---

*Gerado automaticamente por @data-engineer (AIOS) em 2026-01-29*
