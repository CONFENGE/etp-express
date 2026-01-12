# Criterios de Auditoria TCU/TCE para ETPs

**Versao:** 1.0.0 | **Data:** 2026-01-12 | **Issue:** #1262

---

## Sumario

Este documento mapeia os criterios de validacao utilizados pelos robos ALICE/SOFIA do TCU para auditoria de ETPs, conforme pesquisa em documentacao publica e acordaos do tribunal.

---

## 1. Visao Geral do ALICE/SOFIA

### 1.1 O que e o ALICE?

O **ALICE** (Analise de Licitacoes e Editais) e um sistema de inteligencia artificial desenvolvido pelo TCU que analisa automaticamente processos de contratacoes publicas. O sistema busca identificar:

- Irregularidades em licitacoes
- Direcionamento de especificacoes
- Sobrepreco e superfaturamento
- Fracionamento irregular
- Ausencia de elementos obrigatorios

### 1.2 O que e o SOFIA?

O **SOFIA** (Sistema de Orientacao sobre Fatos e Indicios para o Auditor) complementa o ALICE, oferecendo orientacoes aos auditores sobre possiveis irregularidades encontradas.

### 1.3 Relevancia para ETPs

O ETP e a **primeira etapa** do planejamento de contratacoes (Art. 6o, XX, Lei 14.133/2021). ETPs mal elaborados podem resultar em:

- Anulacao do processo licitatorio
- Determinacao de refazer o planejamento
- Responsabilizacao de servidores
- Multas e penalidades

---

## 2. Criterios Mapeados por Categoria

### 2.1 IDENTIFICACAO (5 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-043 | Responsavel pela elaboracao do ETP | HIGH | Art. 18, Lei 14.133/2021 |
| TCU-044 | Data de elaboracao do ETP | MEDIUM | Art. 18, Lei 14.133/2021 |
| TCU-045 | Numero do processo administrativo | MEDIUM | Lei 9.784/1999 |
| TCU-046 | Orgao demandante | MEDIUM | Art. 18, Lei 14.133/2021 |
| TCU-047 | Objeto da contratacao | CRITICAL | Art. 18, Lei 14.133/2021 |

### 2.2 JUSTIFICATIVA (5 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-001 | Descricao da necessidade da contratacao | CRITICAL | Art. 18, par. 1o, I |
| TCU-002 | Analise de alternativas de solucao | CRITICAL | Art. 18, par. 1o, V |
| TCU-021 | Demonstrativo de resultados pretendidos | MEDIUM | Art. 18, par. 1o, IX |
| TCU-025 | Alinhamento com PDTIC (TI) | HIGH | IN SGD 94/2022 |

### 2.3 REQUISITOS (18 criterios)

| ID | Criterio | Severidade | Aplicavel a |
|----|----------|------------|-------------|
| TCU-003 | Estimativa de quantidades | CRITICAL | Todos |
| TCU-006 | Justificativa para parcelamento | CRITICAL | Todos |
| TCU-010 | Especificacoes tecnicas nao restritivas | HIGH | Todos |
| TCU-011 | Cronograma fisico-financeiro | MEDIUM | OBRAS |
| TCU-013 | Niveis de servico (SLA) | MEDIUM | TI, SERVICOS |
| TCU-014 | Requisitos de seguranca da informacao | HIGH | TI |
| TCU-016 | Indicadores de desempenho (KPIs) | MEDIUM | SERVICOS |
| TCU-017 | Frequencia e horarios de execucao | LOW | SERVICOS |
| TCU-018 | Prazo de garantia | MEDIUM | MATERIAIS, TI |
| TCU-020 | Descricao da solucao como um todo | MEDIUM | Todos |
| TCU-022 | Providencias previas a contratacao | LOW | Todos |
| TCU-023 | Contratacoes correlatas | LOW | Todos |
| TCU-026 | Transferencia de conhecimento | MEDIUM | TI |
| TCU-027 | Plano de transicao contratual | MEDIUM | TI, SERVICOS |
| TCU-028 | Propriedade intelectual | HIGH | TI |
| TCU-029 | Produtividade de referencia | HIGH | SERVICOS |
| TCU-031 | Uniformes e EPIs | LOW | SERVICOS |
| TCU-032 | Plano de fiscalizacao | MEDIUM | OBRAS, TI, SERVICOS |
| TCU-049 | Integracao com sistemas existentes | MEDIUM | TI |
| TCU-050 | Hospedagem e infraestrutura | MEDIUM | TI |
| TCU-051 | Acessibilidade digital | HIGH | TI |

