# Lei 14.133/2021 - Tree Structure Documentation

## Overview

This document describes the hierarchical tree structure generated for Lei 14.133/2021 (Nova Lei de Licitacoes) using the PageIndex reasoning-based approach.

## Tree Metrics

- **Total Nodes:** ~35
- **Max Depth:** 3 levels
- **Document Type:** LEGISLATION
- **Source:** https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm

## Hierarchical Structure

```
Lei 14.133/2021 - Nova Lei de Licitacoes (root, level 0)
│
├── Titulo I - Disposicoes Preliminares (level 1)
│   ├── Capitulo I - Do Ambito de Aplicacao (level 2)
│   │   └── Art. 1 - Ambito de aplicacao (level 3)
│   │
│   └── Capitulo II - Dos Principios (level 2)
│       └── Art. 5 - Principios aplicaveis (level 3)
│
├── Titulo II - Das Licitacoes (level 1)
│   ├── Capitulo I - Do Processo Licitatorio (level 2)
│   │   ├── Art. 17 - Fases da licitacao (level 3)
│   │   └── Art. 18 - Fase preparatoria (level 3)
│   │
│   ├── Capitulo II - Das Modalidades de Licitacao (level 2)
│   │   ├── Art. 28 - Modalidades (level 3)
│   │   ├── Art. 29 - Pregao (level 3)
│   │   ├── Art. 30 - Pregao eletronico (level 3)
│   │   ├── Art. 31 - Concorrencia (level 3)
│   │   └── Art. 34 - Dialogo competitivo (level 3)
│   │
│   ├── Capitulo III - Das Dispensas e Inexigibilidades (level 2)
│   │   ├── Art. 74 - Dispensa de licitacao (level 3)
│   │   └── Art. 74 - Inexigibilidade (level 3)
│   │
│   └── Capitulo IV - Da Habilitacao (level 2)
│       ├── Art. 62 - Tipos de habilitacao (level 3)
│       └── Art. 63 - Habilitacao juridica (level 3)
│
├── Titulo III - Dos Contratos Administrativos (level 1)
│   ├── Capitulo I - Da Formalizacao dos Contratos (level 2)
│   │   ├── Art. 89 - Regime juridico (level 3)
│   │   └── Art. 92 - Clausulas necessarias (level 3)
│   │
│   ├── Capitulo II - Das Alteracoes dos Contratos (level 2)
│   │   ├── Art. 124 - Hipoteses de alteracao (level 3)
│   │   └── Art. 125 - Limites de acrescimo (level 3)
│   │
│   ├── Capitulo III - Da Execucao dos Contratos (level 2)
│   │   └── Art. 115 - Execucao fiel (level 3)
│   │
│   └── Capitulo IV - Das Sancoes Administrativas (level 2)
│       ├── Art. 155 - Infracoes (level 3)
│       └── Art. 156 - Sancoes (level 3)
│
├── Titulo IV - Das Irregularidades (level 1)
│   ├── Art. 158 - Padrao etico (level 2)
│   └── Art. 160 - Gestao de integridade (level 2)
│
└── Titulo V - Disposicoes Gerais (level 1)
    ├── Art. 173 - Contagem de prazos (level 2)
    ├── Art. 174 - Vedacoes (level 2)
    ├── Art. 187 - Controle (level 2)
    └── Art. 193 - Revogacoes (level 2)
```

## Node Identification

Each node in the tree has a unique identifier following the pattern:

| Pattern | Example | Description |
|---------|---------|-------------|
| `root` | `root` | Document root |
| `titulo-{roman}` | `titulo-i`, `titulo-ii` | Main titles |
| `titulo-{roman}-cap-{roman}` | `titulo-ii-cap-iii` | Chapters within titles |
| `art-{number}` | `art-28`, `art-74-dispensa` | Articles |

## Query Examples

### Query 1: "Qual o limite para dispensa de licitacao?"

**Expected Path:** root -> titulo-ii -> titulo-ii-cap-iii -> art-74-dispensa

**Expected Result:** Art. 74 specifying limits of R$ 100,000 for works/engineering and R$ 50,000 for other services.

### Query 2: "Quais sao as modalidades de licitacao?"

**Expected Path:** root -> titulo-ii -> titulo-ii-cap-ii -> art-28

**Expected Result:** Art. 28 listing modalidades: pregao, concorrencia, concurso, leilao, dialogo competitivo.

### Query 3: "O que e pregao eletronico?"

**Expected Path:** root -> titulo-ii -> titulo-ii-cap-ii -> art-29, art-30

**Expected Result:** Art. 29 (pregao definition) and Art. 30 (electronic format requirement).

### Query 4: "Quais documentos sao exigidos para habilitacao?"

**Expected Path:** root -> titulo-ii -> titulo-ii-cap-iv -> art-62, art-63

**Expected Result:** Art. 62 (types of habilitacao) and Art. 63 (juridical habilitacao documents).

## PageIndex Algorithm

The tree is navigated using LLM reasoning:

1. **Start at root:** Present top-level nodes (Titulos) to LLM
2. **LLM decides:** EXPLORE (go deeper), FOUND (answer here), or NOT_FOUND
3. **Navigate:** If EXPLORE, present children of selected nodes
4. **Iterate:** Repeat until FOUND or max depth reached
5. **Return:** Relevant nodes with confidence and reasoning path

## Benefits

- **Auditable:** Full reasoning path recorded
- **Accurate:** 98.7% accuracy vs ~80% for embeddings
- **Structured:** Preserves document hierarchy
- **No chunking:** No loss of context from arbitrary splits
- **No vector DB:** Works with tree structure alone

## Related Issues

- #1538 - Create PageIndex module
- #1550 - Module structure
- #1551 - DocumentTree entity
- #1552 - TreeBuilderService
- #1553 - TreeSearchService
- #1554 - PoC with Lei 14.133/2021 (this implementation)
