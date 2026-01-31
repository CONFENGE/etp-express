# QA Review - Technical Debt Assessment

**Reviewer:** @qa (Quinn - AIOS)
**Data:** 2026-01-29

---

## Gate Status: NEEDS WORK

---

## Gaps Identificados

### 1. Inconsistencia na contagem total de debitos
O resumo executivo do DRAFT declara **36 debitos** no texto, mas a tabela soma **43 debitos** (12 + 24 + 7). O texto e a tabela se contradizem no mesmo paragrafo. Isso compromete a credibilidade do documento.

### 2. Contagem de debitos de Database divergente
O DRAFT afirma 24 debitos de Database, mas o DB-AUDIT.md lista: 11 TD + 6 S + 7 P = 24. Porem, o DRAFT re-enumera como DB-01 a DB-11 + DB-S01 a DB-S06 + DB-P01 a DB-P07 = 24. A contagem fecha, mas os 22 indexes ausentes nao estao contabilizados na tabela de resumo nem na matriz de priorizacao como itens individuais. Isso e mencionado apenas em nota de rodape. Se os indexes sao uma unica tarefa, deveriam ter um ID (ex: DB-IDX-01).

### 3. Ausencia de analise de testes existentes
Nenhum dos 4 documentos menciona a cobertura de testes atual. Sem baseline de cobertura, nao ha como medir impacto das resolucoes. Perguntas criticas nao respondidas:
- Qual a cobertura atual de testes unitarios no backend?
- Existem testes para os fluxos afetados pelos debitos (eager loading, multi-tenancy, validacao)?
- Os testes E2E cobrem a cadeia de contratacao completa?

### 4. Ausencia de analise de CI/CD
O debito SYS-04 (monorepo sem Turborepo/Nx) e listado, mas nao ha diagnostico do pipeline atual de CI/CD. Tempo de build? Quais steps existem? Testes rodam no CI?

### 5. Sem analise de impacto em producao
Nenhum documento inclui metricas reais de producao:
- Tempo de resposta P50/P95/P99 atual das rotas afetadas por eager loading
- Numero de requests por minuto
- Taxa de erro atual
- Tempo de startup atual do backend no Railway

### 6. Redis/BullMQ nao auditados
O system-architecture.md documenta Redis e BullMQ como parte do stack, mas nenhuma auditoria cobre:
- Configuracao de filas
- Retry policies
- Dead letter queues
- Persistencia de jobs

### 7. Ausencia de analise de migrations
SYS-03 menciona 57 migrations com auto-run, mas o DB-AUDIT diz 52. Discrepancia de 5 migrations. Nenhum documento analisa se existem migrations com DML (dados) que impedem squash.

### 8. Sem mencao a backup e disaster recovery
Nenhum documento aborda estrategia de backup do PostgreSQL no Railway, RPO/RTO, ou plano de disaster recovery.

---

## Riscos Cruzados

| Risco | Areas Afetadas | Severidade | Mitigacao |
|-------|---------------|------------|-----------|
| Resolver eager loading (SYS-01/DB-01) pode quebrar codigo existente que depende do carregamento automatico | Backend, Frontend (dados esperados nos payloads), Testes | ALTA | Mapear TODOS os pontos que consomem entidades com eager antes de remover. Criar testes de regressao para cada endpoint afetado. |
| Padronizar tipos monetarios (SYS-05/DB-04) requer migration de dados existentes | Database, Backend, Frontend (parsing de valores) | ALTA | Migration deve ser reversivel. Validar que calculos existentes nao quebram. Testar com dados reais de producao (anonimizados). |
| Hashear apiKey (DB-S02) invalida todas as API keys existentes | Database, API publica, Clientes externos da API de precos | ALTA | Plano de migracao: (1) adicionar coluna hash, (2) notificar usuarios, (3) periodo de transicao com dual-read, (4) remover texto plano. |
| Adicionar organizationId em ExportMetadata (DB-09) requer backfill | Database, Backend (queries), Multi-tenancy | MEDIA | Migration de backfill deve inferir organizationId via ETP associado. Validar que nenhum export fica orfao. |
| Alterar validacao de senha (FE-01) pode afetar usuarios com senhas de 6-7 chars | Frontend, Backend, UX | BAIXA | Apenas afeta novos registros e trocas de senha. Usuarios existentes nao sao afetados (senhas ja armazenadas como hash). |
| 22 indexes novos em uma unica migration podem causar lock prolongado | Database, Producao | MEDIA | Usar `CREATE INDEX CONCURRENTLY` para evitar locks. Dividir em batches se necessario. A migration TypeORM padrao NAO usa CONCURRENTLY -- isso precisa ser explicito. |
| Squash de 52-57 migrations pode causar incompatibilidade com ambientes existentes | Database, DevOps, Staging/Producao | MEDIA | Squash so deve afetar novos ambientes. Ambientes existentes devem manter migrations ja executadas. Usar baseline condicionada. |

