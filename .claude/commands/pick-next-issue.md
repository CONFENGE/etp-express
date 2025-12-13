# Pick Next Issue - Engenheiro-Executor ETP Express

Você é o **Engenheiro-Executor** do projeto ETP Express.
Seu trabalho é escolher **uma única issue** do backlog e tratá-la até a criação da PR. O merge e fechamento são feitos via `/review-pr`.

---

## 🎯 OBJETIVO GERAL

Selecionar e implementar a próxima issue **executável** do repositório ETP Express, criando uma PR pronta para review. O merge e fechamento são responsabilidade do `/review-pr`.

**IMPORTANTE:** Antes de começar, consulte `ROADMAP.md` para entender:

- Estado atual dos milestones (M1-M6)
- Prioridades do projeto no momento
- Contexto de bloqueios ou dependências críticas
- Objetivos da fase atual de desenvolvimento

---

## 1️⃣ SELEÇÃO DA ISSUE (Algoritmo Determinístico)

### Passo 1: Consultar ROADMAP.md

**OBRIGATÓRIO:** Leia a seção de status atual no ROADMAP.md para entender:

- Quais milestones estão completos
- Qual milestone está em progresso
- Prioridades P0/P1/P2/P3 do momento
- Bloqueios ou dependências críticas documentadas

```bash
# Ler roadmap para contexto
cat ROADMAP.md | grep -A 20 "## Status Atual\|## Prioridades\|## Milestones"
```

### Passo 2: Buscar Issues Disponíveis

```bash
gh issue list --state open --json number,title,labels,milestone,updatedAt --limit 200
```

### Passo 3: Aplicar Algoritmo de Seleção

**Critérios de Seleção (ordem de prioridade rigorosa):**

1. **Prioridade (DECISIVO):** P0 > P1 > P2 > P3
   - Verificar labels: `priority/P0`, `priority/P1`, `priority/P2`, `priority/P3`
   - **P0 (BLOCKER):** Deve ser resolvido ANTES de qualquer outra prioridade
   - **P1 (HIGH):** Alta prioridade - resolver após P0
   - **P2 (MEDIUM):** Média prioridade - resolver após P1
   - **P3 (LOW):** Baixa prioridade - resolver após P2

2. **Dependências (BLOQUEIO):**
   - Verificar campo "Dependencies" na issue
   - **NÃO** iniciar issue bloqueada por outras issues abertas
   - Priorizar issues que desbloqueiam outras (efeito cascata)

3. **Milestone (SEQUENCIAL):**
   - Seguir ordem: M1 → M2 → M3 → M4 → M5 → M6
   - Consultar ROADMAP.md para saber milestone atual
   - Preferir issues do milestone em progresso

4. **Tipo (IMPACTO):**
   - Data Integrity (crítico para integridade)
   - Security/Legal Safety (segurança e conformidade)
   - Deploy/Infrastructure (fundação técnica)
   - Bugs Críticos (correções urgentes)
   - Features (funcionalidades)
   - Refactoring (melhorias de código)
   - Documentation (documentação)

5. **Tamanho (DESEMPATE):**
   - Em caso de empate nas prioridades acima, escolha a menor (1–4h)
   - Issues atômicas são sempre preferidas

6. **Bloqueio Total:**
   - Se nenhuma issue cumprir os critérios → declare backlog bloqueado e **PARE**
   - Informe ao usuário quais dependências estão bloqueando o progresso

### Output da Seleção

```
🟢 ISSUE SELECIONADA: #<número> – <título>
   Prioridade: Px
   Milestone: Mx
   Tempo estimado: X h
   Dependências: <Nenhuma | Bloqueada por: #X | Bloqueia: #Y>
   Racional: <motivo detalhado da escolha baseado no algoritmo>
```

---

## 2️⃣ GOVERNANÇA (Checagem Pré-Execução)

### Buscar Detalhes da Issue

```bash
gh issue view <número> --json body,labels,title,milestone
```

### Validar Estrutura Atômica

A issue **DEVE** conter todos os elementos abaixo:

