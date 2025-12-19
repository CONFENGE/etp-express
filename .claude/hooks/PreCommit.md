# PreCommit Hook

Este hook e executado antes de cada commit para garantir qualidade do codigo.

---

## Verificacoes Automaticas

### 1. Formatacao

```bash
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"
```

Se falhar, executar auto-fix:

```bash
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

### 2. Linting

```bash
cd backend && npx eslint . --ext .ts --max-warnings 0
cd frontend && npx eslint . --ext .ts,.tsx --max-warnings 0
```

Se falhar com erros auto-fixaveis:

```bash
npx eslint . --fix
```

### 3. Type Checking

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Se falhar, bloquear commit e reportar erros.

### 4. Testes Afetados

```bash
# Apenas testes relacionados aos arquivos modificados
npm test -- --changedSince=HEAD --passWithNoTests
```

---

## Criterios de Bloqueio

O commit e **BLOQUEADO** se:

- ❌ Type errors existirem
- ❌ ESLint errors (nao warnings)
- ❌ Testes falharem

O commit **PROSSEGUE** com warnings se:

- ⚠ ESLint warnings (nao errors)
- ⚠ Formatting corrigido automaticamente

---

## Bypass

Em casos excepcionais, pode-se bypassar com:

```bash
git commit --no-verify -m "mensagem"
```

**AVISO:** Nao recomendado. Use apenas para emergencias.

---

## Output Esperado

### Sucesso

```
[PreCommit] Verificando...
[PreCommit] ✅ Prettier OK
[PreCommit] ✅ ESLint OK
[PreCommit] ✅ TypeScript OK
[PreCommit] ✅ Testes OK
[PreCommit] Commit aprovado!
```

### Falha

```
[PreCommit] Verificando...
[PreCommit] ✅ Prettier OK
[PreCommit] ❌ ESLint FALHOU
 src/service.ts:42 - @typescript-eslint/no-explicit-any

[PreCommit] Commit BLOQUEADO. Corrija os erros acima.
```

---

## Configuracao

Este hook ja esta ativo via Husky + lint-staged no projeto.

Arquivos de configuracao:

- `.husky/pre-commit`
- `package.json` → `lint-staged`
