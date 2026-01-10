# Requisitos de Conformidade TCU para ETPs

**Versao:** 1.0 | **Data:** 2026-01-10 | **Autor:** Pesquisa automatizada ETP Express

---

## Fundamentacao Legal

### Legislacao Primaria

| Norma | Descricao | Relevancia para ETP |
|-------|-----------|---------------------|
| **Lei 14.133/2021** | Nova Lei de Licitacoes | Art. 18 define estrutura e elementos obrigatorios do ETP |
| **IN SEGES 58/2022** | Regulamenta ETP no ambito federal | Substitui IN 40/2020, define Sistema ETP Digital |
| **IN SEGES 65/2021** | Pesquisa de Precos | Define metodologia e fontes aceitas para estimativa de precos |

### Definicao Legal do ETP

Conforme Art. 6o, inciso XX da Lei 14.133/2021:

> "documento constitutivo da primeira etapa do planejamento de uma contratacao que caracteriza o interesse publico envolvido e a sua melhor solucao e da base ao anteprojeto, ao termo de referencia ou ao projeto basico a serem elaborados caso se conclua pela viabilidade da contratacao"

---

## Elementos do ETP (Art. 18, par. 1o Lei 14.133/2021)

### Elementos OBRIGATORIOS (par. 2o)

Os seguintes elementos sao **obrigatorios** em todo ETP (incisos I, IV, VI, VIII e XIII):

| Inciso | Elemento | Descricao |
|--------|----------|-----------|
| **I** | Descricao da necessidade | Descricao da necessidade da contratacao, considerado o problema a ser resolvido sob a perspectiva do interesse publico |
| **IV** | Estimativas de quantidades | Estimativas das quantidades para a contratacao, acompanhadas das memorias de calculo e dos documentos que lhes dao suporte |
| **VI** | Estimativa do valor | Estimativa do valor da contratacao, acompanhada dos precos unitarios referenciais, das memorias de calculo e dos documentos que lhe dao suporte |
| **VIII** | Parcelamento | Justificativas para o parcelamento ou nao da contratacao |
| **XIII** | Posicionamento conclusivo | Posicionamento conclusivo sobre a adequacao da contratacao para o atendimento da necessidade a que se destina |

### Elementos Condicionais (devem ser incluidos quando aplicaveis ou justificada ausencia)

| Inciso | Elemento | Descricao |
|--------|----------|-----------|
| **II** | Previsao no PCA | Demonstracao da previsao da contratacao no plano de contratacoes anual |
| **III** | Requisitos da contratacao | Requisitos da contratacao necessarios e suficientes a escolha da solucao |
| **V** | Levantamento de mercado | Levantamento de mercado por meio de analise das alternativas possiveis e justificativa tecnica e economica da escolha |
| **VII** | Descricao da solucao | Descricao da solucao como um todo, inclusive das exigencias relacionadas a manutencao e a assistencia tecnica |
| **IX** | Demonstrativo de resultados | Demonstrativo dos resultados pretendidos em termos de economicidade e melhor aproveitamento dos recursos |
| **X** | Providencias previas | Providencias a serem adotadas pela Administracao previamente a celebracao do contrato |
| **XI** | Contratacoes correlatas | Contratacoes correlatas e/ou interdependentes |
| **XII** | Impactos ambientais | Descricao de possiveis impactos ambientais e respectivas medidas mitigadoras |

---

## Requisitos por Tipo de Contratacao

### OBRAS e Servicos de Engenharia

