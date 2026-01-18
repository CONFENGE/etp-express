# Fontes de Jurisprudencia - TCE-SP e TCU

> Documentacao tecnica para integracao de jurisprudencia no modulo PageIndex
> Issue: #1577 | Sprint: M17-PageIndex

---

## 1. Visao Geral

Este documento define a estrategia de coleta de dados de jurisprudencia do TCE-SP e TCU para indexacao no PageIndex, habilitando busca semantica e validacao de compliance baseada em precedentes.

### Objetivo

- Indexar **minimo 50 sumulas do TCE-SP** sobre licitacoes e contratos
- Indexar **minimo 50 decisoes do TCU** (sumulas + acordaos) sobre Lei 14.133/2021
- Habilitar busca por tema/situacao via TreeSearchService
- Integrar com ComplianceService para alertas de conflito

---

## 2. Fontes TCE-SP

### 2.1 Portal de Jurisprudencia

**URL Base:** https://www.tce.sp.gov.br/jurisprudencia

**Tipos de Documentos:**
- Acordaos
- Despachos
- Pareceres
- Sentencas
- Relatorios/Votos

**Metadados Disponiveis:**
- Numero do processo
- Exercicio
- Data de autuacao e publicacao
- Relator
- Auditor
- Materia (~200 categorias)

### 2.2 Sumulas TCE-SP

**URL:** https://www.tce.sp.gov.br/boletim-de-jurisprudencia/sumulas

**Quantidade Disponivel:** 52 sumulas (1-52, com 6 canceladas)

**Estrutura das Sumulas:**
```json
{
  "numero": 1,
  "ementa": "Nao e licita a concessao de subvencao para bolsa de estudo...",
  "tema": "Auxilios e Subvencoes",
  "status": "VIGENTE",
  "fundamentacao": "Decisoes reiteradas do TCESP",
  "sourceUrl": "https://www.tce.sp.gov.br/jurisprudencia/sumula/1"
}
```

**Categorias Tematicas Identificadas:**
| Categoria | Qtd Sumulas |
|-----------|-------------|
| Licitacao | 30 |
| Auxilios e Subvencoes | 3 |
| Terceiro Setor | 2 |
| Registro de Precos | 4 |
| Contratacoes | 2 |
| Remuneracao | 2 |
| Competencia | 1 |
| Alcances | 1 |
| Adiantamentos | 1 |
| Execucao Orcamentaria | 1 |
| Sancoes | 1 |
| Canceladas | 6 |

### 2.3 Estrategia de Coleta TCE-SP

**Metodo:** Coleta manual estruturada (sem API disponivel)

**Justificativa:** O portal do TCE-SP nao oferece API publica. O acesso e exclusivamente via interface web com formulario HTML tradicional.

**Abordagem:**
1. Extrair sumulas da pagina web (ja mapeadas - 52 sumulas)
2. Estruturar em JSON com metadados completos
3. Incluir links para fonte original
4. Categorizar por tema para tree structure

**Arquivo de Saida:** `backend/src/modules/pageindex/data/tcesp-sumulas.json`

---

## 3. Fontes TCU

### 3.1 Portal de Jurisprudencia

**URL Base:** https://portal.tcu.gov.br/jurisprudencia

**Ferramentas de Pesquisa:**
- Acordaos: https://pesquisa.apps.tcu.gov.br/pesquisa/acordao-completo
- Jurisprudencia Selecionada: https://pesquisa.apps.tcu.gov.br/pesquisa/jurisprudencia-selecionada
- Sumulas: https://pesquisa.apps.tcu.gov.br/pesquisa/sumula
- Respostas a Consultas: https://pesquisa.apps.tcu.gov.br/pesquisa/resposta-consulta

**Publicacoes Periodicas:**
- Boletim de Jurisprudencia: Semanal
- Informativo de Licitacoes e Contratos: Quinzenal (tercas-feiras)
- Boletim de Pessoal: Mensal

### 3.2 Sumulas TCU

**Quantidade Disponivel:** ~30 sumulas ativas sobre licitacoes (247-289+)

**Sumulas Relevantes para Licitacoes:**

