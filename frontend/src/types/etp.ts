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