- ✅ **Context**: Por que esta tarefa existe?
- ✅ **Objective**: O que deve ser alcançado?
- ✅ **File Location**: Arquivos específicos a modificar/criar
- ✅ **Technical Approach**: Como implementar (opcional mas recomendado)
- ✅ **Acceptance Criteria**: 3–7 critérios verificáveis
- ✅ **Dependencies**: Bloqueada por / Bloqueia outras issues
- ✅ **Estimated Effort**: 1–8 horas

### Se Faltar Algum Elemento → REWRITE EXPRESS

**NÃO prossiga com a implementação. Execute primeiro o rewrite:**

```markdown
## 🎯 Objetivo

<Objetivo claro e mensurável da issue>

## 📋 Contexto

<Por que precisamos desta mudança? Qual problema resolve?>

## 🔧 Solução Técnica

<Passo a passo técnico da implementação>

**Arquivo(s):** <Lista explícita de arquivos com paths absolutos>
**Linhas:** <Linhas específicas a modificar (se aplicável)>

## ✅ Critérios de Aceitação

- [ ] Critério 1 (verificável e testável)
- [ ] Critério 2
- [ ] Critério 3
      ...

## 📊 Estimativa

**Esforço:** <X horas> (1–8h, atômico)

## 🔗 Dependências

- **Bloqueada por:** #<issue-id> ou Nenhum
- **Bloqueia:** #<issue-id> ou Nenhum
- **Relacionada:** #<issue-id> (opcional)
```

Atualize a issue no GitHub:

```bash
gh issue edit <número> --body "<conteúdo-reescrito>"
```

---

## 2️⃣.5 VALIDAÇÃO DE ATOMICIDADE (CRÍTICO)

### Critério de Atomicidade

Uma issue é **ATÔMICA** se atende TODOS os requisitos:

1. **Estimativa:** 1-8 horas (máx 1 dia de trabalho)
2. **Escopo único:** Resolve um único problema específico
3. **Executável sozinha:** Não depende de issues abertas (bloqueada por)
4. **Testável isoladamente:** Pode ser validada independentemente
5. **Especificação completa:** Arquivos, approach e ACs claros

### Se Issue NÃO é Atômica → DESMEMBRAR

**🚫 NÃO EXECUTE issues não-atômicas. Primeiro, quebre em sub-issues.**

#### Identificar Necessidade de Desmembramento

**QUEBRAR se:**

- Estimativa > 8h
- Múltiplos objetivos distintos no mesmo body
- Scope vago ou amplo demais (ex: "Refatorar módulo X")
- Depende de múltiplas outras issues
- Mistura tipos diferentes (ex: feature + refactor + docs)

#### Processo de Desmembramento

**Passo 1:** Identificar sub-tarefas independentes

Exemplo de issue não-atômica:

```
#999 - Secrets Management & API Key Rotation (8-10h)
```

Desmembrar em:

```
#1000 - [SEC-999a] Avaliar soluções de Secrets Management (2h)
#1001 - [SEC-999b] Implementar secret scanning (2h)
#1002 - [SEC-999c] Migrar secrets para solução escolhida (2h)
#1003 - [SEC-999d] Documentar procedimento de rotação (1h)
#1004 - [SEC-999e] Implementar dual-key strategy (2h)
#1005 - [SEC-999f] Implementar audit trail para acesso (3h)
```

**Passo 2:** Criar sub-issues no GitHub

Para cada sub-tarefa:

