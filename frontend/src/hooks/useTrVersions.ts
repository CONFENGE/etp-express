import { useState, useCallback } from 'react';
import { apiHelpers } from '@/lib/api';
import type {
  TrVersion,
  TrVersionsResponse,
  TrVersionResponse,
  TrVersionComparisonResult,
  RestoreTrVersionResponse,
} from '@/types/tr-version';

/**
 * Hook for TR version management.
 *
 * @see #1253 - [TR-f] Versionamento e historico de TR
 */
interface UseTrVersionsReturn {
  versions: TrVersion[];
  isLoading: boolean;
  error: string | null;
  fetchVersions: (termoReferenciaId: string) => Promise<void>;
  createVersion: (
    termoReferenciaId: string,
    changeLog?: string,
  ) => Promise<TrVersion>;
  getVersion: (
    termoReferenciaId: string,
    versionId: string,
  ) => Promise<TrVersion>;
  compareVersions: (
    termoReferenciaId: string,
    versionId1: string,
    versionId2: string,
  ) => Promise<TrVersionComparisonResult>;
  restoreVersion: (
    termoReferenciaId: string,
    versionId: string,
  ) => Promise<void>;
  clearError: () => void;
}

export function useTrVersions(): UseTrVersionsReturn {
  const [versions, setVersions] = useState<TrVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchVersions = useCallback(async (termoReferenciaId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiHelpers.get<TrVersionsResponse>(
        `/termo-referencia/${termoReferenciaId}/versions`,
      );
      setVersions(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar versoes';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVersion = useCallback(
    async (
      termoReferenciaId: string,
      changeLog?: string,
    ): Promise<TrVersion> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.post<TrVersionResponse>(
          `/termo-referencia/${termoReferenciaId}/versions`,
          { changeLog },
        );
        // Add new version to the beginning of the list
        setVersions((prev) => [response.data, ...prev]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar versao';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getVersion = useCallback(
    async (
      termoReferenciaId: string,
      versionId: string,
    ): Promise<TrVersion> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.get<TrVersionResponse>(
          `/termo-referencia/${termoReferenciaId}/versions/${versionId}`,
        );
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao obter versao';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const compareVersions = useCallback(
    async (
      termoReferenciaId: string,
      versionId1: string,
      versionId2: string,
    ): Promise<TrVersionComparisonResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.get<TrVersionComparisonResult>(
          `/termo-referencia/${termoReferenciaId}/versions/compare/${versionId1}/${versionId2}`,
        );
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao comparar versoes';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const restoreVersion = useCallback(
    async (termoReferenciaId: string, versionId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await apiHelpers.post<RestoreTrVersionResponse>(
          `/termo-referencia/${termoReferenciaId}/versions/${versionId}/restore`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao restaurar versao';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    versions,
    isLoading,
    error,
    fetchVersions,
    createVersion,
    getVersion,
    compareVersions,
    restoreVersion,
    clearError,
  };
}