### 2.4 ESTIMATIVA DE PRECOS (9 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-004 | Pesquisa de mercado (3+ fontes) | CRITICAL | IN SEGES 65/2021 |
| TCU-005 | Referencia SINAPI/SICRO (obras) | CRITICAL | Art. 23, Lei 14.133 |
| TCU-030 | Referencia a convencao coletiva | HIGH | IN SEGES 5/2017 |
| TCU-038 | BDI detalhado (obras) | HIGH | Acordao TCU 2622/2013 |
| TCU-040 | Data-base dos precos | HIGH | IN SEGES 65/2021 |
| TCU-041 | Exclusao de precos inexequiveis | MEDIUM | IN SEGES 65/2021 |
| TCU-042 | Metodologia de calculo | MEDIUM | IN SEGES 65/2021 |

### 2.5 RISCOS (3 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-008 | Analise de riscos com mitigacao | HIGH | Art. 18, par. 1o, XII |
| TCU-024 | Impactos ambientais | MEDIUM | Art. 18, par. 1o, XII |
| TCU-036 | Logistica reversa | LOW | Lei 12.305/2010 |

### 2.6 CONCLUSAO (1 criterio)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-007 | Posicionamento conclusivo | CRITICAL | Art. 18, par. 1o, XIII |

### 2.7 DOCUMENTACAO (6 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-009 | ART/RRT do responsavel tecnico | HIGH | Lei 5.194/1966 |
| TCU-012 | Memorial descritivo | MEDIUM | Art. 6o, XXV |
| TCU-019 | Previsao no PCA | MEDIUM | Art. 18, par. 1o, II |
| TCU-033 | Catalogo de referencia | LOW | Art. 19, Lei 14.133 |
| TCU-034 | Historico de consumo | MEDIUM | Art. 18, par. 1o, IV |
| TCU-035 | Exigencia de amostras | LOW | Art. 42, Lei 14.133 |
| TCU-039 | Projeto basico ou anteprojeto | HIGH | Art. 18, par. 3o |
| TCU-048 | ETP anterior ao TR | CRITICAL | Art. 6o, XX |

### 2.8 CONFORMIDADE LEGAL (3 criterios)

| ID | Criterio | Severidade | Referencia Legal |
|----|----------|------------|------------------|
| TCU-015 | Conformidade LGPD | HIGH | Lei 13.709/2018 |
| TCU-037 | Licencas ambientais (obras) | HIGH | CONAMA 237/1997 |
| TCU-052 | Classificacao de dados | HIGH | Decreto 7.845/2012 |

---

## 3. Elementos OBRIGATORIOS do ETP (Lei 14.133/2021)

Conforme Art. 18, par. 2o, os seguintes elementos sao **sempre obrigatorios**:

| Inciso | Elemento | ID Mapeado |
|--------|----------|------------|
| I | Descricao da necessidade | TCU-001 |
| IV | Estimativas de quantidades | TCU-003 |
| VI | Estimativa do valor | TCU-004, TCU-005 |
| VIII | Parcelamento ou nao | TCU-006 |
| XIII | Posicionamento conclusivo | TCU-007 |

---

## 4. Acordaos TCU Relevantes

### 4.1 Anulacao por ETP Deficiente

| Acordao | Tema | Determinacao |
|---------|------|--------------|
| 488/2019 | Publicacao ETP | Recomendou publicacao do ETP junto ao edital |
| 2076/2023 | Publicacao ETP | Confirmou irregularidade na falta de publicacao |
| 1463/2024 | Publicacao ETP | Reafirmou necessidade de publicidade |
| 2273/2024 | Publicacao ETP | ETP nao e anexo OBRIGATORIO do edital |

### 4.2 Direcionamento e Restricao de Competitividade

