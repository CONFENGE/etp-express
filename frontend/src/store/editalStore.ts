import { create } from 'zustand';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { Edital, UpdateEditalDto } from '@/types/edital';

/**
 * State para gerenciamento de Editais.
 *
 * Funcionalidades:
 * - Buscar Edital por ID
 * - Atualizar Edital parcialmente
 * - Cache de edital atual
 * - Loading e error states
 *
 * Issue #1280 - [Edital-d] Editor de edital no frontend
 * Milestone: M14 - Geração de Edital
 */
interface EditalState {
  // Estado
  currentEdital: Edital | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchEdital: (id: string) => Promise<Edital>;
  updateEdital: (id: string, data: UpdateEditalDto) => Promise<Edital>;
  clearCurrentEdital: () => void;
  clearError: () => void;
}

/**
 * Store Zustand para gerenciamento de Editais.
 *
 * @example
 * ```tsx
 * const { fetchEdital, updateEdital, currentEdital, isLoading } = useEditalStore();
 *
 * // Buscar edital
 * await fetchEdital(editalId);
 *
 * // Atualizar campo
 * await updateEdital(editalId, { objeto: 'Nova descrição' });
 * ```
 */
export const useEditalStore = create<EditalState>((set) => ({
  // Estado inicial
  currentEdital: null,
  isLoading: false,
  error: null,

  /**
   * Busca um Edital por ID.
   *
   * GET /editais/:id
   *
   * @param id UUID do Edital
   * @returns Promise<Edital> Edital encontrado
   * @throws Error se falhar na busca
   */
  fetchEdital: async (id: string): Promise<Edital> => {
    set({ isLoading: true, error: null });

    try {
      logger.info('[EditalStore] Fetching edital', { id });

      const response = await api.get<Edital>(`/editais/${id}`);
      const edital = response.data;

      // Converter dates de string para Date
      if (edital.dataSessaoPublica) {
        edital.dataSessaoPublica = new Date(edital.dataSessaoPublica);
      }
      if (edital.dataPublicacao) {
        edital.dataPublicacao = new Date(edital.dataPublicacao);
      }
      if (edital.approvedAt) {
        edital.approvedAt = new Date(edital.approvedAt);
      }
      edital.createdAt = new Date(edital.createdAt);
      edital.updatedAt = new Date(edital.updatedAt);

      set({ currentEdital: edital, isLoading: false });

      logger.info('[EditalStore] Edital fetched successfully', { id, numero: edital.numero });

      return edital;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar edital';
      logger.error('[EditalStore] Failed to fetch edital', { id, error: errorMessage });
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * Atualiza um Edital parcialmente.
   *
   * PATCH /editais/:id
   *
   * @param id UUID do Edital
   * @param data Campos a atualizar (partial)
   * @returns Promise<Edital> Edital atualizado
   * @throws Error se falhar na atualização
   */
  updateEdital: async (id: string, data: UpdateEditalDto): Promise<Edital> => {
    set({ isLoading: true, error: null });

    try {
      logger.info('[EditalStore] Updating edital', { id, fields: Object.keys(data) });

      const response = await api.patch<Edital>(`/editais/${id}`, data);
      const edital = response.data;

      // Converter dates de string para Date
      if (edital.dataSessaoPublica) {
        edital.dataSessaoPublica = new Date(edital.dataSessaoPublica);
      }
      if (edital.dataPublicacao) {
        edital.dataPublicacao = new Date(edital.dataPublicacao);
      }
      if (edital.approvedAt) {
        edital.approvedAt = new Date(edital.approvedAt);
      }
      edital.createdAt = new Date(edital.createdAt);
      edital.updatedAt = new Date(edital.updatedAt);

      // Atualizar cache
      set({ currentEdital: edital, isLoading: false });

      logger.info('[EditalStore] Edital updated successfully', { id });

      return edital;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar edital';
      logger.error('[EditalStore] Failed to update edital', { id, error: errorMessage });
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  /**
   * Limpa o edital atual do cache.
   */
  clearCurrentEdital: () => {
    logger.info('[EditalStore] Clearing current edital');
    set({ currentEdital: null, error: null });
  },

  /**
   * Limpa o erro atual.
   */
  clearError: () => {
    set({ error: null });
  },
}));
