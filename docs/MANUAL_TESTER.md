# Manual do Tester - ETP Express

**Versao:** 1.0
**Data:** Dezembro 2025
**Publico-alvo:** Gestores de Qualidade, Testadores e Equipe de QA

---

## Sumario

1. [Introducao](#1-introducao)
2. [Ambientes Disponiveis](#2-ambientes-disponiveis)
3. [Credenciais de Teste](#3-credenciais-de-teste)
4. [Procedimentos de Teste por Funcionalidade](#4-procedimentos-de-teste-por-funcionalidade)
5. [Checklist de Smoke Test Manual](#5-checklist-de-smoke-test-manual)
6. [Como Reportar Bugs](#6-como-reportar-bugs)
7. [Ferramentas Recomendadas](#7-ferramentas-recomendadas)
8. [Glossario](#8-glossario)

---

## 1. Introducao

Este manual consolida os procedimentos de teste para gestores e testadores do ETP Express. Ele fornece:

- Credenciais para acesso aos ambientes de teste
- Procedimentos padronizados para cada funcionalidade
- Checklist de smoke test para validacao rapida
- Processo estruturado para reportar bugs

### Responsabilidades do Tester

- Executar testes manuais conforme procedimentos descritos
- Documentar bugs encontrados com evidencias
- Validar correcoes antes do fechamento de issues
- Manter comunicacao com equipe de desenvolvimento

---

## 2. Ambientes Disponiveis

### 2.1 Producao

| Servico  | URL                                                     |
| -------- | ------------------------------------------------------- |
| Frontend | https://etp-express-frontend-production.up.railway.app  |
| Backend  | https://etp-express-backend-production.up.railway.app   |
| API Docs | https://etp-express-backend-production.up.railway.app/api/docs |
| Health   | https://etp-express-backend-production.up.railway.app/api/health |

**Uso:** Ambiente real de producao. Testar apenas funcionalidades criticas pos-deploy.

### 2.2 Local (Desenvolvimento)

| Servico  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3001        |
| API Docs | http://localhost:3001/api/docs |
| Health   | http://localhost:3001/api/health |

**Uso:** Testes de desenvolvimento e validacao de novas features.

### 2.3 Verificando Status dos Ambientes

```bash
# Producao - Backend Health
curl -s https://etp-express-backend-production.up.railway.app/api/health | jq

# Producao - Frontend
curl -s -o /dev/null -w "%{http_code}" https://etp-express-frontend-production.up.railway.app

# Local - Backend Health
curl -s http://localhost:3001/api/health | jq
```

**Resposta esperada do health check:**
```json
{
  "status": "ok",
  "database": "up",
  "redis": "up"
}
```

---

## 3. Credenciais de Teste

### 3.1 Usuario Demonstracao (Recomendado para Testes)

| Campo | Valor                     |
| ----- | ------------------------- |
| Email | demoetp@confenge.com.br   |
| Senha | Ver `backend/src/scripts/seed-admin.ts` linha 59 |
| Role  | DEMO                      |
| Org   | Demonstracao ETP Express  |

> **Seguranca:** Senhas nao sao documentadas em texto claro. Consulte o script de seed para obter a senha atual.

### 3.2 Obtendo Credenciais Atualizadas

```bash
# No diretorio backend/, execute:
grep -A 5 "DEMO_DATA" src/scripts/seed-admin.ts | grep password
```

### 3.3 Criando Usuario de Teste Local

Para ambiente local, execute o seed script:

```bash
cd backend
npm run seed:admin
```

Isso criara:
- Usuario admin (SYSTEM_ADMIN)
- Usuario demo (DEMO)
- Organizacoes correspondentes
- Dominios autorizados

### 3.4 Roles Disponiveis

| Role         | Permissoes                                      |
| ------------ | ----------------------------------------------- |
| SYSTEM_ADMIN | Acesso total, gestao de organizacoes            |
| DOMAIN_ADMIN | Gestao de usuarios do proprio dominio           |
| USER         | Criar e gerenciar ETPs proprios                 |
| DEMO         | Acesso limitado para demonstracoes              |

---

## 4. Procedimentos de Teste por Funcionalidade

### 4.1 Autenticacao

#### Login

| Passo | Acao                                   | Resultado Esperado               |
| ----- | -------------------------------------- | -------------------------------- |
| 1     | Acessar pagina de login                | Formulario exibido               |
| 2     | Inserir email valido                   | Campo aceita input               |
| 3     | Inserir senha valida                   | Campo aceita input (mascarado)   |
| 4     | Clicar "Entrar"                        | Loading exibido                  |
| 5     | Aguardar redirect                      | Dashboard exibido                |
| 6     | Verificar token em localStorage        | Token JWT presente               |

#### Logout

| Passo | Acao                     | Resultado Esperado           |
| ----- | ------------------------ | ---------------------------- |
| 1     | Clicar menu usuario      | Dropdown exibido             |
| 2     | Clicar "Sair"            | Redirect para login          |
| 3     | Verificar localStorage   | Token removido               |
| 4     | Tentar acessar /dashboard| Redirect para login          |

#### Recuperacao de Senha

| Passo | Acao                           | Resultado Esperado              |
| ----- | ------------------------------ | ------------------------------- |
| 1     | Clicar "Esqueceu sua senha?"   | Formulario de recuperacao       |
| 2     | Inserir email cadastrado       | Campo aceita input              |
| 3     | Clicar "Enviar"                | Mensagem de sucesso             |
| 4     | Verificar email                | Link de reset recebido          |

### 4.2 CRUD de ETPs

#### Criar ETP

| Passo | Acao                        | Resultado Esperado                |
| ----- | --------------------------- | --------------------------------- |
| 1     | Clicar "Novo ETP"           | Modal/pagina de criacao           |
| 2     | Preencher titulo            | Campo aceita input                |
| 3     | Preencher descricao         | Campo aceita input                |
| 4     | Clicar "Criar"              | ETP criado, redirect para editor  |
| 5     | Verificar listagem          | Novo ETP aparece na lista         |

#### Editar ETP

| Passo | Acao                        | Resultado Esperado                |
| ----- | --------------------------- | --------------------------------- |
| 1     | Clicar no ETP existente     | Editor aberto                     |
| 2     | Modificar titulo            | Campo editavel                    |
| 3     | Clicar "Salvar"             | Alerta de sucesso                 |
| 4     | Recarregar pagina           | Alteracoes persistidas            |

#### Deletar ETP

| Passo | Acao                        | Resultado Esperado                |
| ----- | --------------------------- | --------------------------------- |
| 1     | Clicar icone de delete      | Modal de confirmacao              |
| 2     | Confirmar exclusao          | ETP removido da lista             |
| 3     | Verificar listagem          | ETP nao aparece mais              |

### 4.3 Geracao com IA

| Passo | Acao                           | Resultado Esperado              |
| ----- | ------------------------------ | ------------------------------- |
| 1     | Abrir secao do ETP             | Editor de secao                 |
| 2     | Clicar "Gerar com IA"          | Loading/spinner exibido         |
| 3     | Aguardar geracao (<30s sync)   | Conteudo gerado exibido         |
| 4     | Revisar conteudo               | Texto coerente com contexto     |
| 5     | Clicar "Aceitar" ou "Editar"   | Secao salva/editavel            |

**Tempos de Referencia:**
- Geracao sincrona: < 30 segundos
- Geracao assincrona (BullMQ): < 60 segundos
- Timeout maximo: 120 segundos

### 4.4 Exportacao PDF/DOCX

#### Exportar PDF

| Passo | Acao                    | Resultado Esperado                   |
| ----- | ----------------------- | ------------------------------------ |
| 1     | Clicar "Exportar PDF"   | Loading exibido                      |
| 2     | Aguardar geracao        | Download iniciado                    |
| 3     | Abrir arquivo           | PDF valido, aberto sem erros         |
| 4     | Verificar conteudo      | Todas secoes preenchidas presentes   |
| 5     | Verificar tamanho       | Arquivo > 10KB                       |

#### Exportar DOCX

| Passo | Acao                    | Resultado Esperado                   |
| ----- | ----------------------- | ------------------------------------ |
| 1     | Clicar "Exportar DOCX"  | Loading exibido                      |
| 2     | Aguardar geracao        | Download iniciado                    |
| 3     | Abrir arquivo           | DOCX valido, aberto sem erros        |
| 4     | Verificar formatacao    | Estilos aplicados corretamente       |
| 5     | Verificar tamanho       | Arquivo > 10KB                       |

### 4.5 Import & Analysis

| Passo | Acao                          | Resultado Esperado               |
| ----- | ----------------------------- | -------------------------------- |
| 1     | Acessar "Import & Analysis"   | Pagina de upload                 |
| 2     | Fazer upload de PDF/DOCX      | Arquivo aceito                   |
| 3     | Clicar "Analisar"             | Analise iniciada                 |
| 4     | Aguardar resultado            | Score e feedback exibidos        |
| 5     | Clicar "Converter para ETP"   | ETP criado com conteudo importado|

### 4.6 APIs Governamentais

| Passo | Acao                            | Resultado Esperado             |
| ----- | ------------------------------- | ------------------------------ |
| 1     | Gerar secao com pesquisa gov    | Busca em PNCP, SINAPI, SICRO   |
| 2     | Verificar resultados            | Dados estruturados retornados  |
| 3     | Validar fontes                  | Referencias oficiais citadas   |

**Endpoints de Teste:**
```bash
curl "https://etp-express-backend-production.up.railway.app/api/gov-search?query=obras"
```

---

## 5. Checklist de Smoke Test Manual

Execute este checklist apos cada deploy para validacao rapida do sistema.

### Pre-requisitos

- [ ] Acesso a credenciais de teste
- [ ] Navegador atualizado (Chrome, Firefox, Edge)
- [ ] Conexao com internet estavel

### 5.1 Backend

- [ ] Health check retorna 200 OK
- [ ] `status: "ok"` no JSON
- [ ] `database: "up"`
- [ ] `redis: "up"`

### 5.2 Frontend

- [ ] Pagina de login carrega < 3s
- [ ] Zero erros no console (F12)
- [ ] Logo CONFENGE visivel
- [ ] Fontes carregadas corretamente

### 5.3 Autenticacao

- [ ] Login com credenciais validas funciona
- [ ] Redirect para dashboard apos login
- [ ] Token armazenado em localStorage
- [ ] Rotas protegidas bloqueiam acesso sem login

### 5.4 CRUD ETP

- [ ] Criar ETP funciona
- [ ] Listar ETPs funciona
- [ ] Editar ETP funciona
- [ ] Deletar ETP funciona (com confirmacao)

### 5.5 Geracao IA

- [ ] Geracao de secao funciona
- [ ] Loading state exibido durante geracao
- [ ] Conteudo valido retornado
- [ ] Tempo < 30s (sync) ou < 60s (async)

### 5.6 Exportacao

- [ ] Exportar PDF funciona
- [ ] PDF abre sem erros
- [ ] Exportar DOCX funciona
- [ ] DOCX abre sem erros

### 5.7 Monitoramento

- [ ] Zero erros criticos no Sentry (ultimas 24h)
- [ ] Todos servicos Railway ONLINE
- [ ] Response time < 3s (P95)

### Resultado

- [ ] **PASS:** Todos os itens confirmados
- [ ] **FAIL:** Documentar falhas como bugs

**Executado em:** _______________
**Executado por:** _______________

---

## 6. Como Reportar Bugs

### 6.1 Onde Reportar

| Canal          | Uso                                    |
| -------------- | -------------------------------------- |
| GitHub Issues  | Bugs tecnicos, feature requests        |
| Email suporte  | suporte@confenge.com.br                |

### 6.2 Template de Bug Report

```markdown
## Descricao
[Descreva o bug de forma clara e concisa]

## Passos para Reproduzir
1. Acessar [URL]
2. Clicar em [elemento]
3. Preencher [campo]
4. Observar [comportamento]

## Comportamento Esperado
[O que deveria acontecer]

## Comportamento Atual
[O que realmente acontece]

## Evidencias
- Screenshot: [anexar]
- Video: [link]
- Console log: [copiar erros]

## Ambiente
- Navegador: [Chrome/Firefox/Edge] versao [X]
- SO: [Windows/Mac/Linux]
- Ambiente: [Producao/Local]
- Data/Hora: [quando ocorreu]

## Severidade
- [ ] P0 - Bloqueante (sistema inacessivel)
- [ ] P1 - Critico (funcionalidade principal quebrada)
- [ ] P2 - Importante (funcionalidade secundaria afetada)
- [ ] P3 - Menor (inconveniencia, workaround existe)
```

### 6.3 Informacoes Essenciais

**Sempre incluir:**

1. **Passos para reproduzir** - Sequencia exata de acoes
2. **Evidencia visual** - Screenshot ou video
3. **Console log** - Erros do navegador (F12 > Console)
4. **Network log** - Requests com falha (F12 > Network)
5. **Ambiente** - Producao ou Local, navegador, SO

### 6.4 Prioridades de Bug

| Prioridade | Criterio                                | SLA Resposta |
| ---------- | --------------------------------------- | ------------ |
| P0         | Sistema inacessivel, perda de dados     | 1 hora       |
| P1         | Funcionalidade core quebrada            | 4 horas      |
| P2         | Funcionalidade secundaria afetada       | 24 horas     |
| P3         | Inconveniencia menor, workaround existe | 72 horas     |

---

## 7. Ferramentas Recomendadas

### 7.1 Navegador

- **Chrome DevTools** - Inspecao, console, network
- **Firefox Developer Edition** - Testes de compatibilidade
- **Lighthouse** - Auditorias de performance e acessibilidade

### 7.2 Captura de Tela

- **ShareX** (Windows) - Screenshots e gravacao
- **Loom** - Gravacao de tela com audio
- **CleanShot X** (Mac) - Screenshots anotados

### 7.3 API Testing

- **Postman** - Testes de API REST
- **curl** - Testes via linha de comando
- **Swagger UI** - Documentacao interativa (/api/docs)

### 7.4 Inspecao de Banco

- **TablePlus** - Client PostgreSQL
- **pgAdmin** - Administracao PostgreSQL
- **DBeaver** - Client universal

---

## 8. Glossario

| Termo         | Definicao                                              |
| ------------- | ------------------------------------------------------ |
| ETP           | Estudo Tecnico Preliminar                              |
| Smoke Test    | Teste rapido de funcionalidades criticas               |
| PNCP          | Portal Nacional de Contratacoes Publicas               |
| SINAPI        | Sistema Nacional de Pesquisa de Custos                 |
| SICRO         | Sistema de Custos Referenciais de Obras                |
| BullMQ        | Sistema de filas para processamento assincrono         |
| JWT           | JSON Web Token (autenticacao)                          |
| CORS          | Cross-Origin Resource Sharing                          |
| P0/P1/P2/P3   | Niveis de prioridade de bugs                           |
| SLA           | Service Level Agreement (acordo de nivel de servico)   |

---

## Historico de Versoes

| Versao | Data      | Alteracoes                    |
| ------ | --------- | ----------------------------- |
| 1.0    | Dez/2025  | Versao inicial do manual      |

---

**ETP Express** - Manual do Tester

Contato: suporte@confenge.com.br
