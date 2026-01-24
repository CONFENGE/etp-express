import { useState } from 'react';
import api from '@/lib/api';
import type {
  Medicao,
  Ocorrencia,
  Ateste,
  CreateMedicaoDto,
  CreateOcorrenciaDto,
  CreateAtesteDto,
  UpdateMedicaoDto,
  UpdateOcorrenciaDto,
} from '@/types/contract';

export function useFiscalizacao(contratoId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== MEDICOES ====================

  const fetchMedicoes = async (): Promise<Medicao[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Medicao[]>(
        `/contracts/${contratoId}/medicoes`,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao carregar medições';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createMedicao = async (data: CreateMedicaoDto): Promise<Medicao> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<Medicao>(
        `/contracts/${contratoId}/medicoes`,
        data,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao criar medição';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMedicao = async (
    medicaoId: string,
    data: UpdateMedicaoDto,
  ): Promise<Medicao> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch<Medicao>(`/medicoes/${medicaoId}`, data);
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao atualizar medição';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteMedicao = async (medicaoId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/medicoes/${medicaoId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao remover medição';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== OCORRENCIAS ====================

  const fetchOcorrencias = async (): Promise<Ocorrencia[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Ocorrencia[]>(
        `/contracts/${contratoId}/ocorrencias`,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao carregar ocorrências';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createOcorrencia = async (
    data: CreateOcorrenciaDto,
  ): Promise<Ocorrencia> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<Ocorrencia>(
        `/contracts/${contratoId}/ocorrencias`,
        data,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao criar ocorrência';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOcorrencia = async (
    ocorrenciaId: string,
    data: UpdateOcorrenciaDto,
  ): Promise<Ocorrencia> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch<Ocorrencia>(
        `/ocorrencias/${ocorrenciaId}`,
        data,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao atualizar ocorrência';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteOcorrencia = async (ocorrenciaId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/ocorrencias/${ocorrenciaId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao remover ocorrência';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== ATESTES ====================

  const createAteste = async (
    medicaoId: string,
    data: CreateAtesteDto,
  ): Promise<Ateste> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<Ateste>(
        `/medicoes/${medicaoId}/ateste`,
        data,
      );
      return response.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao criar ateste';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    // Medicoes
    fetchMedicoes,
    createMedicao,
    updateMedicao,
    deleteMedicao,
    // Ocorrencias
    fetchOcorrencias,
    createOcorrencia,
    updateOcorrencia,
    deleteOcorrencia,
    // Atestes
    createAteste,
  };
}
