# Registro de Incidentes - ETP Express

Este diretorio contem a documentacao de incidentes de producao.

## Estrutura

```
docs/incidents/
  README.md           # Este arquivo
  2025/               # Incidentes de 2025
    INC-2025-MM-DD-XX.md
```

## Nomenclatura

`INC-YYYY-MM-DD-XX`

- `YYYY`: Ano
- `MM`: Mes
- `DD`: Dia
- `XX`: Numero sequencial do dia (01, 02, etc.)

## Severidade

| Severidade | Obrigatorio Post-Mortem | Prazo |
|------------|-------------------------|-------|
| P0 | Sim | 48h |
| P1 | Sim (se duracao >2h) | 72h |
| P2 | Opcional | 1 semana |
| P3 | Nao | N/A |

## Templates

- [Notificacao de Incidente](../templates/incident-notification.md)
- [Incidente Resolvido](../templates/incident-resolved.md)
- [Post-Mortem](../templates/post-mortem.md)

## Referencia

- [SLA e Definicoes](../SLA.md)
- [OPS Runbook](../OPS_RUNBOOK.md)

---

## Historico de Incidentes

### 2025

| ID | Data | Severidade | Duracao | Resumo | Status |
|----|------|------------|---------|--------|--------|
| - | - | - | - | Nenhum incidente registrado | - |

---

**Atualizado em:** 2025-12-20
