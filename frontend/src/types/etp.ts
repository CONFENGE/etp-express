export interface ETP {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'under_review' | 'completed';
  progress: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
}

export interface Section {
  id: string;
  etpId: string;
  sectionNumber: number;
  title: string;
  content: string;
  isRequired: boolean;
  isCompleted: boolean;
  aiGenerated: boolean;
  hasEnrichmentWarning?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SectionTemplate {
  number: number;
  title: string;
  description: string;
  isRequired: boolean;
  fields: SectionField[];
  helpText?: string;
}

export interface SectionField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface AIGenerationRequest {
  etpId: string;
  sectionNumber: number;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface AIGenerationResponse {
  content: string;
  references: Reference[];
  confidence: number;
  warnings: string[];
}

export interface Reference {
  id: string;
  title: string;
  source: string;
  url?: string;
  relevance: number;
  excerpt?: string;
}

export interface SimilarContract {
  id: string;
  title: string;
  description: string;
  similarity: number;
  year: number;
  value?: number;
  organ?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completeness: number;
}

export interface ValidationError {
  sectionNumber: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  sectionNumber: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ExportOptions {
  format: 'pdf' | 'json' | 'docx';
  includeDrafts: boolean;
  includeReferences: boolean;
}

export const REQUIRED_SECTIONS = [1, 4, 6, 8, 13];

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    number: 1,
    title: 'I - Necessidade da Contratação',
    description: 'Demonstração da necessidade da contratação',
    isRequired: true,
    fields: [
      {
        name: 'description',
        label: 'Descrição da Necessidade',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva a necessidade que justifica a contratação...',
        helpText:
          'Explique o problema ou demanda que será atendida pela contratação',
      },
      {
        name: 'justification',
        label: 'Justificativa',
        type: 'textarea',
        required: true,
        placeholder: 'Justifique a necessidade...',
        helpText: 'Apresente argumentos que fundamentem a necessidade',
      },
    ],
    helpText:
      'Esta seção deve demonstrar claramente a necessidade da contratação, com base em dados e análises concretas.',
  },
  {
    number: 4,
    title: 'IV - Requisitos da Contratação',
    description: 'Especificação dos requisitos da contratação',
    isRequired: true,
    fields: [
      {
        name: 'functional_requirements',
        label: 'Requisitos Funcionais',
        type: 'textarea',
        required: true,
        placeholder: 'Liste os requisitos funcionais...',
      },
      {
        name: 'technical_requirements',
        label: 'Requisitos Técnicos',
        type: 'textarea',
        required: true,
        placeholder: 'Liste os requisitos técnicos...',
      },
      {
        name: 'legal_requirements',
        label: 'Requisitos Legais',
        type: 'textarea',
        required: false,
        placeholder: 'Liste os requisitos legais aplicáveis...',
      },
    ],
    helpText: 'Especifique todos os requisitos necessários para a contratação.',
  },
  {
    number: 6,
    title: 'VI - Estimativa de Preços',
    description: 'Estimativa do valor da contratação',
    isRequired: true,
    fields: [
      {
        name: 'estimated_value',
        label: 'Valor Estimado',
        type: 'number',
        required: true,
        placeholder: '0.00',
        helpText: 'Valor total estimado para a contratação',
      },
      {
        name: 'methodology',
        label: 'Metodologia de Cálculo',
        type: 'textarea',
        required: true,
        placeholder: 'Descreva a metodologia utilizada...',
        helpText: 'Explique como o valor foi calculado',
      },
      {
        name: 'market_research',
        label: 'Pesquisa de Mercado',
        type: 'textarea',
        required: true,
        placeholder: 'Apresente a pesquisa de mercado realizada...',
      },
    ],
    helpText:
      'A estimativa deve ser baseada em pesquisa de mercado consistente.',
  },
  {
    number: 8,
    title: 'VIII - Adequação Orçamentária',
    description: 'Demonstração da adequação orçamentária',
    isRequired: true,
    fields: [
      {
        name: 'budget_source',
        label: 'Fonte Orçamentária',
        type: 'text',
        required: true,
        placeholder: 'Ex: Programa de Trabalho 123456',
      },
      {
        name: 'availability',
        label: 'Disponibilidade Orçamentária',
        type: 'textarea',
        required: true,
        placeholder: 'Demonstre a disponibilidade orçamentária...',
      },
    ],
    helpText: 'Demonstre que há recursos orçamentários disponíveis.',
  },
  {
    number: 13,
    title: 'XIII - Contratações Correlatas e/ou Interdependentes',
    description: 'Análise de contratações correlatas',
    isRequired: true,
    fields: [
      {
        name: 'related_contracts',
        label: 'Contratos Relacionados',
        type: 'textarea',
        required: false,
        placeholder: 'Liste contratos correlatos ou interdependentes...',
      },
      {
        name: 'analysis',
        label: 'Análise',
        type: 'textarea',
        required: true,
        placeholder: 'Analise as interdependências...',
      },
    ],
    helpText:
      'Identifique e analise contratações que possam ter relação com esta.',
  },
  {
    number: 2,
    title: 'II - Objetivos da Contratação',
    description: 'Objetivos que se pretende alcançar',
    isRequired: false,
    fields: [
      {
        name: 'objectives',
        label: 'Objetivos',
        type: 'textarea',
        required: false,
        placeholder: 'Liste os objetivos da contratação...',
      },
    ],
  },
  {
    number: 3,
    title: 'III - Descrição da Solução',
    description: 'Descrição da solução escolhida',
    isRequired: false,
    fields: [
      {
        name: 'solution',
        label: 'Solução',
        type: 'textarea',
        required: false,
        placeholder: 'Descreva a solução...',
      },
    ],
  },
  {
    number: 5,
    title: 'V - Levantamento de Mercado',
    description: 'Levantamento de mercado realizado',
    isRequired: false,
    fields: [
      {
        name: 'market_analysis',
        label: 'Análise de Mercado',
        type: 'textarea',
        required: false,
        placeholder: 'Apresente a análise de mercado...',
      },
    ],
  },
  {
    number: 7,
    title: 'VII - Justificativa para o Parcelamento ou não da Solução',
    description: 'Justificativa sobre parcelamento',
    isRequired: false,
    fields: [
      {
        name: 'parceling',
        label: 'Parcelamento',
        type: 'textarea',
        required: false,
        placeholder: 'Justifique o parcelamento ou não da solução...',
      },
    ],
  },
  {
    number: 9,
    title: 'IX - Resultados Pretendidos',
    description: 'Resultados esperados com a contratação',
    isRequired: false,
    fields: [
      {
        name: 'expected_results',
        label: 'Resultados Esperados',
        type: 'textarea',
        required: false,
        placeholder: 'Descreva os resultados pretendidos...',
      },
    ],
  },
  {
    number: 10,
    title: 'X - Providências a serem Adotadas',
    description: 'Providências necessárias',
    isRequired: false,
    fields: [
      {
        name: 'actions',
        label: 'Providências',
        type: 'textarea',
        required: false,
        placeholder: 'Liste as providências...',
      },
    ],
  },
  {
    number: 11,
    title: 'XI - Possíveis Impactos Ambientais',
    description: 'Análise de impactos ambientais',
    isRequired: false,
    fields: [
      {
        name: 'environmental_impact',
        label: 'Impactos Ambientais',
        type: 'textarea',
        required: false,
        placeholder: 'Analise os possíveis impactos ambientais...',
      },
    ],
  },
  {
    number: 12,
    title: 'XII - Declaração de Viabilidade',
    description: 'Declaração de viabilidade da contratação',
    isRequired: false,
    fields: [
      {
        name: 'viability',
        label: 'Viabilidade',
        type: 'textarea',
        required: false,
        placeholder: 'Declare a viabilidade da contratação...',
      },
    ],
  },
];