| Requisito | Obrigatorio | Fundamentacao | Keywords para Validacao |
|-----------|-------------|---------------|-------------------------|
| Descricao da necessidade da obra | SIM | Art. 18, par. 1o, I | necessidade, demanda, problema, interesse publico |
| Justificativa da solucao escolhida | SIM | Art. 18, par. 1o, V | solucao, alternativa, escolha, viabilidade |
| Estimativa de quantidades | SIM | Art. 18, par. 1o, IV | quantidade, volume, unidade, memoria de calculo |
| Referencia de precos (SINAPI/SICRO) | SIM | IN 65/2021 | SINAPI, SICRO, preco, referencia, data-base |
| Analise de riscos | RECOMENDADO | Art. 18, par. 1o, XII | risco, mitigacao, contingencia |
| ART/RRT do responsavel tecnico | SIM (obras) | Lei 5.194/66, Lei 12.378/10 | ART, RRT, CREA, CAU, responsavel tecnico |
| Cronograma fisico-financeiro | RECOMENDADO | Art. 46, Lei 14.133 | cronograma, etapa, parcela, desembolso |
| Memorial descritivo | RECOMENDADO | Art. 6o, XXV | memorial, especificacao, descritivo |
| Licencas ambientais (se aplicavel) | CONDICIONAL | Resolucao CONAMA | licenca, ambiental, LP, LI, LO |
| Projeto basico ou anteprojeto | CONDICIONAL | Art. 18, par. 3o | projeto, basico, anteprojeto |
| BDI detalhado | RECOMENDADO | Acordao TCU 2622/2013 | BDI, beneficio, despesas indiretas |

### Tecnologia da Informacao (TI)

| Requisito | Obrigatorio | Fundamentacao | Keywords para Validacao |
|-----------|-------------|---------------|-------------------------|
| Descricao da necessidade | SIM | Art. 18, par. 1o, I | necessidade, demanda, problema |
| Especificacoes tecnicas | SIM | IN SGD 94/2022 | especificacao, tecnica, requisito |
| Niveis de servico (SLA) | RECOMENDADO | IN SGD 94/2022 | SLA, nivel de servico, disponibilidade |
| Conformidade LGPD | CONDICIONAL | Lei 13.709/2018 | LGPD, dados pessoais, privacidade |
| Requisitos de seguranca | RECOMENDADO | IN SGD 94/2022 | seguranca, criptografia, autenticacao |
| Estimativa de precos | SIM | Art. 18, par. 1o, VI | preco, valor, estimativa, orcamento |
| Analise de riscos | RECOMENDADO | Art. 18, par. 1o, XII | risco, mitigacao, contingencia |
| Metodologia de execucao | RECOMENDADO | Art. 18, par. 1o, VII | metodologia, execucao, entrega |
| Plano de transicao contratual | RECOMENDADO | IN SGD 94/2022 | transicao, encerramento, continuidade |
| Propriedade intelectual | CONDICIONAL | Lei 9.609/1998 | propriedade, codigo-fonte, licenca |

### Servicos Continuados

| Requisito | Obrigatorio | Fundamentacao | Keywords para Validacao |
|-----------|-------------|---------------|-------------------------|
| Descricao da necessidade | SIM | Art. 18, par. 1o, I | necessidade, demanda, servico |
| Justificativa da solucao | SIM | Art. 18, par. 1o, V | solucao, justificativa, escolha |
| Produtividade de referencia | RECOMENDADO | IN SEGES 5/2017 | produtividade, rendimento, indicador |
| Postos de trabalho | CONDICIONAL | Art. 121, Lei 14.133 | posto, trabalho, mao de obra |
| Indicadores de desempenho (KPIs) | RECOMENDADO | Art. 18, par. 1o, IX | indicador, desempenho, KPI, meta |
| Estimativa de precos | SIM | Art. 18, par. 1o, VI | preco, valor, estimativa |
| Convencao coletiva | CONDICIONAL | CLT | convencao, coletiva, sindicato, piso |
| Equipamentos e uniformes | CONDICIONAL | - | equipamento, uniforme, PPE, EPI |
| Plano de fiscalizacao | RECOMENDADO | Art. 18, par. 1o, X | fiscalizacao, gestor, fiscal |

### Aquisicao de Materiais

