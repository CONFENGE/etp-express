# Guia de Contribuicao - ETP Express

Obrigado pelo interesse em contribuir com o ETP Express! Este guia apresenta as praticas e padroes do projeto.

## Indice

- [Setup do Ambiente](#setup-do-ambiente)
- [Padrao de Commits](#padrao-de-commits)
- [Processo de Pull Request](#processo-de-pull-request)
- [Padroes de Codigo](#padroes-de-codigo)
- [Testes](#testes)
- [Code Review](#code-review)

---

## Setup do Ambiente

### Pre-requisitos

- **Node.js** 20+ LTS
- **PostgreSQL** 15+
- **Git** 2.40+
- **Docker** (opcional, mas recomendado)

### Instalacao

```bash
# 1. Fork o repositorio no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU-USUARIO/etp-express.git
cd "ETP Express"

# 3. Adicione o upstream
git remote add upstream https://github.com/tjsasakifln/etp-express.git

# 4. Instale dependencias (monorepo)
npm install

# 5. Instale dependencias do backend
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais

# 6. Instale dependencias do frontend
cd ../frontend
npm install
cp .env.example .env

# 7. Volte para a raiz
cd ..

# 8. Inicie os servicos (modo desenvolvimento)
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Com Docker (Recomendado)

```bash
# Setup completo com um comando
bash scripts/setup-local.sh

# Ou manualmente
cp .env.template .env
# Edite .env com sua OPENAI_API_KEY
docker-compose up
```

---

## Padrao de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para manter um historico limpo e gerar changelogs automaticos.

### Formato

```
tipo(escopo): descricao curta (#issue)

Corpo opcional com mais detalhes.

Footer opcional (Breaking Changes, etc.)
```

### Tipos Permitidos

| Tipo       | Quando Usar                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | Nova funcionalidade                            |
| `fix`      | Correcao de bug                                |
| `docs`     | Apenas documentacao (README, JSDoc, etc.)      |
| `test`     | Adicao ou correcao de testes                   |
| `refactor` | Refatoracao sem mudanca de comportamento       |
| `perf`     | Melhoria de performance                        |
| `chore`    | Tarefas de manutencao (deps, configs, scripts) |
| `security` | Correcao de vulnerabilidade                    |
| `style`    | Formatacao, espacos, ponto-e-virgula (nao CSS) |
| `ci`       | Mudancas em CI/CD (GitHub Actions, etc.)       |
| `build`    | Build system ou dependencias externas          |
| `revert`   | Revert de commit anterior                      |

### Escopos Comuns

- `backend` - Codigo NestJS
- `frontend` - Codigo React
- `auth` - Autenticacao/autorizacao
- `etps` - Modulo de ETPs
- `sections` - Modulo de secoes
- `orchestrator` - Sistema de IA
- `docs` - Documentacao
- `ci` - CI/CD
- `deps` - Dependencias

### Exemplos

```bash
# Feature
git commit -m "feat(backend): add rate limiting to auth endpoints (#42)"

# Bug fix
git commit -m "fix(frontend): resolve memory leak in ETP editor (#156)"

# Documentacao
git commit -m "docs: update README badges and contributing guide (#36)"

# Refatoracao
git commit -m "refactor(orchestrator): extract helper functions for validation"

# Performance
git commit -m "perf(backend): implement LLM response caching (#339)"

# Seguranca
git commit -m "security(auth): fix JWT token validation vulnerability (#413)"
```

### Pre-commit Hooks

O projeto usa Husky para validar commits automaticamente:

1. **ESLint**: Verifica codigo antes do commit
2. **Gitleaks**: Escaneia por secrets vazados
3. **Commitlint**: Valida formato do commit message

---

## Processo de Pull Request

### 1. Antes de Comecar

```bash
# Sincronize com upstream
git fetch upstream
git checkout master
git merge upstream/master

# Crie uma branch para sua feature
git checkout -b feat/123-minha-feature
```

### 2. Nomenclatura de Branches

| Tipo         | Padrao                     | Exemplo                    |
| ------------ | -------------------------- | -------------------------- |
| Feature      | `feat/ISSUE-descricao`     | `feat/42-rate-limiting`    |
| Bug fix      | `fix/ISSUE-descricao`      | `fix/156-memory-leak`      |
| Hotfix       | `hotfix/ISSUE-descricao`   | `hotfix/413-jwt-vuln`      |
| Documentacao | `docs/ISSUE-descricao`     | `docs/36-readme-badges`    |
| Refatoracao  | `refactor/ISSUE-descricao` | `refactor/78-orchestrator` |

### 3. Durante o Desenvolvimento

- Faca commits pequenos e frequentes
- Mantenha a branch atualizada com master
- Escreva testes para codigo novo
- Atualize documentacao quando necessario

### 4. Antes de Abrir PR

```bash
# Rode todos os testes
npm run test:all

# Verifique lint
npm run lint

# Verifique TypeScript
npm run typecheck

# Sincronize com upstream
git fetch upstream
git rebase upstream/master
```

### 5. Checklist de PR

Antes de submeter, verifique:

- [ ] Branch nomeada corretamente
- [ ] Commits seguem Conventional Commits
- [ ] Todos os testes passando localmente
- [ ] Lint sem erros
- [ ] TypeScript sem erros
- [ ] Coverage nao diminuiu
- [ ] Documentacao atualizada (se aplicavel)
- [ ] Issue relacionada linkada no PR

### 6. Template de PR

```markdown
## Context

Por que esta mudanca e necessaria?

## Changes

- Mudanca 1
- Mudanca 2
- Mudanca 3

## Testing

- [ ] Testes unitarios passando
- [ ] Testes de integracao passando (se aplicavel)
- [ ] Testado manualmente

## Risks

Quais sao os riscos potenciais?

## Rollback Plan

Como reverter se necessario?

## Closes

Closes #NUMERO-DA-ISSUE
```

---

## Padroes de Codigo

### TypeScript

- **Strict mode** habilitado
- **Zero `any`** (use tipos proprios ou `unknown`)
- **Interfaces** para objetos complexos
- **Enums** para conjuntos fixos de valores

### Backend (NestJS)

- Controllers apenas para roteamento
- Logica de negocios em Services
- Validacao com class-validator
- DTOs para entrada/saida
- Guards para autorizacao
- Interceptors para transformacao

### Frontend (React)

- Componentes funcionais com hooks
- Estado global com Zustand
- Formularios com React Hook Form + Zod
- Estilizacao com Tailwind CSS
- Componentes UI com shadcn/ui

### Naming Conventions

| Item              | Padrao         | Exemplo              |
| ----------------- | -------------- | -------------------- |
| Arquivos TS       | kebab-case     | `user-service.ts`    |
| Classes           | PascalCase     | `UserService`        |
| Funcoes/Metodos   | camelCase      | `getUserById()`      |
| Constantes        | SCREAMING_CASE | `MAX_RETRY_ATTEMPTS` |
| Interfaces        | PascalCase + I | `IUserResponse`      |
| Types             | PascalCase     | `UserRole`           |
| Componentes React | PascalCase     | `ETPEditor.tsx`      |

---

## Testes

### Estrutura

```
projeto/
├── backend/
│   ├── src/
│   │   └── modulo/
│   │       ├── modulo.service.ts
│   │       └── modulo.service.spec.ts  # Unitarios
│   └── test/
│       └── modulo.e2e-spec.ts          # E2E
├── frontend/
│   └── src/
│       └── components/
│           ├── Component.tsx
│           └── Component.test.tsx      # Unitarios
└── e2e/
    └── fluxo.spec.ts                   # E2E Playwright
```

### Comandos

```bash
# Backend
cd backend
npm test                  # Unitarios
npm run test:e2e          # Integracao
npm run test:cov          # Com coverage

# Frontend
cd frontend
npm test                  # Unitarios
npm run test:coverage     # Com coverage

# E2E (Playwright)
cd e2e
npm test                  # Requer frontend rodando
```

### Metas de Coverage

| Modulo   | Meta | Atual |
| -------- | ---- | ----- |
| Backend  | 70%+ | 78%   |
| Frontend | 60%+ | 60%   |

### Boas Praticas

1. **Teste comportamento, nao implementacao**
2. **Um assert por teste** (quando possivel)
3. **Nomes descritivos**: `deve retornar erro quando email invalido`
4. **Arrange-Act-Assert** pattern
5. **Mocks apenas quando necessario**

---

## Code Review

### O que Revisamos

1. **Corretude**: O codigo faz o que deveria?
2. **Testes**: Ha cobertura adequada?
3. **Legibilidade**: Facil de entender?
4. **Performance**: Ha problemas obvios?
5. **Seguranca**: Inputs validados? OWASP Top 10?
6. **Padroes**: Segue convencoes do projeto?

### Como Revisar

- Seja construtivo e respeitoso
- Explique o "por que" das sugestoes
- Use "nit:" para sugestoes opcionais
- Aprove quando estiver satisfeito
- Solicite mudancas quando necessario

### Respondendo a Reviews

- Agradeca o feedback
- Responda a cada comentario
- Faca as mudancas solicitadas
- Marque conversas resolvidas
- Re-solicite review apos mudancas

---

## Recursos Adicionais

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura do sistema
- [ROADMAP.md](./ROADMAP.md) - Status e planejamento
- [docs/SECURITY.md](./docs/SECURITY.md) - Politica de seguranca
- [GitHub Issues](https://github.com/tjsasakifln/etp-express/issues) - Backlog

---

## Duvidas?

- Abra uma issue com tag `question`
- Consulte a documentacao em `/docs`
- Verifique issues existentes

Obrigado por contribuir!
