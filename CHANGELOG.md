# 📋 CHANGELOG

Todas as mudanças notáveis do **ETP Express** serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### 🔄 Em Desenvolvimento (v1.0.0 - Planejada para Q1 2026)

Trabalho em progresso para alcançar qualidade de produção:

#### 🔒 Security & Infrastructure (2025-12-05)

- ✅ #413 - Fix HIGH severity jws vulnerability + Update Railway domain (PR #415)
  - **Security Fix:** Upgraded `jws` from 3.2.2 to 3.2.3 (CVE Score: 7.5 HIGH)
  - Fixed GHSA-869p-cjfg-cm3x: Improper Verification of Cryptographic Signature (CWE-347)
  - Added npm `overrides` for `jws@^4.0.0` to force secure version
  - Upgraded `nodemailer` from 7.0.10 to 7.0.11 (LOW severity fix)
  - **Documentation:** Updated all Railway domain references from `etp-express-backend.up.railway.app` to `etp-express-backend-production.up.railway.app`
  - Zero vulnerabilities after fix (`npm audit --omit=dev`)
  - All 882 tests passing ✅

#### ⚡ Async Processing & Performance (2025-12-04)

- ✅ #220 - Implementar BullMQ para geração assíncrona de seções (PR #386)
  - **Migração de processamento síncrono → assíncrono** eliminando timeouts HTTP (30-60s → <100ms)
  - BullMQ instalado com configuração global de Redis (`@nestjs/bullmq` + `bullmq`)
  - `SectionsProcessor` criado para processamento background de geração AI
  - Progress tracking: 10% → 90% → 95% → 100% (habilita feedback em tempo real)
  - Retry automático: 3 tentativas com backoff exponencial (5s → 10s → 20s)
  - Error handling robusto: atualiza status para PENDING em falhas
  - `SectionsService.generateSection()` retorna `jobId` imediatamente
  - Múltiplos workers podem processar jobs em paralelo (escalabilidade)
  - **Breaking Change:** API agora retorna `jobId` ao invés de conteúdo final
  - **Próximos passos:** Issue #221 (API de status de jobs), #222 (UX assíncrona frontend)
  - 77/77 testes passando no módulo sections (incluindo 9 novos testes do processor)
  - Coverage: 98.81% no módulo sections

#### 🏢 Multi-Tenancy B2G (2025-12-01)

- ✅ #354 - Infraestrutura de Organizations para Multi-Tenancy B2G (PR #360)
  - **MT-01** - Primeira issue da cadeia de Multi-Tenancy
  - Entidade `Organization` com CNPJ, domainWhitelist, isActive (Kill Switch)
  - Migration com índice GIN em domainWhitelist para lookup eficiente de domínios
  - Módulo `OrganizationsModule` com operações CRUD completas
  - Métodos `suspend()`/`reactivate()` para funcionalidade de Kill Switch
  - Método `findByDomain()` para integração com AuthService.register (MT-03)
  - Suite de testes abrangente: 40 testes, 100% coverage
  - Preparação para próximas issues: MT-02 (relação User-Organization), MT-03 (registro com whitelist), MT-04 (TenantGuard), MT-05 (isolamento de dados ETP), MT-06 (adaptação frontend)

- ✅ #356 - Validação de domínio de email no registro (MT-03) (PR #362)
  - **MT-03** - Auth Guardrails para Multi-Tenancy B2G
  - Validação automática de domínio de email durante registro (`AuthService.register()`)
  - Apenas emails de domínios whitelisted podem criar conta
  - OrganizationId incluído no JWT payload para autorização de tenant
  - Validação de `organization.isActive` antes de permitir registro
  - Remoção do campo legacy `orgao` de CreateUserDto
  - 6 novos testes MT-03 (818 testes passing, 0 regressões)
  - Casos cobertos: domínio válido, inválido, case-insensitive, organização suspensa

