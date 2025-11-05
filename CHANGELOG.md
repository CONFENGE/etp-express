# 📋 CHANGELOG

Todas as mudanças notáveis do **ETP Express** serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2025-11-05

### 🎉 Lançamento Inicial

Primeira versão completa do **ETP Express** - Sistema assistivo para elaboração de Estudos Técnicos Preliminares (Lei 14.133/2021).

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

## [Unreleased]

### 🔄 Planejado para v1.1

#### A Adicionar
- [ ] Templates por órgão/setor
- [ ] Modo colaborativo (múltiplos usuários editando)
- [ ] Integração com PNCP (Painel Nacional de Contratações Públicas)
- [ ] Upload de documentos anexos
- [ ] Dark mode
- [ ] PWA (Progressive Web App)
- [ ] Internacionalização (i18n)
- [ ] Testes E2E completos (Playwright)
- [ ] Storybook para componentes
- [ ] CI/CD com GitHub Actions

#### A Melhorar
- [ ] Cache de respostas LLM para reduzir custos
- [ ] Otimização de prompts de IA
- [ ] Melhorias de UX baseadas em analytics
- [ ] Documentação de uso para servidores
- [ ] Vídeos tutoriais

### 🔮 Planejado para v2.0

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
**Última atualização**: 2025-11-05
