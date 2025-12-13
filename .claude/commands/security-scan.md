---
description: Scan de seguranca abrangente (OWASP, npm audit, secrets)
allowed-tools: Bash(npm audit:*), Bash(npx:*), Grep, Read
---

# /security-scan - Scan de Seguranca Abrangente

Voce e um engenheiro de seguranca responsavel por identificar vulnerabilidades no projeto ETP Express.

---

## Categorias de Verificacao

1. **Dependencias** - Vulnerabilidades em pacotes npm
2. **Secrets** - Chaves e credenciais hardcoded
3. **OWASP Top 10** - Padroes de vulnerabilidade comuns
4. **Configuracao** - Misconfiguration de seguranca

---

## Fluxo de Execucao

### 1. Audit de Dependencias

```bash
cd backend && npm audit --json 2>&1 | head -200
cd frontend && npm audit --json 2>&1 | head -200
```

### 2. Scan de Secrets

Padroes a buscar:

```bash
# API Keys
grep -rn "api[_-]?key.*=.*['\"][a-zA-Z0-9]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" .

# AWS Keys
grep -rn "AKIA[0-9A-Z]{16}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" .

# Private Keys
grep -rn "-----BEGIN.*PRIVATE KEY-----" .

# Passwords hardcoded
grep -rn "password.*=.*['\"][^$]" --include="*.ts" --include="*.tsx" .

# JWT Secrets
grep -rn "secret.*=.*['\"][a-zA-Z0-9]" --include="*.ts" --include="*.tsx" .
```

### 3. Verificacao OWASP Top 10

#### A01 - Broken Access Control

```bash
# Verificar guards em controllers
grep -rn "@Controller" backend/src --include="*.ts" -A 5 | grep -v "@UseGuards"
```

#### A02 - Cryptographic Failures

```bash
# Verificar uso de algoritmos fracos
grep -rn "md5\|sha1\|des\|rc4" backend/src --include="*.ts"
```

#### A03 - Injection

```bash
# Verificar SQL raw sem parametrizacao
grep -rn "query\|execute" backend/src --include="*.ts" -B 2 -A 2
```

#### A07 - XSS

```bash
# Verificar dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML\|innerHTML" frontend/src --include="*.tsx" --include="*.ts"
```

### 4. Verificacao de Configuracao

```bash
# Helmet configurado
grep -rn "helmet" backend/src/main.ts

# CORS restritivo
grep -rn "cors" backend/src/main.ts -A 5

# Rate limiting
grep -rn "RateLimit\|throttle" backend/src --include="*.ts"
```

---

## Classificacao de Severidade

| Severidade  | Descricao                                  | Acao                             |
| ----------- | ------------------------------------------ | -------------------------------- |
| **CRITICO** | Exploravel remotamente, impacto alto       | Parar tudo, corrigir AGORA       |
| **ALTO**    | Exploravel, impacto significativo          | Corrigir antes do proximo deploy |
| **MEDIO**   | Exploravel com condicoes, impacto moderado | Corrigir no sprint atual         |
| **BAIXO**   | Difícil explorar, impacto limitado         | Backlog de seguranca             |
| **INFO**    | Melhoria recomendada                       | Nice to have                     |

---

## Formato do Relatorio

```markdown
## Security Scan Report - ETP Express

**Data:** <data>
**Escaneado por:** Claude Code Security Scanner

### Resumo Executivo

| Severidade | Quantidade |
| ---------- | ---------- |
| Critico    | X          |
| Alto       | X          |
| Medio      | X          |
| Baixo      | X          |
| Info       | X          |

### Vulnerabilidades de Dependencias

#### Backend

| Pacote | Versao  | Severidade | CVE           | Correcao               |
| ------ | ------- | ---------- | ------------- | ---------------------- |
| lodash | 4.17.20 | Alto       | CVE-2021-XXXX | Atualizar para 4.17.21 |

#### Frontend

| Pacote | Versao | Severidade | CVE           | Correcao              |
| ------ | ------ | ---------- | ------------- | --------------------- |
| axios  | 0.21.0 | Medio      | CVE-2021-XXXX | Atualizar para 0.21.1 |

### Secrets Detectados

| Arquivo | Linha | Tipo | Status              |
| ------- | ----- | ---- | ------------------- |
| -       | -     | -    | Nenhum detectado ✅ |

### Findings OWASP

| ID  | Categoria | Arquivo       | Linha | Descricao          | Severidade |
| --- | --------- | ------------- | ----- | ------------------ | ---------- |
| 1   | A01       | controller.ts | 42    | Endpoint sem guard | Alto       |

### Recomendacoes

1. **Imediato:** <acao>
2. **Curto prazo:** <acao>
3. **Medio prazo:** <acao>

### Comandos de Remediacao

\`\`\`bash

# Corrigir vulnerabilidades de deps

cd backend && npm audit fix
cd frontend && npm audit fix

# Forcando major updates (cuidado!)

npm audit fix --force
\`\`\`
```

---

## Exemplo de Output

```
## Security Scan Report - ETP Express

**Data:** 2025-01-15
**Escaneado por:** Claude Code Security Scanner

### Resumo Executivo

| Severidade | Quantidade |
|------------|------------|
| Critico | 0 |
| Alto | 2 |
| Medio | 3 |
| Baixo | 5 |
| Info | 8 |

✅ Nenhuma vulnerabilidade critica encontrada
⚠️ 2 vulnerabilidades de alta severidade requerem atencao

### Recomendacoes

1. **Imediato:** Atualizar lodash para 4.17.21 (CVE-2021-23337)
2. **Curto prazo:** Adicionar rate limiting ao endpoint /auth/login
3. **Medio prazo:** Implementar CSP headers no frontend
```

---

## Regras

1. **Nao exponha secrets** - Nunca mostre valores de chaves/senhas encontradas
2. **Priorize por impacto** - Foque em vulnerabilidades exploraveis
3. **Forneca correcao** - Sempre sugira como resolver
4. **False positives** - Indique quando algo pode ser falso positivo
