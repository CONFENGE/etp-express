# Lei 14.133/2021 Skill

## Activation

Esta skill e ativada automaticamente quando voce trabalha com ETPs, secoes ou compliance de licitacoes.

---

## Contexto Legal

A **Lei 14.133/2021** (Nova Lei de Licitacoes e Contratos Administrativos) substituiu a Lei 8.666/1993 e estabelece novas regras para contratacoes publicas no Brasil.

O **Estudo Tecnico Preliminar (ETP)** e documento obrigatorio previsto no Art. 18 da Lei 14.133/2021.

---

## Estrutura do ETP (Art. 18)

O ETP deve conter, quando couber:

### 1. Descricao da Necessidade

- Problema a ser resolvido
- Alinhamento estrategico
- Resultados esperados

### 2. Area Requisitante

- Identificacao da area demandante
- Responsavel tecnico
- Justificativa de urgencia (se houver)

### 3. Requisitos da Contratacao

- Especificacoes tecnicas
- Padroes de qualidade
- Sustentabilidade

### 4. Estimativas de Quantidade

- Metodologia de calculo
- Historico de consumo
- Projecao de demanda

### 5. Levantamento de Mercado

- Pesquisa de precos
- Fornecedores potenciais
- Solucoes disponiveis

### 6. Estimativa de Valor

- Precos de referencia
- Fontes consultadas
- Composicao de custos

### 7. Descricao da Solucao

- Solucao escolhida
- Justificativa tecnica
- Comparativo de alternativas

### 8. Justificativa para Parcelamento

- Viabilidade tecnica
- Viabilidade economica
- Impacto na competitividade

### 9. Demonstrativo de Resultados

- Beneficios esperados
- Indicadores de desempenho
- Criterios de medicao

### 10. Providencias Previas

- Preparativos necessarios
- Infraestrutura requerida
- Capacitacao

### 11. Contratacoes Correlatas

- Contratos vigentes
- Integracoes necessarias
- Dependencias

### 12. Impactos Ambientais

- Sustentabilidade
- Logistica reversa
- Certificacoes ambientais

### 13. Posicionamento Conclusivo

- Viabilidade da contratacao
- Recomendacao final
- Riscos identificados

---

## Validacoes Automaticas

### Campos Obrigatorios

```typescript
const requiredSections = [
 'descricaoNecessidade',
 'areaRequisitante',
 'requisitosContratacao',
 'estimativaQuantidade',
 'levantamentoMercado',
 'estimativaValor',
 'descricaoSolucao',
 'posicionamentoConclusivo',
];
```

### Validacoes de Conteudo

```typescript
const validations = {
 descricaoNecessidade: {
 minLength: 100,
 mustContain: ['problema', 'necessidade', 'objetivo'],
 },
 estimativaValor: {
 mustHave: ['fonte', 'data', 'valor'],
 maxAge: 180, // dias
 },
 levantamentoMercado: {
 minFornecedores: 3,
 mustHavePrices: true,
 },
};
```

---

## Templates de Texto

### Descricao da Necessidade

```markdown
## 1. Descricao da Necessidade

A [ORGAO] necessita de [OBJETO] para [FINALIDADE].

### 1.1 Contexto

[Descrever o contexto institucional e operacional]

### 1.2 Problema Identificado

[Descrever o problema que a contratacao visa resolver]

### 1.3 Alinhamento Estrategico

Esta contratacao esta alinhada com:

- [Objetivo estrategico 1]
- [Objetivo estrategico 2]

### 1.4 Resultados Esperados

Com a contratacao, espera-se:

- [Resultado 1]
- [Resultado 2]
```

### Estimativa de Valor

```markdown
## 6. Estimativa de Valor

### 6.1 Metodologia

A estimativa de precos foi realizada conforme Art. 23 da Lei 14.133/2021, utilizando:

- [x] Painel de Precos do Governo Federal
- [x] Contratacoes similares de outros orgaos
- [ ] Pesquisa de precos de mercado
- [ ] Sites especializados

### 6.2 Precos de Referencia

| Item | Descricao | Qtd | Valor Unit. | Fonte | Data |
| ---- | --------- | --- | ----------- | ------- | ------------ |
| 1 | [Item] | [N] | R$ [X] | [Fonte] | [DD/MM/AAAA] |

### 6.3 Valor Total Estimado

R$ [VALOR] ([VALOR POR EXTENSO])

### 6.4 Dotacao Orcamentaria

[Informar se ha dotacao disponivel]
```

---

## Compliance Checks

### Antes de Salvar

```typescript
function validateEtpCompliance(etp: Etp): ComplianceResult {
 const errors: string[] = [];
 const warnings: string[] = [];

 // Verificar campos obrigatorios
 for (const section of requiredSections) {
 if (!etp.sections[section] || etp.sections[section].content.length < 50) {
 errors.push(
 `Secao "${section}" e obrigatoria e deve ter conteudo substantivo`,
 );
 }
 }

 // Verificar estimativa de valor
 if (etp.estimativaValor) {
 const priceDate = new Date(etp.estimativaValor.date);
 const daysSince =
 (Date.now() - priceDate.getTime()) / (1000 * 60 * 60 * 24);
 if (daysSince > 180) {
 warnings.push(
 'Estimativa de precos com mais de 180 dias - recomenda-se atualizacao',
 );
 }
 }

 // Verificar levantamento de mercado
 if (etp.fornecedores && etp.fornecedores.length < 3) {
 warnings.push('Recomenda-se consulta a pelo menos 3 fornecedores');
 }

 return {
 valid: errors.length === 0,
 errors,
 warnings,
 };
}
```

---

## Termos Legais

### Glossario

| Termo | Definicao |
| ------- | ------------------------------------ |
| **ETP** | Estudo Tecnico Preliminar |
| **TR** | Termo de Referencia |
| **PB** | Projeto Basico |
| **DFD** | Documento de Formalizacao de Demanda |
| **ARP** | Ata de Registro de Precos |
| **SRP** | Sistema de Registro de Precos |

### Referencias Legais

- Lei 14.133/2021 - Nova Lei de Licitacoes
- Decreto 10.024/2019 - Pregao Eletronico
- IN SEGES 58/2022 - Contratacao de TIC
- IN SEGES 65/2021 - Estudos Tecnicos Preliminares

---

## Regras do Projeto

1. **Sempre valide compliance** - Antes de salvar ETP
2. **Sempre referencie a lei** - Art. 18 da Lei 14.133/2021
3. **Sempre verifique datas** - Precos expiram em 180 dias
4. **Sempre documente fontes** - Para estimativas de valor
5. **Sempre inclua justificativas** - Para decisoes tecnicas