---

## Dependencias Validadas

### Ordem de Resolucao Proposta pelo DRAFT
A matriz de priorizacao nao define ordem explicitamente, apenas severidade. Isso e um gap. A ordem correta deve considerar dependencias:

### Ordem Recomendada (com dependencias)

1. **FE-01** (validacao senha) -- sem dependencias, esforco minimo, impacto direto em UX. **Fazer primeiro.**
2. **DB-S02** (hashear apiKey) -- sem dependencias tecnicas, mas requer plano de comunicacao com usuarios da API publica. **Planejar migracao antes de executar.**
3. **SYS-01/DB-01/DB-P01** (eager loading) -- **bloqueador:** precisa de mapeamento completo de todos os pontos que consomem entidades com eager. Testes de regressao sao pre-requisito.
4. **Indexes ausentes (22)** -- pode ser feito em paralelo com #3, mas deve usar `CREATE INDEX CONCURRENTLY`. **Nao depende de outros itens.**
5. **DB-04/SYS-05** (tipos monetarios) -- **depende de:** decisao arquitetural (string vs number). Requer migration de dados. Fazer apos estabilizar eager loading.
6. **DB-09/DB-S03** (multi-tenancy) -- pode ser feito em paralelo com #5. Requer backfill de dados.
7. **SYS-03** (squash migrations) -- **fazer por ultimo:** nao impacta funcionalidade, apenas startup. E o item com maior risco de breaking change em ambientes existentes.
8. **SYS-02** (entity scan) -- depende de refatoracao modular. Pode ser feito apos squash.
9. **SYS-04** (Turborepo/Nx) -- esforco alto (16h+), baixa urgencia relativa. **Backlog.**

### Bloqueadores Identificados
- **Nenhuma tarefa pode ser iniciada sem baseline de testes.** Se a cobertura atual for baixa, o primeiro passo deve ser criar testes para os fluxos afetados ANTES de refatorar.
- A resolucao de DB-S02 (apiKey hash) bloqueia qualquer melhoria na API publica de precos.

---

## Testes Requeridos

### Para cada debito resolvido:

| Debito | Testes Necessarios |
|--------|-------------------|
| SYS-01/DB-01/DB-P01 (eager loading) | Testes de integracao para CADA endpoint que retorna Contrato, Edital, Medicao, Ocorrencia. Verificar que payloads nao incluem dados desnecessarios. Benchmark de tempo de resposta antes/depois. |
| DB-S02 (apiKey hash) | Teste de autenticacao via API Key apos migracao. Teste de que texto plano nao persiste no banco. Teste de comparacao via hash. |
| DB-04/SYS-05 (tipos monetarios) | Testes unitarios de calculo com valores limites (0.01, 999999999999.99). Teste de roundtrip DB->Service->API->Frontend. Teste de que conversoes nao perdem precisao. |
| FE-01 (validacao senha) | Teste E2E de registro com senha de 6 chars (deve falhar no front). Teste E2E com senha de 8+ chars com complexidade (deve passar). Teste de mensagem de erro correta. |
| Indexes ausentes | Benchmark de queries EXPLAIN ANALYZE antes/depois. Testar que queries de listagem usam os novos indexes. |
| DB-09 (ExportMetadata organizationId) | Teste de isolamento multi-tenant: usuario A nao ve exports de usuario B. Teste de backfill: todos os registros existentes possuem organizationId. |
| DB-S03 (ContractPrice organizationId NOT NULL) | Teste de constraint: insercao sem organizationId deve falhar. Teste de backfill de registros existentes. |
| SYS-03 (squash migrations) | Teste de fresh install com migration baseline. Teste de upgrade em ambiente com migrations existentes. |
| FE-02 (paginacao) | Teste de integracao front-back verificando que campo de metadados de paginacao e consistente. |
| FE-03 (SkipLink) | Teste de acessibilidade axe-core verificando WCAG 2.4.1. Teste de focus management com Tab. |

