# Technical Debt Assessment - DRAFT

## Para Revisao dos Especialistas
Data: 2026-01-29
Autor: @architect (Aria) - AIOS v3.10.0

> **NOTA:** Este documento consolida debitos tecnicos identificados em 3 analises independentes:
> - Arquitetura de Sistema (`docs/architecture/system-architecture.md`)
> - Auditoria de Banco de Dados (`supabase/docs/DB-AUDIT.md`)
> - Especificacao Frontend/UX (`docs/frontend/frontend-spec.md`)
>
> Todos os debitos receberam IDs unificados com prefixo por area: **SYS-**, **DB-**, **FE-**.

---

## 1. Resumo Executivo

O ETP Express e um sistema maduro com 45+ entidades, 35+ modulos NestJS, ~30 paginas React e integracoes com 6+ servicos externos. A analise cruzada de 3 areas revelou **36 debitos tecnicos** distribuidos da seguinte forma:

| Area | Quantidade | Alta | Media | Baixa |
|------|-----------|------|-------|-------|
| Sistema/Arquitetura | 12 | 4 | 5 | 3 |
| Database | 24 | 4 | 9 | 11 |
| Frontend/UX | 7 | 1 | 2 | 4 |
| **Total** | **43** | **9** | **16** | **18** |

**Debitos criticos identificados:**
1. **Eager loading cascateado** (SYS-01/DB-01/DB-P01) - impacta performance de toda a cadeia de contratacao
2. **API Key armazenada sem hash** (DB-S02) - risco de seguranca em caso de breach
3. **Tipos monetarios inconsistentes** (SYS-05/DB-04) - risco de dados corrompidos
4. **Validacao de senha desalinhada** (FE-01) - frontend aceita senhas que o backend rejeita

**Debitos cross-area** que afetam multiplas camadas foram identificados na secao 6.

---

## 2. Debitos de Sistema (from system-architecture.md)

| ID | Debito | Severidade | Descricao | Impacto |
|----|--------|------------|-----------|---------|
| SYS-01 | Eager loading excessivo | **ALTA** | Entidades Etp, Contrato, Edital usam `eager: true` em multiplas relacoes ManyToOne (User, Organization). Causa queries N+1 e carregamento desnecessario em listagens. | Performance degradada em listagens, payloads HTTP inflados |
| SYS-02 | 45+ entities no scan global | **ALTA** | `entities: [__dirname + '/**/*.entity{.ts,.js}']` carrega todas as entidades globalmente. | Tempo de startup elevado |
| SYS-03 | 57 migrations com auto-run | **ALTA** | Grande numero de migrations com `migrationsRun: true`. Schema em evolucao rapida causa lentidao no startup. | Startup lento em producao, risco de timeout no Railway |
| SYS-04 | Monorepo sem Turborepo/Nx | **ALTA** | Usa npm workspaces basico sem orquestracao de build/test. | CI/CD subotimo, builds desnecessarios |
| SYS-05 | Tipo `string` para campos decimal | **MEDIA** | Contrato usa `string` para `valorGlobal`, inconsistente com Etp que usa `number` para `valorEstimado`. | Conversoes imprevistas, bugs de calculo |
| SYS-06 | Body parser duplicado | **MEDIA** | `bodyParser: false` no NestFactory + configuracao manual. Funcional mas fragil. | Manutencao dificil |
| SYS-07 | Guards globais via APP_GUARD | **MEDIA** | TenantGuard e RolesGuard globais requerem `@Public()` em rotas publicas. Facil de esquecer. | Risco de seguranca por omissao |
| SYS-08 | Feature flags sem persistencia clara | **MEDIA** | FeatureFlagsModule existe mas sem indicacao de storage (banco vs env vs config). | Operacional |
| SYS-09 | Chaos module em src/ | **MEDIA** | Codigo de chaos engineering dentro do diretorio de producao. | Risco de deploy acidental de chaos em producao |
| SYS-10 | tmpfiles no frontend | **BAIXA** | 150+ diretorios `tmpclaude-*-cwd` no frontend. | Espaco em disco |
| SYS-11 | strictBindCallApply: false | **BAIXA** | TypeScript config nao usa strict completo. | Type safety reduzida |
| SYS-12 | forceConsistentCasingInFileNames: false | **BAIXA** | Pode causar problemas cross-platform (Linux vs Windows). | Portabilidade |

