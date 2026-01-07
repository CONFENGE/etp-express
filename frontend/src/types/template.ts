/**
 * Template type for ETP creation.
 * Maps to backend EtpTemplate entity.
 * Issue #1161 - [Templates] Criar modelos pre-configurados por tipo
 */

/**
 * Template type enum - matches backend EtpTemplateType
 */
export enum EtpTemplateType {
  OBRAS = 'OBRAS',
  TI = 'TI',
  SERVICOS = 'SERVICOS',
  MATERIAIS = 'MATERIAIS',
}

/**
 * AI prompt configuration for each section
 */
export interface TemplatePrompt {
  sectionType: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * ETP Template data structure for frontend.
 * Used by TemplateSelector component.
 */
export interface EtpTemplate {
  id: string;
  name: string;
  type: EtpTemplateType;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultSections: string[];
  prompts: TemplatePrompt[];
  legalReferences: string[];
  priceSourcesPreferred: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template icon mapping by type.
 * Used for visual representation in TemplateSelector.
 */
export const TEMPLATE_ICONS: Record<EtpTemplateType, string> = {
  [EtpTemplateType.OBRAS]: '🏗️',
  [EtpTemplateType.TI]: '💻',
  [EtpTemplateType.SERVICOS]: '🔧',
  [EtpTemplateType.MATERIAIS]: '📦',
};

/**
 * Template display labels in Portuguese.
 */
export const TEMPLATE_TYPE_LABELS: Record<EtpTemplateType, string> = {
  [EtpTemplateType.OBRAS]: 'Obras e Engenharia',
  [EtpTemplateType.TI]: 'Tecnologia da Informacao',
  [EtpTemplateType.SERVICOS]: 'Servicos',
  [EtpTemplateType.MATERIAIS]: 'Materiais',
};
