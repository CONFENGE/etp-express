# TROUBLESHOOTING - ETP Express

Guia de resolucao de problemas comuns do ETP Express.

**Atualizado:** 2025-12-20 | **Versao:** 1.0.0

---

## Indice

1. [Problemas de Login](#1-problemas-de-login)
2. [Sessao Expirada](#2-sessao-expirada)
3. [Permissao Negada](#3-permissao-negada)
4. [Falhas na Geracao com IA](#4-falhas-na-geracao-com-ia)
5. [Servico de Pesquisa Indisponivel](#5-servico-de-pesquisa-indisponivel)
6. [Erros de Exportacao PDF/DOCX](#6-erros-de-exportacao-pdfdocx)
7. [Problemas de Performance](#7-problemas-de-performance)
8. [Erros de Conexao](#8-erros-de-conexao)
9. [Rate Limiting](#9-rate-limiting)
10. [Dados Invalidos](#10-dados-invalidos)
11. [Conflito de Dados](#11-conflito-de-dados)
12. [Erros de Banco de Dados](#12-erros-de-banco-de-dados)
13. [Acesso Negado Multi-Tenancy](#13-acesso-negado-multi-tenancy)
14. [Servico em Manutencao](#14-servico-em-manutencao)

---

## 1. Problemas de Login

### Sintoma
- Mensagem "Credenciais invalidas" ao fazer login
- Pagina de login recarrega sem efeito
- Botao de login nao responde

### Causa Provavel
- Email ou senha incorretos
- Usuario nao confirmou email de registro
- Conta bloqueada por tentativas excessivas

### Solucao

1. **Verifique as credenciais:**
   - Confira se o email esta correto (atencao a maiusculas/minusculas)
   - Verifique se a senha esta correta (Caps Lock desligado)

2. **Se esqueceu a senha:**
   - Clique em "Esqueci minha senha" na tela de login
   - Verifique sua caixa de entrada e pasta de spam
   - O link expira em 1 hora

3. **Se a conta foi bloqueada:**
   - Aguarde 15 minutos apos 5 tentativas falhas
   - Contate suporte@confenge.com.br se o problema persistir

4. **Se nao recebeu email de confirmacao:**
   - Verifique a pasta de spam
   - Solicite reenvio em suporte@confenge.com.br

---

## 2. Sessao Expirada

### Sintoma
- Mensagem "Sessao expirada. Faca login novamente."
- Redirecionamento automatico para tela de login
- Erro 401 no console do navegador

### Causa Provavel
- Token JWT expirou (validade: 8 horas)
- Usuario fez logout em outra aba/dispositivo
- Limpeza de cookies do navegador

### Solucao

1. **Faca login novamente:**
   - Acesse a pagina de login e insira suas credenciais
   - Suas alteracoes nao salvas podem ter sido perdidas

2. **Para evitar perda de dados:**
   - Salve regularmente (Ctrl+S ou botao Salvar)
   - Nao deixe a aba inativa por longos periodos
   - Mantenha apenas uma sessao ativa por vez

3. **Se o problema persiste frequentemente:**
   - Limpe cache e cookies do navegador
   - Desative extensoes que bloqueiam cookies
   - Tente um navegador diferente

---

## 3. Permissao Negada

### Sintoma
- Mensagem "Voce nao tem permissao para acessar este recurso."
- Erro 403 Forbidden
- Botoes ou menus desabilitados

### Causa Provavel
- Usuario nao tem role adequada (Admin, Manager, User)
- Tentativa de acessar recurso de outra organizacao
- Feature restrita ao plano contratado

### Solucao

1. **Verifique seu perfil de acesso:**
   - Acesse Menu > Meu Perfil
   - Confira sua role: Admin, Manager ou User

2. **Permissoes por role:**
   | Acao | User | Manager | Admin |
   |------|------|---------|-------|
   | Visualizar ETPs | Proprios | Organizacao | Todos |
   | Criar/Editar ETPs | Proprios | Organizacao | Todos |
   | Gerenciar usuarios | Nao | Nao | Sim |
   | Configuracoes sistema | Nao | Nao | Sim |

3. **Se precisa de mais permissoes:**
   - Solicite ao Admin da sua organizacao
   - Contate suporte@confenge.com.br

---

## 4. Falhas na Geracao com IA

### Sintoma
- Mensagem "Servico de IA temporariamente indisponivel."
- Geracao de secao demora muito e falha
- Indicador de progresso trava em 0%
- Erro ao gerar conteudo automaticamente

### Causa Provavel
- API OpenAI temporariamente indisponivel
- Circuit breaker ativado por falhas consecutivas
- Timeout na requisicao (limite: 60 segundos)
- Limite de tokens excedido

### Solucao

1. **Aguarde e tente novamente:**
   - O sistema possui retry automatico
   - Aguarde 2-3 minutos e clique em "Gerar" novamente

2. **Verifique o status do servico:**
   - Acesse `/api/health/ready` para ver status dos provedores
   - Status "degraded" indica problemas temporarios

3. **Se o problema persiste:**
   - Tente gerar uma secao menor/mais simples
   - Preencha manualmente e tente IA depois
   - O circuit breaker reseta automaticamente em 60 segundos

4. **Indicadores de status:**
   ```
   healthy  = Servico funcionando normalmente
   degraded = Servico com problemas, retry automatico
   down     = Servico indisponivel, aguarde
   ```

---

## 5. Servico de Pesquisa Indisponivel

### Sintoma
- Mensagem "Servico de pesquisa temporariamente indisponivel."
- Pesquisa de referencias nao retorna resultados
- Erro ao buscar contratos similares
- Indicador "Exa: degraded" no health check

### Causa Provavel
- API Exa temporariamente fora do ar
- Circuit breaker ativado por falhas
- Limite de requisicoes da API excedido

### Solucao

1. **Aguarde e tente novamente:**
   - O circuit breaker reseta em 60 segundos
   - Aguarde e refaca a pesquisa

2. **Alternativas de pesquisa:**
   - Use as APIs governamentais integradas (PNCP, SINAPI, SICRO)
   - Insira referencias manualmente

3. **Verifique status:**
   ```bash
   curl https://etp-express-backend.railway.app/api/health/ready
   ```
   - Campo `providers.exa.status` indica estado atual

---

## 6. Erros de Exportacao PDF/DOCX

### Sintoma
- Mensagem "Erro ao exportar documento."
- Download nao inicia
- Arquivo gerado esta corrompido
- Erro "ETP nao encontrado"

### Causa Provavel
- ETP incompleto (secoes obrigatorias faltando)
- Timeout na geracao (documentos grandes)
- ETP foi deletado ou movido

### Solucao

1. **Verifique se o ETP existe:**
   - Acesse a lista de ETPs e localize o documento
   - Se nao encontrar, pode ter sido deletado

2. **Verifique completude:**
   - Todas as secoes obrigatorias devem estar preenchidas
   - Salve o ETP antes de exportar

3. **Para documentos grandes:**
   - Divida em partes menores se possivel
   - Tente exportar em horario de menor uso

4. **Se o arquivo esta corrompido:**
   - Limpe cache do navegador
   - Tente exportar em formato diferente (PDF vs DOCX)
   - Use navegador diferente

5. **Formatos suportados:**
   - **PDF:** Recomendado para visualizacao
   - **DOCX:** Recomendado para edicao posterior

---

## 7. Problemas de Performance

### Sintoma
- Aplicacao lenta para responder
- Timeout em requisicoes (P95 > 3s)
- Tela congela durante operacoes
- Mensagem "O servidor demorou para responder."

### Causa Provavel
- Alta carga no servidor
- Conexao de internet lenta
- Muitos ETPs ou secoes carregados
- Navegador com cache cheio

### Solucao

1. **Verifique sua conexao:**
   - Teste velocidade em speedtest.net
   - Minimo recomendado: 5 Mbps download

2. **Otimize o navegador:**
   - Limpe cache e cookies
   - Feche abas desnecessarias
   - Desative extensoes pesadas

3. **Use paginacao:**
   - Nao carregue todos os ETPs de uma vez
   - Use filtros para reduzir resultados

4. **Horarios de menor uso:**
   - Evite operacoes pesadas entre 9h-12h e 14h-17h
   - Exportacoes grandes: prefira antes das 8h ou apos 18h

5. **Navegadores recomendados:**
   - Chrome 90+
   - Firefox 88+
   - Edge 90+
   - Safari 14+

---

## 8. Erros de Conexao

### Sintoma
- Mensagem "Erro de conexao. Verifique sua internet."
- Erro "Network Error" ou "ERR_NETWORK"
- Aplicacao offline
- Requests falhando no console

### Causa Provavel
- Sem conexao com a internet
- Firewall bloqueando requisicoes
- Servidor temporariamente indisponivel
- VPN interferindo na conexao

### Solucao

1. **Verifique conexao com internet:**
   - Tente acessar outros sites
   - Reinicie o roteador se necessario

2. **Verifique firewall/proxy:**
   - Certifique-se que o dominio esta liberado
   - Dominios necessarios:
     - `etp-express-frontend.railway.app`
     - `etp-express-backend.railway.app`

3. **Se usando VPN:**
   - Tente desativar temporariamente
   - Alguns VPNs bloqueiam APIs externas

4. **Verifique status do servico:**
   - Acesse https://status.railway.app
   - Verifique se ha manutencao programada

---

## 9. Rate Limiting

### Sintoma
- Mensagem "Muitas requisicoes. Aguarde um momento."
- Erro 429 Too Many Requests
- Bloqueio temporario de acesso
- Login bloqueado

### Causa Provavel
- Excesso de requisicoes em curto periodo
- Scripts ou automacoes agressivas
- Varias abas fazendo requisicoes simultaneas

### Solucao

1. **Aguarde o cooldown:**
   - Rate limit geral: 100 req/minuto (reset em 60s)
   - Rate limit auth: 5 req/minuto (reset em 60s)

2. **Reducao de requisicoes:**
   - Feche abas duplicadas
   - Nao recarregue a pagina repetidamente
   - Aguarde operacoes completarem

3. **Se usando automacao:**
   - Adicione delays entre requisicoes (min 1s)
   - Use exponential backoff em erros

4. **Limites por endpoint:**
   | Endpoint | Limite | Janela |
   |----------|--------|--------|
   | /auth/* | 5 req | 60s |
   | /api/* (geral) | 100 req | 60s |
   | /api/export/* | 10 req | 60s |

---

## 10. Dados Invalidos

### Sintoma
- Mensagem "Dados invalidos. Verifique as informacoes."
- Erro 400 Bad Request ou 422 Unprocessable Entity
- Formulario nao submete
- Campos destacados em vermelho

### Causa Provavel
- Campo obrigatorio vazio
- Formato de dado incorreto
- Valor fora do range permitido
- Caracteres especiais invalidos

### Solucao

1. **Verifique campos obrigatorios:**
   - Campos marcados com * sao obrigatorios
   - Preencha todos antes de submeter

2. **Formatos esperados:**
   | Campo | Formato |
   |-------|---------|
   | Email | usuario@dominio.com |
   | CNPJ | 00.000.000/0000-00 |
   | Valor | 1.234,56 (sem R$) |
   | Data | DD/MM/AAAA |

3. **Limites de caracteres:**
   - Titulo ETP: max 200 caracteres
   - Descricao secao: max 10.000 caracteres
   - Nome usuario: max 100 caracteres

4. **Caracteres a evitar:**
   - Emojis em campos de texto
   - Caracteres especiais: < > { } [ ]
   - Multiplos espacos consecutivos

---

## 11. Conflito de Dados

### Sintoma
- Mensagem "Conflito de dados. Atualize a pagina."
- Erro 409 Conflict
- Alteracoes nao salvas
- Dados antigos sobrescrevem novos

### Causa Provavel
- Outro usuario editou o mesmo registro
- Edicao simultanea em abas diferentes
- Versao do registro desatualizada

### Solucao

1. **Atualize a pagina:**
   - Pressione F5 ou Ctrl+R
   - Suas alteracoes nao salvas serao perdidas

2. **Evite edicao simultanea:**
   - Coordene com colegas ao editar mesmo ETP
   - Verifique "Ultima modificacao" antes de editar

3. **Sistema de versionamento:**
   - O ETP Express mantem historico de versoes
   - Acesse Historico > Versoes para recuperar dados

4. **Boas praticas:**
   - Salve frequentemente
   - Nao deixe formularios abertos por longos periodos
   - Use uma unica aba por ETP

---

## 12. Erros de Banco de Dados

### Sintoma
- Mensagem "Erro ao acessar dados. Tente novamente."
- Erro 500 Internal Server Error
- Dados nao carregam
- Lista de ETPs vazia inesperadamente

### Causa Provavel
- Conexao com banco de dados falhou
- Pool de conexoes esgotado
- Query timeout (limite: 30s)
- Manutencao no banco de dados

### Solucao

1. **Tente novamente em instantes:**
   - Erros de conexao sao geralmente temporarios
   - Aguarde 30 segundos e tente novamente

2. **Verifique status do sistema:**
   ```bash
   curl https://etp-express-backend.railway.app/api/health
   ```
   - Campo `database` deve ser "connected"

3. **Se o problema persiste:**
   - Verifique https://status.railway.app
   - Contate suporte@confenge.com.br

4. **Informacoes para suporte:**
   - Horario exato do erro
   - Acao que estava executando
   - Screenshot da mensagem de erro

---

## 13. Acesso Negado Multi-Tenancy

### Sintoma
- Mensagem "Recurso pertence a outra organizacao."
- ETP visivel mas nao editavel
- Erro ao acessar via link direto
- Erro 403 em recursos especificos

### Causa Provavel
- Tentativa de acessar ETP de outra organizacao
- Link compartilhado de usuario de outra org
- Usuario transferido de organizacao

### Solucao

1. **Verifique sua organizacao:**
   - Acesse Menu > Meu Perfil
   - Confirme a organizacao listada

2. **Se mudou de organizacao recentemente:**
   - Faca logout e login novamente
   - O token precisa ser renovado

3. **Acesso entre organizacoes:**
   - Nao e permitido por seguranca (LGPD)
   - Solicite exportacao ao dono do ETP

4. **Para administradores:**
   - SystemAdmin pode acessar todas organizacoes
   - Use com cuidado e apenas quando necessario

---

## 14. Servico em Manutencao

### Sintoma
- Mensagem "Servico em manutencao."
- Erro 503 Service Unavailable
- Pagina de manutencao exibida
- Aplicacao completamente indisponivel

### Causa Provavel
- Deploy em andamento
- Atualizacao de banco de dados
- Manutencao programada

### Solucao

1. **Aguarde a conclusao:**
   - Manutencoes geralmente duram 5-15 minutos
   - Nao faca refresh excessivo

2. **Verifique comunicados:**
   - Email de aviso e enviado antes de manutencoes
   - Verifique inbox e spam

3. **Horarios de manutencao:**
   - Preferencia: 22h-6h (baixo uso)
   - Emergencias: podem ocorrer a qualquer momento

4. **Apos a manutencao:**
   - Faca refresh (F5)
   - Se necessario, faca logout e login

---

## Contato de Suporte

Se nenhuma das solucoes acima resolver seu problema:

**Email:** suporte@confenge.com.br

**Informacoes a incluir:**
1. Descricao detalhada do problema
2. Passos para reproduzir
3. Screenshots do erro
4. Navegador e versao
5. Horario do ocorrido

**SLA de Resposta:**
- P0 (Sistema fora do ar): 1 hora
- P1 (Feature critica indisponivel): 4 horas
- P2 (Problema moderado): 24 horas
- P3 (Duvida/sugestao): 48 horas

---

## Historico de Atualizacoes

| Data | Versao | Alteracao |
|------|--------|-----------|
| 2025-12-20 | 1.0.0 | Documento inicial com 14 cenarios |
