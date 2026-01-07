import { useState, useEffect, useCallback, useRef } from 'react';
import { apiHelpers } from '@/lib/api';
import { EtpTemplate } from '@/types/template';
import { getContextualErrorMessage } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

/**
 * Hook for fetching and managing ETP templates.
 * Issue #1238 - Create TemplateSelector frontend component
 *
 * Features:
 * - Fetch all active templates from /templates endpoint
 * - Loading and error state management
 * - Prevents duplicate fetches
 * - Cache-friendly (single fetch per mount)
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<EtpTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchTemplates = useCallback(async () => {
    if (hasFetchedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      hasFetchedRef.current = true;
      const data = await apiHelpers.get<EtpTemplate[]>('/templates');
      setTemplates(data);
    } catch (err) {
      const errorMessage = getContextualErrorMessage(
        'carregar',
        'os templates',
        err,
      );
      setError(errorMessage);
      logger.error('Failed to fetch templates', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const refetch = useCallback(() => {
    hasFetchedRef.current = false;
    return fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    refetch,
  };
}
