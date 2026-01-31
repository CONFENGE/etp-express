# AI Validation Service - Similar ao ALICE/TCU

## Issue #1291 - [IA] Validação automática similar ao ALICE/TCU

Sistema de detecção inteligente de irregularidades em licitações, inspirado no robô ALICE do TCU (Análise de Licitações e Editais), que opera com 89% de precisão.

## Visão Geral

O `AiValidationService` implementa detecção automática de 10 tipos de irregularidades comuns em processos licitatórios, auxiliando na conformidade com a Lei 14.133/2021.

## Tipos de Irregularidades Detectadas

### 1. SUPERFATURAMENTO
- **Descrição**: Preços muito acima do mercado
- **Severidade**: CRITICAL (>60% acima), HIGH (>40% acima)
- **Integração**: Market Intelligence Module (OverpriceAlertService)
- **Referência Legal**: Lei 14.133/2021, Art. 23

### 2. DIRECIONAMENTO
- **Descrição**: Especificações direcionadas para fornecedor específico
- **Detecção**: Padrões textuais como "marca específica", "somente fornecedor"
- **Severidade**: HIGH/MEDIUM
- **Referência Legal**: Lei 14.133/2021, Art. 11 e Art. 40, §1º

### 3. FRACIONAMENTO
- **Descrição**: Divisão artificial de despesas para evitar licitação
- **Detecção**: Análise de ETPs similares no mesmo período/órgão
- **Severidade**: HIGH
- **Referência Legal**: Lei 14.133/2021, Art. 6º, XLV e Art. 75, §§1º e 2º

### 4. ESPECIFICAÇÃO RESTRITIVA
- **Descrição**: Requisitos técnicos excessivamente restritivos
- **Detecção**: Scoring baseado em palavras-chave (certificações, atestados, etc.)
- **Severidade**: HIGH/MEDIUM
- **Referência Legal**: Lei 14.133/2021, Art. 40, §1º

### 5. PRAZO INADEQUADO
- **Descrição**: Prazo insuficiente para formulação de propostas
- **Detecção**: Comparação com prazos mínimos por modalidade
- **Severidade**: CRITICAL (<50% do prazo), HIGH
- **Referência Legal**: Lei 14.133/2021, Art. 54

### 6. AUSÊNCIA DE JUSTIFICATIVA
- **Descrição**: Falta de fundamentação adequada
- **Detecção**: Campo vazio ou muito curto (<100 caracteres)
- **Severidade**: CRITICAL (vazio), HIGH (insuficiente)
- **Referência Legal**: Lei 14.133/2021, Art. 6º, XXIII

### 7. VALOR INCOMPATÍVEL
- **Descrição**: Valor incompatível com complexidade do objeto
- **Detecção**: Heurísticas baseadas em palavras-chave de complexidade
- **Severidade**: MEDIUM
- **Referência Legal**: Princípio da razoabilidade

### 8. DISPENSA IRREGULAR
- **Descrição**: Uso inadequado de dispensa/inexigibilidade
- **Detecção**: Identificação de termos + validação de justificativa
- **Severidade**: HIGH
- **Referência Legal**: Lei 14.133/2021, Arts. 74 e 75

### 9. VÍNCULOS SOCIETÁRIOS
- **Descrição**: Vínculos suspeitos entre participantes
- **Status**: Placeholder (requer integração com Receita Federal)

### 10. PADRÕES DE PREÇO ANORMAIS
- **Descrição**: Padrões anormais de precificação
- **Status**: Placeholder (requer análise de propostas)

## API Endpoints

### POST /ai-validation/validate
Valida um documento (ETP ou Edital)

**Request:**
```json
{
  "etpId": "uuid",          // Opcional
  "editalId": "uuid",       // Opcional
  "deepAnalysis": false     // Opcional (ativa verificações custosas)
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "irregularityType": "SUPERFATURAMENTO",
    "severityLevel": "CRITICAL",
    "description": "Preço estimado está 75.2% acima da mediana de mercado",
    "evidence": "Valor estimado: R$ 175.200,00",
    "recommendation": "Revisar pesquisa de preços...",
    "confidenceScore": 85,
    "affectedField": "valorEstimado",
    "legalReference": "Lei 14.133/2021, Art. 23",
    "status": "PENDING",
    "createdAt": "2026-01-31T20:00:00Z"
  }
]
```

