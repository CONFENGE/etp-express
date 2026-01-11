import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '@/lib/api';
import { useProactiveSuggestions } from './useProactiveSuggestions';

// Mock the api module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useProactiveSuggestions', () => {
  const mockEtpId = 'test-etp-123';

  const mockSuggestionsResponse = {
    data: {
      suggestions: [
        {
          type: 'incomplete',
          field: 'Justificativa',
          message: 'A secao "Justificativa" esta vazia.',
          priority: 'high',
          helpPrompt: 'Me ajude a preencher a secao "Justificativa"',
        },
        {
          type: 'improvement',
          field: 'Requisitos',
          message: 'A secao "Requisitos" parece incompleta.',
          priority: 'medium',
          helpPrompt: 'Me ajude a melhorar a secao "Requisitos"',
        },
      ],
      totalIssues: 2,
      highPriorityCount: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockSuggestionsResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch suggestions on mount', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    expect(api.get).toHaveBeenCalledWith(
      `/chat/etp/${mockEtpId}/suggestions`,
      expect.anything(),
    );
  });

  it('should return correct suggestion counts', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.totalIssues).toBe(2);
      expect(result.current.highPriorityCount).toBe(1);
    });
  });

  it('should set loading state while fetching', async () => {
    // Create a deferred promise to control when the API responds
    let resolvePromise: (value: typeof mockSuggestionsResponse) => void;
    const pendingPromise = new Promise<typeof mockSuggestionsResponse>(
      (resolve) => {
        resolvePromise = resolve;
      },
    );
    vi.mocked(api.get).mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!(mockSuggestionsResponse);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network error';
    vi.mocked(api.get).mockRejectedValue(new Error(errorMessage));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useProactiveSuggestions(mockEtpId, undefined, { onError }),
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe(errorMessage);
    });

    expect(onError).toHaveBeenCalled();
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useProactiveSuggestions(mockEtpId, undefined, { enabled: false }),
    );

    // Wait a bit to ensure no fetch is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.suggestions).toHaveLength(0);
  });

  it('should get suggestion for specific field', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    const justificativaSuggestion =
      result.current.getSuggestionForField('Justificativa');
    expect(justificativaSuggestion).toBeDefined();
    expect(justificativaSuggestion?.field).toBe('Justificativa');
    expect(justificativaSuggestion?.priority).toBe('high');

    const nonExistentSuggestion =
      result.current.getSuggestionForField('NonExistent');
    expect(nonExistentSuggestion).toBeUndefined();
  });

  it('should case-insensitive match in getSuggestionForField', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    const suggestion =
      result.current.getSuggestionForField('justificativa'); // lowercase
    expect(suggestion).toBeDefined();
    expect(suggestion?.field).toBe('Justificativa');
  });

  it('should refresh suggestions manually', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    const callCountBefore = vi.mocked(api.get).mock.calls.length;

    // Manual refresh
    await result.current.refresh();

    expect(vi.mocked(api.get).mock.calls.length).toBe(callCountBefore + 1);
  });

  it('should not fetch without etpId', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(''));

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.suggestions).toHaveLength(0);
  });

  it('should return empty suggestions array initially', () => {
    const { result } = renderHook(() =>
      useProactiveSuggestions(mockEtpId, undefined, { enabled: false }),
    );

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.totalIssues).toBe(0);
    expect(result.current.highPriorityCount).toBe(0);
  });

  it('should provide error as null when no error', async () => {
    const { result } = renderHook(() => useProactiveSuggestions(mockEtpId));

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    expect(result.current.error).toBeNull();
  });
});
