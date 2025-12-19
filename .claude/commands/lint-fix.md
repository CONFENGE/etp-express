---
description: Auto-fix de linting e formatacao (ESLint + Prettier)
allowed-tools: Bash(npx eslint:*), Bash(npx prettier:*), Bash(npm run:*)
---

# /lint-fix - Auto-fix de Linting e Formatacao

Voce e responsavel por aplicar correcoes automaticas de linting e formatacao no projeto ETP Express.

---

## Ferramentas Utilizadas

| Ferramenta | Proposito | Configuracao |
| ---------- | ------------------- | --------------- |
| ESLint | Qualidade de codigo | `.eslintrc.js` |
| Prettier | Formatacao | `.prettierrc` |
| TypeScript | Type checking | `tsconfig.json` |

---

## Fluxo de Execucao

### 1. Verificar Status Atual

```bash
# Backend
cd backend && npx eslint . --ext .ts --format stylish 2>&1 | tail -30
cd backend && npx prettier --check "src/**/*.ts" 2>&1 | tail -20

# Frontend
cd frontend && npx eslint . --ext .ts,.tsx --format stylish 2>&1 | tail -30
cd frontend && npx prettier --check "src/**/*.{ts,tsx}" 2>&1 | tail -20
```

### 2. Aplicar Auto-fixes

```bash
# Backend - ESLint auto-fix
cd backend && npx eslint . --ext .ts --fix

# Backend - Prettier
cd backend && npx prettier --write "src/**/*.ts"

# Frontend - ESLint auto-fix
cd frontend && npx eslint . --ext .ts,.tsx --fix

# Frontend - Prettier
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}"
```

### 3. Verificar Type Errors

```bash
# Backend
cd backend && npx tsc --noEmit 2>&1 | head -50

# Frontend
cd frontend && npx tsc --noEmit 2>&1 | head -50
```

### 4. Relatar Resultado

```markdown
## Lint Fix Report

### Backend

| Categoria | Antes | Depois |
| --------------- | ----- | ------ |
| ESLint Errors | X | Y |
| ESLint Warnings | X | Y |
| Prettier Issues | X | Y |
| Type Errors | X | Y |

**Arquivos modificados:**

- `src/module/file.ts` - Formatacao
- `src/service/other.ts` - Unused imports

### Frontend

| Categoria | Antes | Depois |
| --------------- | ----- | ------ |
| ESLint Errors | X | Y |
| ESLint Warnings | X | Y |
| Prettier Issues | X | Y |
| Type Errors | X | Y |

**Arquivos modificados:**

- `src/components/Button.tsx` - Formatacao
- `src/hooks/useAuth.ts` - Unused vars

### Issues Remanescentes

Se houver erros que nao podem ser auto-fixados:

| Arquivo | Linha | Erro | Correcao Manual |
| ------- | ----- | ---------------------------------- | -------------------- |
| file.ts | 42 | @typescript-eslint/no-explicit-any | Definir tipo correto |
```

---

## Correcoes Automaticas Aplicadas

### ESLint

- Remocao de imports nao utilizados
- Ordenacao de imports
- Adicao de semicolons
- Correcao de quotes (single vs double)
- Espacamento e indentacao
- Trailing commas

### Prettier

- Formatacao consistente
- Line length (80/100 chars)
- Tab vs spaces
- End of line

---

## Issues que Requerem Correcao Manual

| Regra | Descricao | Como Corrigir |
| ------------------------------------ | -------------------------- | -------------------- |
| `@typescript-eslint/no-explicit-any` | Uso de `any` | Definir tipo correto |
| `@typescript-eslint/no-unused-vars` | Variavel nao usada | Remover ou usar |
| `react-hooks/exhaustive-deps` | Deps faltando em useEffect | Adicionar deps |
| `@typescript-eslint/ban-types` | Tipo banido (Object, {}) | Usar tipo especifico |

---

## Exemplo de Output

```
## Lint Fix Report

### Backend ✅

| Categoria | Antes | Depois |
|-----------|-------|--------|
| ESLint Errors | 12 | 0 |
| ESLint Warnings | 8 | 3 |
| Prettier Issues | 25 | 0 |
| Type Errors | 0 | 0 |

**Arquivos modificados:** 8 arquivos

### Frontend ✅

| Categoria | Antes | Depois |
|-----------|-------|--------|
| ESLint Errors | 5 | 0 |
| ESLint Warnings | 15 | 4 |
| Prettier Issues | 42 | 0 |
| Type Errors | 0 | 0 |

**Arquivos modificados:** 12 arquivos

### Issues Remanescentes

| Arquivo | Linha | Erro |
|---------|-------|------|
| useAuth.ts | 42 | exhaustive-deps |
| api.ts | 15 | no-explicit-any |

Para corrigir: Adicione dependencias faltantes no useEffect e substitua `any` por tipos corretos.
```

---

## Regras

1. **Sempre verificar antes** - Veja quantos erros existem antes de corrigir
2. **Auto-fix primeiro** - Use as ferramentas antes de correcoes manuais
3. **Type check** - Sempre verifique tipos apos correcoes
4. **Reporte diferencas** - Mostre o antes/depois
5. **Nao force** - Se algo nao pode ser auto-fixado, documente
