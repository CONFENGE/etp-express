import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from './useAuth';

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  quotaConsumed: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
}

interface QuotaStatus {
  totalQuota: number;
  consumedQuota: number;
  remainingQuota: number;
  periodStart: Date;
  periodEnd: Date;
}

interface ApiUsageData {
  usage: UsageMetrics;
  quota: QuotaStatus;
}

/**
 * useApiUsage - Hook for fetching API usage metrics (#1689).
 *
 * Fetches usage metrics and quota information for the current user.
 * Auto-refreshes when component mounts.
 *
 * Related:
 * - Issue: #1689 - Criar dashboard de uso da API no frontend
 * - Backend endpoint: GET /api/users/me/api-usage
 */
export function useApiUsage() {
  const { user, updateUser } = useAuth();
  const [data, setData] = useState<ApiUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{ data: ApiUsageData }>(
        '/users/me/api-usage',
      );
      setData(response.data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch API usage'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    try {
      setIsRegenerating(true);
      const response = await api.post<{
        data: { apiKey: string; message: string };
      }>('/users/me/api-key/regenerate');

      // Update auth store with new API key
      if (user) {
        updateUser({ ...user, apiKey: response.data.data.apiKey });
      }

      return response.data.data.apiKey;
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error('Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchUsage,
    regenerateApiKey,
    isRegenerating,
  };
}
