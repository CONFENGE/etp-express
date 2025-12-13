# PostIssueSelect Hook

Este hook e executado apos o comando `/pick-next-issue` selecionar uma issue.

---

## Acoes Automaticas

### 1. Atualizar ROADMAP.md

Adicionar entrada no changelog com a issue selecionada:

```markdown
### [DATA]

**Issue #XXX - Titulo** (Em Progresso)

- Branch: `feat/XXX-slug`
- Prioridade: PX
- Milestone: MX
```

### 2. Criar Branch

Se ainda nao existir:

```bash
git checkout -b feat/<issue-id>-<slug>
```

### 3. Registrar no Memory MCP

Salvar no knowledge graph:

```json
{
  "entity": "current-work",
  "type": "issue",
  "properties": {
    "issueId": "XXX",
    "title": "Titulo da issue",
    "branch": "feat/XXX-slug",
    "startedAt": "2025-01-15T14:30:00Z"
  }
}
```

### 4. Carregar Contexto da Issue

Ler arquivos mencionados na issue:

- File Location especificados
- Arquivos relacionados (imports, testes)

---

## Output Esperado

```markdown
## Issue Selecionada

**#42 - Implementar refresh token JWT**

### Setup Automatico

- ✅ Branch criada: `feat/42-refresh-token`
- ✅ ROADMAP.md atualizado
- ✅ Contexto carregado

### Arquivos a Modificar

1. `backend/src/auth/auth.service.ts`
2. `backend/src/auth/auth.controller.ts`
3. `backend/src/auth/dto/refresh-token.dto.ts`

### Acceptance Criteria

- [ ] Endpoint POST /auth/refresh funcional
- [ ] Token expirado retorna 401
- [ ] Novo token tem TTL de 7 dias
- [ ] Testes unitarios cobrindo casos

### Proximo Passo

Iniciar implementacao conforme Technical Approach da issue.
```

---

## Integracao

Este hook e invocado automaticamente pelo `/pick-next-issue` apos a selecao ser confirmada.

Pode ser desabilitado com flag:

```
/pick-next-issue --no-hooks
```
