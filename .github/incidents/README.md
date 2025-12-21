# Registro de Incidentes - ETP Express

Este diretorio contem a documentacao de incidentes ocorridos em producao.

## Estrutura

```
incidents/
  README.md           # Este arquivo
  TEMPLATE.md         # Template para novos incidentes
  YYYY-MM-DD-XXX.md   # Incidentes documentados (por data)
```

## Severidades

| Nivel | Descricao | SLA Resposta | Exemplos |
|-------|-----------|--------------|----------|
| P0 | Sistema indisponivel | 15 min | Login quebrado, 500 em todas rotas |
| P1 | Funcionalidade critica degradada | 1h | LLM timeout, export falhando |
| P2 | Funcionalidade secundaria afetada | 4h | Lentidao, erro intermitente |

## Quando Criar Incidente

- Qualquer P0 (obrigatorio)
- P1 com duracao > 30 minutos
- P2 recorrente (3+ ocorrencias)
- Qualquer evento que afete SLA

## Como Documentar

1. Copie `TEMPLATE.md` para `YYYY-MM-DD-XXX.md`
2. Preencha todas as secoes
3. Commit e push
4. Agende postmortem se necessario

## Historico de Incidentes

| Data | ID | Severidade | Duracao | Resumo |
|------|-----|------------|---------|--------|
| - | - | - | - | Nenhum incidente registrado |

---

**Objetivo:** Zero incidentes P0, minimizar P1.
