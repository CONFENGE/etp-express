# Incident Resolved Template

**Uso:** Comunicar usuários quando um incidente em produção foi completamente resolvido.

**Quando usar:**
- ✅ Incidente resolvido e sistema normalizado
- ✅ Verificação completa realizada (health checks, smoke tests)
- ✅ Root cause identificada

**Quando NÃO usar:**
- ❌ Incidente ainda em investigação
- ❌ Resolução parcial (workaround temporário)
- ❌ Sistema ainda instável

---

## Email Template

**Assunto:** [ETP Express] Problema Resolvido - [Descrição Breve]

---

Prezados usuários do ETP Express,

O problema técnico que afetava o sistema foi **completamente resolvido**.

### ✅ Resumo da Resolução

**Problema Identificado:** [Descrição técnica simplificada da root cause]

**Ações Tomadas:** [O que foi feito para resolver]
- Exemplo: "Restauramos a conexão com o banco de dados"
- Exemplo: "Revertemos o deploy que causou o problema"
- Exemplo: "Aumentamos os recursos de infraestrutura"

**Status Atual:** Sistema normalizado e funcionando corretamente

**Verificação:** Todos os testes confirmam funcionamento normal

### 🔒 Segurança dos Dados

[Incluir SEMPRE informação sobre dados]

**Opção 1 (sem perda):**
✅ **Todos os dados estão seguros.** Não houve perda de informações. ETPs criados/editados antes do incidente foram preservados.

**Opção 2 (com perda - se aplicável):**
⚠️ **Impacto em dados:** [Descrever claramente o que foi perdido]
- Exemplo: "ETPs criados entre 14h30 e 15h00 podem ter sido perdidos"
- Exemplo: "Edições feitas nas últimas 2 horas podem não ter sido salvas"

### 🛡️ Medidas Preventivas

Para evitar recorrência deste problema, implementamos:

- [Medida preventiva 1]
- [Medida preventiva 2]
- [Medida preventiva 3]

### 📋 Próximos Passos

- **Sistema está disponível agora** - você pode retomar o trabalho normalmente
- [Se houve perda de dados] Recomendamos revisar ETPs editados durante o período do incidente
- Se encontrar qualquer problema, por favor nos contate: [email/canal de suporte]

---

Agradecemos sua paciência e compreensão durante a resolução deste incidente.

Atenciosamente,
**Equipe ETP Express**

---

## Slack/Teams Template

```
✅ **INCIDENT RESOLVED - ETP Express**

O problema reportado às [HH:MM] foi resolvido.

**Root Cause:** [Causa raiz simplificada]
**Resolução:** [O que foi feito]
**Status:** Sistema normalizado
**Dados:** ✅ Seguros / ⚠️ [Descrição de impacto]

Sistema está disponível para uso normal.

Post-mortem completo será publicado em 48h.
```

---

## Exemplo Preenchido: Database Down Resolved

**Assunto:** [ETP Express] Sistema Normalizado - Problema de Conexão Resolvido

---

Prezados usuários do ETP Express,

O problema técnico que afetava o sistema foi **completamente resolvido**.

### ✅ Resumo da Resolução

**Problema Identificado:** Falha temporária na infraestrutura do banco de dados causada por atualização de segurança do provedor de cloud (Railway)

**Ações Tomadas:**
- Reiniciamos o serviço de banco de dados
- Validamos integridade de todos os dados armazenados
- Executamos testes completos de funcionalidade
- Confirmamos restauração de todos os endpoints críticos

**Status Atual:** Sistema normalizado e funcionando corretamente

**Verificação:** Todos os testes confirmam funcionamento normal
- ✅ Login funcional
- ✅ Criação de ETPs funcional
- ✅ Geração de seções funcional
- ✅ Exportação de PDFs funcional

### 🔒 Segurança dos Dados

✅ **Todos os dados estão seguros.** Não houve perda de informações. Todos os ETPs criados e editados antes do incidente (15h20) foram preservados integralmente.

### 🛡️ Medidas Preventivas

Para evitar recorrência deste problema, implementamos:

- Monitoramento proativo de health check do banco de dados (alertas a cada 30s)
- Procedimento de rollback automático em caso de falhas similares
- Backup automático adicional antes de atualizações de infraestrutura

### 📋 Próximos Passos

- **Sistema está disponível agora** - você pode retomar o trabalho normalmente
- Não é necessária nenhuma ação de sua parte
- Se encontrar qualquer problema, por favor nos contate: suporte@etpexpress.com

---

**Duração total do incidente:** 45 minutos (15h20 - 16h05)

Agradecemos sua paciência e compreensão durante a resolução deste incidente.

Atenciosamente,
**Equipe ETP Express**

---

## Checklist Antes de Enviar

- [ ] Incidente **COMPLETAMENTE** resolvido (não apenas mitigado)?
- [ ] Health checks e smoke tests passando?
- [ ] Root cause identificada e descrita de forma clara?
- [ ] Ações tomadas documentadas?
- [ ] Impacto em dados claramente comunicado?
- [ ] Medidas preventivas definidas?
- [ ] Mensagem revisada (tom positivo, transparente)?
- [ ] Post-mortem agendado (se P0/P1)?

---

## Timing

**Enviar imediatamente após:**
- Sistema 100% normalizado
- Smoke tests finais passando
- Incident Commander aprovar comunicação

**⚠️ NÃO enviar se:**
- Sistema ainda instável
- Root cause não identificada
- Possibilidade de recorrência imediata

---

## Tone Guidelines

✅ **DO:**
- Ser transparente sobre root cause
- Agradecer pela paciência
- Focar em medidas preventivas
- Usar linguagem clara e objetiva

❌ **DON'T:**
- Fazer promessas impossíveis ("nunca mais vai acontecer")
- Usar jargão técnico excessivo
- Culpar terceiros (providers, etc)
- Minimizar impacto sofrido pelos usuários

---

## Follow-up Actions

1. **+24h:** Enviar post-mortem resumido (opcional, se P0)
2. **+7 dias:** Confirmar que medidas preventivas foram implementadas
3. **+30 dias:** Revisar métricas (incidente similar recorreu?)

---

**Template Version:** 1.0
**Last Updated:** 2025-11-15
