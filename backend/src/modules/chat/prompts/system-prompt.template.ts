import { Etp } from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';
import { EtpSection } from '../../../entities/etp-section.entity';

/**
 * Configuration options for building the system prompt.
 */
export interface SystemPromptOptions {
  /** Current ETP being edited */
  etp: Etp;
  /** Sections of the ETP (may be partial) */
  sections: EtpSection[];
  /** Field currently being edited by the user */
  contextField?: string;
  /** Whether to include anti-hallucination instructions */
  includeAntiHallucination?: boolean;
}

/**
 * Get template type description in Portuguese.
 */
function getTemplateTypeDescription(type: EtpTemplateType | null): string {
  const descriptions: Record<EtpTemplateType, string> = {
    [EtpTemplateType.OBRAS]: 'Obras e Engenharia',
    [EtpTemplateType.TI]: 'Tecnologia da Informacao',
    [EtpTemplateType.SERVICOS]: 'Servicos Continuados',
    [EtpTemplateType.MATERIAIS]: 'Aquisicao de Materiais',
  };
  return type ? descriptions[type] || 'Geral' : 'Geral';
}

/**
 * Format sections summary for context injection.
 */
function formatSectionsContext(sections: EtpSection[]): string {
  if (!sections || sections.length === 0) {
    return 'Nenhuma secao preenchida ainda.';
  }

  return sections
    .filter((s) => s.content && s.content.length > 0)
    .map((s) => {
      const contentPreview =
        s.content.length > 500
          ? s.content.substring(0, 500) + '...'
          : s.content;
      return `### ${s.title}\n${contentPreview}`;
    })
    .join('\n\n');
}

/**
 * Get context-specific guidance based on the field being edited.
 */
function getFieldGuidance(contextField?: string): string {
  if (!contextField) return '';

  const fieldGuidance: Record<string, string> = {
    justificativa:
      'Foque em: necessidade da contratacao, interesse publico, beneficios esperados, e riscos de nao contratar (Art. 18, Lei 14.133/2021).',
    objeto:
      'Ajude a descrever o objeto de forma clara, precisa e completa, evitando ambiguidades.',
    requisitosTecnicos:
      'Foque em requisitos objetivos e mensuraveis, evitando direcionamento (IN SEGES/ME n 40/2020).',
    estimativaValor:
      'Oriente sobre pesquisa de precos, fontes confiaveis (SINAPI, SICRO, Painel de Precos), e metodologia de calculo.',
    riscos:
      'Ajude a identificar e descrever riscos tecnicos, operacionais e de mercado da contratacao.',
    sustentabilidade:
      'Oriente sobre criterios de sustentabilidade ambiental conforme IN SLTI/MP n 01/2010.',
  };

  // Normalize field name for lookup
  const normalizedField = contextField
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

  for (const [key, guidance] of Object.entries(fieldGuidance)) {
    if (normalizedField.includes(key.toLowerCase())) {
      return `\n## Foco Atual\nO usuario esta editando: ${contextField}\n${guidance}`;
    }
  }

  return `\n## Foco Atual\nO usuario esta editando o campo: ${contextField}`;
}

/**
 * Anti-hallucination instructions for the LLM.
 */
const ANTI_HALLUCINATION_INSTRUCTIONS = `
## REGRAS CRITICAS - NUNCA VIOLE

1. **NAO INVENTE** numeros de leis, decretos ou normas especificas
2. **NAO CITE** artigos ou incisos sem absoluta certeza
3. **NAO MENCIONE** valores monetarios especificos sem base
4. **NAO CRIE** numeros de processos ou documentos
5. **NAO CITE** jurisprudencia especifica

Quando mencionar legislacao, prefira termos gerais:
- CORRETO: "conforme a Lei de Licitacoes (Lei 14.133/2021)"
- ERRADO: "conforme o Art. 23, 2o, inciso III, alinea b..."

Use linguagem que indique estimativa quando apropriado:
- "aproximadamente", "geralmente", "pode", "estima-se"

Ao final de respostas sobre legislacao, adicione:
"IMPORTANTE: Informacoes especificas devem ser verificadas antes do uso oficial."`;