---

## 3. Debitos de Database (from DB-AUDIT.md)

⚠️ **PENDENTE:** Revisao do @data-engineer

### 3.1 Debitos Tecnicos (TD-01 a TD-11)

| ID | Debito Original | Severidade | Descricao |
|----|----------------|------------|-----------|
| DB-01 (TD-01) | Eager loading excessivo | **ALTA** | Contrato carrega Edital (eager) que carrega Organization (eager). Cadeia cascateada: Contrato->Edital->Organization. Medicao e Ocorrencia tambem carregam Contrato eager. Queries com 5+ JOINs automaticos por request. |
| DB-02 (TD-02) | Relacionamento polimorfico sem FK | **MEDIA** | `DocumentoFiscalizacao.entidadeId` aponta para medicao, ocorrencia ou ateste sem Foreign Key real. Orphans possiveis, sem CASCADE delete. |
| DB-03 (TD-03) | ApiUsage com PK integer | **BAIXA** | Unica entidade com PK autoincrement (int). Todas as outras usam UUID. Inconsistencia de padrao. |
| DB-04 (TD-04) | Tipos inconsistentes para valores monetarios | **ALTA** | `Contrato.valorGlobal` e `string`, `Medicao.valorMedido` e `string`, mas `Etp.valorEstimado` e `number`. Tipo TypeScript inconsistente para `decimal(15,2)`. |
| DB-05 (TD-05) | Campos versao/currentVersion duplicados | **MEDIA** | `TermoReferencia` tem ambos `versao` e `currentVersion` com default 1. Semantica ambigua. |
| DB-06 (TD-06) | User com campo created_by varchar | **MEDIA** | Em `Etp`, `created_by` e varchar ao inves de uuid FK explicitamente tipada. |
| DB-07 (TD-07) | ContratoSyncLog.resolution tipado como `any` | **MEDIA** | Campo `resolution` usa `any`. Perde type safety e pode armazenar dados inesperados. |
| DB-08 (TD-08) | Falta de UpdateDateColumn | **BAIXA** | `EtpVersion`, `TermoReferenciaVersion`, `ComplianceValidationHistory`, `Ateste`, `DocumentoFiscalizacao`, `ContratoSyncLog`, `ExportMetadata` nao possuem `updatedAt`. |
| DB-09 (TD-09) | ExportMetadata sem organizationId | **MEDIA** | Entidade sem isolamento multi-tenant. Acesso cross-tenant possivel via query direta. |
| DB-10 (TD-10) | ApiUsage sem entity name | **BAIXA** | `@Entity()` sem nome de tabela explicito. Nome gerado automaticamente pelo TypeORM. |
| DB-11 (TD-11) | Enum inline em govBrSyncStatus | **MEDIA** | Usa array inline `['pending', 'synced', 'error']` ao inves de enum TypeScript declarado. |

### 3.2 Preocupacoes de Seguranca (S-01 a S-06)

| ID | Preocupacao | Severidade | Descricao |
|----|-------------|------------|-----------|
| DB-S01 (S-01) | Password field sem @Exclude global | **MEDIA** | `User.password` tem `select: false` no TypeORM, mas depende de queries corretas. Considerar transformer/interceptor global. |
| DB-S02 (S-02) | API Key armazenada em texto | **ALTA** | `User.apiKey` armazenada como varchar sem hash (bcrypt/argon2). Risco critico em caso de breach do banco. |
| DB-S03 (S-03) | Multi-tenancy nao obrigatorio | **MEDIA** | `ContractPrice.organizationId` e nullable. Registros sem organizationId podem vazar dados cross-tenant. |
| DB-S04 (S-04) | CNPJ armazenado sem validacao | **BAIXA** | `Contrato.contratadoCnpj` e varchar(18) sem regex constraint no banco. Apenas validacao na aplicacao. |
| DB-S05 (S-05) | ContratoSyncLog.resolution usa `any` | **MEDIA** | Dados Gov.br armazenados sem tipagem. Possivel armazenar dados inesperados ou maliciosos. |
| DB-S06 (S-06) | IP address em texto plano | **BAIXA** | `AnalyticsEvent.ipAddress` e `AuditLog.ipAddress` armazenam IPs sem anonimizacao. Potencial violacao LGPD. |

