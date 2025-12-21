# Post-Mortem Template

**Uso:** Documentar analise detalhada apos resolucao de incidentes P0 ou P1.

**Quando usar:**
- Obrigatorio para todos incidentes P0
- Obrigatorio para incidentes P1 com duracao >2 horas
- Opcional para P2/P3 se houver learning significativo

**Prazo:** 48 horas apos resolucao do incidente

---

## Template

```markdown
# Post-Mortem: [Titulo Descritivo do Incidente]

**ID:** INC-YYYY-MM-DD-XX
**Data do Incidente:** YYYY-MM-DD
**Duracao:** HH:MM - HH:MM (X horas Y minutos)
**Severidade:** P0/P1
**Status:** Resolvido
**Autor:** [Nome]
**Revisores:** [Nomes]

---

## 1. Resumo Executivo

[2-3 paragrafos resumindo o que aconteceu, o impacto e o resultado]

**Exemplo:**
> Em 20/12/2025 as 14:30, o sistema ETP Express ficou completamente indisponivel
> por 45 minutos devido a uma falha na conexao com o banco de dados. A causa raiz
> foi uma atualizacao automatica do Railway que reiniciou o PostgreSQL sem
> graceful shutdown. O problema foi resolvido reiniciando o servico backend e
> validando a integridade dos dados. Nenhum dado foi perdido.

---

## 2. Timeline Detalhada

| Horario | Evento | Responsavel |
|---------|--------|-------------|
| HH:MM | [Primeiro sinal do problema] | Sistema/Alertas |
| HH:MM | [Deteccao do incidente] | [Nome] |
| HH:MM | [Primeira resposta] | [Nome] |
| HH:MM | [Escalation (se houver)] | [Nome] |
| HH:MM | [Root cause identificada] | [Nome] |
| HH:MM | [Mitigacao aplicada] | [Nome] |
| HH:MM | [Verificacao de resolucao] | [Nome] |
| HH:MM | [Comunicacao aos usuarios] | [Nome] |
| HH:MM | [Incidente encerrado] | [Nome] |

---

## 3. Root Cause Analysis

### 3.1 O Que Aconteceu (Fatos)

[Descricao tecnica detalhada do que aconteceu, sem interpretacoes]

### 3.2 Por Que Aconteceu (5 Whys)

1. **Por que o sistema ficou indisponivel?**
   - [Resposta 1]

2. **Por que [Resposta 1]?**
   - [Resposta 2]

3. **Por que [Resposta 2]?**
   - [Resposta 3]

4. **Por que [Resposta 3]?**
   - [Resposta 4]

5. **Por que [Resposta 4]?**
   - [Resposta 5 - ROOT CAUSE]

### 3.3 Causa Raiz Identificada

**Causa Raiz:** [Descricao clara e concisa da causa fundamental]

**Tipo de Causa:**
- [ ] Codigo (bug, regression)
- [ ] Configuracao (misconfiguration)
- [ ] Infraestrutura (hardware, cloud provider)
- [ ] Dependencia Externa (API terceira, biblioteca)
- [ ] Processo (falta de procedimento, erro humano)
- [ ] Monitoramento (alerta ausente ou incorreto)

---

## 4. Impacto

### 4.1 Impacto no Usuario

| Metrica | Valor |
|---------|-------|
| **Usuarios Afetados** | XX (X% do total) |
| **Duracao do Impacto** | X horas Y minutos |
| **Funcionalidades Afetadas** | [Lista] |
| **Transacoes Perdidas** | X (se aplicavel) |
| **Dados Perdidos** | Nenhum / [Descricao] |

### 4.2 Impacto nos SLOs

| SLO | Target | Resultado | Status |
|-----|--------|-----------|--------|
| Uptime Mensal | 99.9% | XX.X% | OK / Violado |
| P95 Latency | <3s | X.Xs | OK / Violado |
| Error Rate | <0.1% | X.X% | OK / Violado |

### 4.3 Impacto no Negocio

[Descricao qualitativa do impacto: reputacao, confianca, SLA com clientes, etc.]

---

## 5. O Que Deu Certo

[Listar aspectos positivos da resposta ao incidente]

- [ ] Deteccao rapida (alertas funcionaram)
- [ ] Comunicacao efetiva com usuarios
- [ ] Escalation adequado
- [ ] Resolucao dentro do SLA
- [ ] Documentacao atualizada ajudou
- [ ] Runbooks foram uteis
- [ ] Rollback funcionou conforme esperado

---

## 6. O Que Deu Errado

[Listar aspectos que podem ser melhorados]

- [ ] Deteccao lenta (faltava alerta)
- [ ] Comunicacao atrasada
- [ ] Escalation confuso
- [ ] Resolucao demorada
- [ ] Falta de documentacao
- [ ] Runbook desatualizado
- [ ] Rollback nao funcionou
- [ ] [Outros]

---

## 7. Acoes Corretivas

### 7.1 Acoes Imediatas (Ja Realizadas)

| Acao | Status | Responsavel | Data |
|------|--------|-------------|------|
| [Acao 1] | Completa | [Nome] | YYYY-MM-DD |
| [Acao 2] | Completa | [Nome] | YYYY-MM-DD |

### 7.2 Acoes de Curto Prazo (1-2 Semanas)

| Acao | Prioridade | Responsavel | Prazo | Issue |
|------|------------|-------------|-------|-------|
| [Acao 1] | Alta | [Nome] | YYYY-MM-DD | #XXX |
| [Acao 2] | Media | [Nome] | YYYY-MM-DD | #XXX |

### 7.3 Acoes de Longo Prazo (1-3 Meses)

| Acao | Prioridade | Responsavel | Prazo | Issue |
|------|------------|-------------|-------|-------|
| [Acao 1] | Media | [Nome] | YYYY-MM-DD | #XXX |
| [Acao 2] | Baixa | [Nome] | YYYY-MM-DD | #XXX |

---

## 8. Lessons Learned

### O Que Aprendemos

1. [Aprendizado 1]
2. [Aprendizado 2]
3. [Aprendizado 3]

### Recomendacoes para o Time

1. [Recomendacao 1]
2. [Recomendacao 2]

---

## 9. Metricas de Resposta

| Metrica | Valor | Target SLA | Status |
|---------|-------|------------|--------|
| **MTTA** (Time to Acknowledge) | X min | 15 min (P0) | OK / Violado |
| **MTTR** (Time to Resolve) | X min | 4h (P0) | OK / Violado |
| **Time to Communicate** | X min | 30 min (P0) | OK / Violado |

---

## 10. Anexos

- [ ] Logs relevantes (link ou arquivo)
- [ ] Graficos de metricas durante o incidente
- [ ] Screenshots (se aplicavel)
- [ ] Comunicacoes enviadas aos usuarios

---

## Aprovacoes

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Autor | [Nome] | YYYY-MM-DD | [Aprovado] |
| Tech Lead | [Nome] | YYYY-MM-DD | [Pendente] |
| DevOps | [Nome] | YYYY-MM-DD | [Pendente] |

---

**Proxima Revisao:** YYYY-MM-DD (30 dias apos o incidente)
```

