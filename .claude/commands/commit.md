---
description: Commit semantico automatizado seguindo Conventional Commits
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git status:*), Bash(git diff:*)
argument-hint: [mensagem-opcional]
---

# /commit - Commit Semantico Automatizado

Voce e responsavel por criar commits seguindo o padrao Conventional Commits do projeto ETP Express.

---

## Fluxo de Execucao

### 1. Verificar Mudancas

```bash
git status
git diff --stat
```

Se nao houver mudancas, informe ao usuario e pare.

### 2. Analisar Mudancas

Identifique:

- Quais arquivos foram modificados
- Qual o proposito das mudancas
- Se ha breaking changes

### 3. Classificar Tipo de Commit

| Tipo       | Quando Usar                              |
| ---------- | ---------------------------------------- |
| `feat`     | Nova funcionalidade                      |
| `fix`      | Correcao de bug                          |
| `refactor` | Refatoracao sem mudanca de comportamento |
| `test`     | Adicao ou correcao de testes             |
| `docs`     | Documentacao                             |
| `chore`    | Tarefas de manutencao                    |
| `perf`     | Melhoria de performance                  |
| `security` | Correcao de vulnerabilidade              |
| `style`    | Formatacao, espacos, etc.                |
| `ci`       | Mudancas em CI/CD                        |

### 4. Identificar Escopo

Escopos validos no ETP Express:

- `backend` - Mudancas no backend NestJS
- `frontend` - Mudancas no frontend React
- `auth` - Sistema de autenticacao
- `etps` - Modulo de ETPs
- `sections` - Modulo de secoes
- `export` - Modulo de exportacao
- `rag` - Modulo RAG/pgvector
- `search` - Busca de contratos
- `config` - Configuracoes
- `deps` - Dependencias
- `ci` - CI/CD workflows

### 5. Gerar Mensagem

Se `$ARGUMENTS` fornecido, use como mensagem.

Senao, gere a mensagem no formato:

```
<type>(<scope>): <descricao-curta>

<descricao-detalhada-se-necessario>

<footer-se-breaking-change>
```

### 6. Executar Commit

```bash
git add .
git commit -m "<mensagem>"
```

---

## Regras de Mensagem

1. **Primeira linha:** Maximo 72 caracteres
2. **Imperativo:** Use "add", nao "added" ou "adding"
3. **Sem ponto final** na primeira linha
4. **Breaking changes:** Adicione `BREAKING CHANGE:` no footer

---

## Exemplos

### Commit simples

```bash
git commit -m "feat(backend): add JWT refresh token endpoint"
```

### Commit com descricao

```bash
git commit -m "$(cat <<'EOF'
fix(auth): resolve token expiration race condition

The previous implementation had a race condition where tokens could
expire between validation and use. This fix adds a 30-second buffer.

Closes #42
EOF
)"
```

### Commit com breaking change

```bash
git commit -m "$(cat <<'EOF'
refactor(api): change authentication header format

BREAKING CHANGE: Authorization header now requires 'Bearer ' prefix.
Update all API clients to include the prefix.

Migration: Add 'Bearer ' before all tokens in Authorization headers.
EOF
)"
```

---

## Assinatura

Todos os commits devem terminar com a assinatura Claude Code:

```
Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Output Esperado

```
Commit criado com sucesso:

feat(backend): add JWT refresh token endpoint

Arquivos incluidos:
- backend/src/auth/auth.service.ts
- backend/src/auth/auth.controller.ts
- backend/src/auth/dto/refresh-token.dto.ts

Hash: abc123def
```
