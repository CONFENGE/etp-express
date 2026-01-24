import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFiscalizacao } from './useFiscalizacao';
import api from '@/lib/api';
import type { Medicao, Ateste } from '@/types/contract';
import { MedicaoStatus, AtesteResultado } from '@/types/contract';

// Mock API
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useFiscalizacao', () => {
  const contratoId = 'test-contrato-id';
  const mockMedicao: Medicao = {
    id: 'medicao-1',
    contratoId,
    numero: 1,
    periodoInicio: '2024-01-01',
    periodoFim: '2024-01-31',
    valorMedido: '10000.00',
    status: MedicaoStatus.PENDENTE,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMedicoes', () => {
    it('should fetch medicoes successfully', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: [mockMedicao] });

      const { result } = renderHook(() => useFiscalizacao(contratoId));

      const medicoes = await result.current.fetchMedicoes();

      expect(api.get).toHaveBeenCalledWith(`/contracts/${contratoId}/medicoes`);
      expect(medicoes).toEqual([mockMedicao]);
    });

    it('should handle fetch error', async () => {
      const error = new Error('API Error');
      vi.mocked(api.get).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useFiscalizacao(contratoId));

      await expect(result.current.fetchMedicoes()).rejects.toThrow('API Error');
      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
      });
    });
  });

  describe('createMedicao', () => {
    it('should create medicao successfully', async () => {
      const newMedicaoData = {
        periodoInicio: '2024-02-01',
        periodoFim: '2024-02-28',
        valorMedido: '5000.00',
      };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockMedicao });

      const { result } = renderHook(() => useFiscalizacao(contratoId));

      const medicao = await result.current.createMedicao(newMedicaoData);

      expect(api.post).toHaveBeenCalledWith(
        `/contracts/${contratoId}/medicoes`,
        newMedicaoData,
      );
      expect(medicao).toEqual(mockMedicao);
    });
  });

  describe('createAteste', () => {
    it('should create ateste successfully', async () => {
      const medicaoId = 'medicao-1';
      const atesteData = {
        resultado: AtesteResultado.APROVADO,
        dataAteste: '2024-01-15',
      };
      const mockAteste: Ateste = {
        id: 'ateste-1',
        medicaoId,
        resultado: AtesteResultado.APROVADO,
        dataAteste: '2024-01-15',
        createdAt: '2024-01-15T00:00:00Z',
      };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockAteste });

      const { result } = renderHook(() => useFiscalizacao(contratoId));

      const ateste = await result.current.createAteste(medicaoId, atesteData);

      expect(api.post).toHaveBeenCalledWith(
        `/medicoes/${medicaoId}/ateste`,
        atesteData,
      );
      expect(ateste).toEqual(mockAteste);
    });
  });
});
