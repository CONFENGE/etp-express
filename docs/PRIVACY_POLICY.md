# Política de Privacidade - ETP Express

**Última atualização:** 22 de novembro de 2025
**Versão:** 2.0
**Vigência:** A partir de 22/11/2025

---

## 1. Informações Gerais

### 1.1 Identificação do Controlador

**Nome da Entidade:** ETP Express
**CNPJ:** [A ser preenchido]
**Endereço:** [A ser preenchido]
**E-mail de Contato:** privacidade@confenge.com.br
**Encarregado de Dados (DPO):** [A ser preenchido]
**E-mail do Encarregado:** dpo@confenge.com.br

### 1.2 Sobre Esta Política

Esta Política de Privacidade descreve como o **ETP Express** coleta, usa, armazena, compartilha e protege os dados pessoais dos usuários da plataforma, em conformidade com a **Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018**.

Ao utilizar nossos serviços, você concorda com os termos desta política. Caso não concorde, pedimos que não utilize a plataforma.

---

## 2. Dados Coletados e Finalidades

### 2.1 Dados de Cadastro e Autenticação

| Dado Pessoal | Finalidade | Base Legal (LGPD) |
| --------------------------- | ------------------------------------------------ | -------------------------------------------- |
| **E-mail** | Autenticação, comunicação e recuperação de senha | Art. 7º, V - Execução de contrato |
| **Senha (hash bcrypt)** | Autenticação segura | Art. 7º, V - Execução de contrato |
| **Nome completo** | Identificação do usuário na plataforma | Art. 7º, V - Execução de contrato |
| **Órgão público vinculado** | Contextualização de ETPs geradas | Art. 7º, V - Execução de contrato |
| **Data de cadastro** | Auditoria e conformidade | Art. 7º, II - Cumprimento de obrigação legal |

**Armazenamento:** Banco de dados PostgreSQL com criptografia em repouso (Railway)
**Retenção:** Enquanto a conta estiver ativa + 90 dias após exclusão solicitada

### 2.2 Dados de Uso e Analytics

| Dado Pessoal | Finalidade | Base Legal (LGPD) |
| -------------------------- | ------------------------------------ | --------------------------------- |
| **Endereço IP** | Segurança, análise geográfica de uso | Art. 7º, IX - Legítimo interesse |
| **User Agent (navegador)** | Compatibilidade técnica | Art. 7º, IX - Legítimo interesse |
| **Session ID** | Gerenciamento de sessão | Art. 7º, V - Execução de contrato |
| **Eventos de interação** | Melhoria da experiência do usuário | Art. 7º, IX - Legítimo interesse |

**Armazenamento:** Tabela `analytics_events` no PostgreSQL
**Retenção:**

- **IPs:** 30 dias em texto claro, após pseudonimização (hash SHA-256)
- **Session ID:** 60 dias, após anonimização (SET NULL)
- **User ID:** 90 dias, após anonimização (SET NULL)

**Anonimização:** Dados são **automaticamente anonimizados** após os prazos acima para preservar apenas métricas agregadas sem rastreio individual.

### 2.3 Logs de Auditoria

| Dado Pessoal | Finalidade | Base Legal (LGPD) |
| ----------------------- | ----------------------------------------- | -------------------------------------------- |
| **User ID** | Conformidade LGPD (registro de operações) | Art. 7º, II - Obrigação legal (Art. 37 LGPD) |
| **IP Address** | Investigação de incidentes de segurança | Art. 7º, IX - Legítimo interesse |
| **Timestamp** | Rastreio de operações críticas | Art. 7º, II - Obrigação legal |
| **Mudanças realizadas** | Registro de tratamento de dados | Art. 7º, II - Obrigação legal |

**Armazenamento:** Tabela `audit_logs` no PostgreSQL
**Retenção:** 90 dias (após este período, registros são **automaticamente excluídos**)

**Importante:** Logs de auditoria **nunca armazenam senhas** (apenas hashes) e dados sensíveis em `changes` são pseudonimizados.

### 2.4 Conteúdo de Estudos Técnicos Preliminares (ETPs)