- ✅ #357 - Tenant Kill Switch + RBAC (MT-04) (PR #363)
  - **MT-04** - Kill Switch para suspender organizações + controle de acesso por roles
  - **TenantGuard** bloqueia todos os usuários de organizações suspensas (isActive=false)
  - Retorna 403 Forbidden com mensagem clara ao usuário
  - Respeita rotas @Public() (login, register, health checks)
  - Logs de auditoria para todas as tentativas bloqueadas (compliance LGPD)
  - **RolesGuard** + decorator @Roles() para controle de acesso baseado em roles
  - Endpoints de Organizations restritos a role ADMIN
  - Ordem de execução: JwtAuthGuard → TenantGuard → RolesGuard
  - Endpoints ADMIN: `PATCH /organizations/:id/suspend` e `/reactivate`
  - 7 novos testes TenantGuard (873 testes passing, 43 test suites)
  - AuditAction.TENANT_BLOCKED para trilha de auditoria completa

#### 🤖 Enriquecimento com IA (2025-11-25)

- ✅ #210 - Enriquecimento automático de ETPs com fundamentação de mercado via Perplexity (PR #296)
  - Integração do PerplexityService no OrchestratorService
  - Enriquecimento de 5 seções críticas: justificativa, contextualização, orçamento, pesquisa_mercado, especificação_técnica
  - Graceful degradation: geração continua mesmo sem dados externos
  - Indicadores visuais no frontend quando enrichment indisponível
  - Queries customizadas por tipo de seção para busca otimizada
  - 30 novos testes backend (100% passing, 0 regressões)
  - Flag `hasEnrichmentWarning` para transparência ao usuário

#### 🐛 Hotfixes (2025-11-25)

- ✅ #297 - Adicionar componente Alert faltante para SectionCard (PR #297)
  - Componente shadcn/ui Alert com 3 subcomponentes (Alert, AlertTitle, AlertDescription)
  - Suporte para variantes: default, destructive, warning
  - Correção de falha de build pós-merge da PR #296
  - JSDoc completo para todos os componentes públicos
  - Re-merge da PR #296 executado com sucesso após correção

#### ♻️ Refatoração de Código (2025-11-28)