### 3.3 Preocupacoes de Performance (P-01 a P-07)

| ID | Preocupacao | Severidade | Descricao |
|----|-------------|------------|-----------|
| DB-P01 (P-01) | Eager loading cascateado | **ALTA** | Queries de Medicao/Ocorrencia carregam cadeia completa ate Organization. 5+ JOINs por query. |
| DB-P02 (P-02) | Campos JSONB sem indice GIN | **MEDIA** | ~25 campos JSONB sem indexes GIN. Queries `jsonb @>` serao full scan. |
| DB-P03 (P-03) | contract_prices sem particao | **MEDIA** | Tabela de market intelligence pode crescer para milhoes de registros sem partitioning por data. |
| DB-P04 (P-04) | Pool connection limitado | **MEDIA** | max=20 (Railway Starter). Com 40 tabelas e queries eager, pool pode esgotar em picos de acesso. |
| DB-P05 (P-05) | Texto completo sem tsvector | **BAIXA** | Campos `descricao`, `objeto` usados em busca textual sem indice tsvector. Full scan em buscas textuais. |
| DB-P06 (P-06) | Legislation.embedding sem HNSW | **BAIXA** | Index pgvector nao declarado na entity. Busca vetorial sera sequential scan. |
| DB-P07 (P-07) | SinapiItem/SicroItem sem particao por UF | **BAIXA** | Dados por estado sem particao horizontal. Impacto futuro com crescimento dos dados. |

### 3.4 Indexes Ausentes (22 recomendacoes)

As seguintes tabelas da cadeia de contratacao carecem de indexes criticos:

- **termos_referencia**: organizationId, etpId, status (3 indexes)
- **editais**: organizationId, status, termoReferenciaId (3 indexes)
- **contratos**: organizationId, editalId, status, govBrSyncStatus (4 indexes)
- **medicoes**: contratoId, status (2 indexes)
- **ocorrencias**: contratoId, status (2 indexes)
- **atestes**: medicaoId (1 index)
- **documentos_fiscalizacao**: [tipoEntidade, entidadeId] (1 index composto)
- **pesquisas_precos**: organizationId, etpId (2 indexes)
- **contrato_sync_logs**: contratoId (1 index)
- **export_metadata**: etpId (1 index)
- **etp_sections**: [etp_id, order] (1 index composto)
- **etp_versions**: [etp_id, versionNumber] (1 index composto)

**Total: 22 indexes ausentes.** Podem ser criados em uma unica migration.

---

## 4. Debitos de Frontend/UX (from frontend-spec.md)

⚠️ **PENDENTE:** Revisao do @ux-design-expert