| Dado Pessoal | Finalidade | Base Legal (LGPD) |
| ------------------------ | -------------------------- | --------------------------------- |
| **Título do ETP** | Identificação do projeto | Art. 7º, V - Execução de contrato |
| **Descrição do projeto** | Geração de conteúdo via IA | Art. 7º, V - Execução de contrato |
| **Seções geradas** | Documento final do usuário | Art. 7º, V - Execução de contrato |

**Armazenamento:** Tabelas `etps` e `sections` no PostgreSQL
**Retenção:** Enquanto a conta estiver ativa + 90 dias após exclusão solicitada

**Sanitização:** Antes de enviar conteúdo para APIs de IA (OpenAI, Exa), **todos os dados pessoais identificáveis são automaticamente removidos** (CPF, CNPJ, e-mails, telefones, etc.) via `PIIRedactionService`.

---

## 3. Compartilhamento de Dados com Terceiros

### 3.1 Provedores de Inteligência Artificial

#### OpenAI (ChatGPT)

- **Dados compartilhados:** Prompts sanitizados (sem CPF, CNPJ, e-mails, telefones)
- **Finalidade:** Geração de conteúdo textual para seções de ETPs
- **Localização:** Estados Unidos (transferência internacional)
- **Base legal:** Art. 7º, V - Execução de contrato + Art. 33 LGPD
- **Proteção:** `PIIRedactionService` remove dados pessoais **antes** do envio
- **DPA:** OpenAI possui Data Processing Agreement (DPA) conforme GDPR/LGPD

**Garantias de Segurança:**

- ✅ Comunicação via HTTPS/TLS (criptografia em trânsito)
- ✅ PII Redaction automático (remove CPF, CNPJ, e-mails, telefones, RGs, matrículas, CEPs)
- ✅ Logs de warning quando PII é detectado
- ✅ OpenAI não utiliza dados de clientes para treinamento de modelos (conforme política da OpenAI)

#### Exa AI

- **Dados compartilhados:** Queries de pesquisa sanitizadas
- **Finalidade:** Busca de informações públicas sobre contratações
- **Localização:** Estados Unidos (transferência internacional)
- **Base legal:** Art. 7º, V - Execução de contrato + Art. 33 LGPD
- **Proteção:** `PIIRedactionService` remove dados pessoais **antes** do envio

**Garantias de Segurança:**

- ✅ Comunicação via HTTPS/TLS (criptografia em trânsito)
- ✅ PII Redaction automático aplicado às queries
- ✅ Apenas informações públicas de contratações são consultadas

### 3.2 Infraestrutura de Hospedagem

#### Railway.app

- **Dados compartilhados:** Todos os dados do sistema (banco de dados, logs)
- **Finalidade:** Hospedagem e execução da plataforma
- **Localização:** Estados Unidos (transferência internacional)
- **Base legal:** Art. 7º, V - Execução de contrato + Art. 33 LGPD
- **Proteção:**
 - ✅ PostgreSQL com encryption at rest (criptografia em repouso)
 - ✅ HTTPS forçado (TLS 1.2+)
 - ✅ SSL/TLS na conexão com banco de dados
 - ✅ Logs retidos por 7 dias (Railway) com sanitização de PII
- **DPA:** Railway possui Data Processing Agreement conforme GDPR/LGPD

### 3.3 Quando NÃO Compartilhamos Dados

**Nunca vendemos, alugamos ou comercializamos seus dados pessoais.**

Dados podem ser compartilhados com autoridades públicas apenas:

- Em cumprimento de ordem judicial
- Para proteção de direitos em processos judiciais
- Quando exigido por lei

---

## 4. Direitos do Titular de Dados

Conforme a LGPD (Art. 18), você tem os seguintes direitos:

### 4.1 Direito de Acesso

**O que é:** Obter confirmação de quais dados pessoais tratamos sobre você.

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br` com assunto "Solicitação de Acesso - LGPD".

**Prazo de resposta:** 15 dias úteis.

**Formato da resposta:** Relatório em PDF com todos os dados pessoais armazenados.

### 4.2 Direito de Correção

**O que é:** Corrigir dados incompletos, inexatos ou desatualizados.

**Como exercer:**

- Acesse "Meu Perfil" na plataforma e edite seus dados
- OU envie e-mail para `privacidade@confenge.com.br`

**Prazo de resposta:** 15 dias úteis (se via e-mail).

### 4.3 Direito de Exclusão (Direito ao Esquecimento)

**O que é:** Solicitar a eliminação de dados pessoais tratados com base em consentimento ou quando desnecessários.

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br` com assunto "Solicitação de Exclusão - LGPD".

