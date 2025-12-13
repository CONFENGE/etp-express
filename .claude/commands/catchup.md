---
description: Restaurar contexto de trabalho apos /clear
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Read
---

# /catchup - Restaurar Contexto de Trabalho

Voce e o assistente de desenvolvimento do ETP Express. Sua tarefa e restaurar rapidamente o contexto de trabalho apos um `/clear` ou inicio de sessao.

---

## Fluxo de Execucao

### 1. Status do Repositorio

```bash
git status
git branch --show-current
```

Identifique:

- Branch atual
- Arquivos modificados nao commitados
- Arquivos staged

### 2. Historico Recente

```bash
git log --oneline -10
```

Identifique:

- Ultimos commits
- Padrao de commits (feat, fix, refactor, etc.)
- Issue relacionada ao trabalho recente

### 3. Mudancas em Progresso

```bash
git diff --stat
```

Se houver mudancas, liste os arquivos modificados e um resumo do que foi alterado.

### 4. Contexto do Projeto

Leia ROADMAP.md para entender:

- Status atual dos milestones
- Issues em progresso
- Prioridades P0/P1/P2/P3

### 5. Resumo Executivo

Apresente um resumo conciso:

```
## Estado Atual do Projeto

**Branch:** <branch-atual>
**Ultimo Commit:** <hash> - <mensagem>
**Arquivos Modificados:** <N arquivos>

### Mudancas Pendentes
- <arquivo1>: <tipo-mudanca>
- <arquivo2>: <tipo-mudanca>

### Contexto do ROADMAP
- Milestone atual: <Mx>
- Issues abertas prioritarias: #<issue-id>

### Sugestao de Proximo Passo
<baseado no contexto, sugira o proximo passo logico>
```

---

## Exemplo de Output

```
## Estado Atual do Projeto

**Branch:** feat/42-auth-improvements
**Ultimo Commit:** abc123 - feat(auth): add JWT refresh token
**Arquivos Modificados:** 3 arquivos

### Mudancas Pendentes
- backend/src/auth/auth.service.ts: Implementacao refresh token
- backend/src/auth/auth.controller.ts: Novo endpoint /refresh
- backend/test/auth.e2e-spec.ts: Testes E2E

### Contexto do ROADMAP
- Milestone atual: M3 (Quality & Security)
- Issues abertas prioritarias: #42 (auth improvements)

### Sugestao de Proximo Passo
Continuar implementacao do refresh token - faltam testes unitarios.
```

---

## Regras

1. **Seja conciso** - O objetivo e dar contexto rapido, nao um relatorio extenso
2. **Foque no relevante** - Ignore arquivos de configuracao ou auto-gerados
3. **Sugira acao** - Sempre termine com uma sugestao de proximo passo
4. **Nao execute acoes** - Apenas leia e reporte, nao modifique nada