- ✅ #316 - Extrair método buildEnrichedPrompt() do OrchestratorService (PR #320)
  - **Parte 1 de 4** da refatoração para Clean Code compliance (#28)
  - Novo método privado `buildEnrichedPrompt()` (132 linhas) encapsula lógica de construção de prompts
  - Reduz `generateSection()` de 120 para 86 linhas (próximas PRs: #317, #318, #319)
  - Sanitização de input (prompt injection), enriquecimento legal, fundamentação, PII redaction
  - 7 novos testes unitários (766/766 passing, 96% coverage mantido)
  - Zero mudanças comportamentais - output idêntico à implementação anterior
  - Cleanup: remoção de arquivos temporários `github-issues.json` e `github-milestones.json`

#### 🛡️ Resiliência e Confiabilidade (2025-11-20)

- ✅ #206 - Implementar Circuit Breaker para OpenAI API (PR #230)
  - Proteção contra falhas em cascata usando padrão Circuit Breaker (Opossum)
  - Thresholds: 50% erro rate, 5 requests mínimas, 60s timeout, 30s reset
  - Endpoint de monitoramento: `GET /health/providers/openai`
  - Graceful degradation com mensagem amigável ao usuário
  - 17 testes para OpenAIService + 9 testes para HealthController
  - 590 testes passando (0 regressões)

#### 🔒 Conformidade LGPD (2025-11-19 a 2025-11-20)

- ✅ #202 - Implementar consentimento LGPD no registro (PR #215)
- ✅ #203 - Implementar sanitização PII antes de envio para LLMs (PR #219)
- ✅ #204 - Aviso de transferência internacional de dados (PR #221)
- ✅ #205 - Política de Privacidade completa conforme LGPD (PR #223)
- ✅ #196 - Termos de Uso completos + integração frontend (PR #229)
  - Criado `docs/TERMS_OF_SERVICE.md` (14 seções, 353 lines)
  - Nova página `/terms` no frontend (TermsOfService.tsx)
  - Links separados no formulário de registro
  - Conformidade com LGPD, Marco Civil, CDC, Lei 14.133

#### ⚙️ Infraestrutura Técnica (2025-11-06 a 2025-11-12)

- ✅ Configuração Jest para testes backend
- ✅ ESLint + Prettier configurados
- ✅ Testes unitários: auth, sections, ETPs, controllers, services
- ✅ Documentação JSDoc implementada
- ✅ Vulnerabilidades de segurança resolvidas:
  - HIGH: jspdf 2.5.1 → 3.0.3 (CVE-2024: ReDoS, DoS)
  - MODERATE: dompurify 2.5.8 → 3.3.0 (XSS bypass)
- ✅ Correções TypeScript aplicadas
- 🔄 Cobertura de testes em aumento (0.46% → ~50%, meta: 70%)

#### 📊 Progresso Geral

- **25 de 77 issues concluídas** (32%)
- **M1 (Foundation)**: 70% concluído (21/30)
- **M3 (Security)**: 30% concluído (3/10)
- **M4 (Refactoring)**: 5% iniciado (1/20)

#### 🎯 Próximas Entregas

- [ ] Finalizar M1 - Testes (9 issues restantes)
- [ ] Completar M3 - Auditoria OWASP + LGPD
- [ ] M2 - CI/CD Pipeline
- [ ] M4 - Load testing e performance
- [ ] M5 - UAT com usuários reais

---

## [0.1.0] - 2025-11-05

### 🎉 Core MVP Lançado

Primeira versão funcional do **ETP Express** - Sistema assistivo para elaboração de Estudos Técnicos Preliminares (Lei 14.133/2021). Core operacional, mas ainda em fase de testes e refinamento de qualidade.

### ✨ Adicionado

#### Backend (NestJS)

- Sistema completo de autenticação JWT
- CRUD de usuários com roles (admin, user)
- CRUD de ETPs (Estudos Técnicos Preliminares)
- Sistema de seções com 13 incisos da Lei 14.133/2021
- **Orquestrador de IA** com 5 subagentes especializados:
  - Legal Agent (validação de conformidade legal)
  - Fundamentação Agent (busca de contratações similares)
  - Clareza Agent (análise de legibilidade)
  - Simplificação Agent (remoção de jargão)
  - Anti-Hallucination Agent (mitigação de alucinações)
- Integração com **OpenAI GPT-4** para geração de conteúdo
- Integração com **Perplexity API** para busca de contratações similares
- Sistema completo de **versionamento** com:
  - Snapshots automáticos
  - Histórico de versões
  - Diff textual
  - Restauração de versões
- Sistema de **exportação** para:
  - PDF (Puppeteer + Handlebars)
  - JSON estruturado
  - XML padronizado
- **Auditoria completa** com trilha de logs
- **Analytics** de UX com telemetria
- Validação obrigatória de seções mínimas (I, IV, VI, VIII, XIII)
- Swagger/OpenAPI documentation completa
- Rate limiting e security headers (Helmet.js)
- 64 arquivos TypeScript

#### Frontend (React)

- Interface moderna com **Tailwind CSS** + **shadcn/ui**
- Sistema de autenticação com JWT
- Dashboard com estatísticas
- **Editor de ETP** com:
  - 13 seções em tabs navegáveis
  - Formulários guiados por seção
  - Indicadores de seções obrigatórias
  - Barra de progresso de completude
  - Auto-save
- **Painel de IA** para geração de conteúdo
- **Painel de busca** de contratações similares
- **WarningBanner persistente** (aviso obrigatório em todas as páginas)
- Sistema de tooltips explicativos
- Loading states elegantes com microinterações
- Validação em tempo real (Zod + React Hook Form)
- State management com **Zustand**
- Responsividade mobile-first
- Acessibilidade **WCAG 2.1 AA**:
  - ARIA labels completos
  - Navegação por teclado
  - Contraste 4.5:1
  - Screen reader friendly
- 62 arquivos TypeScript + TSX

#### Infraestrutura

- Configuração completa para **Railway**
- Schema PostgreSQL completo com:
  - 8 tabelas principais
  - Views materializadas
  - Funções utilitárias
  - Triggers automáticos
  - Índices otimizados
- Migrations TypeORM
- Deploy automatizado
- Variáveis de ambiente documentadas

#### Documentação

- **README.md**: Documentação principal completa
- **ARCHITECTURE.md**: Arquitetura detalhada do sistema
- **DEPLOY_RAILWAY.md**: Guia completo de deploy
- **QUICKSTART.md**: Guia rápido (10 minutos)
- **PROJECT_SUMMARY.md**: Sumário executivo
- **DATABASE_SCHEMA.sql**: Schema PostgreSQL completo
- **LICENSE**: Licença MIT com disclaimers
- **CHANGELOG.md**: Este arquivo

### 🔒 Segurança

- Implementação de proteções **OWASP Top 10**
- Sanitização de inputs (class-validator)
- Proteção contra SQL Injection (TypeORM)
- CORS configurado
- Rate limiting (100 req/min)
- JWT com expiração
- Bcrypt para senhas
- Helmet.js para headers de segurança
- Logs sanitizados (sem secrets)
- HTTPS obrigatório em produção

### 📊 Métricas

- **Total de arquivos**: 145+ arquivos
- **Linhas de código**: ~20.300 linhas
- **Backend**: 64 arquivos TypeScript
- **Frontend**: 62 arquivos TypeScript/TSX
- **Endpoints API**: ~35 endpoints REST
- **Componentes UI**: 38 componentes React
- **Entidades**: 8 entidades TypeORM
- **Agentes de IA**: 5 subagentes especializados

### ⚠️ Avisos e Limitações

- Sistema é **assistivo**, não substitui responsabilidade administrativa
- IA pode cometer erros (alucinações)
- Validação humana é **obrigatória**
- Implementado sistema de mitigação de alucinações
- Disclaimers obrigatórios em todas as saídas
- Aviso persistente em todas as páginas do frontend

### 🎯 Funcionalidades Core

- ✅ Formulário guiado para 13 seções do ETP
- ✅ Geração assistida por IA (GPT-4)
- ✅ Validação multi-agente
- ✅ Busca de contratações similares (Perplexity)
- ✅ Versionamento completo
- ✅ Exportação PDF/JSON/XML
- ✅ Auditoria e telemetria
- ✅ Autenticação JWT
- ✅ Deploy Railway

---

### 🔮 Planejado para v1.1+

#### A Adicionar

- [ ] Suporte a modelos on-premise (Llama, Mistral)
- [ ] IA híbrida (local + cloud)
- [ ] Workflow de aprovação
- [ ] Assinatura eletrônica
- [ ] Integração com sistemas oficiais (COMPRASNET)
- [ ] API pública documentada
- [ ] Webhooks para integrações
- [ ] Modo offline
- [ ] Backup automático local

---

## Tipos de Mudanças

- **✨ Adicionado**: Novas funcionalidades
- **🔄 Modificado**: Mudanças em funcionalidades existentes
- **⚠️ Descontinuado**: Funcionalidades que serão removidas
- **🗑️ Removido**: Funcionalidades removidas
- **🐛 Corrigido**: Correções de bugs
- **🔒 Segurança**: Correções de vulnerabilidades

---

## Como Contribuir

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Minha feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

Toda contribuição será documentada neste CHANGELOG.

---

## Versionamento

Utilizamos [SemVer](https://semver.org/lang/pt-BR/) para versionamento:

- **MAJOR** (1.x.x): Mudanças incompatíveis na API
- **MINOR** (x.1.x): Novas funcionalidades compatíveis
- **PATCH** (x.x.1): Correções de bugs compatíveis

---

**⚠️ LEMBRETE**: O ETP Express pode cometer erros. Sempre revise as informações antes de uso oficial.

---

**Mantido por**: Equipe ETP Express
**Última atualização**: 2025-11-20
**Versão Atual**: 0.1.0 (Core MVP)
**Próxima Versão**: 1.0.0 (Q1 2026)