| Acordao | Tema | Determinacao |
|---------|------|--------------|
| - | Especificacoes | Anulou licitacao por especificacoes restritivas |
| - | ETP pro forma | Anulou processo por ausencia de analise de alternativas |

### 4.3 Precos de Referencia

| Acordao | Tema | Determinacao |
|---------|------|--------------|
| 2622/2013 | BDI Obras | Definiu parametros de BDI para obras publicas |
| - | SINAPI/SICRO | Obrigatoriedade de uso em obras |

---

## 5. Niveis de Severidade

| Nivel | Peso | Descricao |
|-------|------|-----------|
| **CRITICAL** | 1.0 | Obrigatorio por lei - ausencia pode anular processo |
| **HIGH** | 0.8 | Altamente recomendado - gera apontamento grave |
| **MEDIUM** | 0.5 | Recomendado - gera apontamento moderado |
| **LOW** | 0.2 | Opcional - agrega valor mas nao obrigatorio |

---

## 6. Aplicabilidade por Tipo de ETP

### 6.1 OBRAS (42 criterios aplicaveis)

Criterios especificos: TCU-005 (SINAPI/SICRO), TCU-009 (ART/RRT), TCU-011 (cronograma), TCU-037 (licencas ambientais), TCU-038 (BDI), TCU-039 (projeto basico).

### 6.2 TI (45 criterios aplicaveis)

Criterios especificos: TCU-013 (SLA), TCU-014 (seguranca), TCU-015 (LGPD), TCU-025 (PDTIC), TCU-026 (transferencia conhecimento), TCU-027 (transicao), TCU-028 (propriedade intelectual), TCU-049 (integracao), TCU-050 (hospedagem), TCU-051 (acessibilidade), TCU-052 (classificacao dados).

### 6.3 SERVICOS (40 criterios aplicaveis)

Criterios especificos: TCU-013 (SLA), TCU-016 (KPIs), TCU-017 (horarios), TCU-027 (transicao), TCU-029 (produtividade), TCU-030 (convencao coletiva), TCU-031 (uniformes/EPIs).

### 6.4 MATERIAIS (35 criterios aplicaveis)

Criterios especificos: TCU-018 (garantia), TCU-033 (CATMAT), TCU-034 (historico consumo), TCU-035 (amostras).

---

## 7. Integracao com ETP Express

### 7.1 Arquivo de Configuracao

Os criterios estao documentados em formato JSON em:
```
backend/src/modules/compliance/data/compliance-rules.json
```

### 7.2 Schema de Validacao

O schema JSON para validacao estrutural esta em:
```
backend/src/modules/compliance/data/compliance-rules.schema.json
```

### 7.3 Seeder

O seeder que popula os checklists no banco esta em:
```
backend/src/modules/compliance/compliance-checklist.seeder.ts
```

---

## 8. Referencias

### Legislacao

- [Lei 14.133/2021 - Art. 18](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)
- [IN SEGES 58/2022 - ETP Digital](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-no-58-de-8-de-agosto-de-2022)
- [IN SEGES 65/2021 - Pesquisa de Precos](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-65-de-7-de-julho-de-2021)
- [IN SGD 94/2022 - Contratacoes de TIC](https://www.gov.br/governodigital/pt-br/contratacoes/instrucao-normativa-sgd-me-no-94)
- [Lei 13.709/2018 - LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

### TCU

- [Portal de Licitacoes e Contratos TCU](https://licitacoesecontratos.tcu.gov.br/)
- [TCU - Robo ALICE](https://portal.tcu.gov.br/imprensa/noticias/conheca-alice-a-inteligencia-artificial-do-tcu.htm)
- [Acordao TCU 2622/2013 - BDI](https://portal.tcu.gov.br/sumarios-e-relatorios/acordao-2622-2013-plenario/)

### Outros

- [TCE-SP - Lei 14.133 Comentada](https://www.tce.sp.gov.br/legislacao-comentada/lei-14133-1o-abril-2021/18)
- COMMON_REJECTIONS.md - Motivos comuns de rejeicao
- TCU_REQUIREMENTS.md - Requisitos detalhados por tipo

---

## Historico de Versoes

| Versao | Data | Alteracao |
|--------|------|-----------|
| 1.0.0 | 2026-01-12 | Versao inicial - 52 criterios mapeados |