### GET /ai-validation
Lista validações com filtros

**Query Params:**
- `etpId` (opcional)
- `editalId` (opcional)
- `irregularityType` (opcional)
- `severityLevel` (opcional)
- `status` (opcional)
- `page` (default: 1)
- `limit` (default: 20)

### GET /ai-validation/summary
Retorna sumário de validações

**Query Params:**
- `etpId` (opcional)
- `editalId` (opcional)

**Response:**
```json
{
  "totalIrregularities": 5,
  "bySeverity": {
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0,
    "info": 0
  },
  "byType": {
    "SUPERFATURAMENTO": 1,
    "ESPECIFICACAO_RESTRITIVA": 1,
    ...
  },
  "byStatus": {
    "pending": 3,
    "acknowledged": 1,
    "resolved": 1,
    "falsePositive": 0,
    "acceptedRisk": 0
  },
  "overallRiskScore": 45,
  "recommendations": [
    "Revisar pesquisa de preços...",
    "Ajustar especificações técnicas..."
  ]
}
```

### PATCH /ai-validation/:id/acknowledge
Reconhece/resolve uma validação

**Request:**
```json
{
  "status": "RESOLVED",
  "note": "Preço ajustado após renegociação"
}
```

## Níveis de Severidade

- **CRITICAL**: Risco crítico, alta probabilidade de rejeição
- **HIGH**: Risco alto, pode ser questionado
- **MEDIUM**: Risco médio, requer correção
- **LOW**: Risco baixo, recomenda-se atenção
- **INFO**: Informativo, sem risco significativo

## Status de Validação

- **PENDING**: Aguardando análise
- **ACKNOWLEDGED**: Reconhecido pela equipe
- **RESOLVED**: Corrigido
- **FALSE_POSITIVE**: Falso positivo
- **ACCEPTED_RISK**: Risco aceito conscientemente

## Acurácia e Confiança

Cada detecção inclui um `confidenceScore` (0-100) que indica a confiança do algoritmo:

- **90-100**: Alta confiança (validação objetiva)
- **70-89**: Confiança média (heurísticas robustas)
- **50-69**: Baixa confiança (sugestivo, requer revisão manual)

## Integração com Outros Módulos

### Market Intelligence
- `OverpriceAlertService` para detecção de superfaturamento
- `RegionalBenchmarkService` para comparação de preços regionais

### Compliance
- `ComplianceValidationService` para checklists TCU/TCE
- `JurisprudenciaService` para validação contra precedentes

## Roadmap

### Melhorias Planejadas

1. **Machine Learning**
   - Treinar modelos com dados históricos do TCU
   - Aprendizado contínuo baseado em feedback

2. **Integrações Externas**
   - API Receita Federal (vínculos societários)
   - Portal da Transparência (histórico de fornecedores)
   - PNCP (Painel Nacional de Contratações Públicas)

3. **Análise Avançada**
   - NLP para análise semântica de justificativas
   - Detecção de padrões em propostas (conluio)
   - Análise de séries temporais para fracionamento

4. **Dashboard**
   - Visualização de riscos por órgão
   - Tendências de irregularidades
   - Ranking de conformidade

## Testes

```bash
# Executar testes
npm test -- ai-validation.service.spec.ts

# Cobertura
npm run test:cov
```

## Referências

- [Robô ALICE - TCU](https://portal.tcu.gov.br/imprensa/noticias/robo-alice-ja-analisou-mais-de-60-mil-editais-de-licitacao.htm)
- [Lei 14.133/2021 - Nova Lei de Licitações](http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm)
- [IN SEGES/ME nº 65/2021 - Pesquisa de Preços](https://www.in.gov.br/en/web/dou/-/instrucao-normativa-n-65-de-7-de-julho-de-2021-331788741)

## Autoria

- **Issue**: #1291
- **Data**: 2026-01-31
- **Implementação**: MVP YOLO Mode (Pragmatic Approach)