### Testes de Regressao Globais
- Executar suite completa de testes unitarios e E2E apos cada resolucao
- Smoke test da cadeia completa: ETP -> TR -> Edital -> Contrato -> Medicao
- Teste de performance: P95 das rotas principais nao deve degradar

---

## Metricas de Qualidade

### Metricas a Coletar ANTES de Iniciar Resolucoes (Baseline)

| Metrica | Como Medir | Ferramenta |
|---------|-----------|------------|
| Cobertura de testes unitarios | `npm test -- --coverage` | Jest/Vitest |
| Cobertura de testes E2E | Paginas cobertas vs total (~30) | Playwright |
| Tempo de startup backend | Log do NestJS bootstrap | Winston logs |
| P95 latencia das rotas principais | `/api/v1/etps`, `/api/v1/contratos` | Prometheus/Sentry |
| Tamanho medio de payload | Endpoints de listagem com eager loading | Network tab / Sentry |
| Numero de queries por request | Slow query subscriber | TypeORM logger |
| Taxa de erro 5xx | Ultimos 30 dias | Sentry |
| Mutation score | `npm run test:mutation` | Stryker |
| Vulnerabilidades npm | `npm audit` | npm |
| Indexes utilizados vs ausentes | `pg_stat_user_indexes` | PostgreSQL |

### Metas Pos-Resolucao

| Metrica | Meta |
|---------|------|
| Cobertura de testes unitarios backend | >= 80% |
| Todas as rotas de listagem com P95 < 500ms | Sim |
| Payload medio de listagem reduzido em 50%+ | Apos remover eager loading |
| Zero campos monetarios com tipo inconsistente | Apos padronizacao |
| 100% das entidades principais com organizationId NOT NULL | Apos resolucao multi-tenancy |
| Zero API keys em texto plano no banco | Apos hashear |
| 22 indexes criados e verificados via EXPLAIN | Apos migration |
| Frontend e backend com mesma validacao de senha | Apos FE-01 |

---

## Parecer Final

### Veredicto: NEEDS WORK

O assessment tecnico e **abrangente e bem estruturado**, cobrindo 3 areas criticas do sistema com IDs unificados e matriz de priorizacao. A identificacao dos debitos cross-area e particularmente valiosa.

### Condicoes para APPROVED:

1. **Corrigir inconsistencia na contagem** (36 vs 43 no resumo executivo)
2. **Corrigir divergencia de migrations** (57 no system-architecture vs 52 no DB-AUDIT)
3. **Adicionar ID para os 22 indexes ausentes** (ex: DB-IDX-01) e incluir na contagem total
4. **Incluir baseline de metricas de producao** -- sem metricas atuais, nao ha como medir melhoria
5. **Definir ordem de resolucao com dependencias** -- a matriz atual so ordena por severidade, nao por dependencias tecnicas
6. **Adicionar nota sobre `CREATE INDEX CONCURRENTLY`** -- critica para evitar downtime em producao
7. **Incluir plano de migracao para DB-S02** (apiKey hash) -- nao pode ser feito como "flip switch", precisa de transicao gradual
8. **Obter revisoes pendentes** -- o documento marca como PENDENTE a revisao de @data-engineer e @ux-design-expert. Essas revisoes sao bloqueadoras para consolidacao final.

### Riscos Nao Cobertos pelo Assessment:
- Ausencia de analise de Redis/BullMQ
- Sem estrategia de backup/DR
- Sem baseline de cobertura de testes
- Sem analise do pipeline CI/CD atual

### Pontos Positivos:
- Excelente rastreabilidade com IDs cross-area (SYS-01/DB-01/DB-P01)
- Perguntas direcionadas para especialistas (secao 7 do DRAFT)
- Identificacao correta dos debitos de seguranca criticos (apiKey, multi-tenancy)
- Estimativas de esforco realistas e granulares

---

*Revisao gerada em 2026-01-29 por @qa (Quinn) - AIOS v3.10.0*
*Status: NEEDS WORK -- 8 condicoes para aprovacao listadas acima.*
