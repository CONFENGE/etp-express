# Configuração de MCPs - ETP Express

## MCPs Instalados

Foram instalados 4 MCPs essenciais para o desenvolvimento do ETP Express:

### 1. PostgreSQL MCP **[CRÍTICO]**

**Função:** Acesso direto ao banco de dados PostgreSQL
**Benefícios:**

- Query direta ao banco sem precisar de clients externos
- Inspeção de schema e relacionamentos
- Debug de queries TypeORM
- Validação de migrations

**Configuração necessária:**

```json
"postgresql://user:password@localhost:5432/etp_express"
```

⚠️ **AÇÃO NECESSÁRIA:** Atualize com suas credenciais reais do PostgreSQL:

1. Abra: `C:\Users\tj_sa\AppData\Roaming\Claude\claude_desktop_config.json`
2. Substitua `user:password` pelas suas credenciais
3. Confirme o nome do banco (`etp_express`)

### 2. GitHub MCP **[ESSENCIAL]**

**Função:** Gerenciamento de issues, PRs e milestones
**Benefícios:**

- Criar/editar/fechar issues diretamente
- Gerenciar 98 issues organizadas em 6 milestones
- Criar PRs com templates
- Visualizar progresso dos milestones

⚠️ **AÇÃO NECESSÁRIA:** Configure seu GitHub Personal Access Token:

1. Crie um token em: https://github.com/settings/tokens/new
2. Permissões necessárias: `repo`, `read:org`, `workflow`
3. Abra: `C:\Users\tj_sa\AppData\Roaming\Claude\claude_desktop_config.json`
4. Substitua `YOUR_TOKEN_HERE` pelo seu token

### 3. Filesystem MCP **[ÚTIL]**

**Função:** Navegação eficiente no codebase
**Benefícios:**

- Exploração rápida de estrutura de pastas
- Busca de arquivos por padrões
- Melhor contexto de organização do código

✅ **Pré-configurado** com o caminho do projeto.

### 4. Memory MCP **[ÚTIL]**

**Função:** Memória persistente entre sessões
**Benefícios:**

- Lembrar de decisões arquiteturais
- Contexto de conversas anteriores
- Histórico de mudanças e razões

✅ **Pronto para uso** - sem configuração necessária.

---

## Como Ativar os MCPs

1. **Feche o Claude Code** completamente
2. **Configure as credenciais** (PostgreSQL + GitHub Token)
3. **Reabra o Claude Code**
4. Os MCPs serão carregados automaticamente

Você verá indicadores dos MCPs ativos na interface.

---

## Testando os MCPs

Após reiniciar, teste cada MCP:

### PostgreSQL MCP

```
Liste todas as tabelas do banco etp_express
```

### GitHub MCP

```
Mostre as issues do milestone M1
```

### Filesystem MCP

```
Liste todos os arquivos .ts no diretório src/
```

### Memory MCP

```
Salve na memória: "Arquitetura do projeto usa NestJS + TypeORM + PostgreSQL"
```

---

## 📋 MCPs Opcionais (Considerar Depois)

### Git MCP

- **Quando instalar:** Se precisar de operações git mais avançadas
- **Por enquanto:** Bash + git CLI já funcionam bem

### Sequential Thinking MCP

- **Quando instalar:** Para debugging muito complexo
- **Por enquanto:** Para M1 (testes) não é necessário

### Brave Search MCP

- **Quando instalar:** Para pesquisar docs externas (OpenAI, NestJS, etc)
- **Por enquanto:** WebSearch já funciona

---

## 🔧 Troubleshooting

### MCP não aparece

1. Verifique o arquivo de configuração está correto
2. Reinicie completamente o Claude Code
3. Verifique logs em: `C:\Users\tj_sa\AppData\Roaming\Claude\logs`

### PostgreSQL MCP falha

- Verifique se PostgreSQL está rodando
- Confirme credenciais e nome do banco
- Teste conexão com: `psql -U user -d etp_express`

### GitHub MCP falha

- Verifique se o token tem as permissões corretas
- Token deve ter escopo `repo`
- Teste com: `gh auth status`

---

## 📚 Recursos

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Available MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Claude Code MCP Guide](https://docs.claude.com/claude-code/mcp)

---

**Criado em:** 2025-11-12
**Arquivo de configuração:** `C:\Users\tj_sa\AppData\Roaming\Claude\claude_desktop_config.json`
