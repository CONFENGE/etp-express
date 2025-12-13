# SessionStart Hook

Este hook e executado automaticamente no inicio de cada sessao Claude Code.

---

## Acoes Automaticas

### 1. Carregar Contexto do Projeto

Ao iniciar a sessao:

1. Ler `ROADMAP.md` para entender o estado atual do projeto
2. Verificar `git status` para mudancas pendentes
3. Identificar branch atual e ultimo commit

### 2. Ativar Skills Relevantes

Baseado nos arquivos abertos ou mencionados:

- Se `backend/src/` → Ativar `nestjs-patterns`
- Se `frontend/src/` → Ativar `react-patterns`
- Se `entities/` ou `migrations/` → Ativar `typeorm-guide`
- Se trabalhar com ETPs → Ativar `lei-14133`
- Se trabalhar com jobs/queues → Ativar `bullmq-patterns`

### 3. Verificar Saude do Projeto

Executar verificacoes rapidas:

- Build status (cache hit esperado)
- Testes passando
- Linting OK

### 4. Sugerir Proximo Passo

Baseado no contexto:

- Se ha mudancas pendentes → Sugerir `/commit` ou continuar trabalho
- Se branch limpa → Sugerir `/pick-next-issue`
- Se PR aberta → Sugerir `/review-pr`

---

## Output Esperado

```markdown
## Sessao Iniciada

**Projeto:** ETP Express
**Branch:** master
**Status:** Limpa

### Contexto Carregado

- ROADMAP.md: M6 em progresso (84%)
- Issues abertas: 54
- Prioridades: P0 Security (1), P0 Enterprise (9)

### Skills Ativas

- nestjs-patterns
- react-patterns

### Sugestao

Execute `/pick-next-issue` para selecionar a proxima tarefa.
```

---

## Configuracao

Este hook pode ser ativado adicionando ao `settings.local.json`:

```json
{
  "hooks": {
    "sessionStart": ".claude/hooks/SessionStart.md"
  }
}
```