/**
 * Build the complete system prompt for the ETP chatbot.
 *
 * @param options - Configuration options including ETP context
 * @returns Complete system prompt string
 *
 * @remarks
 * The prompt is structured to:
 * 1. Define the assistant's role and expertise
 * 2. Inject current ETP context (metadata and sections)
 * 3. Provide field-specific guidance when available
 * 4. Include anti-hallucination safeguards
 * 5. Set behavioral constraints
 *
 * Issue #1394 - [CHAT-1167c] Implement AI chat completion with ETP context injection
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const {
    etp,
    sections,
    contextField,
    includeAntiHallucination = true,
  } = options;

  const templateType = getTemplateTypeDescription(etp.templateType);
  const sectionsContext = formatSectionsContext(sections);
  const fieldGuidance = getFieldGuidance(contextField);
  const antiHallucination = includeAntiHallucination
    ? ANTI_HALLUCINATION_INSTRUCTIONS
    : '';

  return `Voce e um assistente especializado em Estudos Tecnicos Preliminares (ETP) conforme a Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos).

## Sua Funcao
Ajudar o usuario a elaborar ETPs de qualidade, fornecendo:
- Orientacoes sobre preenchimento de campos
- Sugestoes de texto baseadas no contexto do ETP
- Esclarecimentos sobre requisitos legais
- Dicas para evitar erros comuns em licitacoes

## ETP Atual
- **Titulo:** ${etp.title || 'Nao informado'}
- **Objeto:** ${etp.objeto || 'Nao informado'}
- **Tipo de Contratacao:** ${templateType}
- **Orgao:** ${etp.organization?.name || etp.orgaoEntidade || 'Nao informado'}
- **Status:** ${etp.status || 'Rascunho'}
- **Progresso:** ${etp.completionPercentage || 0}%

## Secoes Preenchidas
${sectionsContext}
${fieldGuidance}

## Legislacao de Referencia
- Lei 14.133/2021 - Nova Lei de Licitacoes
- IN SEGES/ME n 40/2020 - Elaboracao de ETP
- IN SEGES/ME n 65/2021 - Contratacoes de TI
- Decreto 10.024/2019 - Licitacoes Eletronicas
- IN SLTI/MP n 01/2010 - Sustentabilidade
${antiHallucination}

## Instrucoes de Comportamento
1. Responda APENAS sobre ETPs e contratacoes publicas
2. Cite bases legais quando relevante, mas de forma generica
3. Sugira melhorias especificas para o ETP atual
4. Se nao souber algo, diga "nao sei" - NUNCA invente
5. Seja conciso, maximo 500 palavras por resposta
6. Use linguagem tecnica mas acessivel
7. Quando sugerir texto para inserir, formate claramente`;
}

/**
 * Extract relevant legislation references from the assistant's response.
 *
 * @param response - Assistant response text
 * @returns Array of legislation references found
 */
export function extractLegislationReferences(response: string): string[] {
  const references: string[] = [];

  // Pattern for Lei references
  const leiPattern = /Lei\s+(?:n[º°]?\s*)?(\d+(?:\.\d+)?\/\d{4})/gi;
  let match;
  while ((match = leiPattern.exec(response)) !== null) {
    references.push(`Lei ${match[1]}`);
  }

  // Pattern for IN references
  const inPattern =
    /IN\s+(?:SEGES|SLTI|MP|ME)(?:\/ME|\/MP)?\s+n[º°]?\s*(\d+\/\d{4})/gi;
  while ((match = inPattern.exec(response)) !== null) {
    references.push(`IN ${match[1]}`);
  }

  // Pattern for Decreto references
  const decretoPattern = /Decreto\s+(?:n[º°]?\s*)?(\d+(?:\.\d+)?\/\d{4})/gi;
  while ((match = decretoPattern.exec(response)) !== null) {
    references.push(`Decreto ${match[1]}`);
  }

  // Pattern for Article references
  const artPattern = /Art(?:igo)?\.?\s*(\d+)/gi;
  while ((match = artPattern.exec(response)) !== null) {
    references.push(`Art. ${match[1]}`);
  }

  // Remove duplicates
  return [...new Set(references)];
}
