# Incident Notification Template

**Uso:** Comunicar usuários quando um incidente em produção está em andamento e afeta funcionalidades do sistema.

**Quando usar:**

- ✅ Incidente P0 ou P1 confirmado
- ✅ Impacto afeta usuários finais
- ✅ Estimativa de resolução > 15 minutos

**Quando NÃO usar:**

- ❌ Incidentes P2/P3 (baixo impacto)
- ❌ Manutenção planejada (usar outro template)
- ❌ Problema já resolvido (usar incident-resolved.md)

---

## Email Template

**Assunto:** [ETP Express] Sistema com Instabilidade - [Descrição Breve]

---

Prezados usuários do ETP Express,

Identificamos um problema técnico que está afetando o funcionamento do sistema.

### Resumo

**Problema:** [Descrição clara e objetiva do problema]

**Impacto:** [O que os usuários NÃO conseguem fazer]

- Exemplo: "Não é possível gerar novas seções de ETPs"
- Exemplo: "Sistema completamente indisponível"
- Exemplo: "Login está apresentando lentidão (>30s)"

**Status:** Nossa equipe está trabalhando ativamente na resolução

**Previsão de normalização:** [Estimativa realista ou "Investigando"]

- Se < 1h: Informar estimativa (ex: "até 30 minutos")
- Se desconhecido: "Investigando. Atualizações a cada 30 minutos"

### Próximos Passos

- Você receberá atualizações por email a cada **30 minutos** até a resolução
- Mensagem de resolução será enviada assim que o sistema normalizar
- Não é necessário abrir chamados - já estamos cientes do problema

### ℹ Informações Adicionais

[Opcional: Informações relevantes, como horário alternativo, workaround temporário, etc.]

Pedimos desculpas pelo transtorno. Estamos trabalhando para normalizar o sistema o mais rápido possível.

---

Atenciosamente,
**Equipe ETP Express**

---

## Slack/Teams Template

```
 **INCIDENT ALERT - ETP Express**

**Problema:** [Descrição breve]
**Impacto:** [O que não funciona]
**Status:** Investigando
**ETA:** [Estimativa ou "TBD - updates a cada 30min"]

Nossa equipe está trabalhando na resolução.
Thread para updates: 
```

---

## Exemplo Preenchido: Database Down

**Assunto:** [ETP Express] Sistema Temporariamente Indisponível

---

Prezados usuários do ETP Express,

Identificamos um problema técnico que está afetando o funcionamento do sistema.

### Resumo

**Problema:** Falha na conexão com banco de dados

**Impacto:** Sistema completamente indisponível

- Não é possível acessar ETPs existentes
- Não é possível criar novos ETPs
- Login não está funcionando

**Status:** Nossa equipe está trabalhando ativamente na resolução

**Previsão de normalização:** Estimamos normalização em até **1 hora**

### Próximos Passos

- Você receberá atualizações por email a cada **30 minutos** até a resolução
- Mensagem de resolução será enviada assim que o sistema normalizar
- Não é necessário abrir chamados - já estamos cientes do problema

### ℹ Informações Adicionais

Este é um problema pontual de infraestrutura. **Não há perda de dados** - todos os ETPs salvos anteriormente estão seguros e serão restaurados assim que o sistema normalizar.

Pedimos desculpas pelo transtorno. Estamos trabalhando para normalizar o sistema o mais rápido possível.

---

Atenciosamente,
**Equipe ETP Express**

---

## Checklist Antes de Enviar

- [ ] Severity confirmada (P0 ou P1)?
- [ ] Impacto claramente descrito?
- [ ] Estimativa realista (ou "Investigando")?
- [ ] Frequência de updates definida (padrão: 30min)?
- [ ] Mensagem revisada (tom empático, sem jargão técnico)?
- [ ] Aprovação do Incident Commander (se P0)?

---

## Canais de Distribuição

**Primário:**

- Email para base de usuários cadastrados

**Secundário:**

- Slack/Teams (se houver)
- Status page (se implementado)
- Banner no frontend (se sistema parcialmente funcional)

**Emergência:**

- SMS (apenas P0 com impacto total)

---

**Template Version:** 1.0
**Last Updated:** 2025-11-15
