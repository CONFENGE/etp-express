import { useState, useCallback, useRef, useEffect } from 'react';
import { useETPStore } from '@/store/etpStore';
import { logger } from '@/lib/logger';

interface UseETPPreviewOptions {
  etpId: string;
}

interface UseETPPreviewReturn {
  /** Whether the preview modal is open */
  isOpen: boolean;
  /** Open the preview modal and fetch the PDF */
  openPreview: () => void;
  /** Close the preview modal */
  closePreview: () => void;
  /** The PDF blob for rendering */
  pdfBlob: Blob | null;
  /** Whether the preview is loading */
  isLoading: boolean;
  /** Error message if preview failed */
  error: string | null;
  /** Retry fetching the preview */
  retry: () => void;
}

/**
 * Hook for managing ETP export preview state (#1214)
 *
 * Handles:
 * - Opening/closing the preview modal
 * - Fetching the PDF blob from the backend
 * - Loading and error states
 * - Cleanup on unmount (abort controller)
 *
 * @example
 * ```tsx
 * const { isOpen, openPreview, closePreview, pdfBlob, isLoading, error, retry } =
 *   useETPPreview({ etpId });
 *
 * return (
 *   <>
 *     <Button onClick={openPreview}>Preview</Button>
 *     <ExportPreviewModal
 *       open={isOpen}
 *       onOpenChange={(open) => !open && closePreview()}
 *       pdfBlob={pdfBlob}
 *       isLoading={isLoading}
 *       error={error}
 *       onRetry={retry}
 *       onDownload={handleExportPDF}
 *     />
 *   </>
 * );
 * ```
 */
export function useETPPreview({
  etpId,
}: UseETPPreviewOptions): UseETPPreviewReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { fetchPreview } = useETPStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchPdfBlob = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    setError(null);

    try {
      logger.info('Fetching PDF preview', { etpId });
      const blob = await fetchPreview(etpId, { signal });
      setPdfBlob(blob);
      logger.info('PDF preview loaded successfully', { etpId });
    } catch (err) {
      // Silently handle aborted requests
      if (err instanceof Error && err.name === 'CanceledError') {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar preview';
      setError(message);
      logger.error('Failed to load PDF preview', { etpId, error: err });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [etpId, fetchPreview]);

  const openPreview = useCallback(() => {
    setIsOpen(true);
    fetchPdfBlob();
  }, [fetchPdfBlob]);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Clear state after close animation
    setTimeout(() => {
      setPdfBlob(null);
      setError(null);
    }, 300);
  }, []);

  const retry = useCallback(() => {
    fetchPdfBlob();
  }, [fetchPdfBlob]);

  return {
    isOpen,
    openPreview,
    closePreview,
    pdfBlob,
    isLoading,
    error,
    retry,
  };
}
