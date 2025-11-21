import { create } from 'zustand';
import {
  ETP,
  Section,
  AIGenerationRequest,
  AIGenerationResponse,
  Reference,
  ValidationResult,
  ExportOptions,
} from '@/types/etp';
import { apiHelpers } from '@/lib/api';

interface ETFState {
  etps: ETP[];
  currentETP: ETP | null;
  references: Reference[];
  isLoading: boolean;
  error: string | null;
  aiGenerating: boolean;
  validationResult: ValidationResult | null;

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
  exportPDF: (id: string, options?: ExportOptions) => Promise<Blob>;
  exportJSON: (id: string) => Promise<string>;

  // References
  fetchReferences: (etpId: string) => Promise<void>;
  addReference: (reference: Reference) => void;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  etps: [],
  currentETP: null,
  references: [],
  isLoading: false,
  error: null,
  aiGenerating: false,
  validationResult: null,
};

export const useETPStore = create<ETFState>((set, _get) => ({
  ...initialState,

  fetchETPs: async () => {
    set({ isLoading: true, error: null });
    try {
      const etps = await apiHelpers.get<ETP[]>('/etps');
      set({ etps, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar ETPs',
        isLoading: false,
      });
    }
  },

  fetchETP: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const etp = await apiHelpers.get<ETP>(`/etps/${id}`);
      set({ currentETP: etp, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar ETP',
        isLoading: false,
      });
    }
  },

  createETP: async (data: Partial<ETP>) => {
    set({ isLoading: true, error: null });
    try {
      const etp = await apiHelpers.post<ETP>('/etps', data);
      set((state) => ({
        etps: [etp, ...state.etps],
        currentETP: etp,
        isLoading: false,
      }));
      return etp;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao criar ETP',
        isLoading: false,
      });
      throw error;
    }
  },

  updateETP: async (id: string, data: Partial<ETP>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiHelpers.put<ETP>(`/etps/${id}`, data);
      set((state) => ({
        etps: state.etps.map((etp) => (etp.id === id ? updated : etp)),
        currentETP: state.currentETP?.id === id ? updated : state.currentETP,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao atualizar ETP',
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
        error: error instanceof Error ? error.message : 'Erro ao deletar ETP',
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
    set({ isLoading: true, error: null });
    try {
      const updated = await apiHelpers.put<Section>(
        `/etps/${etpId}/sections/${sectionId}`,
        data,
      );

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
        error:
          error instanceof Error ? error.message : 'Erro ao atualizar seção',
        isLoading: false,
      });
      throw error;
    }
  },

  generateSection: async (request: AIGenerationRequest) => {
    set({ aiGenerating: true, error: null });
    try {
      const response = await apiHelpers.post<AIGenerationResponse>(
        `/etps/${request.etpId}/sections/${request.sectionNumber}/generate`,
        request,
      );
      set({ aiGenerating: false });
      return response;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Erro ao gerar seção com IA',
        aiGenerating: false,
      });
      throw error;
    }
  },

  regenerateSection: async (request: AIGenerationRequest) => {
    set({ aiGenerating: true, error: null });
    try {
      const response = await apiHelpers.post<AIGenerationResponse>(
        `/etps/${request.etpId}/sections/${request.sectionNumber}/regenerate`,
        request,
      );
      set({ aiGenerating: false });
      return response;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Erro ao regenerar seção',
        aiGenerating: false,
      });
      throw error;
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
        error: error instanceof Error ? error.message : 'Erro ao validar ETP',
        isLoading: false,
      });
      throw error;
    }
  },

  exportPDF: async (id: string, options?: ExportOptions) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.post<Blob>(
        `/etps/${id}/export/pdf`,
        options,
      );
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao exportar PDF',
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
        error: error instanceof Error ? error.message : 'Erro ao exportar JSON',
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
      console.error('Erro ao carregar referências:', error);
    }
  },

  addReference: (reference: Reference) => {
    set((state) => ({
      references: [...state.references, reference],
    }));
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),
}));
