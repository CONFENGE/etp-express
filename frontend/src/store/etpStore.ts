import { create } from 'zustand';
import {
  ETP,
  Section,
  AIGenerationRequest,
  AIGenerationResponse,
  Reference,
  ValidationResult,
  ExportOptions,
  GenerationStatus,
  AsyncSection,
  DataSourceStatusInfo,
  COMPLETED_SECTION_STATUSES,
  SectionType,
} from '@/types/etp';
import { CreateETPPayload } from '@/schemas/etpWizardSchema';
import axios from 'axios';
import api, { apiHelpers } from '@/lib/api';
import {
  pollJobStatus,
  JobFailedError,
  PollingTimeoutError,
  PollingAbortedError,
} from '@/lib/polling';
import { logger } from '@/lib/logger';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Result of export operations containing blob and filename from backend
 */
interface ExportResult {
  blob: Blob;
  filename: string;
}

/**
 * Backend user type for createdBy relation.
 * @see Issue #1351 - Admin dashboard ETP authorship identification
 */
interface BackendUser {
  id: string;
  name: string;
  email?: string;
}

/**
 * Backend Section response type.
 * The backend may return 'order' instead of 'sectionNumber'.
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
interface BackendSection extends Omit<Section, 'order' | 'sectionNumber' | 'isCompleted' | 'aiGenerated' | 'hasEnrichmentWarning'> {
  order?: number;
  sectionNumber?: number;
}

/**
 * Maps backend section response to frontend Section type.
 * Computes derived fields (isCompleted, aiGenerated, hasEnrichmentWarning).
 *
 * @param backendSection - Section data from backend API
 * @returns Section object with derived fields computed
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
function mapBackendSectionToFrontend(backendSection: BackendSection): Section {
  const { order, sectionNumber: legacyNumber, ...rest } = backendSection;

  // Determine the order value (backend uses 'order', legacy uses 'sectionNumber')
  const sectionOrder = order ?? legacyNumber ?? 1;

  // Compute derived fields
  const isCompleted = COMPLETED_SECTION_STATUSES.includes(
    backendSection.status ?? 'pending'
  );
  const aiGenerated = Boolean(backendSection.metadata?.model);
  const hasEnrichmentWarning = aiGenerated &&
    backendSection.metadata?.agentsUsed?.length === 0;

  return {
    ...rest,
    order: sectionOrder,
    sectionNumber: sectionOrder, // Legacy alias for backward compatibility
    isCompleted,
    aiGenerated,
    hasEnrichmentWarning,
  } as Section;
}

/**
 * Maps array of backend sections to frontend Sections.
 * @param backendSections - Array of section data from backend API
 * @returns Array of Section objects with derived fields computed
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
function mapBackendSections(backendSections: BackendSection[]): Section[] {
  return backendSections.map(mapBackendSectionToFrontend);
}

/**
 * Backend ETP response type with completionPercentage field.
 * The backend returns `completionPercentage` but frontend type expects `progress`.
 * @see Issue #1316 - Progress display fix
 * @see Issue #1351 - Admin dashboard ETP authorship identification
 */
interface BackendETP extends Omit<ETP, 'progress' | 'createdBy'> {
  completionPercentage?: number;
  progress?: number;
  createdBy?: BackendUser;
}

/**
 * Maps backend ETP response to frontend ETP type.
 * Converts `completionPercentage` → `progress` for compatibility.
 * Maps `createdBy` user relation for authorship display.
 *
 * @param backendEtp - ETP data from backend API
 * @returns ETP object with `progress` field properly set
 * @see Issue #1316 - Fix progress display showing only '%' without value
 * @see Issue #1351 - Admin dashboard ETP authorship identification
 */
function mapBackendETPToFrontend(backendEtp: BackendETP): ETP {
  const { completionPercentage, createdBy, sections, ...rest } = backendEtp;

  // Map sections with derived fields (#1529)
  const mappedSections = sections
    ? mapBackendSections(sections as unknown as BackendSection[])
    : [];

  return {
    ...rest,
    sections: mappedSections,
    // Use completionPercentage from backend, fallback to progress if already mapped, default to 0
    progress: completionPercentage ?? rest.progress ?? 0,
    // Map createdBy user for authorship display (#1351)
    createdBy: createdBy
      ? { id: createdBy.id, name: createdBy.name }
      : undefined,
  } as ETP;
}

