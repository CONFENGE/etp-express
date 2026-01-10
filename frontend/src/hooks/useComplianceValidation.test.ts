import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useComplianceValidation } from './useComplianceValidation';
import type { ComplianceScoreSummary } from '@/types/compliance';

// Mock the compliance API module
vi.mock('@/lib/compliance', () => ({
  complianceApi: {
    getScore: vi.fn(),
    validateEtp: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

// Mock the error handling module
vi.mock('@/lib/api-errors', () => ({
  getContextualErrorMessage: vi.fn(
    (action, resource, _error) => `Erro ao ${action} ${resource}`,
  ),
}));

import { complianceApi } from '@/lib/compliance';

describe('useComplianceValidation', () => {
  const mockScoreSummary: ComplianceScoreSummary = {
    score: 75,
    passed: true,
    status: 'APPROVED',
    totalItems: 20,
    passedItems: 15,
    failedItems: 5,
    topIssues: [
      {
        requirement: 'Justificativa da necessidade',
        fixSuggestion: 'Inclua uma justificativa detalhada...',
        priority: 'high',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch compliance score on mount when etpId is provided', async () => {
    vi.mocked(complianceApi.getScore).mockResolvedValue(mockScoreSummary);

    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: true,
        enablePolling: false,
      }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockScoreSummary);
    expect(complianceApi.getScore).toHaveBeenCalledWith('test-etp-id');
  });

  it('should not fetch when etpId is empty', async () => {
    const { result } = renderHook(() =>
      useComplianceValidation('', { autoFetch: true, enablePolling: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(complianceApi.getScore).not.toHaveBeenCalled();
  });

  it('should not fetch on mount when autoFetch is false', async () => {
    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: false,
        enablePolling: false,
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(complianceApi.getScore).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.mocked(complianceApi.getScore).mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: true,
        enablePolling: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Erro ao validar conformidade do ETP');
    expect(result.current.data).toBeNull();
  });

  it('should allow manual refetch', async () => {
    vi.mocked(complianceApi.getScore).mockResolvedValue(mockScoreSummary);

    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: false,
        enablePolling: false,
      }),
    );

    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.refetch();
    });

    expect(complianceApi.getScore).toHaveBeenCalledWith('test-etp-id');
    expect(result.current.data).toEqual(mockScoreSummary);
  });

  it('should clear error on successful refetch', async () => {
    vi.mocked(complianceApi.getScore)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockScoreSummary);

    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: true,
        enablePolling: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Erro ao validar conformidade do ETP');
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockScoreSummary);
  });

  it('should not trigger new fetch when etpId changes to empty', async () => {
    vi.mocked(complianceApi.getScore).mockResolvedValue(mockScoreSummary);

    const { result, rerender } = renderHook(
      ({ etpId }) =>
        useComplianceValidation(etpId, {
          autoFetch: true,
          enablePolling: false,
        }),
      { initialProps: { etpId: 'test-etp-id' } },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockScoreSummary);
    });

    // Clear the mock to check if new calls are made
    vi.mocked(complianceApi.getScore).mockClear();

    // Rerender with empty etpId
    rerender({ etpId: '' });

    // No new fetch should be triggered
    expect(complianceApi.getScore).not.toHaveBeenCalled();
  });

  it('should set isLoading correctly during fetch lifecycle', async () => {
    let resolvePromise: (value: ComplianceScoreSummary) => void;
    const controlledPromise = new Promise<ComplianceScoreSummary>(
      (resolve) => {
        resolvePromise = resolve;
      },
    );
    vi.mocked(complianceApi.getScore).mockReturnValue(controlledPromise);

    const { result } = renderHook(() =>
      useComplianceValidation('test-etp-id', {
        autoFetch: true,
        enablePolling: false,
      }),
    );

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!(mockScoreSummary);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockScoreSummary);
  });
});
