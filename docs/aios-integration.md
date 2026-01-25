# Integração AIOS Framework - ETP Express

**Data de Integração:** 2026-01-24
**Versão AIOS:** 3.10.0
**Versão ETP Express:** 1.0.0

---

## Visão Geral

O ETP Express integra o **AIOS (AI-Orchestrated System)**, um framework de agentes especializados para desenvolvimento assistido por IA. Esta integração traz capacidades avançadas de orquestração de agentes, workflows automatizados e documentação estruturada.

## Arquitetura da Integração

```
etp-express/
├── .aios-core/              # Framework AIOS (core)
│   ├── core/                # Orquestração, registry, utils
│   ├── development/         # Agentes, tasks, templates
│   │   ├── agents/          # 12 agentes especializados
│   │   ├── tasks/           # Workflows de tarefas
│   │   ├── templates/       # Templates de documentos
│   │   ├── checklists/      # Checklists de validação
│   │   └── scripts/         # Scripts de desenvolvimento
│   ├── infrastructure/      # Scripts de infraestrutura
│   ├── core-config.yaml     # Configuração principal
│   └── user-guide.md        # Guia do usuário AIOS
│
├── .claude/                 # Configurações Claude Code (existente)
│   ├── CLAUDE.md            # Regras (expandido com AIOS)
│   └── commands/            # Comandos ETP-específicos
│
├── docs/                    # Documentação estruturada
│   ├── product-briefs/      # Product Briefs (analyst)
│   ├── prds/                # PRDs (pm)
│   ├── tech-specs/          # Tech Specs (architect)
│   └── stories/             # Stories (sm)
│
└── package.json             # Dependências AIOS adicionadas
```

## Componentes Principais

### 1. Agentes Especializados

O AIOS fornece 12 agentes especializados organizados por fase:

#### Planning Phase (Planejamento)
- **analyst** (`analyst.md`) - Análise de negócios, criação de Product Briefs
- **pm** (`pm.md`) - Product Manager, criação de PRDs (Product Requirements Documents)
- **architect** (`architect.md`) - Arquitetura técnica, Tech Specs
- **ux-design-expert** (`ux-design-expert.md`) - Design UX/UI, acessibilidade

#### Development Cycle (Desenvolvimento)
- **sm** (`sm.md`) - Scrum Master, criação de Stories hipercontextualizadas
- **dev** (`dev.md`) - Desenvolvedor, implementação de código
- **qa** (`qa.md`) - Quality Assurance, testes e validação
- **po** (`po.md`) - Product Owner, gestão de backlog

#### Infrastructure (Infraestrutura)
- **devops** (`devops.md`) - Deploy, CI/CD, infraestrutura Railway
- **data-engineer** (`data-engineer.md`) - Pipelines de dados, ETL

#### Meta (Orquestração)
- **aios-master** (`aios-master.md`) - Orquestração geral, desenvolvimento do framework
- **squad-creator** (`squad-creator.md`) - Criação de squads especializados

### 2. Sistema de Configuração

**Arquivo principal:** `.aios-core/core-config.yaml`

Configurações adaptadas para ETP Express:

```yaml
project:
  type: EXISTING_PROJECT
  name: etp-express
  description: "ETP Express - Plataforma de Estudos Técnicos Preliminares"
  stack:
    backend: "NestJS 11 + TypeORM + PostgreSQL"
    frontend: "React 18 + Vite + Tailwind CSS"
    deployment: "Railway"

prd:
  prdShardedLocation: docs/prds

productBrief:
  briefLocation: docs/product-briefs

techSpec:
  specLocation: docs/tech-specs

devStoryLocation: docs/stories

roadmap:
  roadmapFile: ROADMAP.md
  trackingEnabled: true
  autoUpdate: true
```

### 3. Workflows Automatizados

O AIOS implementa workflows estruturados:

```
┌─────────────────────────────────────────────────────────────┐
│                    Planning Phase                           │
│  (Interface Web, PRs, Discussões)                          │
└─────────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
  analyst              pm              architect
  (Brief)            (PRD)          (Tech Spec)
      │                    │                    │
      └────────────────────┴────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                  Development Cycle                          │
│                    (IDE Local)                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                          sm
                    (Story Creation)
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
              dev                    qa
         (Implementation)        (Testing)
                │                     │
                └──────────┬──────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                     Deployment                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                        devops
                   (Railway Deploy)
```

### 4. Documentação Estruturada

O AIOS padroniza a documentação em fases:

1. **Product Brief** (`docs/product-briefs/issue-{n}-brief.md`)
   - Análise de contexto de negócio
   - User stories preliminares
   - Alternativas de solução
   - Criado por: `analyst`

2. **PRD** (`docs/prds/issue-{n}-prd.md`)
   - Requisitos funcionais e não-funcionais
   - Critérios de aceitação
   - Compliance (LGPD, WCAG, OWASP)
   - Criado por: `pm`

