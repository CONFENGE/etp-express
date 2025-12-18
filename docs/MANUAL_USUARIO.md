# Manual do Usuário - ETP Express

**Versão:** 1.0
**Data:** Janeiro 2026
**Plataforma:** https://confenge.com.br/etpexpress

---

## Sumário

1. [Introdução](#1-introdução)
2. [Primeiros Passos](#2-primeiros-passos)
   - [Criando sua Conta](#21-criando-sua-conta)
   - [Fazendo Login](#22-fazendo-login)
   - [Recuperação de Senha](#23-recuperação-de-senha)
3. [Dashboard](#3-dashboard)
4. [Criando um Novo ETP](#4-criando-um-novo-etp)
   - [Informações Básicas](#41-informações-básicas)
   - [Seções do ETP](#42-seções-do-etp)
5. [Geração de Conteúdo com IA](#5-geração-de-conteúdo-com-ia)
   - [Como Funciona](#51-como-funciona)
   - [Gerando uma Seção](#52-gerando-uma-seção)
   - [Dicas para Melhores Resultados](#53-dicas-para-melhores-resultados)
6. [Exportação de Documentos](#6-exportação-de-documentos)
   - [Exportar para PDF](#61-exportar-para-pdf)
   - [Exportar para DOCX](#62-exportar-para-docx)
7. [Import & Analysis](#7-import--analysis)
   - [Importando Documentos](#71-importando-documentos)
   - [Análise de Qualidade](#72-análise-de-qualidade)
   - [Convertendo para ETP](#73-convertendo-para-etp)
8. [Gestão de Usuários](#8-gestão-de-usuários)
   - [Criando Usuários](#81-criando-usuários)
   - [Editando Usuários](#82-editando-usuários)
   - [Gerenciando Acessos](#83-gerenciando-acessos)
9. [Perguntas Frequentes (FAQ)](#9-perguntas-frequentes-faq)
10. [Suporte](#10-suporte)

---

## 1. Introdução

### O que é o ETP Express?

O **ETP Express** é uma plataforma digital desenvolvida para auxiliar órgãos públicos na elaboração de **Estudos Técnicos Preliminares (ETP)** em conformidade com a **Lei 14.133/2021** (Nova Lei de Licitações e Contratos Administrativos).

### Principais Funcionalidades

- **Criação Assistida por IA**: Geração automática de conteúdo para cada seção do ETP
- **Conformidade Legal**: Estrutura baseada na Lei 14.133/2021
- **Exportação Profissional**: Documentos em PDF e DOCX prontos para uso
- **Análise de Documentos**: Importação e avaliação de ETPs existentes
- **Gestão Multi-usuário**: Controle de acesso por organização
- **Pesquisa Governamental**: Integração com PNCP, Compras.gov.br, SINAPI e SICRO

### Requisitos do Sistema

- Navegador atualizado (Chrome, Firefox, Edge ou Safari)
- Conexão com internet
- Email institucional do órgão autorizado

---

## 2. Primeiros Passos

### 2.1 Criando sua Conta

Para criar uma conta no ETP Express:

1. Acesse **https://confenge.com.br/etpexpress**
2. Clique em **"Cadastre-se"**
3. Preencha os campos obrigatórios:
   - **Nome completo**: Seu nome como servidor
   - **Email**: Use seu email institucional (ex: nome@orgao.gov.br)
   - **Senha**: Mínimo de 6 caracteres
   - **Confirmar Senha**: Repita a senha

4. Aceite os termos obrigatórios:
   - ☑️ Termos de Uso e Política de Privacidade (LGPD)
   - ☑️ Transferência Internacional de Dados

5. Clique em **"Cadastrar"**

> **Importante**: Apenas emails de domínios autorizados podem se cadastrar. Se seu órgão ainda não está cadastrado, entre em contato com o suporte.

### 2.2 Fazendo Login

1. Acesse **https://confenge.com.br/etpexpress**
2. Digite seu **email institucional**
3. Digite sua **senha**
4. Clique em **"Entrar"**

> **Dica**: Você pode clicar no ícone 👁️ para visualizar a senha enquanto digita.

### 2.3 Recuperação de Senha

Caso esqueça sua senha:

1. Na tela de login, clique em **"Esqueceu sua senha?"**
2. Digite seu email institucional
3. Clique em **"Enviar link de recuperação"**
4. Acesse seu email e clique no link recebido
5. Defina uma nova senha

---

## 3. Dashboard

Após fazer login, você será direcionado ao **Dashboard**, que apresenta:

### Visão Geral

- **Total de ETPs**: Quantidade de estudos criados
- **Em Progresso**: ETPs ainda em elaboração
- **Concluídos**: ETPs finalizados (100%)

### ETPs Recentes

Lista dos últimos 5 ETPs acessados, com:

- Título do ETP
- Status atual (Rascunho, Em Progresso, Concluído)
- Percentual de conclusão
- Data da última atualização

### Ações Rápidas

- **Novo ETP**: Criar um novo Estudo Técnico Preliminar
- **Meus ETPs**: Acessar lista completa de ETPs

---

## 4. Criando um Novo ETP

### 4.1 Informações Básicas

1. No Dashboard, clique em **"Novo ETP"**
2. Preencha as informações iniciais:
   - **Título**: Nome descritivo do ETP (ex: "Aquisição de Equipamentos de Informática")
   - **Descrição** (opcional): Breve resumo do objeto

3. O sistema criará automaticamente o ETP com todas as 13 seções

### 4.2 Seções do ETP

O ETP Express segue a estrutura definida pela Lei 14.133/2021, com as seguintes seções:

| Seção | Título                          | Obrigatória |
| ----- | ------------------------------- | ----------- |
| I     | Necessidade da Contratação      | ✅ Sim      |
| II    | Objetivos da Contratação        | Não         |
| III   | Descrição da Solução            | Não         |
| IV    | Requisitos da Contratação       | ✅ Sim      |
| V     | Levantamento de Mercado         | Não         |
| VI    | Estimativa de Preços            | ✅ Sim      |
| VII   | Justificativa para Parcelamento | Não         |
| VIII  | Adequação Orçamentária          | ✅ Sim      |
| IX    | Resultados Pretendidos          | Não         |
| X     | Providências a serem Adotadas   | Não         |
| XI    | Possíveis Impactos Ambientais   | Não         |
| XII   | Declaração de Viabilidade       | Não         |
| XIII  | Contratações Correlatas         | ✅ Sim      |

### Navegando entre Seções

- Use as **abas numeradas** (1 a 13) na parte superior do editor
- Ou use o **painel lateral** com a lista completa de seções
- Seções preenchidas são indicadas com ✅

### Salvando Alterações

- Clique em **"Salvar"** após editar cada seção
- O sistema exibe um alerta caso tente sair sem salvar
- O progresso é atualizado automaticamente

---

## 5. Geração de Conteúdo com IA

### 5.1 Como Funciona

O ETP Express utiliza **Inteligência Artificial** para auxiliar na redação das seções do ETP:

1. A IA pesquisa informações em **fontes governamentais oficiais**:
   - Portal Nacional de Contratações Públicas (PNCP)
   - Compras.gov.br (SIASG)
   - Tabelas SINAPI e SICRO (preços de referência)

2. Gera textos em **conformidade com a Lei 14.133/2021**

3. O conteúdo é uma **sugestão** que deve ser revisada e adaptada

### 5.2 Gerando uma Seção

1. Navegue até a seção desejada
2. Clique no botão **"Gerar com IA"** (ícone de varinha mágica ✨)
3. Aguarde o processamento (indicador de progresso será exibido)
4. Revise o conteúdo gerado
5. Edite conforme necessário
6. Clique em **"Salvar"**

> **Importante**: A geração pode levar alguns segundos. Você verá uma barra de progresso indicando o status.

### 5.3 Dicas para Melhores Resultados

Para obter conteúdo mais preciso:

- **Preencha o título do ETP** de forma descritiva
- **Complete as seções anteriores** antes de gerar as seguintes
- **Forneça contexto** na descrição do ETP
- **Revise sempre** o conteúdo gerado
- **Adapte à realidade** do seu órgão

> **Aviso Legal**: O conteúdo gerado por IA é uma sugestão. A responsabilidade final pelo documento é do servidor responsável pela elaboração do ETP.

---

## 6. Exportação de Documentos

Após concluir seu ETP, você pode exportá-lo em dois formatos:

### 6.1 Exportar para PDF

1. Abra o ETP desejado
2. Clique no botão **"Exportar PDF"** (ícone de documento)
3. Aguarde a geração (barra de progresso será exibida)
4. O download iniciará automaticamente

O PDF gerado inclui:

- Cabeçalho com identificação do documento
- Todas as seções preenchidas
- Formatação profissional
- Numeração de páginas

### 6.2 Exportar para DOCX

1. Abra o ETP desejado
2. Clique no botão **"Exportar DOCX"** (ícone de Word)
3. Aguarde a geração
4. O download iniciará automaticamente

O arquivo DOCX permite:

- Edição posterior no Microsoft Word
- Ajustes de formatação
- Adição de assinaturas
- Impressão personalizada

> **Dica**: Use o formato DOCX se precisar fazer ajustes finais antes da publicação oficial.

### Cancelando uma Exportação

Se necessário, você pode cancelar uma exportação em andamento clicando no botão **"Cancelar"** que aparece durante o processamento.

---

## 7. Import & Analysis

O módulo de **Import & Analysis** permite importar e analisar ETPs existentes.

### 7.1 Importando Documentos

1. No menu lateral, clique em **"Import & Analysis"**
2. Arraste um arquivo ou clique para selecionar
3. Formatos aceitos: **PDF** ou **DOCX**
4. Clique em **"Analisar Documento"**

### 7.2 Análise de Qualidade

O sistema avalia o documento em três dimensões:

| Dimensão                       | O que avalia                |
| ------------------------------ | --------------------------- |
| **Conformidade Legal**         | Aderência à Lei 14.133/2021 |
| **Clareza e Legibilidade**     | Qualidade da redação        |
| **Qualidade da Fundamentação** | Embasamento técnico         |

Resultados apresentados:

- **Pontuação Geral** (0-100)
- **Veredito**: Aprovado, Necessita Revisão ou Reprovado
- **Issues encontradas**: Críticas, Importantes e Sugestões

### 7.3 Convertendo para ETP

Após a análise, você pode converter o documento para o sistema:

1. Revise os resultados da análise
2. Clique em **"Converter para ETP"**
3. O sistema criará um novo ETP com o conteúdo importado
4. Você será redirecionado para o editor

> **Benefício**: Permite continuar editando ETPs criados fora do sistema ou migrar documentos antigos.

---

## 8. Gestão de Usuários

> **Nota**: Esta funcionalidade está disponível apenas para usuários com perfil de **Gestor de Domínio**.

### 8.1 Criando Usuários

1. Acesse **"Gerenciamento" > "Usuários"**
2. Clique em **"Novo Usuário"**
3. Preencha os dados:
   - **Nome**: Nome completo do usuário
   - **Email**: Deve ser do mesmo domínio do órgão
   - **Cargo** (opcional): Função no órgão

4. Clique em **"Criar"**
5. O usuário receberá um email com instruções de acesso

### 8.2 Editando Usuários

1. Na lista de usuários, localize o usuário desejado
2. Clique no ícone de **edição** (lápis)
3. Altere os campos necessários
4. Clique em **"Salvar"**

### 8.3 Gerenciando Acessos

**Ativar/Desativar Usuário:**

- Use o toggle na coluna "Status" para ativar ou desativar o acesso

**Resetar Senha:**

- Clique no menu de ações (⋮)
- Selecione **"Resetar Senha"**
- O usuário receberá um email para criar nova senha

**Excluir Usuário:**

- Clique no menu de ações (⋮)
- Selecione **"Excluir"**
- Confirme a ação (pode desfazer em até 5 segundos)

### Quota de Usuários

Cada domínio possui uma quota máxima de usuários. O indicador de quota mostra:

- Usuários ativos / Total disponível
- Quando a quota está esgotada, não é possível criar novos usuários

---

## 9. Perguntas Frequentes (FAQ)

### Acesso e Conta

**P: Não consigo me cadastrar. O que fazer?**
R: Verifique se está usando seu email institucional. Apenas domínios autorizados podem se cadastrar. Se o problema persistir, entre em contato com o suporte.

**P: Esqueci minha senha. Como recuperar?**
R: Na tela de login, clique em "Esqueceu sua senha?" e siga as instruções enviadas por email.

**P: Posso usar meu email pessoal?**
R: Não. O ETP Express exige email institucional do órgão público autorizado.

### Criação de ETPs

**P: Preciso preencher todas as seções?**
R: Não. Apenas as seções obrigatórias (I, IV, VI, VIII e XIII) são necessárias. As demais são opcionais conforme a natureza da contratação.

**P: Posso editar um ETP depois de exportado?**
R: Sim. O ETP permanece no sistema e pode ser editado a qualquer momento. Basta exportar novamente após as alterações.

**P: O sistema salva automaticamente?**
R: Não. Você deve clicar em "Salvar" após editar cada seção. O sistema alerta sobre alterações não salvas.

### Geração com IA

**P: A IA substitui o trabalho do servidor?**
R: Não. A IA é uma ferramenta de auxílio que gera sugestões de conteúdo. O servidor é responsável por revisar, adaptar e validar todo o conteúdo.

**P: De onde vêm as informações geradas?**
R: A IA consulta fontes governamentais oficiais como PNCP, Compras.gov.br, SINAPI e SICRO.

**P: O conteúdo gerado é confiável?**
R: O conteúdo é gerado com base em fontes oficiais, mas deve sempre ser revisado pelo servidor responsável. A IA pode cometer erros.

### Exportação

**P: Qual formato devo usar: PDF ou DOCX?**
R: Use PDF para documentos finais. Use DOCX se precisar fazer ajustes de formatação ou adicionar elementos como assinaturas.

**P: A exportação está demorando muito. É normal?**
R: A geração pode levar alguns segundos dependendo do tamanho do documento. Se ultrapassar 1 minuto, tente novamente.

### Problemas Técnicos

**P: A página não carrega corretamente.**
R: Tente limpar o cache do navegador (Ctrl+Shift+Delete) e recarregar a página. Se persistir, tente outro navegador.

**P: Perdi meu trabalho não salvo. É possível recuperar?**
R: Infelizmente, conteúdo não salvo não pode ser recuperado. Recomendamos salvar frequentemente durante a edição.

**P: O sistema está lento.**
R: Verifique sua conexão com a internet. Se o problema persistir, tente acessar em outro horário ou entre em contato com o suporte.

---

## 10. Suporte

### Canais de Atendimento

**Email de Suporte:**
📧 suporte@confenge.com.br

**Horário de Atendimento:**
Segunda a Sexta, das 8h às 18h (horário de Brasília)

### Antes de Entrar em Contato

Para agilizar o atendimento, tenha em mãos:

- Seu email de cadastro
- Descrição detalhada do problema
- Prints de tela (se aplicável)
- Navegador e versão utilizados

### Reportando Problemas

Ao reportar um problema, inclua:

1. O que você estava tentando fazer
2. O que aconteceu (mensagem de erro, comportamento inesperado)
3. Passos para reproduzir o problema
4. Horário aproximado da ocorrência

---

## Glossário

| Termo               | Definição                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| **ETP**             | Estudo Técnico Preliminar - documento que fundamenta a contratação pública |
| **Lei 14.133/2021** | Nova Lei de Licitações e Contratos Administrativos                         |
| **PNCP**            | Portal Nacional de Contratações Públicas                                   |
| **SINAPI**          | Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil       |
| **SICRO**           | Sistema de Custos Referenciais de Obras                                    |
| **LGPD**            | Lei Geral de Proteção de Dados                                             |
| **IA**              | Inteligência Artificial                                                    |

---

## Histórico de Versões

| Versão | Data     | Alterações               |
| ------ | -------- | ------------------------ |
| 1.0    | Jan/2026 | Versão inicial do manual |

---

**ETP Express** - Simplificando a elaboração de Estudos Técnicos Preliminares

© 2026 CONFENGE. Todos os direitos reservados.
