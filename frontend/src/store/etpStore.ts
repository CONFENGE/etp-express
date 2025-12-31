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
  SimilarContract,
} from '@/types/etp';
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

  // Similar contracts state (#1048)
  similarContracts: SimilarContract[];
  similarContractsLoading: boolean;

  // ETP Operations
  fetchETPs: () => Promise<void>;
  fetchETP: (id: string) => Promise<void>;
  createETP: (data: Partial<ETP>) => Promise<ETP>;
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
  ) => Promise<Blob>;
  exportDocx: (id: string, options?: { signal?: AbortSignal }) => Promise<Blob>;
  exportJSON: (id: string) => Promise<string>;

  // References
  fetchReferences: (etpId: string) => Promise<void>;
  addReference: (reference: Reference) => void;

  // Similar contracts (#1048)
  fetchSimilarContracts: (query: string) => Promise<void>;
  clearSimilarContracts: () => void;

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
  // Similar contracts state (#1048)
  similarContracts: [] as SimilarContract[],
  similarContractsLoading: false,
};

/**
 * AbortController for current polling operation (#611)
 * Stored outside the store to avoid triggering re-renders
 */
let currentPollingController: AbortController | null = null;

export const useETPStore = create<ETFState>((set, _get) => ({
  ...initialState,

  fetchETPs: async () => {
    set({ isLoading: true, error: null });
    try {
      // API returns paginated response: { data: ETP[], meta: {...}, disclaimer: string }
      const response = await apiHelpers.get<{ data: ETP[]; meta: unknown }>(
        '/etps',
      );
      set({ etps: response.data, isLoading: false });
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
      // Backend wraps response in { data: ETP, disclaimer: string }
      const response = await apiHelpers.get<{ data: ETP; disclaimer: string }>(
        `/etps/${id}`,
      );
      const etp = response.data;
      set({ currentETP: etp, isLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage('carregar', 'o ETP', error),
        isLoading: false,
      });
    }
  },

  createETP: async (data: Partial<ETP>) => {
    set({ isLoading: true, error: null });
    try {
      // Backend wraps response in { data: ETP, disclaimer: string }
      const response = await apiHelpers.post<{ data: ETP; disclaimer: string }>(
        '/etps',
        data,
      );
      const etp = response.data;
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

  /**
   * Updates an ETP with optimistic locking support (Issue #1059).
   * Sends the current version to prevent silent data loss from concurrent updates.
   * If version conflict (409), displays user-friendly error message.
   */
  updateETP: async (id: string, data: Partial<ETP>) => {
    set({ isLoading: true, error: null });
    try {
      // Include version from current ETP state for optimistic locking (#1059)
      const state = useETPStore.getState();
      const currentVersion =
        state.currentETP?.id === id ? state.currentETP.version : undefined;
      const dataWithVersion =
        currentVersion !== undefined
          ? { ...data, version: currentVersion }
          : data;

      // Backend wraps response in { data: ETP, disclaimer: string }
      const response = await apiHelpers.patch<{
        data: ETP;
        disclaimer: string;
      }>(`/etps/${id}`, dataWithVersion);
      const updated = response.data;
      set((state) => ({
        etps: state.etps.map((etp) => (etp.id === id ? updated : etp)),
        currentETP: state.currentETP?.id === id ? updated : state.currentETP,
        isLoading: false,
      }));
    } catch (error) {
      // Handle version conflict specially (Issue #1059)
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        set({
          error:
            'Este ETP foi modificado por outro usuário. Recarregue a página para ver as alterações mais recentes.',
          isLoading: false,
        });
        throw error;
      }
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
    _etpId: string,
    sectionId: string,
    data: Partial<Section>,
  ) => {
    set({ isLoading: true, error: null });
    try {
      // Use PATCH /sections/:id endpoint (not PUT /etps/:id/sections/:id)
      // Backend sections.controller.ts line 328 - PATCH /sections/:id
      const response = await apiHelpers.patch<{ data: Section }>(
        `/sections/${sectionId}`,
        data,
      );
      // Backend wraps response in { data: section, disclaimer: string }
      const updated = response.data;

      set((state) => {
        if (!state.currentETP) return state;

        const updatedSections = state.currentETP.sections.map((section) =>
          section.id === sectionId ? updated : section,
        );

        return {
          currentETP: {
            ...state.currentETP,
            sections: updatedSections,
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
    // Cancel any existing polling before starting new one (#611)
    if (currentPollingController) {
      currentPollingController.abort();
    }
    currentPollingController = new AbortController();
    const { signal } = currentPollingController;

    set({
      aiGenerating: true,
      error: null,
      generationProgress: 0,
      generationStatus: 'queued',
      generationJobId: null,
    });

    try {
      // 1. Start async generation and get jobId
      const response = await apiHelpers.post<{ data: AsyncSection }>(
        `/sections/etp/${request.etpId}/generate`,
        {
          type: `section_${request.sectionNumber}`,
          title: `Seção ${request.sectionNumber}`,
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
        set({
          aiGenerating: false,
          generationStatus: 'completed',
          generationProgress: 100,
          generationJobId: null,
          // Store data source status for display (#756)
          dataSourceStatus: pollResult.dataSourceStatus || null,
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
      // Clean up controller reference (#611)
      if (currentPollingController?.signal === signal) {
        currentPollingController = null;
      }
    }
  },

  regenerateSection: async (request: AIGenerationRequest) => {
    // Cancel any existing polling before starting new one (#611)
    if (currentPollingController) {
      currentPollingController.abort();
    }
    currentPollingController = new AbortController();
    const { signal } = currentPollingController;

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
      const response = await apiHelpers.post<{ data: AsyncSection }>(
        `/sections/etp/${request.etpId}/generate`,
        {
          type: `section_${request.sectionNumber}`,
          title: `Seção ${request.sectionNumber}`,
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
        set({
          aiGenerating: false,
          generationStatus: 'completed',
          generationProgress: 100,
          generationJobId: null,
          // Store data source status for display (#756)
          dataSourceStatus: pollResult.dataSourceStatus || null,
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
      // Clean up controller reference (#611)
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
      const { signal, ...exportOptions } = options || {};
      const response = await api.post(`/etps/${id}/export/pdf`, exportOptions, {
        responseType: 'blob',
        signal,
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
      return response.data as Blob;
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

  /**
   * Fetch similar contracts based on query text (#1048)
   * Uses the /search/similar-contracts endpoint with Exa AI
   */
  fetchSimilarContracts: async (query: string) => {
    if (!query || query.trim().length < 10) {
      // Don't search for very short queries
      return;
    }

    set({ similarContractsLoading: true });

    try {
      const response = await apiHelpers.get<{
        data: Array<{
          id: string;
          title: string;
          description?: string;
          similarity?: number;
          year?: number;
          value?: number;
          organ?: string;
          orgao?: string;
          objeto?: string;
          valorTotal?: number;
          anoContratacao?: number;
        }>;
      }>('/search/similar-contracts', {
        params: { q: query },
      });

      // Map backend response to SimilarContract type
      const contracts: SimilarContract[] = (response.data || []).map(
        (item) => ({
          id: item.id,
          title: item.title || item.objeto || 'Contratação sem título',
          description: item.description || item.objeto || '',
          similarity: item.similarity || 0.8,
          year: item.year || item.anoContratacao || new Date().getFullYear(),
          value: item.value || item.valorTotal,
          organ: item.organ || item.orgao,
        }),
      );

      set({
        similarContracts: contracts,
        similarContractsLoading: false,
      });
    } catch (error) {
      logger.error('Error fetching similar contracts', error);
      set({
        similarContracts: [],
        similarContractsLoading: false,
      });
    }
  },

  clearSimilarContracts: () => {
    set({ similarContracts: [], similarContractsLoading: false });
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),

  /**
   * Cancel any ongoing AI generation polling (#611)
   * Call this from component cleanup (useEffect return)
   * to prevent state updates on unmounted components
   */
  cancelGeneration: () => {
    if (currentPollingController) {
      currentPollingController.abort();
      currentPollingController = null;
      set({
        aiGenerating: false,
        generationProgress: 0,
        generationStatus: 'idle',
        generationJobId: null,
      });
    }
  },
}));