| ID | Debito | Severidade | Descricao |
|----|--------|------------|-----------|
| FE-01 (TD-01) | Inconsistencia validacao senha | **ALTA** | Frontend valida minimo 6 chars (`constants.ts`), backend exige 8 chars (`register.dto.ts`). Usuario preenche formulario com senha valida no front mas rejeitada pelo backend. Experiencia frustrante. |
| FE-02 (TD-02) | Inconsistencia tipo paginacao | **MEDIA** | Frontend `PaginatedResponse` usa campo `pagination`, backend `PaginatedResult` usa campo `meta`. Pode causar bugs de integracao silenciosos. |
| FE-03 (TD-03) | SkipLink nao integrado | **MEDIA** | Componente `SkipLink` existe mas nao esta no `RootLayout`/`App.tsx`. Sem `<main id="main-content">`. WCAG 2.4.1 parcialmente cumprido. |
| FE-04 (TD-04) | SkipLink em ingles | **BAIXA** | Label "Skip to main content" deveria ser "Pular para o conteudo principal" para consistencia i18n. |
| FE-05 (TD-05) | Swagger desabilitado em producao | **BAIXA** | Decisao intencional de seguranca, mas dificulta integracao por terceiros. Falta documentacao API estatica alternativa. |
| FE-06 (TD-06) | ErrorBoundary sem Sentry direto | **BAIXA** | `ErrorBoundary.componentDidCatch` usa `logger.error` que integra com Sentry, mas sem `Sentry.withScope` para contexto adicional. Funcional, mas subotimo. |
| FE-07 (TD-07) | Disclaimer em todas as respostas | **INFO** | Tanto respostas de sucesso (paginacao) quanto erro incluem disclaimer legal. Overhead de payload pequeno mas constante em cada request. |

---

## 5. Matriz Preliminar de Priorizacao

| ID | Debito | Area | Severidade | Impacto | Esforco Estimado |
|----|--------|------|------------|---------|-----------------|
| SYS-01 / DB-01 / DB-P01 | Eager loading excessivo/cascateado | Sistema + DB | **ALTA** | Performance critica em listagens e cadeia contratacao | 4-8h |
| DB-S02 | API Key armazenada sem hash | DB/Seguranca | **ALTA** | Risco de vazamento de API keys em breach | 4h |
| DB-04 / SYS-05 | Tipos monetarios inconsistentes | DB + Sistema | **ALTA** | Dados corrompidos, bugs de calculo | 4-8h |
| FE-01 | Validacao senha desalinhada front/back | Frontend | **ALTA** | UX ruim, formularios rejeitados | 1h |
| SYS-02 | 45+ entities no scan global | Sistema | **ALTA** | Startup lento | 2-4h |
| SYS-03 | 57 migrations auto-run | Sistema | **ALTA** | Startup lento em producao | 4-8h (squash) |
| SYS-04 | Monorepo sem Turborepo/Nx | Sistema | **ALTA** | CI/CD subotimo | 16h+ |
| DB-09 | ExportMetadata sem organizationId | DB/Seguranca | **MEDIA** | Vazamento cross-tenant | 1h |
| DB-S03 | Multi-tenancy nao obrigatorio em ContractPrice | DB/Seguranca | **MEDIA** | Vazamento cross-tenant | 2h |
| DB-02 | Relacionamento polimorfico sem FK | DB | **MEDIA** | Orphans, sem integridade referencial | 8h |
| DB-05 | Campos versao/currentVersion duplicados | DB | **MEDIA** | Semantica ambigua, bugs | 4h |
| DB-06 | created_by varchar em Etp | DB | **MEDIA** | Integridade fraca | 2h |
| DB-07 / DB-S05 | ContratoSyncLog.resolution `any` | DB | **MEDIA** | Type safety, dados inesperados | 2h |
| DB-11 | Enum inline govBrSyncStatus | DB | **MEDIA** | Design inconsistente | 1h |
| DB-S01 | Password field sem @Exclude global | DB/Seguranca | **MEDIA** | Risco de leak de hash | 2h |
| FE-02 | Inconsistencia tipo paginacao | Frontend | **MEDIA** | Bugs de integracao silenciosos | 2h |
| FE-03 | SkipLink nao integrado | Frontend/a11y | **MEDIA** | WCAG 2.4.1 parcial | 1h |
| SYS-06 | Body parser duplicado | Sistema | **MEDIA** | Manutencao fragil | 1h |
| SYS-07 | Guards globais via APP_GUARD | Sistema | **MEDIA** | Seguranca por omissao | 2h |
| SYS-08 | Feature flags sem persistencia clara | Sistema | **MEDIA** | Operacional | 4h |
| SYS-09 | Chaos module em src/ | Sistema | **MEDIA** | Deploy acidental | 2h |
| DB-P02 | JSONB sem index GIN | DB/Performance | **MEDIA** | Full scan em queries JSONB | 2h |
| DB-P03 | contract_prices sem particao | DB/Performance | **MEDIA** | Escala futura | 16h |
| DB-P04 | Pool connection limitado (max=20) | DB/Performance | **MEDIA** | Pool exhaustion em picos | 1h (config) |
| DB-03 | ApiUsage com PK integer | DB | **BAIXA** | Inconsistencia | 2h |
| DB-08 | Falta de updatedAt | DB | **BAIXA** | Auditoria incompleta | 2h |
| DB-10 | ApiUsage sem entity name | DB | **BAIXA** | Convencao | 0.5h |
| DB-S04 | CNPJ sem validacao no banco | DB/Seguranca | **BAIXA** | Dados invalidos | 1h |
| DB-S06 | IP em texto plano (LGPD) | DB/Seguranca | **BAIXA** | Compliance LGPD | 4h |
| DB-P05 | Texto sem tsvector | DB/Performance | **BAIXA** | Busca textual lenta | 4h |
| DB-P06 | Embedding sem HNSW | DB/Performance | **BAIXA** | Busca vetorial lenta | 1h |
| DB-P07 | SINAPI/SICRO sem particao UF | DB/Performance | **BAIXA** | Escala futura | 8h |
| SYS-10 | tmpfiles no frontend | Sistema | **BAIXA** | Espaco em disco | 0.5h |
| SYS-11 | strictBindCallApply: false | Sistema | **BAIXA** | Type safety | 1h |
| SYS-12 | forceConsistentCasingInFileNames: false | Sistema | **BAIXA** | Portabilidade cross-platform | 1h |
| FE-04 | SkipLink em ingles | Frontend/a11y | **BAIXA** | Consistencia i18n | 0.5h |
| FE-05 | Swagger desabilitado em prod | Frontend/API | **BAIXA** | Integracao terceiros | 4h |
| FE-06 | ErrorBoundary sem Sentry direto | Frontend | **BAIXA** | Observabilidade | 1h |
| FE-07 | Disclaimer em todas as respostas | Frontend/API | **INFO** | Overhead de payload | N/A (design decision) |