```bash
gh issue create \
  --title "[PARENT-ID subtask-letter] <descrição-específica>" \
  --milestone "<mesmo-milestone-do-parent>" \
  --label "<mesmas-labels-do-parent>" \
  --body "$(cat <<EOF
## 🎯 Objetivo
<Objetivo específico desta sub-issue>

## 📋 Contexto
Esta é a sub-tarefa [X] de [total] da issue parent #<parent-id>.

**Parent Issue:** #<parent-id> - <título-parent>

## 🔧 Solução Técnica
<Approach técnico específico>

**Arquivo(s):** <arquivos específicos>

## ✅ Critérios de Aceitação
- [ ] <critério específico 1>
- [ ] <critério específico 2>
- [ ] <critério específico 3>

## 📊 Estimativa
**Esforço:** <1-3h> (atômico)

## 🔗 Dependências
- **Parent:** #<parent-id>
- **Bloqueada por:** #<issue-anterior-na-sequência> (se houver)
- **Bloqueia:** #<próxima-issue-na-sequência> (se houver)

## 📚 Referências
- Parent Issue: #<parent-id>
- Related: <outras-issues-relacionadas>
EOF
)"
```

**Passo 3:** Atualizar issue parent

Adicionar comentário no parent linkando as sub-issues:

```bash
gh issue comment <parent-id> --body "$(cat <<EOF
## 🔄 Issue Desmembrada em Sub-Issues Atômicas

Esta issue foi quebrada nas seguintes sub-issues executáveis:

- [ ] #<sub-1> - <título>
- [ ] #<sub-2> - <título>
- [ ] #<sub-3> - <título>
- [ ] #<sub-4> - <título>
...

**Total de sub-issues:** <N>
**Esforço total:** <X+Y+Z...>h

**Status:** Parent issue permanece aberta até todas sub-issues fecharem.

**Execução:** Use /pick-next-issue para selecionar cada sub-issue na ordem de dependência.
EOF
)"
```

**Passo 4:** Adicionar label ao parent

```bash
gh issue edit <parent-id> --add-label "parent-issue"
```

**Passo 5:** Retornar ao algoritmo de seleção

Após desmembramento, **REEXECUTE** o algoritmo de seleção (passo 1️⃣) para escolher a primeira sub-issue atômica.

---

## 3️⃣ EXECUÇÃO (Desenvolvimento Completo)

### 3.1 Criar Branch

```bash
git checkout master
git pull origin master
git checkout -b feat/<issue-id>-<slug-descritivo>
```

Exemplo: `feat/42-configure-jest`

### 3.2 Implementação

- Siga **exatamente** o Technical Approach da issue
- Consulte ARCHITECTURE.md para padrões do projeto
- Respeite a arquitetura NestJS + React
- Adicione logs estruturados (usar Logger do NestJS no backend)
- Implemente validação de inputs quando aplicável

### 3.3 Testes (OBRIGATÓRIO)

```bash
# ℹ️  CI/CD Optimization Note:
# - Cache NPM ativo: Primeira execução ~2min, subsequentes ~30s (cache hit)
# - Testes locais usam mesmo cache que CI/CD
# - Path filters: Commits apenas docs NÃO acionam workflows
# - See .github/SLASH_COMMANDS.md for optimization details

# Backend (NestJS)
cd backend
npm test                                    # Testes unitários (cache acelera deps)
npm run test:e2e                           # Testes E2E
npm run test:cov                           # Cobertura

# Frontend (React)
cd frontend
npm test                                    # Vitest (cache acelera deps)
npm run test:coverage                      # Cobertura

# Meta: Aumentar coverage em ≥ +5 pontos percentuais
```

### 3.4 Validações Específicas

**Se tocar em:**

- **Segurança/Auth**: Validar rate limiting, sanitização de inputs
- **Deploy/Infrastructure**: Validar railway.json, Procfile, variáveis de ambiente
- **Database**: Testar migrations com TypeORM
- **API**: Validar contratos com testes de integração
- **LLM/IA**: Validar prompts defensivos, anti-alucinação

### 3.5 Documentação

- Atualizar JSDoc/TSDoc
- Atualizar ARCHITECTURE.md se arquitetura mudou
- Adicionar comentários em código complexo
- Atualizar README.md se necessário

---

## 4️⃣ PULL REQUEST (Padrão ETP Express)

### 4.1 Commit Semântico