| Requisito | Obrigatorio | Fundamentacao | Keywords para Validacao |
|-----------|-------------|---------------|-------------------------|
| Descricao da necessidade | SIM | Art. 18, par. 1o, I | necessidade, demanda, material |
| Especificacoes tecnicas | SIM | Art. 18, par. 1o, III | especificacao, tecnica, caracteristica |
| Quantidades estimadas | SIM | Art. 18, par. 1o, IV | quantidade, unidade, volume |
| Garantia | RECOMENDADO | Art. 40, Lei 14.133 | garantia, prazo, cobertura |
| Suporte tecnico | CONDICIONAL | - | suporte, assistencia, manutencao |
| Catalogo de referencia | RECOMENDADO | Art. 19, Lei 14.133 | catalogo, CATMAT, CATSER |
| Estimativa de precos | SIM | Art. 18, par. 1o, VI | preco, valor, cotacao |
| Amostras | CONDICIONAL | Art. 42, Lei 14.133 | amostra, prototipo, teste |
| Logistica reversa | CONDICIONAL | Art. 18, par. 1o, XII | logistica, reversa, descarte, reciclagem |

---

## Pesquisa de Precos (IN SEGES 65/2021)

### Metodologia Aceita pelo TCU

A pesquisa de precos deve utilizar **pelo menos 3 fontes** das seguintes:

| Prioridade | Fonte | Descricao |
|------------|-------|-----------|
| 1 | **Painel de Precos** | Sistema de precos do Governo Federal (ComprasNet) |
| 2 | **Contratacoes similares** | Contratos de outros orgaos publicos nos ultimos 12 meses |
| 3 | **SINAPI** | Sistema Nacional de Pesquisa de Custos e Indices da Construcao Civil (obras) |
| 4 | **SICRO** | Sistema de Custos Referenciais de Obras (rodovias/DNIT) |
| 5 | **Pesquisa publicada** | Tabelas oficiais de precos publicadas por instituicoes |
| 6 | **Cotacoes de mercado** | Pesquisa direta com fornecedores (minimo 3) |
| 7 | **Sites especializados** | Precos de catalogos e sites de dominio publico |

### Requisitos da Pesquisa

- **Data-base**: Informar mes/ano de referencia dos precos
- **Descricao completa**: Mesmas especificacoes do objeto licitado
- **Excecoes**: Justificar precos inexequiveis ou excessivos
- **Mediana**: Preferir mediana sobre media para valor estimado
- **Documentacao**: Anexar prints/comprovantes das pesquisas

---

## Checklist de Conformidade por Tipo

### OBRAS - Checklist TCU

- [ ] **[OBRIGATORIO]** Descricao clara da necessidade sob perspectiva do interesse publico
- [ ] **[OBRIGATORIO]** Estimativa de quantidades com memoria de calculo
- [ ] **[OBRIGATORIO]** Estimativa de valor com referencia SINAPI/SICRO
- [ ] **[OBRIGATORIO]** Justificativa para parcelamento ou nao
- [ ] **[OBRIGATORIO]** Posicionamento conclusivo sobre viabilidade
- [ ] **[RECOMENDADO]** ART/RRT do responsavel tecnico referenciado
- [ ] **[RECOMENDADO]** Analise de alternativas de solucao
- [ ] **[RECOMENDADO]** Analise de riscos com medidas de mitigacao
- [ ] **[RECOMENDADO]** Cronograma fisico-financeiro previsto
- [ ] **[CONDICIONAL]** Memorial descritivo (se projeto basico dispensado)
- [ ] **[CONDICIONAL]** Licencas ambientais necessarias identificadas

### TI - Checklist TCU