**Prazo de resposta:** 15 dias úteis.

**O que acontece:**

1. Dados pessoais são **permanentemente excluídos** do banco de dados
2. Conta é desativada
3. ETPs associados são deletados
4. Logs de auditoria são mantidos por 90 dias para compliance legal, após excluídos

**Exceções:** Dados podem ser mantidos se houver:

- Obrigação legal de retenção (logs de auditoria por 90 dias)
- Exercício de direitos em processo judicial
- Proteção do crédito (se aplicável)

### 4.4 Direito à Portabilidade

**O que é:** Receber seus dados em formato estruturado e legível por máquina.

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br` com assunto "Solicitação de Portabilidade - LGPD".

**Prazo de resposta:** 15 dias úteis.

**Formato:** JSON estruturado contendo:

- Dados cadastrais
- ETPs criados
- Seções geradas
- Histórico de uso (se disponível)

### 4.5 Direito de Oposição

**O que é:** Opor-se ao tratamento de dados realizado com base em legítimo interesse.

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br` com assunto "Oposição ao Tratamento - LGPD".

**Exemplo:** Oposição à coleta de analytics (IPs, User Agents).

**Prazo de resposta:** 15 dias úteis.

### 4.6 Direito de Revogação de Consentimento

**O que é:** Revogar consentimento previamente dado (quando aplicável).

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br`.

**Importante:** Revogação de consentimento pode inviabilizar o uso da plataforma.

### 4.7 Direito de Anonimização

**O que é:** Solicitar bloqueio ou anonimização de dados desnecessários.

**Como exercer:** Envie e-mail para `privacidade@confenge.com.br`.

**Prazo de resposta:** 15 dias úteis.

---

## 5. Como Exercer Seus Direitos

### 5.1 Canais de Atendimento

**E-mail do Encarregado (DPO):**
 `dpo@confenge.com.br`

**E-mail de Privacidade:**
 `privacidade@confenge.com.br`

**Formulário na Plataforma:**
Disponível em: [https://confenge.com.br/privacy/request](https://confenge.com.br/privacy/request) _(em desenvolvimento)_

### 5.2 Informações Necessárias na Solicitação

Para agilizar sua solicitação, inclua:

- **Nome completo**
- **E-mail cadastrado na plataforma**
- **Tipo de solicitação** (acesso, correção, exclusão, portabilidade, etc.)
- **Descrição detalhada** do que você deseja

### 5.3 Verificação de Identidade

Para proteger seus dados, podemos solicitar:

- Confirmação do e-mail cadastrado (envio de código de verificação)
- Resposta a perguntas de segurança
- Documento de identificação (em casos específicos)

### 5.4 Prazos de Resposta

Conforme LGPD Art. 19:

- **Resposta inicial:** 15 dias úteis
- **Resposta completa:** Até 30 dias úteis (casos complexos)

---

## 6. Medidas de Segurança

### 6.1 Segurança Técnica

| Medida | Descrição | Status |
| ---------------------------- | ----------------------------------------------- | --------------- |
| **Criptografia em trânsito** | HTTPS/TLS 1.2+ forçado | ✅ Implementado |
| **Criptografia em repouso** | PostgreSQL encryption at rest (Railway) | ✅ Implementado |
| **Hash de senhas** | bcrypt com salt (custo 10) | ✅ Implementado |
| **Rate limiting** | Proteção contra força bruta (5 tentativas/min) | ✅ Implementado |
| **Sanitização de PII** | `PIIRedactionService` antes de enviar para APIs | ✅ Implementado |
| **Logs de auditoria** | Registro de operações críticas (90 dias) | ✅ Implementado |
| **Anonimização automática** | Analytics anonimizados após 90 dias | ✅ Implementado |

### 6.2 Segurança Organizacional

- ✅ **Controle de acesso:** Apenas equipe autorizada acessa dados
- ✅ **Backup diário:** Banco de dados com backup automatizado (Railway)
- ✅ **Monitoramento:** Logs de segurança e alertas de anomalias
- ✅ **Treinamento:** Equipe treinada em práticas de privacidade
- ✅ **Auditoria:** Revisões periódicas de conformidade LGPD

### 6.3 Incidentes de Segurança

Em caso de vazamento de dados:

1. **Notificação à ANPD:** Dentro de 72 horas (conforme LGPD Art. 48)
2. **Notificação aos usuários afetados:** Via e-mail e aviso na plataforma
3. **Medidas corretivas:** Implementação imediata de correções
4. **Relatório de incidente:** Disponível para consulta dos usuários

**Canal de denúncia:**
 `security@confenge.com.br`

---

## 7. Cookies e Tecnologias de Rastreamento

### 7.1 Cookies Essenciais

| Cookie | Finalidade | Duração | Base Legal |
| --------------- | -------------------------------------- | ------- | --------------------------------- |
| `session_token` | Autenticação e gerenciamento de sessão | 7 dias | Art. 7º, V - Execução de contrato |

**Importante:** Não utilizamos cookies de terceiros para publicidade ou rastreamento.

### 7.2 Local Storage

A plataforma utiliza **Local Storage** do navegador para armazenar:

- Token JWT de autenticação (após login)
- Preferências de interface (tema claro/escuro)

**Dados armazenados:** Não contêm informações sensíveis, apenas IDs criptografados.

### 7.3 Opt-Out

Você pode desativar cookies nas configurações do navegador, mas isso pode afetar a funcionalidade da plataforma (impossibilidade de login).

---

## 8. Período de Retenção de Dados

### 8.1 Tabela de Retenção

| Tipo de Dado | Período de Retenção | Ação após Retenção |
| ------------------------- | -------------------------------------------- | ---------------------------------- |
| **Dados cadastrais** | Enquanto conta ativa + 90 dias após exclusão | Exclusão permanente |
| **Senhas (hash)** | Enquanto conta ativa | Exclusão permanente |
| **ETPs criados** | Enquanto conta ativa + 90 dias após exclusão | Exclusão permanente |
| **Analytics (userId)** | 90 dias | **Anonimização** (SET NULL) |
| **Analytics (IP)** | 30 dias | **Pseudonimização** (hash SHA-256) |
| **Analytics (sessionId)** | 60 dias | **Anonimização** (SET NULL) |
| **Logs de auditoria** | 90 dias | Exclusão permanente |
| **Logs de aplicação** | 7 dias (Railway) | Exclusão automática |

### 8.2 Justificativa dos Prazos

- **90 dias pós-exclusão:** Período para reversão de exclusão acidental + compliance legal
- **90 dias de analytics:** Análise de tendências de uso da plataforma
- **90 dias de audit logs:** Conformidade LGPD Art. 37 (registro de tratamento)

---

## 9. Transferência Internacional de Dados

### 9.1 Países Destinatários

| Provedor | País | Garantias |
| ----------- | -------------- | ------------------------------------------- |
| **OpenAI** | Estados Unidos | DPA conforme GDPR/LGPD + PII Redaction |
| **Exa** | Estados Unidos | DPA conforme GDPR/LGPD + PII Redaction |
| **Railway** | Estados Unidos | DPA conforme GDPR/LGPD + Encryption at rest |

### 9.2 Garantias Legais (LGPD Art. 33)

Transferências internacionais atendem aos requisitos da LGPD:

- ✅ **Cláusulas contratuais padrão** (Standard Contractual Clauses - SCCs)
- ✅ **Certificações de segurança** (SOC 2, ISO 27001)
- ✅ **Pseudonimização/Anonimização** antes do envio (PII Redaction)
- ✅ **Criptografia** em trânsito e repouso

### 9.3 Seus Direitos em Transferências Internacionais

Você pode:

- Solicitar informações sobre as garantias aplicadas
- Opor-se à transferência (pode inviabilizar o uso da plataforma)
- Solicitar cópia do DPA firmado com os provedores

---

## 10. Privacidade de Menores de Idade

**O ETP Express não é destinado a menores de 18 anos.**

Caso identifiquemos dados de menores coletados sem autorização dos responsáveis legais:

1. Dados serão imediatamente excluídos
2. Responsáveis serão notificados (se identificáveis)

Se você é pai/mãe ou responsável legal e acredita que seu filho forneceu dados pessoais, entre em contato: `privacidade@confenge.com.br`

---

## 11. Atualizações desta Política

### 11.1 Frequência de Revisão

Esta política é revisada **semestralmente** ou quando houver:

- Mudanças na legislação (LGPD, ANPD)
- Novas funcionalidades da plataforma
- Alterações em práticas de tratamento de dados

### 11.2 Notificação de Alterações

Você será notificado sobre alterações significativas via:

- ✅ E-mail cadastrado na plataforma
- ✅ Aviso destacado no login
- ✅ Versão atualizada nesta página

**Última atualização:** 22 de novembro de 2025
**Versão anterior:** 1.0 (19 de novembro de 2025)

**Principais alterações na versão 2.0:**

- Detalhamento de anonimização automática de analytics
- Inclusão de prazos específicos de retenção
- Detalhamento de sanitização de PII (PIIRedactionService)
- Informações sobre transferências internacionais
- Ampliação de direitos do titular

---

## 12. Legislação Aplicável e Foro

### 12.1 Lei Aplicável

Esta Política de Privacidade é regida pela legislação brasileira, em especial:

- **Lei nº 13.709/2018** (LGPD)
- **Código Civil Brasileiro**
- **Código de Defesa do Consumidor** (Lei nº 8.078/1990)

### 12.2 Foro

Fica eleito o foro da Comarca de **[Cidade - A ser preenchido]** para dirimir quaisquer controvérsias decorrentes desta política, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

---

## 13. Contato e Ouvidoria

### 13.1 Encarregado de Dados (DPO)

**Nome:** [A ser preenchido]
**E-mail:** dpo@confenge.com.br
**Telefone:** [A ser preenchido]

### 13.2 Canais de Privacidade

**E-mail de Privacidade:** privacidade@confenge.com.br
**E-mail de Segurança:** security@confenge.com.br
**Formulário Online:** [https://confenge.com.br/privacy/contact](https://confenge.com.br/privacy/contact) _(em desenvolvimento)_

### 13.3 Autoridade Nacional de Proteção de Dados (ANPD)

Caso não fique satisfeito com nossas respostas, você pode contatar a ANPD:

- **Site:** https://www.gov.br/anpd
- **Ouvidoria ANPD:** https://www.gov.br/anpd/pt-br/canais_atendimento

---

## 14. Glossário

| Termo | Definição |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Dado Pessoal** | Informação relacionada a pessoa natural identificada ou identificável (LGPD Art. 5º, I) |
| **Titular** | Pessoa natural a quem se referem os dados pessoais (LGPD Art. 5º, V) |
| **Controlador** | ETP Express - quem decide sobre tratamento de dados (LGPD Art. 5º, VI) |
| **Operador** | Quem trata dados em nome do controlador (ex: Railway) (LGPD Art. 5º, VII) |
| **Encarregado (DPO)** | Pessoa indicada para atuar como canal de comunicação (LGPD Art. 5º, VIII) |
| **Consentimento** | Manifestação livre, informada e inequívoca (LGPD Art. 5º, XII) |
| **Anonimização** | Remoção irreversível de identificadores (LGPD Art. 5º, XI) |
| **Pseudonimização** | Substituição de identificadores por tokens reversíveis (LGPD Art. 13) |
| **PII Redaction** | Processo de remoção automática de dados pessoais de textos |

---

## 15. Aceitação desta Política

Ao utilizar a plataforma ETP Express, você declara:

- ✅ Ter lido e compreendido esta Política de Privacidade
- ✅ Concordar com os termos descritos
- ✅ Autorizar o tratamento de seus dados conforme finalidades descritas

**Data de aceite:** Registrada no primeiro login após criação da conta.

---

**Documento criado em conformidade com:**

- Lei nº 13.709/2018 (LGPD)
- Guia de Privacidade por Design da ANPD
- Resolução CD/ANPD nº 2/2022 (Agentes de Tratamento de Pequeno Porte)

---

**ETP Express - Geração de Estudos Técnicos Preliminares com IA**
**Privacidade e Segurança em Primeiro Lugar**

 **Dúvidas?** Entre em contato: privacidade@confenge.com.br