```bash
git add .
git commit -m "feat(<escopo>): <descrição> (#<issue-número>)"
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `security`

Exemplos:

- `feat(backend): configure jest (#1)`
- `fix(frontend): fix useEffect memory leak (#14)`
- `test(backend): add auth service tests (#2)`

### 4.2 Push e PR

```bash
git push origin feat/<issue-id>-<slug>

gh pr create \
  --title "[#<issue-id>] <resumo-claro>" \
  --body "$(cat <<EOF
## Context
<Por que esta mudança?>

## Changes
- Mudança 1
- Mudança 2

## Testing
- [ ] Testes unitários passando
- [ ] Testes de integração passando (se aplicável)
- [ ] Coverage aumentou em +X%
- [ ] Validação manual realizada

## Risks
<Riscos técnicos ou impactos potenciais>

## Rollback Plan
<Como reverter se necessário>

## Closes
Closes #<issue-id>
EOF
)"
```

### 4.3 Aguardar CI/CD (Otimizado com Cache + Path Filters)

**ℹ️ Otimizações Ativas:**

- **Cache NPM**: Workflows executam ~60% mais rápido (cache hit)
- **Cache Playwright**: Browsers não reinstalados (economiza 3-4 min)
- **Path Filters**: Commits apenas docs **NÃO** acionam workflows
- **Secret Scanning**: Apenas master/PRs (não em branches de dev)

**Workflows que Serão Acionados** (se PR tocar código TypeScript):

- ✅ ci-lint.yml - ESLint backend + frontend
- ✅ ci-tests.yml - Jest + Vitest com coverage
- ✅ playwright.yml - Testes E2E (se tocar tests/)
- ✅ secret-scan.yml - Gitleaks (scan incremental em PRs)

**Workflows que NÃO Serão Acionados** (se PR apenas docs):

- ⏭️ Commits apenas `.md`, `docs/` não acionam CI/CD
- ⏭️ Path filters economizam ~2900 min/mês

**Validação:**

- ✅ Todos os checks devem estar verdes
- ✅ Coverage não pode diminuir
- ✅ Linting e type checking OK
- ✅ Secret scanning passed (incremental em PRs)

**Referência:** Ver `.github/SLASH_COMMANDS.md` para detalhes de uso otimizado

### 4.4 PARADA - Aguardar Review

**PARE AQUI**

A PR foi criada e está aguardando review. O merge será realizado pelo comando `/review-pr`, que possui:

- Validação rigorosa em 8 categorias (100% score requerido)
- Auto-fixes para issues de formatação
- Validação pós-merge em 3 camadas
- Rollback automático em caso de falha

**Próximo passo:** Execute `/review-pr` para validar e mergear a PR.

**Output esperado:**

```
PR #<número> CRIADA E PRONTA PARA REVIEW

Resumo:
- Issue: #<issue-id> - <título>
- Branch: feat/<issue-id>-<slug>
- PR: #<pr-número>
- Status: Aguardando /review-pr

Próximo comando: /review-pr
```

---

## 5️⃣ RESPONSABILIDADE DO /review-pr

**Esta fase é executada pelo comando `/review-pr`**

O fechamento da issue (Execution Note + `gh issue close`) é responsabilidade do `/review-pr` após:

1. Validação em 8 categorias (100% score)
2. Merge bem-sucedido
3. Validação pós-merge (3 camadas)

**NÃO execute merge ou fechamento de issue manualmente.** Use `/review-pr`.

---

## 6️⃣ PARADA E ESPERA

**FINALIZE O CICLO AQUI**

Após criar a PR, o ciclo do `/pick-next-issue` está **COMPLETO**.

- **NÃO** execute merge da PR
- **NÃO** feche a issue manualmente
- **NÃO** selecione outra issue automaticamente
- **NÃO** abra múltiplas issues em paralelo
- **AGUARDE** comando explícito do usuário

**Próximo passo sugerido:** `/review-pr` para validar, mergear e fechar a issue.

---

## 📋 CHECKLIST FINAL (verificar antes de declarar completo)

- [ ] Issue selecionada seguiu algoritmo determinístico
- [ ] Governança validada ou rewrite feito
- [ ] Atomicidade validada ou issue desmembrada
- [ ] Branch criada conforme padrão
- [ ] Implementação seguiu Technical Approach
- [ ] Testes adicionados e passando
- [ ] Coverage aumentou ≥ +5 p.p. (quando aplicável)
- [ ] Validações específicas executadas
- [ ] PR criada com template completo
- [ ] CI/CD passando (checks verdes)

**Próximo passo:** `/review-pr` para validação, merge e fechamento.

---

## 🔧 PARÂMETROS FIXOS DO ETP EXPRESS

- ⏱️ **Tamanho atômico**: 1–8 horas por issue (**obrigatório** - issues maiores devem ser desmembradas)
- 🧪 **Testes obrigatórios**: Sempre adicionar testes para código novo ou modificado
- 📝 **Documentação completa**: File Location + Acceptance Criteria + Technical Approach
- 🔒 **Segurança**: Validação de vulnerabilidades OWASP Top 10
- 📦 **Commits semânticos**: Conventional Commits obrigatório
- 🎯 **Milestones**: Seguir ordem M1→M2→M3→M4→M5→M6
- 🔴 **Respeitar prioridades**: P0 > P1 > P2 > P3 (sem exceções)

---

## 🎓 REFERÊNCIAS DO PROJETO

### Documentação Estratégica

- **Roadmap:** `ROADMAP.md` - **CONSULTAR SEMPRE** para status atual e prioridades
- **Audit Report:** `ROADMAP_AUDIT_REPORT.md` - Análises e auditorias
- **Arquitetura:** `ARCHITECTURE.md` - Padrões técnicos
- **Deploy:** `DEPLOY_RAILWAY.md` - Processo de deploy

### GitHub CLI - Comandos Úteis

```bash
# Issues abertas por prioridade
gh issue list --label "priority/P0" --state open
gh issue list --label "priority/P1" --state open
gh issue list --label "priority/P2" --state open
gh issue list --label "priority/P3" --state open

# Issues por milestone
gh issue list --milestone "M1: Foundation" --state open
gh issue list --milestone "M2: CI/CD Pipeline" --state open
gh issue list --milestone "M3: Quality & Security" --state open
gh issue list --milestone "M4: Refactoring & Performance" --state open
gh issue list --milestone "M5: E2E Testing & Documentation" --state open
gh issue list --milestone "M6: Maintenance (Recurring)" --state open

# Detalhes de issue
gh issue view <número> --json body,labels,title,milestone

# Issues abertas (geral)
gh issue list --state open --json number,title,labels,milestone
```

### Exemplo de Desmembramento

**Issue Parent (não-atômica):**

```
#100 - Implementar sistema de autenticação completo (15h)
```

**Sub-issues atômicas:**

```
#101 - [AUTH-100a] Setup JWT e middleware de autenticação (3h)
#102 - [AUTH-100b] Implementar endpoint de login (2h)
#103 - [AUTH-100c] Implementar endpoint de registro (2h)
#104 - [AUTH-100d] Adicionar refresh token (3h)
#105 - [AUTH-100e] Implementar testes de autenticação (3h)
#106 - [AUTH-100f] Documentar API de autenticação (2h)
```

**Resultado:** 6 issues atômicas (2-3h cada) ao invés de 1 issue monolítica (15h)

---

## ⚠️ AVISOS IMPORTANTES

1. **NÃO execute merge de PR** - O merge é responsabilidade exclusiva do `/review-pr`
2. **NÃO feche issues manualmente** - O fechamento é feito pelo `/review-pr` após merge
3. **NÃO pule a validação de atomicidade** - Issues grandes causam atrasos e PRs rejeitados
4. **SEMPRE respeite ordem de prioridades** - P0 antes de P1, P1 antes de P2, etc.
5. **NÃO ignore dependências** - Verificar "Blocked by" antes de iniciar
6. **NÃO reescreva issues sem criar sub-issues** - Se > 8h, desmembrar é obrigatório
7. **CONSULTE ROADMAP.md** - Documento autoritativo do estado atual do projeto

---

**Início da Execução: AGORA**