/**
 * Maps array of backend ETPs to frontend ETPs.
 * @param backendEtps - Array of ETP data from backend API
 * @returns Array of ETP objects with `progress` field properly set
 */
function mapBackendETPs(backendEtps: BackendETP[]): ETP[] {
  return backendEtps.map(mapBackendETPToFrontend);
}

/**
 * Calculates ETP completion percentage based on section statuses.
 * Uses the same logic as backend: count sections with status 'generated', 'reviewed', or 'approved'
 * and divide by total sections.
 *
 * @param sections - Array of sections to calculate progress from
 * @returns Progress percentage (0-100), or 0 if no sections
 * @see Issue #1344 - Ensure frontend progress calculation matches backend
 * @see backend/src/modules/etps/etps.service.ts updateCompletionPercentage()
 */
function calculateProgress(sections: Section[]): number {
  if (!sections || sections.length === 0) {
    return 0;
  }

  const completedSections = sections.filter((s) =>
    COMPLETED_SECTION_STATUSES.includes(s.status ?? 'pending'),
  ).length;

  return (completedSections / sections.length) * 100;
}

/**
 * @deprecated Use SectionType from @/types/etp instead.
 * Kept as alias for backward compatibility.
 * @see Issue #1529 - Sync Section type with EtpSection entity
 */
type BackendSectionType = SectionType;

/**
 * Maps section number to backend SectionType enum value.
 * Based on section-templates.json section titles and backend enum.
 *
 * @see backend/src/entities/etp-section.entity.ts SectionType enum
 * @see frontend/public/data/section-templates.json
 */
const SECTION_NUMBER_TO_TYPE: Record<number, BackendSectionType> = {
  1: 'justificativa', // I - Necessidade da Contratacao
  2: 'introducao', // II - Objetivos da Contratacao
  3: 'descricao_solucao', // III - Descricao da Solucao
  4: 'requisitos', // IV - Requisitos da Contratacao
  5: 'criterios_selecao', // V - Levantamento de Mercado
  6: 'estimativa_valor', // VI - Estimativa de Precos
  7: 'custom', // VII - Justificativa para Parcelamento
  8: 'adequacao_orcamentaria', // VIII - Adequacao Orcamentaria
  9: 'custom', // IX - Resultados Pretendidos
  10: 'custom', // X - Providencias a serem Adotadas
  11: 'analise_riscos', // XI - Possiveis Impactos Ambientais
  12: 'declaracao_viabilidade', // XII - Declaracao de Viabilidade
  13: 'custom', // XIII - Contratacoes Correlatas
};

/**
 * Gets the backend SectionType for a given section number.
 * Falls back to 'custom' for unmapped sections.
 */
function getSectionType(sectionNumber: number): BackendSectionType {
  return SECTION_NUMBER_TO_TYPE[sectionNumber] || 'custom';
}

/**
 * Helper to extract filename from Content-Disposition header
 */
function extractFilenameFromHeader(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;

  // Try to extract filename from Content-Disposition header
  // Format: attachment; filename="ETP-uuid.pdf"
  const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1];
  }

  return fallback;
}

interface ETFState {
  etps: ETP[];
  currentETP: ETP | null;
  references: Reference[];
  isLoading: boolean;
  error: string | null;
  aiGenerating: boolean;
  validationResult: ValidationResult | null;

  // Async generation state (#222)
  generationProgress: number;
  generationStatus: GenerationStatus;
  generationJobId: string | null;

  // Data source status for government APIs (#756)
  dataSourceStatus: DataSourceStatusInfo | null;

  // ETP Operations
  fetchETPs: () => Promise<void>;
  fetchETP: (id: string) => Promise<void>;
  createETP: (data: CreateETPPayload) => Promise<ETP>;
  updateETP: (id: string, data: Partial<ETP>) => Promise<void>;
  deleteETP: (id: string) => Promise<void>;
  setCurrentETP: (etp: ETP | null) => void;

  // Section Operations
  updateSection: (
    etpId: string,
    sectionId: string,
    data: Partial<Section>,
  ) => Promise<void>;
  generateSection: (
    request: AIGenerationRequest,
  ) => Promise<AIGenerationResponse>;
  regenerateSection: (
    request: AIGenerationRequest,
  ) => Promise<AIGenerationResponse>;

  // Validation
  validateETP: (id: string) => Promise<ValidationResult>;