| Numero | Data | Tema | Enunciado |
|--------|------|------|-----------|
| 247 | 2004 | Adjudicacao por Item | Obrigatoria admissao de adjudicacao por item em objetos divisiveis |
| 248 | 2005 | Convite | Repetir convite se menos de 3 propostas qualificadas |
| 250 | 2007 | Entidades sem Fins Lucrativos | Contratacao com dispensa requer nexo efetivo e compatibilidade de precos |
| 252 | 2010 | Servicos Tecnicos | Dispensa requer especializacao, natureza singular e notoria especializacao |
| 253 | 2010 | BDI Diferenciado | Itens especificos com percentual significativo requerem BDI reduzido |
| 254 | 2010 | BDI e Tributos | IRPJ e CSLL nao podem compor BDI (impostos diretos e pessoais) |
| 255 | 2010 | Exclusividade | Alegacoes de exclusividade requerem verificacao administrativa |
| 257 | 2010 | Pregao para Engenharia | Servicos comuns de engenharia admitem modalidade pregao |
| 258 | 2010 | Composicao de Custos | Obrigatorio detalhar composicoes e BDI nos editais |
| 259 | 2010 | Criterios de Aceitabilidade | Definir criterios de precos e e obrigacao, nao faculdade |
| 260 | 2010 | ART | Obrigatoria Anotacao de Responsabilidade Tecnica em projetos e execucao |
| 261 | 2010 | Projeto Basico | Projeto basico adequado e atualizado e obrigatorio |
| 262 | 2010 | Inexequibilidade | Presuncao relativa; administracao deve permitir demonstracao de exequibilidade |
| 263 | 2011 | Capacidade Tecnica | Quantitativos minimos permitidos para parcelas significativas |
| 265 | 2011 | Subsidiarias/Controladas | Contratacao requer compatibilidade de precos e pertinencia de servicos |
| 269 | 2012 | TI - Resultados | Remuneracao de TI vinculada a resultados; pagamento por hora e excecao |
| 270 | 2012 | Indicacao de Marca | Permitida quando estritamente necessaria e previamente justificada |
| 272 | 2012 | Custos Pre-Contratuais | Editais nao podem exigir custos de habilitacao de licitantes |
| 274 | 2012 | SICAF | Inscricao previa no SICAF nao pode ser exigencia habilitatoria |
| 275 | 2012 | Qualificacao Economica | Nao cumulativo: capital minimo, patrimonio ou garantias |
| 281 | 2012 | Cooperativas | Vedadas quando servicos exigem subordinacao, pessoalidade, habitualidade |
| 283 | 2013 | Certidoes Fiscais | Substituir certidoes negativas por comprovantes de regularidade |
| 287 | 2014 | Concurso Publico | Servicos de promocao permitidos por dispensa se requisitos demonstrados |
| 289 | 2016 | Indices Financeiros | Indices de capacidade financeira devem justificar parametros |

### 3.3 Manual de Licitacoes e Contratos

**URL:** https://licitacoesecontratos.tcu.gov.br/

**Versao Atual:** 5a Edicao (Agosto 2024)

**Conteudo Relevante:**
- Orientacoes preventivas e pedagogicas
- 46 acordaos incorporados (2023-2024)
- Interpretacao da Lei 14.133/2021
- Quadros com referencias normativas

**PDF:** https://licitacoesecontratos.tcu.gov.br/wp-content/uploads/sites/11/2024/09/Licitacoes-e-Contratos-Orientacoes-e-Jurisprudencia-do-TCU-5a-Edicao-29-08-2024.pdf

### 3.4 Estrategia de Coleta TCU

**Metodo:** Coleta manual estruturada (SPA requer JavaScript)

**Justificativa:** O portal de pesquisa do TCU e uma SPA (Single Page Application) que carrega dados via JavaScript, nao acessivel via fetch simples.

**Abordagem:**
1. Extrair sumulas listadas em fontes secundarias (ja mapeadas - 24+ sumulas)
2. Complementar com acordaos do Manual de Licitacoes (5a Edicao)
3. Priorizar decisoes sobre Lei 14.133/2021
4. Estruturar em JSON com metadados completos

**Arquivo de Saida:** `backend/src/modules/pageindex/data/tcu-acordaos.json`

---

## 4. Estrutura de Dados

### 4.1 Interface JurisprudenciaData

```typescript
interface JurisprudenciaData {
  /** Identificador unico */
  id: string;

  /** Tribunal de origem */
  tribunal: 'TCE-SP' | 'TCU';

  /** Tipo de decisao */
  tipo: 'SUMULA' | 'ACORDAO' | 'DECISAO_NORMATIVA' | 'PARECER';

  /** Numero da decisao */
  numero: number;

  /** Ano da decisao */
  ano: number;

  /** Ementa/Enunciado */
  ementa: string;

  /** Temas relacionados (para tree structure) */
  temas: string[];

  /** Status atual */
  status: 'VIGENTE' | 'CANCELADA' | 'SUPERADA';

  /** Fundamentacao legal */
  fundamentacao?: string;

  /** URL da fonte original */
  sourceUrl: string;

  /** Data de aprovacao */
  dataAprovacao?: string;

  /** Relator (quando aplicavel) */
  relator?: string;
}
```

