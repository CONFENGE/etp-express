import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import type {
  PesquisaItem,
  PriceResult,
  PriceSourceType,
} from '@/schemas/pesquisaPrecosSchema';

/**
 * PesquisaPrecos entity type from backend
 * @see backend/src/modules/pesquisa-precos/entities/pesquisa-precos.entity.ts
 */
export interface PesquisaPrecos {
  id: string;
  etpId?: string;
  trId?: string;
  items: PesquisaItem[];
  sources: PriceSourceType[];
  results: PriceResult[];
  selectedPrices: Record<string, number>;
  justifications: Record<string, string>;
  status: 'draft' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Create PesquisaPrecos DTO
 */
export interface CreatePesquisaPrecosDto {
  etpId?: string;
  trId?: string;
  items: PesquisaItem[];
  sources: PriceSourceType[];
}

/**
 * Update PesquisaPrecos DTO
 */
export interface UpdatePesquisaPrecosDto {
  results?: PriceResult[];
  selectedPrices?: Record<string, number>;
  justifications?: Record<string, string>;
  status?: 'draft' | 'in_progress' | 'completed';
}

/**
 * Price collection response from backend
 */
export interface PriceCollectionResult {
  itemId: string;
  results: PriceResult[];
  errors?: string[];
}

interface PesquisaPrecosState {
  // Data state
  pesquisas: PesquisaPrecos[];
  currentPesquisa: PesquisaPrecos | null;
  isLoading: boolean;
  error: string | null;

  // Collection state
  isCollecting: boolean;
  collectionProgress: number;

  // Operations
  fetchPesquisas: () => Promise<void>;
  fetchPesquisa: (id: string) => Promise<void>;
  createPesquisa: (data: CreatePesquisaPrecosDto) => Promise<PesquisaPrecos>;
  updatePesquisa: (id: string, data: UpdatePesquisaPrecosDto) => Promise<void>;
  deletePesquisa: (id: string) => Promise<void>;

  // Price collection
  collectPrices: (
    pesquisaId: string,
  ) => Promise<{ results: PriceCollectionResult[] }>;

  // Utility
  clearError: () => void;
  resetStore: () => void;
  setCurrentPesquisa: (pesquisa: PesquisaPrecos | null) => void;
}

const initialState = {
  pesquisas: [],
  currentPesquisa: null,
  isLoading: false,
  error: null,
  isCollecting: false,
  collectionProgress: 0,
};

/**
 * Pesquisa de Precos Store
 *
 * Manages state for price research module:
 * - CRUD operations for pesquisas
 * - Price collection from multiple sources
 * - Results management
 *
 * @see Issue #1506 - Create PesquisaPrecos wizard structure
 */
export const usePesquisaPrecosStore = create<PesquisaPrecosState>(
  (set, get) => ({
    ...initialState,

    fetchPesquisas: async () => {
      set({ isLoading: true, error: null });
      try {
        const pesquisas =
          await apiHelpers.get<PesquisaPrecos[]>('/pesquisa-precos');
        set({
          pesquisas,
          isLoading: false,
        });
      } catch (error) {
        logger.error('Failed to fetch pesquisas', { error });
        set({
          error: getContextualErrorMessage(
            'listar',
            'pesquisas de precos',
            error,
          ),
          isLoading: false,
        });
      }
    },

    fetchPesquisa: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const pesquisa = await apiHelpers.get<PesquisaPrecos>(
          `/pesquisa-precos/${id}`,
        );
        set({
          currentPesquisa: pesquisa,
          isLoading: false,
        });
      } catch (error) {
        logger.error('Failed to fetch pesquisa', { error, id });
        set({
          error: getContextualErrorMessage(
            'carregar',
            'pesquisa de precos',
            error,
          ),
          isLoading: false,
        });
      }
    },

    createPesquisa: async (data: CreatePesquisaPrecosDto) => {
      set({ isLoading: true, error: null });
      try {
        const newPesquisa = await apiHelpers.post<PesquisaPrecos>(
          '/pesquisa-precos',
          data,
        );

        set((state) => ({
          pesquisas: [newPesquisa, ...state.pesquisas],
          currentPesquisa: newPesquisa,
          isLoading: false,
        }));

        logger.info('Pesquisa created', { id: newPesquisa.id });
        return newPesquisa;
      } catch (error) {
        logger.error('Failed to create pesquisa', { error });
        set({
          error: getContextualErrorMessage(
            'criar',
            'pesquisa de precos',
            error,
          ),
          isLoading: false,
        });
        throw error;
      }
    },

    updatePesquisa: async (id: string, data: UpdatePesquisaPrecosDto) => {
      set({ isLoading: true, error: null });
      try {
        const updatedPesquisa = await apiHelpers.patch<PesquisaPrecos>(
          `/pesquisa-precos/${id}`,
          data,
        );

        set((state) => ({
          pesquisas: state.pesquisas.map((p) =>
            p.id === id ? updatedPesquisa : p,
          ),
          currentPesquisa:
            state.currentPesquisa?.id === id
              ? updatedPesquisa
              : state.currentPesquisa,
          isLoading: false,
        }));

        logger.info('Pesquisa updated', { id });
      } catch (error) {
        logger.error('Failed to update pesquisa', { error, id });
        set({
          error: getContextualErrorMessage(
            'atualizar',
            'pesquisa de precos',
            error,
          ),
          isLoading: false,
        });
        throw error;
      }
    },

    deletePesquisa: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await apiHelpers.delete(`/pesquisa-precos/${id}`);

        set((state) => ({
          pesquisas: state.pesquisas.filter((p) => p.id !== id),
          currentPesquisa:
            state.currentPesquisa?.id === id ? null : state.currentPesquisa,
          isLoading: false,
        }));

        logger.info('Pesquisa deleted', { id });
      } catch (error) {
        logger.error('Failed to delete pesquisa', { error, id });
        set({
          error: getContextualErrorMessage(
            'excluir',
            'pesquisa de precos',
            error,
          ),
          isLoading: false,
        });
        throw error;
      }
    },

    collectPrices: async (pesquisaId: string) => {
      set({ isCollecting: true, collectionProgress: 0, error: null });
      try {
        const collectionResponse = await apiHelpers.post<{
          results: PriceCollectionResult[];
        }>(`/pesquisa-precos/${pesquisaId}/collect`);

        // Update current pesquisa with results
        const currentPesquisa = get().currentPesquisa;
        if (currentPesquisa && currentPesquisa.id === pesquisaId) {
          const allResults = collectionResponse.results.flatMap(
            (r: PriceCollectionResult) => r.results,
          );
          set({
            currentPesquisa: {
              ...currentPesquisa,
              results: allResults,
              status: 'completed',
            },
          });
        }

        set({ isCollecting: false, collectionProgress: 100 });
        logger.info('Prices collected', { pesquisaId });
        return collectionResponse;
      } catch (error) {
        logger.error('Failed to collect prices', { error, pesquisaId });
        set({
          error: getContextualErrorMessage('coletar', 'precos', error),
          isCollecting: false,
        });
        throw error;
      }
    },

    clearError: () => set({ error: null }),

    resetStore: () => set(initialState),

    setCurrentPesquisa: (pesquisa) => set({ currentPesquisa: pesquisa }),
  }),
);
