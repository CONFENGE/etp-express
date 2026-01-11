import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';
import { logger } from '@/lib/logger';
import { getContextualErrorMessage } from '@/lib/api-errors';
import {
  TermoReferencia,
  UpdateTermoReferenciaDto,
  GenerateTrResponse,
  calculateTRProgress,
} from '@/types/termo-referencia';

/**
 * Zustand store for Termo de Referencia operations.
 *
 * Provides state management and API integration for TR CRUD operations.
 * Follows the same patterns as etpStore.ts for consistency.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 * @see Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */

interface TRState {
  // Data
  trs: TermoReferencia[];
  currentTR: TermoReferencia | null;

  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Operations
  fetchTRs: () => Promise<void>;
  fetchTRsByEtp: (etpId: string) => Promise<void>;
  fetchTR: (id: string) => Promise<void>;
  generateFromEtp: (etpId: string) => Promise<GenerateTrResponse>;
  updateTR: (id: string, data: UpdateTermoReferenciaDto) => Promise<void>;
  deleteTR: (id: string) => Promise<void>;
  setCurrentTR: (tr: TermoReferencia | null) => void;

  // Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialState = {
  trs: [],
  currentTR: null,
  isLoading: false,
  isGenerating: false,
  error: null,
};

export const useTRStore = create<TRState>((set, _get) => ({
  ...initialState,

  /**
   * Fetch all TRs for the organization
   */
  fetchTRs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.get<TermoReferencia[]>(
        '/termo-referencia',
      );
      set({ trs: response, isLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'carregar',
          'os Termos de Referencia',
          error,
        ),
        isLoading: false,
      });
    }
  },

  /**
   * Fetch TRs for a specific ETP
   */
  fetchTRsByEtp: async (etpId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.get<TermoReferencia[]>(
        `/termo-referencia/etp/${etpId}`,
      );
      set({ trs: response, isLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'carregar',
          'os Termos de Referencia do ETP',
          error,
        ),
        isLoading: false,
      });
    }
  },

  /**
   * Fetch a single TR by ID
   */
  fetchTR: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.get<TermoReferencia>(
        `/termo-referencia/${id}`,
      );
      set({ currentTR: response, isLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'carregar',
          'o Termo de Referencia',
          error,
        ),
        isLoading: false,
      });
    }
  },

  /**
   * Generate TR automatically from an ETP
   * Uses AI to enrich the content
   */
  generateFromEtp: async (etpId: string) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await apiHelpers.post<GenerateTrResponse>(
        `/termo-referencia/generate/${etpId}`,
        {},
      );

      set((state) => ({
        trs: [response, ...state.trs],
        currentTR: response,
        isGenerating: false,
      }));

      logger.info('TR gerado com sucesso via IA', {
        trId: response.id,
        etpId,
        aiEnhanced: response.metadata?.aiEnhanced,
        tokens: response.metadata?.tokens,
      });

      return response;
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'gerar',
          'o Termo de Referencia',
          error,
        ),
        isGenerating: false,
      });
      throw error;
    }
  },

  /**
   * Update an existing TR
   */
  updateTR: async (id: string, data: UpdateTermoReferenciaDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.patch<TermoReferencia>(
        `/termo-referencia/${id}`,
        data,
      );

      set((state) => ({
        trs: state.trs.map((tr) => (tr.id === id ? response : tr)),
        currentTR: state.currentTR?.id === id ? response : state.currentTR,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'atualizar',
          'o Termo de Referencia',
          error,
        ),
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Delete a TR
   */
  deleteTR: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiHelpers.delete(`/termo-referencia/${id}`);
      set((state) => ({
        trs: state.trs.filter((tr) => tr.id !== id),
        currentTR: state.currentTR?.id === id ? null : state.currentTR,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'excluir',
          'o Termo de Referencia',
          error,
        ),
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Set current TR (for local state changes)
   */
  setCurrentTR: (tr: TermoReferencia | null) => set({ currentTR: tr }),

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store to initial state
   */
  resetStore: () => set(initialState),
}));

/**
 * Helper function to get progress percentage for a TR
 */
export function getTRProgress(tr: TermoReferencia): number {
  return calculateTRProgress(tr);
}
