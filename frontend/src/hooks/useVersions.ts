import { useState, useCallback } from 'react';
import { apiHelpers } from '@/lib/api';
import type {
  EtpVersion,
  VersionsResponse,
  VersionResponse,
  VersionComparisonResult,
  RestoreVersionResponse,
} from '@/types/version';

interface UseVersionsReturn {
  versions: EtpVersion[];
  isLoading: boolean;
  error: string | null;
  fetchVersions: (etpId: string) => Promise<void>;
  createVersion: (etpId: string, changeLog?: string) => Promise<EtpVersion>;
  getVersion: (versionId: string) => Promise<EtpVersion>;
  compareVersions: (
    versionId1: string,
    versionId2: string,
  ) => Promise<VersionComparisonResult>;
  restoreVersion: (versionId: string) => Promise<void>;
  clearError: () => void;
}

export function useVersions(): UseVersionsReturn {
  const [versions, setVersions] = useState<EtpVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchVersions = useCallback(async (etpId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiHelpers.get<VersionsResponse>(
        `/versions/etp/${etpId}`,
      );
      setVersions(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar versões';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVersion = useCallback(
    async (etpId: string, changeLog?: string): Promise<EtpVersion> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.post<VersionResponse>(
          `/versions/etp/${etpId}`,
          { changeLog },
        );
        // Add new version to the beginning of the list
        setVersions((prev) => [response.data, ...prev]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar versão';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getVersion = useCallback(
    async (versionId: string): Promise<EtpVersion> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.get<VersionResponse>(
          `/versions/${versionId}`,
        );
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao obter versão';
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
      versionId1: string,
      versionId2: string,
    ): Promise<VersionComparisonResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiHelpers.get<VersionComparisonResult>(
          `/versions/compare/${versionId1}/${versionId2}`,
        );
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao comparar versões';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const restoreVersion = useCallback(async (versionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiHelpers.post<RestoreVersionResponse>(
        `/versions/${versionId}/restore`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao restaurar versão';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