### 4.2 Tree Structure

```
Jurisprudencia
├── TCE-SP
│   ├── Licitacao
│   │   ├── Modalidades
│   │   ├── Habilitacao
│   │   ├── Dispensas
│   │   └── Registro de Precos
│   ├── Contratos
│   │   ├── Formalizacao
│   │   └── Alteracoes
│   └── Terceiro Setor
│       └── Repasses e Convenios
└── TCU
    ├── Lei 14.133/2021
    │   ├── ETP (Estudo Tecnico Preliminar)
    │   ├── Pesquisa de Precos
    │   └── Modalidades
    ├── Licitacao
    │   ├── Adjudicacao
    │   ├── Habilitacao
    │   ├── BDI e Composicao
    │   └── Pregao
    └── Contratos
        ├── Fiscalizacao
        └── Alteracoes
```

---

## 5. Limitacoes Identificadas

### 5.1 TCE-SP

| Limitacao | Impacto | Mitigacao |
|-----------|---------|-----------|
| Sem API publica | Coleta manual necessaria | Estruturar JSON estatico para seeder |
| Formato HTML tradicional | Scraping fragil | Usar dados ja extraidos, atualizar periodicamente |
| Rate limiting desconhecido | N/A para coleta manual | Nao aplicavel |

### 5.2 TCU

| Limitacao | Impacto | Mitigacao |
|-----------|---------|-----------|
| Portal SPA (JavaScript) | Fetch simples nao funciona | Usar fontes secundarias + Manual oficial |
| Sem API documentada | Coleta manual necessaria | Estruturar JSON estatico para seeder |
| PDF grande (~10MB) | Nao acessivel via WebFetch | Extrair manualmente acordaos relevantes |

---

## 6. Proximos Passos

### Sub-issues Dependentes

1. **#1578** - Criar JurisprudenciaSeeder com estrutura base
   - Adicionar `DocumentType.JURISPRUDENCIA`
   - Criar interface `JurisprudenciaData`
   - Implementar seeder base

2. **#1579** - Coletar e indexar sumulas TCE-SP
   - Criar `tcesp-sumulas.json` com 52 sumulas
   - Implementar `TceSPSeeder`
   - Validar tree structure

3. **#1580** - Coletar e indexar acordaos TCU
   - Criar `tcu-acordaos.json` com 50+ decisoes
   - Implementar `TcuSeeder`
   - Priorizar Lei 14.133/2021

4. **#1581** - Criar API de busca
   - Endpoints REST para jurisprudencia
   - Integracao com TreeSearchService

5. **#1582** - Integrar com ComplianceService
   - Alertas de conflito com precedentes
   - Sugestoes de adequacao

---

## 7. Referencias

### TCE-SP
- [Portal de Jurisprudencia](https://www.tce.sp.gov.br/jurisprudencia)
- [Sumulas TCE-SP](https://www.tce.sp.gov.br/boletim-de-jurisprudencia/sumulas)

### TCU
- [Portal de Jurisprudencia TCU](https://portal.tcu.gov.br/jurisprudencia)
- [Pesquisa de Sumulas](https://pesquisa.apps.tcu.gov.br/pesquisa/sumula)
- [Pesquisa de Acordaos](https://pesquisa.apps.tcu.gov.br/pesquisa/acordao-completo)
- [Manual de Licitacoes e Contratos](https://licitacoesecontratos.tcu.gov.br/)
- [Informativo de Licitacoes e Contratos](https://portal.tcu.gov.br/jurisprudencia/boletins-e-informativos/informativo-de-licitacoes-e-contratos.htm)

### Fontes Secundarias
- [Portal L&C - Sumulas TCU](https://www.licitacaoecontrato.com.br/sumulasTCU.php)
- [TCDF - Sumulas TCU sobre Licitacoes](https://jurisprudencia.tc.df.gov.br/2018/07/09/sumulas-tcu-licitacoes-e-contratos/)

---

**Autor:** Claude Code (Engenheiro-Executor)
**Data:** 2026-01-18
**Issue:** #1577
**Sprint:** M17-PageIndex
