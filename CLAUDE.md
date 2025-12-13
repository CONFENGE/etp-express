# Regras Gerais

- sempre que uma tarefa impactar na evolução do projeto, ROADMAP.md deve ser atualizado.
- Sempre que houver recomendação de execução fundamentada, executar a recomendação sem solicitar aprovação manual

# Execução Proativa de Commands

## Regra Geral

Antes de qualquer tarefa, verificar se existe um command relevante. Se existir, executá-lo proativamente usando a skill `proactive-orchestration`.

## Mapeamentos Obrigatórios (AUTO-EXECUTE)

| Contexto Detectado              | Command          | Ativação                       |
| ------------------------------- | ---------------- | ------------------------------ |
| Início de sessão / após /clear  | `/catchup`       | Sempre no início               |
| Erro de build/lint/type         | `/smart-fix`     | Ao detectar erro               |
| Arquivos modificados + tests OK | `/commit`        | Após completar tarefa          |
| Antes de PR/deploy              | `/test-coverage` | Antes de criar PR              |
| Antes de PR/deploy              | `/security-scan` | Antes de criar PR              |
| PR mencionado para review       | `/review-pr`     | Quando usuário menciona PR     |
| Problemas em produção           | `/health-check`  | Quando mencionado Railway/prod |
| Entity editada                  | `/db-migrate`    | Ao editar arquivos .entity.ts  |
| Pré-deploy                      | `/deploy-check`  | Antes de deploy Railway        |
| Drift ROADMAP vs Issues         | `/audit-roadmap` | Inconsistência detectada       |

## Ativação Contextual (SUGGEST - Perguntar)

| Contexto          | Command         | Quando Sugerir                    |
| ----------------- | --------------- | --------------------------------- |
| Feature complexa  | `/brainstorm`   | Antes de implementar feature nova |
| Plano necessário  | `/write-plan`   | 3+ tarefas ou design não-trivial  |
| Múltiplas tarefas | `/execute-plan` | Com plano criado, pronto executar |

## Integração com Skills

A execução proativa de commands complementa `using-superpowers`:

- **Skills** = HOW (como fazer algo)
- **Commands** = WHAT (o que executar automaticamente)

Ambos devem ser verificados antes de cada tarefa.