- [ ] **[OBRIGATORIO]** Descricao clara da necessidade sob perspectiva do interesse publico
- [ ] **[OBRIGATORIO]** Estimativa de quantidades/volumes
- [ ] **[OBRIGATORIO]** Estimativa de valor com pesquisa de mercado
- [ ] **[OBRIGATORIO]** Justificativa para parcelamento ou nao
- [ ] **[OBRIGATORIO]** Posicionamento conclusivo sobre viabilidade
- [ ] **[RECOMENDADO]** Especificacoes tecnicas detalhadas
- [ ] **[RECOMENDADO]** Requisitos de seguranca da informacao
- [ ] **[RECOMENDADO]** Niveis de servico (SLA) definidos
- [ ] **[RECOMENDADO]** Metodologia de execucao/implantacao
- [ ] **[CONDICIONAL]** Conformidade LGPD (se dados pessoais)
- [ ] **[CONDICIONAL]** Plano de transicao contratual

### SERVICOS - Checklist TCU

- [ ] **[OBRIGATORIO]** Descricao clara da necessidade sob perspectiva do interesse publico
- [ ] **[OBRIGATORIO]** Estimativa de quantidades com produtividade
- [ ] **[OBRIGATORIO]** Estimativa de valor com pesquisa de mercado
- [ ] **[OBRIGATORIO]** Justificativa para parcelamento ou nao
- [ ] **[OBRIGATORIO]** Posicionamento conclusivo sobre viabilidade
- [ ] **[RECOMENDADO]** Indicadores de desempenho (KPIs) definidos
- [ ] **[RECOMENDADO]** Frequencia e horarios de execucao
- [ ] **[RECOMENDADO]** Qualificacao minima dos profissionais
- [ ] **[CONDICIONAL]** Referencia a convencao coletiva (se mao de obra)
- [ ] **[CONDICIONAL]** Relacao de equipamentos/uniformes (se aplicavel)

### MATERIAIS - Checklist TCU

- [ ] **[OBRIGATORIO]** Descricao clara da necessidade sob perspectiva do interesse publico
- [ ] **[OBRIGATORIO]** Estimativa de quantidades com justificativa
- [ ] **[OBRIGATORIO]** Estimativa de valor com pesquisa de mercado
- [ ] **[OBRIGATORIO]** Justificativa para parcelamento ou nao
- [ ] **[OBRIGATORIO]** Posicionamento conclusivo sobre viabilidade
- [ ] **[RECOMENDADO]** Especificacoes tecnicas (sem direcionamento)
- [ ] **[RECOMENDADO]** Prazo de garantia minimo
- [ ] **[CONDICIONAL]** Suporte tecnico/assistencia (se aplicavel)
- [ ] **[CONDICIONAL]** Necessidade de amostras pre-qualificacao
- [ ] **[CONDICIONAL]** Logistica reversa (se residuos especiais)

---

## Acordaos TCU Relevantes

| Acordao | Tema | Determinacao/Recomendacao |
|---------|------|---------------------------|
| 488/2019 | Publicacao ETP | Recomendou publicacao do ETP junto ao edital |
| 2076/2023 | Publicacao ETP | Confirmou irregularidade na falta de publicacao |
| 1463/2024 | Publicacao ETP | Reafirmou necessidade de publicidade junto ao edital |
| 2273/2024 | Publicacao ETP | Decidiu que ETP nao e anexo OBRIGATORIO do edital |
| 2622/2013 | BDI Obras | Definiu parametros para BDI em obras publicas |
| - | ETP pro forma | Anulou licitacao por ETP sem analise de alternativas |

---

## Referencias

- [Lei 14.133/2021 - Art. 18](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)
- [IN SEGES 58/2022 - ETP Digital](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-no-58-de-8-de-agosto-de-2022)
- [IN SEGES 65/2021 - Pesquisa de Precos](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-65-de-7-de-julho-de-2021)
- [Portal de Licitacoes e Contratos TCU](https://licitacoesecontratos.tcu.gov.br/4-1-estudo-tecnico-preliminar-etp/)
- [TCE-SP - Lei 14.133 Comentada](https://www.tce.sp.gov.br/legislacao-comentada/lei-14133-1o-abril-2021/18)
