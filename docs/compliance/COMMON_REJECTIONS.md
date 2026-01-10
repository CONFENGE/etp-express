# Motivos Comuns de Rejeicao de ETPs pelo TCU

**Versao:** 1.0 | **Data:** 2026-01-10 | **Autor:** Pesquisa automatizada ETP Express

---

## Visao Geral

Este documento lista os motivos mais frequentes de devolucao/rejeicao de ETPs identificados em acordaos do TCU e auditorias de tribunais de contas. Cada motivo inclui a descricao do problema, a fundamentacao legal, e a solucao recomendada.

---

## Categoria 1: Deficiencias na Descricao da Necessidade

### REJ-001: Justificativa de necessidade generica ou ausente

| Campo | Valor |
|-------|-------|
| **Frequencia** | MUITO ALTA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | Art. 18, par. 1o, I - Lei 14.133/2021 |
| **Secao afetada** | Justificativa |

**Problema:** O ETP nao descreve adequadamente o problema a ser resolvido sob a perspectiva do interesse publico. Justificativas vagas como "atender as necessidades da instituicao" sao insuficientes.

**Texto rejeitado (exemplo):**
> "A contratacao visa atender as necessidades operacionais do orgao."

**Solucao:**
1. Descrever o problema especifico que a contratacao resolve
2. Quantificar o impacto do problema (custos, tempo perdido, riscos)
3. Demonstrar o interesse publico envolvido
4. Citar dados e metricas que fundamentem a necessidade

**Texto aceito (exemplo):**
> "O orgao atualmente opera com sistema de gestao de documentos desenvolvido em 2010, que apresenta vulnerabilidades de seguranca (CVE-2023-XXXX) e indisponibilidade media de 15 horas/mes, impactando o atendimento de aproximadamente 5.000 cidadaos mensais. A contratacao de novo sistema visa garantir a continuidade do servico publico e conformidade com a LGPD."

---

### REJ-002: Ausencia de analise de alternativas

| Campo | Valor |
|-------|-------|
| **Frequencia** | ALTA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | Art. 18, par. 1o, V - Lei 14.133/2021 |
| **Secao afetada** | Justificativa / Requisitos |

**Problema:** O ETP nao demonstra que foram analisadas alternativas de solucao antes de escolher a opcao apresentada. O TCU ja anulou processos licitatorios por este motivo.

**Solucao:**
1. Listar pelo menos 3 alternativas de solucao
2. Analisar pros e contras de cada alternativa
3. Apresentar criterios objetivos de comparacao (custo, prazo, risco, qualidade)
4. Justificar tecnicamente a escolha da alternativa selecionada

**Estrutura recomendada:**
```
| Alternativa | Custo Estimado | Prazo | Riscos | Adequacao |
|-------------|----------------|-------|--------|-----------|
| Opcao A     | R$ X           | X dias| Alto   | Parcial   |
| Opcao B     | R$ Y           | Y dias| Medio  | Adequada  |
| Opcao C     | R$ Z           | Z dias| Baixo  | Excelente |

Conclusao: A Opcao C foi selecionada por apresentar menor risco e maior adequacao aos requisitos, conforme criterios definidos.
```

---

## Categoria 2: Deficiencias na Estimativa de Precos

### REJ-003: Pesquisa de precos insuficiente ou inadequada

| Campo | Valor |
|-------|-------|
| **Frequencia** | MUITO ALTA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | IN SEGES 65/2021 |
| **Secao afetada** | Estimativa de Custos |

**Problema:** O ETP apresenta estimativa de precos sem fontes adequadas, sem data-base, ou com menos de 3 fontes de pesquisa.

**Erros comuns:**
- Usar apenas cotacoes de fornecedores sem outras fontes
- Nao informar data-base dos precos
- Usar precos de SINAPI/SICRO desatualizados
- Nao anexar comprovantes da pesquisa

**Solucao:**
1. Utilizar **minimo 3 fontes** de pesquisa
2. Priorizar: Painel de Precos, Contratacoes similares, SINAPI/SICRO
3. Informar data-base de cada fonte
4. Anexar prints/comprovantes
5. Utilizar mediana (preferivel) ou media para valor estimado
6. Justificar exclusao de valores inexequiveis/excessivos

**Estrutura recomendada:**
```
| Fonte | Valor Unitario | Data-Base | Observacao |
|-------|----------------|-----------|------------|
| Painel de Precos | R$ 100,00 | 01/2026 | UASG XXXX |
| Contrato XXXX | R$ 95,00 | 12/2025 | Pregao YYY |
| SINAPI | R$ 110,00 | 01/2026 | Codigo ZZZZ |

Mediana: R$ 100,00
Valor estimado para contratacao: R$ 100,00 x 1.000 un = R$ 100.000,00
```

