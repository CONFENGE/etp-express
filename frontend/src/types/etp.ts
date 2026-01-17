/**
 * User reference for ETP authorship display.
 * Used to show author name in Dashboard when viewing other users' ETPs.
 * @see Issue #1351 - Admin dashboard ETP authorship identification
 */
export interface ETPAuthor {
  id: string;
  name: string;
}

export interface ETP {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed';
  progress: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  sections: Section[];
  currentVersion?: number;
  /**
   * Author information for ETP authorship display.
   * Populated from backend's createdBy relation.
   * @see Issue #1351 - Admin dashboard ETP authorship identification
   */
  createdBy?: ETPAuthor;
}

/**
 * Section status values (must match backend SectionStatus enum)
 * @see backend/src/entities/etp-section.entity.ts
 */
export type SectionStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'reviewed'
  | 'approved';

/**
 * Section type values (must match backend SectionType enum)
 * @see backend/src/entities/etp-section.entity.ts
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
export type SectionType =
  | 'introducao'
  | 'justificativa'
  | 'descricao_solucao'
  | 'requisitos'
  | 'estimativa_valor'
  | 'analise_riscos'
  | 'criterios_selecao'
  | 'criterios_medicao'
  | 'adequacao_orcamentaria'
  | 'declaracao_viabilidade'
  | 'custom';

/**
 * Section metadata interface (must match backend EtpSection.metadata)
 * @see backend/src/entities/etp-section.entity.ts
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
export interface SectionMetadata {
  tokens?: number;
  model?: string;
  temperature?: number;
  generationTime?: number;
  agentsUsed?: string[];
  similarContracts?: unknown[];
  jobId?: string;
  queuedAt?: string;
  [key: string]: unknown;
}

/**
 * Section validation results interface (must match backend EtpSection.validationResults)
 * @see backend/src/entities/etp-section.entity.ts
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
export interface SectionValidationResults {
  legalCompliance?: boolean;
  clarityScore?: number;
  hallucinationCheck?: boolean;
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Statuses that count toward ETP completion (100% progress)
 * Used to calculate progress consistently with backend
 * @see Issue #1344 - Fix progress inconsistency
 */
export const COMPLETED_SECTION_STATUSES: SectionStatus[] = [
  'generated',
  'reviewed',
  'approved',
];

/**
 * Section interface synchronized with backend EtpSection entity.
 * @see backend/src/entities/etp-section.entity.ts
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
export interface Section {
  id: string;
  etpId: string;
  title: string;
  content: string | null;

  /**
   * Section type from backend enum (Issue #1529)
   * @see SectionType
   */
  type?: SectionType;

  /**
   * User input for AI generation context
   * @see Issue #1529 - Added from backend
   */
  userInput?: string | null;

  /**
   * System prompt used for AI generation
   * @see Issue #1529 - Added from backend
   */
  systemPrompt?: string | null;

  /**
   * Section status from backend (Issue #1344, #1529)
   * Used for progress calculation to ensure consistency
   */
  status: SectionStatus;

  /**
   * Display order of the section (backend: order, frontend alias: sectionNumber)
   * @see Issue #1529 - Renamed from sectionNumber to match backend
   */
  order: number;

  isRequired: boolean;

  /**
   * Section metadata with generation info
   * @see SectionMetadata
   * @see Issue #1529 - Typed interface replacing Record<string, unknown>
   */
  metadata?: SectionMetadata | null;

  /**
   * Validation results from compliance engine
   * @see SectionValidationResults
   * @see Issue #1529 - Added from backend
   */
  validationResults?: SectionValidationResults | null;

  createdAt: string;
  updatedAt: string;

  // ========================================
  // DERIVED FIELDS (computed from backend data)
  // Kept for backward compatibility with existing components
  // ========================================

  /**
   * @deprecated Use `order` instead. Kept for backward compatibility.
   * @see Issue #1529 - Legacy alias for order field
   */
  sectionNumber?: number;

  /**
   * Derived: true when status is 'generated', 'reviewed', or 'approved'
   * @see COMPLETED_SECTION_STATUSES
   * @see Issue #1529 - This is a derived field, not persisted in backend
   */
  isCompleted?: boolean;

  /**
   * Derived: true when metadata.model exists (indicates AI generation)
   * @see Issue #1529 - This is a derived field, not persisted in backend
   */
  aiGenerated?: boolean;

  /**
   * Derived: true when AI generation completed without enrichment data
   * @see Issue #1529 - This is a derived field, not persisted in backend
   */
  hasEnrichmentWarning?: boolean;
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
  type: 'text' | 'textarea' | 'richtext' | 'number' | 'date' | 'select';
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
 * Data source status for government API queries.
 * Used by DataSourceStatus component to display availability alerts.
 * @see #756 - DataSourceStatus frontend component
 */
export interface DataSourceStatusInfo {
  status:
    | 'SUCCESS'
    | 'PARTIAL'
    | 'SERVICE_UNAVAILABLE'
    | 'RATE_LIMITED'
    | 'TIMEOUT';
  sources: Array<{
    name: string;
    status:
      | 'SUCCESS'
      | 'PARTIAL'
      | 'SERVICE_UNAVAILABLE'
      | 'RATE_LIMITED'
      | 'TIMEOUT';
    error?: string;
    latencyMs?: number;
    resultCount?: number;
  }>;
  message: string;
}

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
  /**
   * Status of data sources queried during enrichment phase.
   * Available after job completion.
   * @see #756 - DataSourceStatus frontend component
   */
  dataSourceStatus?: DataSourceStatusInfo;
}

/**
 * Response from GET /sections/jobs/:jobId
 */
export interface JobStatusResponse {
  data: JobStatusData;
  disclaimer: string;
}

/**
 * Section with async generation metadata.
 * Requires jobId and queuedAt in metadata.
 * @see Issue #1529 - Updated to use SectionMetadata interface
 */
export interface AsyncSection extends Section {
  metadata: SectionMetadata & {
    jobId: string;
    queuedAt: string;
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
