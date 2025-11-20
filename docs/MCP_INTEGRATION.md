# MCP Integration Guide - ETP Express

## Overview

Este documento descreve a integração de Model Context Protocol (MCP) servers no projeto ETP Express, fornecendo ferramentas para desenvolvimento, testes e automação através de Claude Code.

**Data de Implementação:** 2025-11-17
**Versão:** 1.0
**Status:** Ativo em desenvolvimento

---

## 📦 MCPs Instalados

### 1. Sequential Thinking MCP
**Propósito:** Resolução estruturada de problemas complexos
**GitHub:** `modelcontextprotocol/servers/tree/main/src/sequentialthinking`
**Licença:** MIT (Open Source)
**Custo:** Gratuito

#### Features
- Pensamento passo-a-passo estruturado
- Revisão e ajuste dinâmico de abordagem
- Exploração de caminhos alternativos
- Documentação de processo de decisão

#### Instalação
```json
"sequential-thinking": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```

#### Casos de Uso no ETP Express
- Debugging de issues complexas (M3 #85, #86, #87)
- Planejamento de features grandes (M5)
- Análise de trade-offs técnicos
- Otimização de performance (M4 #88-91)
- Documentação de decisões de arquitetura

#### Skill Associada
- `.claude/skills/sequential-thinking.md`

---

### 2. Semgrep MCP
**Propósito:** Análise estática de código e detecção de vulnerabilidades
**GitHub:** `semgrep/mcp`
**Licença:** MIT (Open Source)
**Custo:** Gratuito (cloud features opcionais)

#### Features
- Security scanning automatizado
- Detecção de anti-patterns TypeScript
- Custom rules para padrões do projeto
- AST analysis
- OWASP Top 10 vulnerability detection

#### Instalação
```json
"semgrep": {
  "command": "uvx",
  "args": ["semgrep-mcp"],
  "env": {
    "SEMGREP_APP_TOKEN": "OPCIONAL"
  }
}
```

#### Pré-requisitos
- Python 3.8+ (para instalação local)
- `uvx` ou `pipx` para gerenciar pacotes
- Opcional: Semgrep App Token (se usar cloud features)

#### Casos de Uso no ETP Express
- **Milestone 3 - Quality & Security (Issues #47, #86, #87)**
  - Code review automatizado de segurança
  - Detecção de dados sensíveis expostos
  - Validação de LGPD compliance

- **Milestone 4 - Refactoring (Issues #44, #50)**
  - Identificação de `any` type usage
  - Anti-pattern detection
  - Code quality improvements

- **Milestone 6 - Audit Trimestral (Issue #40)**
  - Auditoria de segurança
  - Compliance validation
  - Trend analysis de vulnerabilidades

#### Skill Associada
- `.claude/skills/semgrep-security.md`

#### Configuração Recomendada
Criar `.semgrep.yml` na raiz do projeto:
```yaml
rules:
  # Security
  - id: no-hardcoded-secrets
    pattern: '(password|secret|token|api_key) = "..."'
    message: "Hardcoded secrets detected"
    severity: CRITICAL

  # TypeScript
  - id: no-any-type
    pattern: ": any"
    message: "Avoid using 'any' type"
    severity: WARNING

  # LGPD
  - id: unencrypted-pii
    patterns:
      - pattern: 'user.$FIELD'
        pattern-not: 'encrypted'
    message: "Sensitive data not encrypted"
    severity: HIGH
```

---

### 3. Playwright MCP (Microsoft)
**Propósito:** Automação de browser e testes E2E
**GitHub:** `microsoft/playwright-mcp`
**Licença:** Apache-2.0 (Open Source)
**Custo:** Gratuito

#### Features
- Automação baseada em acessibilidade
- Multi-browser support (Chromium, Firefox, WebKit)
- Device emulation
- Screenshot/PDF generation
- Persistent session management

#### Instalação
```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

#### Pré-requisitos
- Node.js 16+
- Browsers instalados: `npx playwright install`
- `@playwright/test` package (para testes locais)

#### Casos de Uso no ETP Express
- **Milestone 5 - E2E Testing (Issues #22, #23, #24)**
  - Testes de features críticas
  - Login flow validation
  - ETP creation/editing workflows
  - AI generation testing
  - PDF export validation

- **Desenvolvimento de Features**
  - Validação de responsividade
  - Testes de acessibilidade (WCAG)
  - Cross-browser validation

- **QA Automation**
  - Regression testing
  - User journey validation
  - Multi-device testing

#### Skill Associada
- `.claude/skills/playwright-testing.md`

#### Estrutura de Testes
```
frontend/tests/e2e/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── password-reset.spec.ts
├── etp/
│   ├── create-etp.spec.ts
│   ├── edit-etp.spec.ts
│   ├── generate-sections.spec.ts
│   └── similar-contracts.spec.ts
├── fixtures/
│   ├── auth.ts
│   ├── test-data.ts
│   └── pages.ts
└── utils/
    ├── assertions.ts
    └── helpers.ts
```

---

### 4. Browser MCP
**Propósito:** Automação do navegador do usuário via extensão Chrome
**Website:** `browsermcp.io`
**Licença:** Gratuito
**Custo:** Gratuito

#### Features
- Automação do browser existente do usuário
- Mantém contexto de sessão (cookies, login)
- Data extraction de sites dinâmicos
- Interatividade com browser visível

#### Instalação
```json
"browser": {
  "command": "npx",
  "args": ["@browsermcp/mcp"]
}
```

#### Pré-requisitos
- Chrome/Chromium instalado
- Extensão "Browser MCP" instalada do Chrome Web Store
- Node.js 16+

#### Casos de Uso no ETP Express
- **Automação de Tarefas Repetitivas**
  - Preenchimento de formulários
  - Data entry em lote
  - Processamento multi-step

- **Data Integration**
  - Scraping de dados de fontes externas
  - Extração estruturada de informações
  - Pre-filling de formulários com dados extraídos

- **Testes Interativos**
  - Testes com contexto real de usuário
  - Validação com dados e sessão reais
  - Monitoramento de workflows

#### Skill Associada
- `.claude/skills/browser-automation.md`

---

## 🔧 Configuração

### Arquivo: claude_desktop_config.json

Criar ou atualizar arquivo de configuração (exemplo fornecido em `claude_desktop_config.example.json`):

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "semgrep": {
      "command": "uvx",
      "args": ["semgrep-mcp"],
      "env": {
        "SEMGREP_APP_TOKEN": "OPCIONAL - Apenas necessário para Semgrep Cloud features"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "browser": {
      "command": "npx",
      "args": ["@browsermcp/mcp"]
    }
  }
}
```

### Passos de Configuração

1. **Fazer Copy do Arquivo Exemplo**
   ```bash
   cp claude_desktop_config.example.json claude_desktop_config.json
   ```

2. **Instalar Dependências**
   ```bash
   # Sequential Thinking (via npx - sem instalação necessária)

   # Semgrep
   pip install semgrep  # Ou uvx instala automaticamente

   # Playwright
   npm install --save-dev @playwright/test
   npx playwright install

   # Browser MCP
   # Instalar extensão do Chrome Web Store
   ```

3. **Configurar MCP Servers**
   - Editar `claude_desktop_config.json` conforme acima
   - Adicionar variáveis de ambiente necessárias

4. **Testar Conectividade**
   - Executar: `npx -y @modelcontextprotocol/server-sequential-thinking`
   - Verificar output para confirmar server rodando

5. **Reiniciar Claude Code**
   - Fechiar e reabrir para carregar nova configuração

---

## 📋 Skills de Uso

Cada MCP possui uma skill associada em `.claude/skills/` documentando quando e como usar:

| MCP | Skill | Quando Usar |
|-----|-------|-----------|
| Sequential Thinking | `sequential-thinking.md` | Problemas complexos, debugging, planejamento |
| Semgrep | `semgrep-security.md` | Code review, security audit, quality validation |
| Playwright | `playwright-testing.md` | E2E tests, automação web, validação de workflows |
| Browser | `browser-automation.md` | Automação do browser do usuário, data extraction |

### Como Usar Skills

As skills são acionadas automaticamente baseado em contexto:

```
# Exemplo: Quando debugando issue complexa
"Estou tendo dificuldade para entender por que a query está lenta.
Preciso analisar a estrutura do query, indexes e plano de execução."

→ Claude detecta problema complexo e sugere sequential_thinking
```

---

## 🎯 Casos de Uso por Milestone

### Milestone 3 - Quality & Security
**Issues Relacionadas:** #47, #85, #86, #87, #100

**MCPs Recomendados:**
- ✅ **Semgrep**: Security scanning e LGPD validation
- ✅ **Sequential Thinking**: Análise de compliance complex

**Workflow:**
```
1. Use semgrep_security para identificar issues
2. Use sequential_thinking para analisar impacto
3. Implementar fixes
4. Use semgrep novamente para validar
```

### Milestone 4 - Refactoring & Performance
**Issues Relacionadas:** #44, #50, #88, #89, #90, #91

**MCPs Recomendados:**
- ✅ **Sequential Thinking**: Planejamento de refactoring, análise de trade-offs
- ✅ **Semgrep**: Identificação de anti-patterns
- ✅ **Playwright**: Validar que refactoring não quebra features

**Workflow:**
```
1. Use sequential_thinking para planejar refactoring
2. Use semgrep para identificar áreas problemáticas
3. Implementar mudanças
4. Use playwright para validar funcionalidade
```

### Milestone 5 - E2E Testing & Documentation
**Issues Relacionadas:** #22, #23, #24, #40

**MCPs Recomendados:**
- ✅ **Playwright**: Criação de testes E2E
- ✅ **Browser**: Automação de workflows para documentação

**Workflow:**
```
1. Use playwright para escrever testes de feature
2. Use browser para automação de workflow real
3. Documentar processo e critérios de aceição
```

### Milestone 6 - Audit Trimestral
**Issues Relacionadas:** #40, #41, #42

**MCPs Recomendados:**
- ✅ **Semgrep**: Auditoria de segurança completa
- ✅ **Sequential Thinking**: Análise de findings e planejamento de remediation

**Workflow:**
```
1. Use semgrep para scan completo de codebase
2. Use sequential_thinking para analisar tendências
3. Planejar e documentar remediation
4. Validar fixes com semgrep novamente
```

---

## 🚀 Boas Práticas

### ✅ Fazer
- Usar MCP apropriado para contexto (não forçar)
- Documentar quando MCP foi usado em código/issues
- Combinar múltiplos MCPs quando relevante
- Revisar outputs de MCPs antes de aceitar
- Manter skills atualizadas conforme aprendizado

### ❌ Evitar
- Usar Sequential Thinking para problemas triviais
- Confiar 100% em Semgrep (combinar com review humano)
- Depender apenas de Playwright para QA (testes manuais também)
- Deixar automações de Browser rodando indefinidamente
- Ignorar sugestões de MCPs

---

## 📊 Comparação com Abordagens Alternativas

### Antes (sem MCPs)
```
- Debugging manual: 2-3 horas por issue complexa
- Code review: 30 min por PR (sem automated checks)
- Testes E2E: 10 testes escritos manualmente
- Automação: Nenhuma, tarefas repetitivas manuais
```

### Depois (com MCPs)
```
- Debugging: 30-45 min com sequential thinking structured approach
- Code review: 10-15 min + semgrep automated checks
- Testes E2E: 50+ testes com playwright automation
- Automação: Workflows automatizados via browser MCP
```

**ROI Esperado:** +60-70% de produtividade em desenvolvimento

---

## 🔗 Integração com Ferramentas Existentes

### Com Git Workflow
```bash
# Pre-commit hook para semgrep
npx husky install
# Add hook para rodar semgrep antes de commit
```

### Com CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Run Semgrep
  run: semgrep --config=p/security-audit backend/ frontend/

- name: Run Playwright Tests
  run: npx playwright test

- name: Upload Test Reports
  if: always()
  uses: actions/upload-artifact@v2
```

### Com Code Review (`/code-review`)
```
1. Escrever código
2. Executar /code-review para validação
3. Usar semgrep para security check
4. Submeter PR com todos os checks passing
```

### Com TDD (`/tdd-cycle`)
```
1. Escrever teste Playwright (RED)
2. Implementar feature (GREEN)
3. Refactor com validação semgrep (REFACTOR)
4. Validar testes ainda passam
```

---

## 🆘 Troubleshooting

### Sequential Thinking não funciona
```
✓ Verificar que npx está disponível: npx --version
✓ Tentar executar manualmente: npx -y @modelcontextprotocol/server-sequential-thinking
✓ Verificar logs de erro em claude_desktop_config.json
```

### Semgrep não detecta issues
```
✓ Verificar que .semgrep.yml existe na raiz do projeto
✓ Tentar scan manual: uvx semgrep --config=.semgrep.yml .
✓ Verificar se rules estão válidas em YAML
✓ Aumentar verbosidade: uvx semgrep --json --config=.semgrep.yml .
```

### Playwright browsers não instalados
```
✓ Instalar: npx playwright install
✓ Verificar: npx playwright install --with-deps
✓ Listar disponíveis: npx playwright install --list
```

### Browser MCP não conecta
```
✓ Verificar que extensão Chrome está instalada
✓ Verificar que MCP server está rodando
✓ Reiniciar Chrome completamente
✓ Verificar logs em Chrome DevTools → Extensions
```

---

## 📚 Recursos Adicionais

### Documentação Oficial
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Sequential Thinking GitHub](https://github.com/modelcontextprotocol/servers)
- [Semgrep Documentation](https://semgrep.dev/docs/)
- [Playwright Docs](https://playwright.dev/)
- [Browser MCP Docs](https://browsermcp.io/)

### Guias Internos
- Skill: `.claude/skills/sequential-thinking.md`
- Skill: `.claude/skills/semgrep-security.md`
- Skill: `.claude/skills/playwright-testing.md`
- Skill: `.claude/skills/browser-automation.md`

### Relacionado ao Projeto
- ROADMAP.md - Roadmap do projeto
- ARCHITECTURE.md - Arquitetura do ETP Express
- docs/INFRASTRUCTURE.md - Setup de infraestrutura
- docs/DEPLOYMENT.md - Estratégia de deploy

---

## 📝 Histórico de Mudanças

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-11-17 | 1.0 | Integração inicial de 4 MCPs |

---

## 👥 Contribuindo

Para adicionar novos MCPs ou melhorar integração existente:

1. Pesquisar MCP candidato
2. Documentar caso de uso no projeto
3. Implementar configuração em `claude_desktop_config.json`
4. Criar skill em `.claude/skills/`
5. Atualizar este documento
6. Testar integração
7. Submeter PR com documentação

---

**Última Atualização:** 2025-11-17
**Mantido por:** ETP Express Development Team