---

### REJ-004: Falta de referencia SINAPI/SICRO em obras

| Campo | Valor |
|-------|-------|
| **Frequencia** | ALTA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | Art. 23, Lei 14.133/2021; Acordao TCU 2622/2013 |
| **Secao afetada** | Estimativa de Custos |

**Problema:** ETPs de obras e servicos de engenharia que nao utilizam SINAPI ou SICRO como referencia de precos, ou que utilizam tabelas desatualizadas.

**Solucao:**
1. Obrigatoriamente citar SINAPI (obras civis) ou SICRO (rodovias)
2. Informar mes/ano da tabela utilizada (data-base)
3. Para itens nao constantes nas tabelas, justificar e usar cotacoes
4. Aplicar BDI conforme parametros do TCU

**Estrutura recomendada:**
```
Referencia: SINAPI [MES/ANO] - [Estado]
Codigo: XXXXX - Descricao do servico
Preco unitario: R$ XX,XX
BDI aplicado: XX% (conforme Acordao TCU 2622/2013)
Preco com BDI: R$ YY,YY
```

---

## Categoria 3: Deficiencias na Documentacao Tecnica

### REJ-005: Ausencia de ART/RRT em obras

| Campo | Valor |
|-------|-------|
| **Frequencia** | ALTA |
| **Gravidade** | GRAVE |
| **Fundamentacao** | Lei 5.194/66, Lei 12.378/10 |
| **Secao afetada** | Identificacao |

**Problema:** ETPs de obras e servicos de engenharia sem mencao a ART (CREA) ou RRT (CAU) do responsavel tecnico pela elaboracao.

**Solucao:**
1. Identificar profissional responsavel tecnico (engenheiro/arquiteto)
2. Citar numero da ART ou RRT emitida
3. Verificar habilitacao do profissional para o tipo de obra

**Texto aceito (exemplo):**
> "Responsavel Tecnico: Eng. Civil Fulano de Tal - CREA-XX 00000/D
> ART de projeto: ART 0000000000000"

---

### REJ-006: Especificacoes com direcionamento

| Campo | Valor |
|-------|-------|
| **Frequencia** | MEDIA |
| **Gravidade** | GRAVE |
| **Fundamentacao** | Art. 47, Lei 14.133/2021 |
| **Secao afetada** | Requisitos |

**Problema:** Especificacoes tecnicas que direcionam para marca ou fornecedor especifico sem justificativa tecnica adequada.

**Exemplos de direcionamento:**
- "Deve ser fabricado pela empresa X" (sem justificativa)
- "Compativel apenas com sistema Y" (sem demonstrar exclusividade)
- Especificacoes que apenas um fornecedor atende

**Solucao:**
1. Especificar por caracteristicas de desempenho (nao por marca)
2. Se necessario citar marca, incluir "ou similar/equivalente"
3. Se exclusividade tecnica comprovada, anexar estudo que demonstre
4. Verificar se especificacoes sao atendidas por multiplos fornecedores

---

## Categoria 4: Deficiencias na Analise de Riscos

### REJ-007: Ausencia ou insuficiencia de analise de riscos

| Campo | Valor |
|-------|-------|
| **Frequencia** | MEDIA |
| **Gravidade** | MODERADA |
| **Fundamentacao** | Art. 18, par. 1o, XII - Lei 14.133/2021 |
| **Secao afetada** | Riscos |

**Problema:** O ETP nao identifica riscos da contratacao ou apresenta analise superficial sem medidas de mitigacao.

**Solucao:**
1. Identificar riscos tecnicos, operacionais e de gestao
2. Classificar riscos por probabilidade e impacto
3. Definir medidas de mitigacao para cada risco
4. Atribuir responsaveis e prazos

**Estrutura recomendada:**
```
| Risco | Probabilidade | Impacto | Mitigacao | Responsavel |
|-------|---------------|---------|-----------|-------------|
| Atraso na entrega | Media | Alto | Clausula de multa; estoque minimo | Fiscal |
| Defeito no produto | Baixa | Medio | Garantia de 12 meses; testes de recepcao | Fiscal |
| Variacao de precos | Alta | Alto | Clausula de reajuste anual; contrato curto | Gestor |
```

---

## Categoria 5: Deficiencias Formais

### REJ-008: ETP elaborado apos o Termo de Referencia