  // Export
  exportPDF: (
    id: string,
    options?: Partial<ExportOptions> & { signal?: AbortSignal },
  ) => Promise<ExportResult>;
  exportDocx: (
    id: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ExportResult>;
  exportJSON: (id: string) => Promise<string>;

  // Preview (#1214)
  fetchPreview: (
    id: string,
    options?: { signal?: AbortSignal },
  ) => Promise<Blob>;

  // References
  fetchReferences: (etpId: string) => Promise<void>;
  addReference: (reference: Reference) => void;

  // Utility
  clearError: () => void;
  resetStore: () => void;

  // Abort/Cancel (#611)
  cancelGeneration: () => void;
}

const initialState = {
  etps: [],
  currentETP: null,
  references: [],
  isLoading: false,
  error: null,
  aiGenerating: false,
  validationResult: null,
  // Async generation state (#222)
  generationProgress: 0,
  generationStatus: 'idle' as GenerationStatus,
  generationJobId: null as string | null,
  // Data source status for government APIs (#756)
  dataSourceStatus: null as DataSourceStatusInfo | null,
};

/**
 * Map of AbortControllers for parallel polling operations (#1066)
 * Key: sectionNumber (unique per generation)
 * Stored outside the store to avoid triggering re-renders
 *
 * Changed from single global AbortController to Map to support
 * multiple simultaneous section generations without cross-cancellation.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1066
 */
const pollingControllers = new Map<number, AbortController>();

/**
 * @deprecated Use pollingControllers Map instead (#1066)
 * Kept for backward compatibility with cancelGeneration() which
 * cancels ALL ongoing generations (e.g., on component unmount)
 */
let currentPollingController: AbortController | null = null;

export const useETPStore = create<ETFState>((set, _get) => ({
  ...initialState,

  fetchETPs: async () => {
    set({ isLoading: true, error: null });
    try {
      // API returns paginated response: { data: ETP[], meta: {...}, disclaimer: string }
      // Backend returns `completionPercentage`, map to frontend `progress` (#1316)
      const response = await apiHelpers.get<{
        data: BackendETP[];
        meta: unknown;
      }>('/etps');
      set({ etps: mapBackendETPs(response.data), isLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage('carregar', 'ETPs', error),
        isLoading: false,
      });
    }
  },

  fetchETP: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Backend returns `completionPercentage`, map to frontend `progress` (#1316)
      const response = await apiHelpers.get<{ data: BackendETP }>(
        `/etps/${id}`,
      );
      set({
        currentETP: mapBackendETPToFrontend(response.data),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: getContextualErrorMessage('carregar', 'o ETP', error),
        isLoading: false,
      });
    }
  },

  createETP: async (data: CreateETPPayload) => {
    set({ isLoading: true, error: null });
    try {
      // Backend returns `completionPercentage`, map to frontend `progress` (#1316)
      const response = await apiHelpers.post<{ data: BackendETP }>(
        '/etps',
        data,
      );
      const etp = mapBackendETPToFrontend(response.data);
      set((state) => ({
        etps: [etp, ...state.etps],
        currentETP: etp,
        isLoading: false,
      }));
      return etp;
    } catch (error) {
      set({
        error: getContextualErrorMessage('criar', 'o ETP', error),
        isLoading: false,
      });
      throw error;
    }
  },

  updateETP: async (id: string, data: Partial<ETP>) => {
    set({ isLoading: true, error: null });
    try {
      // Backend returns `completionPercentage`, map to frontend `progress` (#1316)
      const response = await apiHelpers.put<{ data: BackendETP }>(
        `/etps/${id}`,
        data,
      );
      const updated = mapBackendETPToFrontend(response.data);
      set((state) => ({
        etps: state.etps.map((etp) => (etp.id === id ? updated : etp)),
        currentETP: state.currentETP?.id === id ? updated : state.currentETP,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getContextualErrorMessage('atualizar', 'o ETP', error),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteETP: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiHelpers.delete(`/etps/${id}`);
      set((state) => ({
        etps: state.etps.filter((etp) => etp.id !== id),
        currentETP: state.currentETP?.id === id ? null : state.currentETP,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getContextualErrorMessage('excluir', 'o ETP', error),
        isLoading: false,
      });
      throw error;
    }
  },

  setCurrentETP: (etp: ETP | null) => set({ currentETP: etp }),

  updateSection: async (
    etpId: string,
    sectionId: string,
    data: Partial<Section>,
  ) => {
    // Note: etpId is kept for API consistency but not used in the route
    // The backend endpoint is PATCH /sections/:id
    void etpId; // Explicitly mark as unused to avoid lint warnings
    set({ isLoading: true, error: null });
    try {
      const updated = await apiHelpers.patch<Section>(
        `/sections/${sectionId}`,
        data,
      );

      set((state) => {
        if (!state.currentETP) return state;

        const updatedSections = state.currentETP.sections.map((section) =>
          section.id === sectionId ? updated : section,
        );

        // Issue #1344: Recalculate progress locally after section update
        // This ensures consistency between list and detail views
        const newProgress = calculateProgress(updatedSections);

        return {
          currentETP: {
            ...state.currentETP,
            sections: updatedSections,
            progress: newProgress,
          },
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: getContextualErrorMessage('atualizar', 'a seção', error),
        isLoading: false,
      });
      throw error;
    }
  },

  generateSection: async (request: AIGenerationRequest) => {
    const { sectionNumber } = request;

    // Cancel only the existing polling for THIS section, not others (#1066)
    // This allows multiple sections to be generated simultaneously
    const existingController = pollingControllers.get(sectionNumber);
    if (existingController) {
      existingController.abort();
      pollingControllers.delete(sectionNumber);
    }

    // Create new controller for this section
    const controller = new AbortController();
    pollingControllers.set(sectionNumber, controller);
    const { signal } = controller;

    // Keep backward compatibility with cancelGeneration() (#611)
    currentPollingController = controller;

    set({
      aiGenerating: true,
      error: null,
      generationProgress: 0,
      generationStatus: 'queued',
      generationJobId: null,
    });

    try {
      // 1. Start async generation and get jobId
      // Map section number to backend SectionType enum value (#1303)
      const sectionType = getSectionType(sectionNumber);

      const response = await apiHelpers.post<{ data: AsyncSection }>(
        `/sections/etp/${request.etpId}/generate`,
        {
          type: sectionType,
          title: `Seção ${sectionNumber}`,
          userInput: request.prompt || '',
          context: request.context,
        },
      );

      // Check if aborted before continuing (#611)
      if (signal.aborted) {
        return null as unknown as AIGenerationResponse;
      }

      const jobId = response.data.metadata?.jobId;

      if (!jobId) {
        // Fallback: backend returned sync response (no jobId)
        if (!signal.aborted) {
          set({
            aiGenerating: false,
            generationStatus: 'completed',
            generationProgress: 100,
          });
        }
        return {
          content: response.data.content || '',
          references: [],
          confidence: 1,
          warnings: [],
        } as AIGenerationResponse;
      }

      set({ generationJobId: jobId, generationStatus: 'generating' });

      // 2. Poll for completion with progress updates and abort support (#611)
      const pollResult = await pollJobStatus(
        jobId,
        (progress) => {
          if (!signal.aborted) {
            set({ generationProgress: progress });
          }
        },
        { signal },
      );

      if (!signal.aborted) {
        // Issue #1344: Update currentETP with generated section and recalculate progress
        // This ensures progress is consistent between list and detail views
        set((state) => {
          const updatedSections = state.currentETP?.sections.map((section) =>
            section.sectionNumber === sectionNumber
              ? { ...section, ...pollResult.section }
              : section,
          );

          const newProgress = updatedSections
            ? calculateProgress(updatedSections)
            : (state.currentETP?.progress ?? 0);

          return {
            aiGenerating: false,
            generationStatus: 'completed',
            generationProgress: 100,
            generationJobId: null,
            // Store data source status for display (#756)
            dataSourceStatus: pollResult.dataSourceStatus || null,
            // Issue #1344: Update ETP sections and progress
            currentETP: state.currentETP
              ? {
                  ...state.currentETP,
                  sections: updatedSections || state.currentETP.sections,
                  progress: newProgress,
                }
              : null,
          };
        });
      }

      return {
        content: pollResult.section.content || '',
        references: [],
        confidence: 1,
        warnings: [],
      } as AIGenerationResponse;
    } catch (error) {
      // Silently handle aborted requests (#611)
      if (error instanceof PollingAbortedError || signal.aborted) {
        return null as unknown as AIGenerationResponse;
      }

      // Use friendly error messages, but keep specific messages from known error types
      let errorMessage: string;

      if (
        error instanceof JobFailedError ||
        error instanceof PollingTimeoutError
      ) {
        // These errors already have user-friendly messages in Portuguese
        errorMessage = error.message;
      } else {
        errorMessage = getContextualErrorMessage(
          'gerar',
          'a seção com IA',
          error,
        );
      }

      set({
        error: errorMessage,
        aiGenerating: false,
        generationStatus: 'failed',
        generationProgress: 0,
        generationJobId: null,
      });
      throw error;
    } finally {
      // Clean up controller reference for this section (#1066)
      pollingControllers.delete(sectionNumber);
      // Clean up backward-compat reference if it matches (#611)
      if (currentPollingController?.signal === signal) {
        currentPollingController = null;
      }
    }
  },

  regenerateSection: async (request: AIGenerationRequest) => {
    const { sectionNumber } = request;

    // Cancel only the existing polling for THIS section, not others (#1066)
    // This allows multiple sections to be regenerated simultaneously
    const existingController = pollingControllers.get(sectionNumber);
    if (existingController) {
      existingController.abort();
      pollingControllers.delete(sectionNumber);
    }

    // Create new controller for this section
    const controller = new AbortController();
    pollingControllers.set(sectionNumber, controller);
    const { signal } = controller;

    // Keep backward compatibility with cancelGeneration() (#611)
    currentPollingController = controller;

    set({
      aiGenerating: true,
      error: null,
      generationProgress: 0,
      generationStatus: 'queued',
      generationJobId: null,
    });

    try {
      // For regenerate, we need to find the section ID first
      // The regenerate endpoint uses section ID, not section number
      // Map section number to backend SectionType enum value (#1303)
      const sectionType = getSectionType(sectionNumber);

      const response = await apiHelpers.post<{ data: AsyncSection }>(
        `/sections/etp/${request.etpId}/generate`,
        {
          type: sectionType,
          title: `Seção ${sectionNumber}`,
          userInput: request.prompt || '',
          context: { ...request.context, regenerate: true },
        },
      );

      // Check if aborted before continuing (#611)
      if (signal.aborted) {
        return null as unknown as AIGenerationResponse;
      }

      const jobId = response.data.metadata?.jobId;

      if (!jobId) {
        // Fallback: backend returned sync response (no jobId)
        if (!signal.aborted) {
          set({
            aiGenerating: false,
            generationStatus: 'completed',
            generationProgress: 100,
          });
        }
        return {
          content: response.data.content || '',
          references: [],
          confidence: 1,
          warnings: [],
        } as AIGenerationResponse;
      }

      set({ generationJobId: jobId, generationStatus: 'generating' });

      // Poll for completion with progress updates and abort support (#611)
      const pollResult = await pollJobStatus(
        jobId,
        (progress) => {
          if (!signal.aborted) {
            set({ generationProgress: progress });
          }
        },
        { signal },
      );

      if (!signal.aborted) {
        // Issue #1344: Update currentETP with regenerated section and recalculate progress
        // This ensures progress is consistent between list and detail views
        set((state) => {
          const updatedSections = state.currentETP?.sections.map((section) =>
            section.sectionNumber === sectionNumber
              ? { ...section, ...pollResult.section }
              : section,
          );

          const newProgress = updatedSections
            ? calculateProgress(updatedSections)
            : (state.currentETP?.progress ?? 0);

          return {
            aiGenerating: false,
            generationStatus: 'completed',
            generationProgress: 100,
            generationJobId: null,
            // Store data source status for display (#756)
            dataSourceStatus: pollResult.dataSourceStatus || null,
            // Issue #1344: Update ETP sections and progress
            currentETP: state.currentETP
              ? {
                  ...state.currentETP,
                  sections: updatedSections || state.currentETP.sections,
                  progress: newProgress,
                }
              : null,
          };
        });
      }

      return {
        content: pollResult.section.content || '',
        references: [],
        confidence: 1,
        warnings: [],
      } as AIGenerationResponse;
    } catch (error) {
      // Silently handle aborted requests (#611)
      if (error instanceof PollingAbortedError || signal.aborted) {
        return null as unknown as AIGenerationResponse;
      }

      // Use friendly error messages, but keep specific messages from known error types
      let errorMessage: string;

      if (
        error instanceof JobFailedError ||
        error instanceof PollingTimeoutError
      ) {
        // These errors already have user-friendly messages in Portuguese
        errorMessage = error.message;
      } else {
        errorMessage = getContextualErrorMessage('regenerar', 'a seção', error);
      }

      set({
        error: errorMessage,
        aiGenerating: false,
        generationStatus: 'failed',
        generationProgress: 0,
        generationJobId: null,
      });
      throw error;
    } finally {
      // Clean up controller reference for this section (#1066)
      pollingControllers.delete(sectionNumber);
      // Clean up backward-compat reference if it matches (#611)
      if (currentPollingController?.signal === signal) {
        currentPollingController = null;
      }
    }
  },

  validateETP: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiHelpers.get<ValidationResult>(
        `/etps/${id}/validate`,
      );
      set({ validationResult: result, isLoading: false });
      return result;
    } catch (error) {
      set({
        error: getContextualErrorMessage('validar', 'o ETP', error),
        isLoading: false,
      });
      throw error;
    }
  },

  exportPDF: async (
    id: string,
    options?: Partial<ExportOptions> & { signal?: AbortSignal },
  ) => {
    set({ isLoading: true, error: null });
    try {
      const { signal } = options || {};
      // Backend export route is GET /export/etp/:id/pdf (#1315)
      const response = await api.get(`/export/etp/${id}/pdf`, {
        responseType: 'blob',
        signal,
      });
      set({ isLoading: false });

      // Extract filename from Content-Disposition header (#1154)
      const contentDisposition = response.headers['content-disposition'];
      const filename = extractFilenameFromHeader(
        contentDisposition,
        `ETP-${id}.pdf`,
      );

      return {
        blob: response.data as Blob,
        filename,
      };
    } catch (error) {
      // Don't set error state for aborted requests
      if (axios.isCancel(error) || (error as Error).name === 'CanceledError') {
        set({ isLoading: false });
        throw error;
      }
      set({
        error: getContextualErrorMessage('exportar', 'o PDF', error),
        isLoading: false,
      });
      throw error;
    }
  },

  exportDocx: async (id: string, options?: { signal?: AbortSignal }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/export/etp/${id}/docx`, {
        responseType: 'blob',
        signal: options?.signal,
      });
      set({ isLoading: false });

      // Extract filename from Content-Disposition header (#1154)
      const contentDisposition = response.headers['content-disposition'];
      const filename = extractFilenameFromHeader(
        contentDisposition,
        `ETP-${id}.docx`,
      );

      return {
        blob: response.data as Blob,
        filename,
      };
    } catch (error) {
      // Don't set error state for aborted requests
      if (axios.isCancel(error) || (error as Error).name === 'CanceledError') {
        set({ isLoading: false });
        throw error;
      }
      set({
        error: getContextualErrorMessage('exportar', 'o DOCX', error),
        isLoading: false,
      });
      throw error;
    }
  },

  // Preview PDF for modal (#1214)
  fetchPreview: async (id: string, options?: { signal?: AbortSignal }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/export/etp/${id}/preview`, {
        responseType: 'blob',
        signal: options?.signal,
      });
      set({ isLoading: false });
      return response.data as Blob;
    } catch (error) {
      // Don't set error state for aborted requests
      if (axios.isCancel(error) || (error as Error).name === 'CanceledError') {
        set({ isLoading: false });
        throw error;
      }
      set({
        error: getContextualErrorMessage('carregar', 'o preview', error),
        isLoading: false,
      });
      throw error;
    }
  },

  exportJSON: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.get<string>(`/etps/${id}/export/json`);
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({
        error: getContextualErrorMessage('exportar', 'o JSON', error),
        isLoading: false,
      });
      throw error;
    }
  },

  fetchReferences: async (etpId: string) => {
    try {
      const references = await apiHelpers.get<Reference[]>(
        `/etps/${etpId}/references`,
      );
      set({ references });
    } catch (error) {
      logger.error('Erro ao carregar referências', error, { etpId });
    }
  },

  addReference: (reference: Reference) => {
    set((state) => ({
      references: [...state.references, reference],
    }));
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),

  /**
   * Cancel ALL ongoing AI generation polling (#611, #1066)
   * Call this from component cleanup (useEffect return)
   * to prevent state updates on unmounted components
   *
   * Updated in #1066 to cancel all parallel generations,
   * not just the last one started.
   */
  cancelGeneration: () => {
    // Cancel all ongoing generations (#1066)
    for (const controller of pollingControllers.values()) {
      controller.abort();
    }
    pollingControllers.clear();

    // Also clean up backward-compat reference (#611)
    if (currentPollingController) {
      currentPollingController.abort();
      currentPollingController = null;
    }

    set({
      aiGenerating: false,
      generationProgress: 0,
      generationStatus: 'idle',
      generationJobId: null,
    });
  },
}));