3. **Tech Spec** (`docs/tech-specs/issue-{n}-tech-spec.md`)
   - Decisões arquiteturais
   - Implementação técnica detalhada
   - API changes, DB migrations
   - Criado por: `architect`

4. **Story** (`docs/stories/issue-{n}-story.md`)
   - Passos de implementação (file-by-file)
   - Snippets de código
   - Test cases específicos
   - Definition of Done
   - Criado por: `sm`

## Dependências Instaladas

As seguintes dependências foram adicionadas ao `package.json`:

```json
{
  "dependencies": {
    "@clack/prompts": "^0.11.0",
    "@kayvan/markdown-tree-parser": "^1.5.0",
    "chalk": "^4.1.2",
    "cli-progress": "^3.12.0",
    "commander": "^14.0.1",
    "execa": "^5.1.1",
    "fs-extra": "^11.3.2",
    "glob": "^11.0.3",
    "handlebars": "^4.7.8",
    "inquirer": "^8.2.6",
    "isolated-vm": "^5.0.4",
    "js-yaml": "^4.1.0",
    "ora": "^5.4.1",
    "picocolors": "^1.1.1",
    "semver": "^7.7.2",
    "validator": "^13.15.15"
  }
}
```

## Comandos npm Disponíveis

```bash
# Validação de estrutura do projeto
npm run aios:validate:structure

# Sincronização de configurações IDE
npm run aios:sync:ide

# Validação de sincronização IDE
npm run aios:sync:ide:validate
```

## Compatibilidade com Sistema Existente

### Comandos .claude/commands/ (Preservados)

Os comandos existentes do ETP Express foram **preservados** e continuam funcionando:

- `/product-brief-etp` - Business Analyst
- `/prd-etp` - Product Manager
- `/tech-spec-etp` - System Architect
- `/story-etp` - Scrum Master

Estes comandos foram **atualizados** para remover referências ao sistema "BMAD" anterior e agora são complementares aos agentes AIOS.

### Integração Híbrida

O sistema funciona de forma **híbrida**:

1. **Comandos .claude/commands/** - Interface familiar para usuários existentes
2. **Agentes .aios-core/** - Capacidades avançadas de orquestração

Ambos sistemas coexistem e podem ser usados conforme preferência.

## Guia de Uso Rápido

### Cenário 1: Criar Feature Completa (Workflow Full)

```bash
# 1. Planning Phase
# Criar Product Brief para issue #1680
analyst → cria docs/product-briefs/issue-1680-brief.md

# Criar PRD
pm → cria docs/prds/issue-1680-prd.md

# Criar Tech Spec
architect → cria docs/tech-specs/issue-1680-tech-spec.md

# 2. Development Cycle
# Criar Story detalhada
sm → cria docs/stories/issue-1680-story.md

# Implementar
dev → segue story e implementa código

# Validar
qa → executa testes, valida DoD
```

### Cenário 2: Usar Comandos Existentes

```bash
# Usar comandos .claude/commands/ diretamente
/product-brief-etp 1680
/prd-etp 1680
/tech-spec-etp 1680
/story-etp 1680
```

### Cenário 3: Validação de Estrutura

```bash
# Validar estrutura do projeto
npm run aios:validate:structure

# Sincronizar configs IDE
npm run aios:sync:ide
```

## Benefícios da Integração

### 1. Orquestração de Agentes
- Agentes especializados por fase do desenvolvimento
- Separação clara de responsabilidades
- Workflows estruturados e previsíveis

### 2. Documentação Padronizada
- Templates consistentes (Product Brief, PRD, Tech Spec, Story)
- Rastreabilidade de decisões
- Facilita onboarding de novos desenvolvedores

### 3. Qualidade e Compliance
- Checklists automáticos (LGPD, WCAG, OWASP, Lei 14.133/2021)
- Definition of Done consistente
- Critérios de aceitação claros

### 4. Produtividade
- Redução de ambiguidade em requisitos
- Stories hipercontextualizadas para desenvolvedores
- Reutilização de templates e padrões

## Próximos Passos

1. **Personalizar Agentes** - Adaptar agentes AIOS para contexto específico do ETP Express (terminologia de licitações, compliance Lei 14.133/2021)

2. **Criar Squads** - Desenvolver squads especializados (ex: squad-licitacao, squad-compliance)

3. **Automatizar Workflows** - Integrar AIOS com GitHub Actions para automação completa

4. **Treinar Equipe** - Documentar melhores práticas de uso dos agentes

## Referências

- **Documentação AIOS**: `.aios-core/user-guide.md`
- **Repositório Original**: https://github.com/tjsasakifln/aios-core
- **Configuração AIOS**: `.aios-core/core-config.yaml`
- **ROADMAP Atualizado**: `ROADMAP.md`

## Suporte

Para dúvidas ou problemas:
1. Consultar `.aios-core/user-guide.md`
2. Revisar exemplos em `.aios-core/development/`
3. Verificar configurações em `.aios-core/core-config.yaml`

---

**Última atualização:** 2026-01-24
**Responsável:** Equipe ETP Express
**Status:** ✅ Integração Concluída
