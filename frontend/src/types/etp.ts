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

/**
 * Job status types for async section generation
 * @see #186 - BullMQ async processing
 * @see #222 - Frontend async UX
 */
export type JobStatus =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'unknown';

/**
 * Generation status for frontend UI state
 */
export type GenerationStatus =
  | 'idle'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed';

/**
 * Job status data from backend polling endpoint
 */
export interface JobStatusData {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: Section;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processedOn?: string;
  failedReason?: string;
  attemptsMade?: number;
  attemptsMax?: number;
}

/**
 * Response from GET /sections/jobs/:jobId
 */
export interface JobStatusResponse {
  data: JobStatusData;
  disclaimer: string;
}

/**
 * Section with async generation metadata
 */
export interface AsyncSection extends Section {
  metadata: {
    jobId: string;
    queuedAt: string;
    [key: string]: unknown;
  };
}

/**
 * Response from POST /sections/etp/:id/generate (async)
 */
export interface AsyncGenerationResponse {
  data: AsyncSection;
  disclaimer: string;
}

export const REQUIRED_SECTIONS = [1, 4, 6, 8, 13];