| Campo | Valor |
|-------|-------|
| **Frequencia** | MEDIA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | Art. 6o, XX - Lei 14.133/2021 |
| **Secao afetada** | N/A |

**Problema:** O ETP foi elaborado de forma "pro forma", apos a definicao do objeto no Termo de Referencia, invertendo a logica do planejamento.

**Evidencias de irregularidade:**
- Data de assinatura do ETP posterior ao TR
- ETP identico ao TR (copia)
- Ausencia de analise de alternativas genuina

**Solucao:**
1. Garantir que ETP seja PRIMEIRA etapa do planejamento
2. Elaborar ETP antes do TR/Projeto Basico
3. ETP deve embasar as decisoes, nao ratificar decisoes ja tomadas

---

### REJ-009: Falta de posicionamento conclusivo

| Campo | Valor |
|-------|-------|
| **Frequencia** | ALTA |
| **Gravidade** | CRITICA |
| **Fundamentacao** | Art. 18, par. 1o, XIII - Lei 14.133/2021 |
| **Secao afetada** | Conclusao |

**Problema:** O ETP nao apresenta conclusao clara sobre a viabilidade e adequacao da contratacao.

**Solucao:**
O ETP deve conter posicionamento conclusivo explicito, como:

**Texto aceito (exemplo):**
> "Diante da analise realizada, concluimos que:
> 1. A contratacao e VIAVEL tecnicamente, pois existem fornecedores qualificados no mercado;
> 2. A contratacao e VIAVEL economicamente, conforme pesquisa de precos que demonstrou valor compativel com o mercado;
> 3. A contratacao e ADEQUADA para atender a necessidade descrita;
> 4. Recomenda-se prosseguir com a elaboracao do Termo de Referencia."

---

### REJ-010: Falta de justificativa para nao parcelamento

| Campo | Valor |
|-------|-------|
| **Frequencia** | ALTA |
| **Gravidade** | GRAVE |
| **Fundamentacao** | Art. 18, par. 1o, VIII - Lei 14.133/2021 |
| **Secao afetada** | Requisitos / Parcelamento |

**Problema:** O ETP nao justifica a decisao de parcelar ou nao parcelar o objeto, o que e elemento OBRIGATORIO.

**Solucao:**
Incluir secao especifica justificando:

**Se NAO parcelar:**
> "Optou-se por nao parcelar o objeto tendo em vista que: (a) existe interdependencia tecnica entre os itens; (b) o parcelamento geraria deseconomia de escala; (c) a execucao conjunta e tecnicamente recomendavel. Fundamentacao: Art. 47, par. 1o, Lei 14.133/2021."

**Se PARCELAR:**
> "Optou-se pelo parcelamento do objeto em X lotes para: (a) ampliar a competitividade; (b) permitir participacao de MPEs; (c) os itens sao tecnicamente independentes. Fundamentacao: Art. 47, Lei 14.133/2021."

---

## Resumo de Frequencia de Rejeicoes

| Codigo | Motivo | Frequencia | Gravidade |
|--------|--------|------------|-----------|
| REJ-001 | Justificativa generica | MUITO ALTA | CRITICA |
| REJ-002 | Falta de analise de alternativas | ALTA | CRITICA |
| REJ-003 | Pesquisa de precos inadequada | MUITO ALTA | CRITICA |
| REJ-004 | Falta de SINAPI/SICRO em obras | ALTA | CRITICA |
| REJ-005 | Ausencia de ART/RRT | ALTA | GRAVE |
| REJ-006 | Especificacoes com direcionamento | MEDIA | GRAVE |
| REJ-007 | Analise de riscos insuficiente | MEDIA | MODERADA |
| REJ-008 | ETP elaborado apos TR | MEDIA | CRITICA |
| REJ-009 | Falta de posicionamento conclusivo | ALTA | CRITICA |
| REJ-010 | Falta de justificativa parcelamento | ALTA | GRAVE |

---

## Referencias

- [TCU - Licitacoes e Contratos](https://licitacoesecontratos.tcu.gov.br/)
- [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)
- [IN SEGES 58/2022](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-no-58-de-8-de-agosto-de-2022)
- [IN SEGES 65/2021](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-65-de-7-de-julho-de-2021)
- [TCE-SP - Lei 14.133 Comentada](https://www.tce.sp.gov.br/legislacao-comentada/lei-14133-1o-abril-2021)
- [Ronny Charles - Estudo Tecnico Preliminar](https://ronnycharles.com.br/da-nao-obrigatoriedade-de-elaboracao-do-estudo-tecnico-preliminar/)
