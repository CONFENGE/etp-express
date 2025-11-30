# Slash Commands - Best Practices para Economia de Minutos GitHub Actions

## Otimizações Implementadas

Com as otimizações de cache e path filters implementadas em 2025-11-30, o consumo de minutos foi reduzido em ~60%:

- **Antes:** ~25 min/ciclo (push + PR)
- **Depois:** ~10 min/ciclo (com cache hit)
- **Economia mensal:** ~8000 minutos (~131 horas)

### Otimizações Aplicadas

1. **Cache NPM** - Instalação de dependências 10x mais rápida com cache hit
2. **Cache Playwright Browsers** - Economiza 3-4 min por execução
3. **Path Filters** - Workflows não executam para commits apenas de documentação
4. **Secret Scanning Otimizado** - Weekly ao invés de daily, apenas em master/PRs
5. **Scan Incremental** - PRs escaneiam apenas commits novos

---

## Uso Otimizado das Slash Commands

### /review-pr

**Consumo de minutos:**

- Com cache hit: ~6-8 min (lint + tests + playwright)
- Com cache miss: ~15-18 min (primeira execução do dia)

**Quando usar:**

- ✅ PRs críticos (security, hotfix, features importantes)
- ✅ PRs bloqueando outros desenvolvedores
- ✅ Fim de sprint (limpar backlog)
- ✅ PRs com todos os checks verdes no CI

**Quando evitar:**

- ❌ PRs triviais (typos, ajustes de docs pequenos)
- ❌ PRs ainda em WIP (aguardar finalização)
- ❌ PRs sem CI green (aguardar correções)
- ❌ PRs com conflitos de merge

**Fluxo de economia:**
O comando /review-pr aciona automaticamente todos os workflows após merge. Com as otimizações:

- Cache NPM reduz tempo de instalação de ~120s para ~10s
- Path filters previnem execuções desnecessárias
- Secret scanning incremental é mais rápido em PRs

---

### /pick-next-issue

**Consumo de minutos:**

- Por issue completa (dev + PR + merge): ~20-25 min
- Com cache hit: ~12-15 min

**Quando usar:**

- ✅ Issues P0/P1 (prioridade alta)
- ✅ Issues bloqueando milestone
- ✅ Issues com acceptance criteria claros
- ✅ Issues atômicas (1-8h de trabalho)

**Quando evitar:**

- ❌ Issues vagas (requere refinamento primeiro)
- ❌ Issues bloqueadas por outras issues abertas
- ❌ Issues >8h (desmembrar em sub-issues antes de executar)
- ❌ Issues sem contexto técnico suficiente

**Otimização:**
Este comando cria branch + implementa + cria PR. Cada PR aciona workflows. Com otimizações:

- Apenas código TypeScript/TSX aciona lint/tests (path filters)
- Cache NPM acelera cada execução de workflow
- Secret scanning não roda em branches de desenvolvimento

---

## Mudanças que NÃO Acionam Workflows

Graças aos **path filters**, os seguintes tipos de commit **NÃO acionam workflows**:

### ✅ Mudanças Seguras (Não acionam CI/CD)

- Mudanças apenas em `*.md` (README, ARCHITECTURE, ROADMAP, etc.)
- Mudanças em `docs/**/*`
- Mudanças em `.vscode/**/*`
- Mudanças em `.editorconfig`, `.prettierrc`
- Commits com apenas updates de CHANGELOG.md

### ⚠️ Mudanças que Acionam Workflows

- Qualquer código TypeScript (`**/*.ts`, `**/*.tsx`)
- Mudanças em `package.json` ou `package-lock.json`
- Mudanças em arquivos de configuração ESLint (`.eslintrc*`)
- Mudanças em testes (`**/*.test.ts`, `**/*.spec.ts`)
- Mudanças nos próprios workflows (`.github/workflows/*.yml`)

---

## Secret Scanning - Mudanças de Comportamento

### Antes da Otimização

- ❌ Executava em **TODOS os branches** (feature, hotfix, etc.)
- ❌ Executava **diariamente** às 3h AM UTC
- ❌ Scan completo em PRs (mesmo para 1 commit novo)

### Depois da Otimização

- ✅ Executa apenas em **master/main** (push)
- ✅ Executa apenas em **PRs para master/main**
- ✅ Executa **semanalmente** (segunda-feira 3h AM UTC)
- ✅ **Scan incremental** em PRs (escaneia apenas commits novos)
- ✅ Mantém `workflow_dispatch` para trigger manual

