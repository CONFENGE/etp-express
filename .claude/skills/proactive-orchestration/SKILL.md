---
name: proactive-orchestration
description: Use at session start and after every user message - automatically detects context and executes relevant commands proactively without requiring explicit user invocation
---

# Proactive Command Orchestration

## Purpose

Ensure commands are executed when relevant, WITHOUT requiring explicit `/command` invocation.

## MANDATORY PROTOCOL

After EVERY user message, complete this checklist:

1. What is the current context? (inicio de sessao, erro, tarefa completa, etc.)
2. Does any command mapping apply? (ver tabela abaixo)
3. If yes - Execute the command via SlashCommand tool
4. Announce: "Executando /command proativamente porque [razao]"

## Command Trigger Matrix

### AUTO-EXECUTE (Sempre, sem perguntar)

| Trigger              | Command          | Deteccao                              |
| -------------------- | ---------------- | ------------------------------------- |
| Session start        | `/catchup`       | Primeira mensagem ou apos /clear      |
| Build error          | `/smart-fix`     | Saida de npm run build com erros      |
| Type error           | `/smart-fix`     | Saida de tsc com erros                |
| Lint error           | `/lint-fix`      | Saida de eslint com erros             |
| Test failure         | `/smart-fix`     | Saida de npm test com FAIL            |
| Task complete        | `/commit`        | Codigo funcionando + tests passing    |
| Entity modified      | `/db-migrate`    | Arquivos .entity.ts editados          |
| Pre-PR               | `/test-coverage` | Antes de criar PR                     |
| Pre-PR               | `/security-scan` | Antes de criar PR                     |
| Pre-deploy           | `/deploy-check`  | Antes de deploy Railway               |
| Prod issue mentioned | `/health-check`  | Mencao a producao + problema          |
| PR mentioned         | `/review-pr`     | Usuario menciona PR para review       |
| Drift suspected      | `/audit-roadmap` | Inconsistencia entre issues e ROADMAP |

### SUGGEST (Perguntar primeiro)

| Trigger         | Command         | Quando                             |
| --------------- | --------------- | ---------------------------------- |
| Complex feature | `/brainstorm`   | Nova feature sem design claro      |
| Multiple tasks  | `/write-plan`   | 3+ tarefas relacionadas            |
| Plan exists     | `/execute-plan` | Plano criado, pronto para executar |

## Integration with using-superpowers

This skill complements `using-superpowers`:

- `using-superpowers` - Checks for relevant **skills**
- `proactive-orchestration` - Checks for relevant **commands**

Both run at session start and after every user message.

## Rationalization Prevention

If you catch yourself thinking:

- "The user didn't ask for this" - WRONG. Proactive = anticipate needs
- "Let me do it manually" - WRONG. Commands exist for consistency
- "This is overkill" - WRONG. Commands prevent errors
- "I'll suggest it later" - WRONG. Execute AUTO-EXECUTE now
- "I already know how to do this" - WRONG. Commands ensure standardization
- "This context doesn't quite match" - WRONG. Close enough = execute

## Example Flows

### Error Detection

```
User: "O build esta falhando com erro de tipo"

1. Detectar: Build error com type error
2. Comando aplicavel: /smart-fix
3. Executar: SlashCommand tool com "/smart-fix"
4. Anunciar: "Executando /smart-fix proativamente para diagnosticar o erro de tipo"
```

### Task Completion

```
User: "Implementa o fix que voce sugeriu"

[After implementing and tests pass]

1. Detectar: Task complete, tests passing
2. Comando aplicavel: /commit
3. Executar: SlashCommand tool com "/commit"
4. Anunciar: "Executando /commit proativamente - tarefa completa com testes passando"
```

### Pre-PR Workflow

```
User: "Cria um PR para essa mudanca"

1. Detectar: PR creation requested
2. Comandos aplicaveis: /test-coverage, /security-scan (Pre-PR)
3. Executar sequencialmente antes de criar PR
4. Anunciar: "Executando validacoes pre-PR proativamente"
```

## Session Start Protocol

Na primeira mensagem de cada sessao:

1. Verificar se contexto precisa ser restaurado
2. Se sim - executar `/catchup`
3. Anunciar skills e commands disponiveis relevantes ao contexto

## Priority Order

Quando multiplos commands aplicam, executar nesta ordem:

1. `/catchup` - Contexto primeiro
2. `/health-check` - Producao e prioritaria
3. `/smart-fix` ou `/lint-fix` - Resolver erros
4. `/test-coverage` + `/security-scan` - Validacao
5. `/commit` - Persistir mudancas
6. `/deploy-check` - Pre-deploy

## Why This Matters

Commands encapsulam workflows testados e padronizados. Executar proativamente:

- Previne erros por esquecimento
- Garante consistencia de processo
- Economiza tempo do usuario
- Documenta acoes tomadas