**Indexes ausentes** (22 recomendacoes da auditoria de DB) nao estao listados individualmente na matriz, mas representam uma unica tarefa de **esforco baixo (2-3h)** com **impacto alto** em performance de queries.

---

## 6. Debitos Cross-Area

Estes debitos impactam multiplas areas do sistema simultaneamente:

### 6.1 Eager Loading (SYS-01 + DB-01 + DB-P01)
- **Backend**: Entidades declaradas com `eager: true` no TypeORM
- **Database**: Queries com 5+ JOINs automaticos, N+1 problems
- **API**: Payloads HTTP inflados com dados desnecessarios (User, Organization em cada item)
- **Frontend**: Respostas mais lentas, mais dados transferidos pela rede
- **Resolucao**: Remover `eager: true` e usar `relations` explicitas nos repositories/services

### 6.2 Tipos Monetarios Inconsistentes (SYS-05 + DB-04)
- **Database**: `decimal(15,2)` mapeado como `string` em Contrato, `number` em Etp
- **Backend**: Services precisam converter tipos ao calcular entre entidades
- **Frontend**: Pode receber string ou number para campos monetarios, precisa tratar ambos
- **Resolucao**: Padronizar para `string` (evitar floating point) ou `number` com transformers consistentes

### 6.3 Validacao de Senha (FE-01)
- **Frontend**: Zod schema aceita minimo 6 caracteres
- **Backend**: class-validator exige minimo 8 caracteres + complexidade
- **UX**: Usuario preenche formulario, submete, e recebe erro do backend
- **Resolucao**: Alinhar Zod schema com regras do backend (8 chars + regex)