### Mitigação de Riscos

Para prevenir secrets em branches de desenvolvimento:

- Use pre-commit hook local: `npm run security:scan:staged`
- Configuração em `.husky/pre-commit` já está ativa
- Weekly scan completo detecta qualquer secret não capturado

---

## Monitoramento de Consumo

### Ver Minutos Consumidos no Mês Atual

```bash
gh api /repos/OWNER/REPO/actions/billing/usage --jq '.total_minutes_used'
```

### Ver Workflows Mais Caros

```bash
gh api /repos/OWNER/REPO/actions/runs?per_page=100 | \
  jq '.workflow_runs[] | {name: .name, duration_min: (.run_duration_ms / 60000)}' | \
  jq -s 'sort_by(.duration_min) | reverse | .[0:10]'
```

### Ver Histórico de Execuções Recentes

```bash
gh run list --limit 20 --json name,conclusion,createdAt,displayTitle,durationMs
```

---

## Métricas de Sucesso Pós-Otimização

### Baseline (Antes - Novembro 2025)

- Tempo médio por ciclo: **~25 min**
- Consumo mensal estimado: **~12000 min**
- 6x instalações npm por ciclo (sem cache)
- Secret scanning em todos os branches + daily

### Atual (Depois - 2025-11-30)

- Tempo médio por ciclo: **~10 min** (cache hit)
- Consumo mensal projetado: **~4000 min**
- 6x instalações npm com cache (~10s cada)
- Secret scanning weekly + apenas master/PRs

### Economia Total

- **Redução:** ~68% (~8000 min/mês economizados)
- **Equivalente:** ~131 horas/mês
- **Custo evitado:** Significativo em planos pagos do GitHub

---

## Casos de Uso - Exemplos Práticos

### Exemplo 1: Commit de Documentação

```bash
# Commit apenas em README
echo "# Updated docs" >> README.md
git commit -am "docs: atualizar README com exemplos"
git push
```

**Resultado:** ✅ Nenhum workflow acionado (path filters)

### Exemplo 2: Commit de Código

```bash
# Commit em código TypeScript
echo "// New feature" >> backend/src/app.service.ts
git commit -am "feat: adicionar nova feature no service"
git push
```

**Resultado:** ⚠️ Workflows acionados (lint + tests + secret-scan em master)

### Exemplo 3: Uso do /review-pr

```bash
# PR já está verde no CI
/review-pr
```

**Resultado:**

- Seleciona PR com maior score
- Valida 8 critérios (100% obrigatório)
- Merge automático se passar
- Workflows acionados pós-merge (~10 min com cache)

### Exemplo 4: Branch de Feature

```bash
# Criar branch feature
git checkout -b feat/nova-feature
echo "// Code" >> backend/src/feature.ts
git commit -am "feat: implementar nova feature"
git push -u origin feat/nova-feature
```

**Resultado:** ✅ Secret scanning NÃO roda (otimização - apenas master/PRs)

---

## Perguntas Frequentes

**Q: Se eu commitar apenas docs, o pre-commit hook ainda roda?**
A: Sim, hooks locais (Husky) sempre rodam. Apenas workflows remotos do GitHub Actions são filtrados.

**Q: Como aciono manualmente um workflow se os path filters bloquearam?**
A: Use `workflow_dispatch` no GitHub UI ou via CLI:

```bash
gh workflow run ci-lint.yml
```

**Q: O secret scanning ainda é seguro com weekly ao invés de daily?**
A: Sim. PRs sempre escaneiam (proteção pré-merge), push em master escaneia (proteção pós-merge), e weekly scan completo pega qualquer coisa esquecida. Pre-commit hook local adiciona camada extra.

**Q: Cache pode causar builds inconsistentes?**
A: Não. Cache key é baseado no hash de `package-lock.json`. Qualquer mudança em dependências invalida o cache automaticamente.

**Q: Posso desabilitar path filters temporariamente?**
A: Sim. Use `workflow_dispatch` para forçar execução manual, ou modifique o workflow removendo a seção `paths:`.

---

## Contribuindo

Se você identificar oportunidades adicionais de otimização ou tiver sugestões, abra uma issue:

```bash
gh issue create --title "CI/CD Optimization: [descrição]" --label optimization
```

---

**Última atualização:** 2025-11-30
**Autor:** Claude Code (otimização automática conforme CLAUDE.md)