---

## Exemplo Preenchido: Database Connection Failure

```markdown
# Post-Mortem: Falha de Conexao com Banco de Dados

**ID:** INC-2025-12-20-01
**Data do Incidente:** 2025-12-20
**Duracao:** 15:20 - 16:05 (45 minutos)
**Severidade:** P0
**Status:** Resolvido
**Autor:** [DevOps Lead]
**Revisores:** [Tech Lead], [CTO]

---

## 1. Resumo Executivo

Em 20/12/2025 as 15:20, o sistema ETP Express ficou completamente indisponivel
por 45 minutos devido a uma falha na conexao com o banco de dados PostgreSQL.
A causa raiz foi uma atualizacao automatica do Railway que reiniciou o container
PostgreSQL sem notificacao previa, causando interrupcao das conexoes ativas.

O problema foi detectado pelos alertas de health check do Sentry em 3 minutos.
A resolucao envolveu reiniciar o servico backend para restabelecer o pool de
conexoes. Nenhum dado foi perdido e todos os ETPs foram preservados.

---

## 2. Timeline Detalhada

| Horario | Evento | Responsavel |
|---------|--------|-------------|
| 15:20 | PostgreSQL reiniciado pelo Railway (manutencao) | Railway |
| 15:21 | Health check comeca a falhar | Sistema |
| 15:23 | Alerta Sentry disparado | Automatico |
| 15:25 | On-call acknowledge do alerta | [Nome] |
| 15:30 | Investigacao iniciada, logs analisados | [Nome] |
| 15:35 | Root cause identificada: DB restart pelo Railway | [Nome] |
| 15:40 | Mitigacao: restart do backend para reconectar | [Nome] |
| 15:45 | Sistema volta ao normal, validacao iniciada | [Nome] |
| 15:50 | Smoke tests passando, usuarios notificados | [Nome] |
| 16:05 | Incidente formalmente encerrado | [Nome] |

---

## 3. Root Cause Analysis

### 3.1 O Que Aconteceu

O Railway executou uma atualizacao de seguranca no container PostgreSQL as 15:20.
O processo de atualizacao reiniciou o container sem graceful shutdown, causando
interrupcao abrupta de todas as conexoes do pool do TypeORM.

O pool de conexoes do backend (configurado com max 20 conexoes) tentou reconectar
automaticamente, mas o mecanismo de retry falhou porque o PostgreSQL ainda nao
estava aceitando conexoes. Apos 5 tentativas com timeout de 5s cada, o pool entrou
em estado de falha permanente.

### 3.2 Por Que Aconteceu (5 Whys)

1. **Por que o sistema ficou indisponivel?**
   - O pool de conexoes do backend entrou em estado de falha

2. **Por que o pool entrou em estado de falha?**
   - O PostgreSQL foi reiniciado abruptamente

3. **Por que o PostgreSQL foi reiniciado abruptamente?**
   - O Railway executou atualizacao de seguranca automatica

4. **Por que nao fomos notificados da atualizacao?**
   - Railway nao envia notificacoes previas para manutencoes automaticas

5. **Por que o backend nao se recuperou automaticamente?**
   - O mecanismo de retry do pool tem limite de 5 tentativas sem reconexao posterior

### 3.3 Causa Raiz Identificada

**Causa Raiz:** Falta de mecanismo de auto-recovery no pool de conexoes apos exaustao
de retries, combinado com restart nao-graceful do PostgreSQL pelo Railway.

**Tipo de Causa:**
- [x] Infraestrutura (cloud provider)
- [x] Configuracao (pool de conexoes)

---

## 4. Impacto

### 4.1 Impacto no Usuario

| Metrica | Valor |
|---------|-------|
| **Usuarios Afetados** | 100% (estimados 15 ativos no momento) |
| **Duracao do Impacto** | 45 minutos |
| **Funcionalidades Afetadas** | Todas (sistema completamente down) |
| **Transacoes Perdidas** | 0 |
| **Dados Perdidos** | Nenhum |

### 4.2 Impacto nos SLOs

| SLO | Target | Resultado Mes | Status |
|-----|--------|---------------|--------|
| Uptime Mensal | 99.9% | 99.89% | Violado (margem) |

---

## 7. Acoes Corretivas

### 7.1 Acoes Imediatas (Ja Realizadas)

| Acao | Status | Responsavel | Data |
|------|--------|-------------|------|
| Reiniciar backend para reconectar pool | Completa | [Nome] | 2025-12-20 |
| Validar integridade dos dados | Completa | [Nome] | 2025-12-20 |

### 7.2 Acoes de Curto Prazo (1-2 Semanas)

| Acao | Prioridade | Responsavel | Prazo | Issue |
|------|------------|-------------|-------|-------|
| Implementar health check do DB no /api/health | Alta | [Nome] | 2025-12-27 | #XXX |
| Configurar retry infinito com backoff exponencial no pool | Alta | [Nome] | 2025-12-27 | #XXX |

### 7.3 Acoes de Longo Prazo (1-3 Meses)

| Acao | Prioridade | Responsavel | Prazo | Issue |
|------|------------|-------------|-------|-------|
| Avaliar PgBouncer para resiliencia de conexoes | Media | [Nome] | 2026-01-30 | #XXX |
| Configurar alertas Railway para manutencoes | Media | [Nome] | 2026-01-15 | #XXX |

---

## 8. Lessons Learned

### O Que Aprendemos

1. O pool de conexoes TypeORM precisa de configuracao mais robusta para auto-recovery
2. Railway pode reiniciar servicos a qualquer momento - precisamos de resiliencia
3. Health check do backend deve verificar conectividade com DB, nao apenas HTTP

### Recomendacoes para o Time

1. Sempre testar cenarios de falha de DB em ambiente de staging
2. Considerar PgBouncer para ambiente de producao com alta disponibilidade
```

---

## Checklist de Revisao

Antes de finalizar o post-mortem:

- [ ] Timeline esta completa e precisa?
- [ ] Root cause foi identificada corretamente?
- [ ] 5 Whys foi aplicado ate a causa fundamental?
- [ ] Impacto foi quantificado (usuarios, duracao, dados)?
- [ ] Acoes corretivas tem owners e prazos?
- [ ] Issues foram criadas no GitHub para cada acao?
- [ ] Lessons learned sao acionaveis?
- [ ] Post-mortem foi revisado por pelo menos 2 pessoas?
- [ ] Blameless - ninguem foi responsabilizado pessoalmente?

---

## Blameless Culture

**IMPORTANTE:** Post-mortems sao para aprendizado, nao para culpar.

- Focar em sistemas e processos, nao em pessoas
- "O que falhou" ao inves de "quem falhou"
- Ambiente seguro para reportar erros
- Erros sao oportunidades de melhoria

---

**Template Version:** 1.0
**Last Updated:** 2025-12-20