### 6.4 Paginacao Inconsistente (FE-02)
- **Backend**: Retorna campo `meta` com dados de paginacao
- **Frontend**: Tipo `PaginatedResponse` espera campo `pagination`
- **Integracao**: Mapeamento pode estar sendo feito em hooks, mas types nao refletem
- **Resolucao**: Unificar nomenclatura (preferencialmente `meta` pois e padrao de mercado)

### 6.5 Multi-tenancy Incompleto (DB-09 + DB-S03)
- **Database**: `ExportMetadata` e `ContractPrice` sem `organizationId` obrigatorio
- **Backend**: TenantGuard global pode nao proteger queries diretas a estas tabelas
- **Seguranca**: Dados de uma organizacao acessiveis por outra via queries especificas
- **Resolucao**: Adicionar `organizationId` NOT NULL + indexes + TenantGuard coverage

### 6.6 API Key Security (DB-S02)
- **Database**: API Key armazenada como varchar em texto plano
- **Backend**: Comparacao de API Key feita por igualdade simples
- **Seguranca**: Em caso de breach do banco, todas as API keys sao comprometidas imediatamente
- **Resolucao**: Hashear com bcrypt/argon2 (mesmo padrao usado para passwords), comparar via hash

---

## 7. Perguntas para Especialistas

### Para @data-engineer:

1. **Indexes ausentes**: A auditoria identificou 22 indexes faltantes na cadeia de contratacao. Qual a ordem de prioridade para criacao? Devem ser criados em uma unica migration ou divididos?

2. **Partitioning de contract_prices**: Qual o volume atual estimado? Ja justifica implementar partitioning por `dataHomologacao`, ou pode esperar ate 1M registros?

3. **Pool de conexoes (max=20)**: O Railway Starter suporta upgrade de pool? Qual o pico de conexoes simultaneas observado em producao?

4. **JSONB indexes GIN**: Quais campos JSONB sao consultados com mais frequencia? `Etp.dynamicFields`, `Etp.metadata`, `ContractPrice.metadata`? Devemos criar indexes GIN apenas nos mais usados?

5. **pgvector HNSW**: O volume de registros em `Legislation` ja justifica index HNSW? Qual o plano de crescimento dessa tabela?

6. **Squash de migrations**: As 57 migrations podem ser consolidadas em uma baseline? Existe alguma migration com dados (DML) que impede squash?

7. **DocumentoFiscalizacao polimorfico**: A recomendacao e converter para 3 FKs separadas. Qual o impacto em queries existentes? Existe algum padrao melhor para TypeORM?

### Para @ux-design-expert:

1. **SkipLink**: O componente existe mas nao esta integrado no layout. Qual a melhor posicao no `RootLayout`? Deve ser o primeiro filho de `<body>` ou do `<div id="root">`?

2. **Validacao de senha**: Alem de alinhar o minimo de 6 para 8 caracteres, devemos mostrar um indicador de forca de senha em tempo real? Qual o padrao de UX recomendado para governo?

3. **Paginacao**: O frontend usa `pagination` e o backend usa `meta`. Se unificarmos, qual nomenclatura e mais intuitiva para developers que consomem a API?

4. **Disclaimer em todas as respostas**: O overhead e pequeno (~100 bytes por request), mas afeta DX. Devemos manter em todas as respostas ou apenas nas que contem conteudo gerado por IA?

5. **Acessibilidade**: Alem do SkipLink, quais outras lacunas de WCAG 2.1 AA devemos priorizar? Existem testes axe-core falhando atualmente?

6. **Documentacao API para terceiros**: Com Swagger desabilitado em producao, qual a melhor abordagem para documentacao publica? Redoc estatico? Portal de developer?

7. **i18n**: O SkipLink em ingles sugere que pode haver outros componentes com texto hardcoded em ingles. Devemos fazer um audit completo de i18n?

---

*Documento DRAFT gerado em 2026-01-29 por @architect (Aria) - AIOS v3.10.0*
*Aguardando revisao de @data-engineer e @ux-design-expert antes de finalizacao.*
