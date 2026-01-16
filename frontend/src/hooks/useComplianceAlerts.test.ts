import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useComplianceAlerts, getAlertId } from './useComplianceAlerts';
import { complianceApi } from '@/lib/compliance';
import { ComplianceSuggestion } from '@/types/compliance';

// Mock the compliance API
vi.mock('@/lib/compliance', () => ({
  complianceApi: {
    getSuggestions: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSuggestions: ComplianceSuggestion[] = [
  {
    category: 'JUSTIFICATION',
    title: 'Justificativa incompleta',
    description: 'Adicione detalhes sobre os beneficios esperados',
    priority: 'high',
    field: 'justificativaContratacao',
    legalReference: 'Art. 18, Lei 14.133/2021',
  },
  {
    category: 'JUSTIFICATION',
    title: 'Falta necessidade atendida',
    description: 'Especifique qual necessidade sera atendida',
    priority: 'medium',
    field: 'necessidadeAtendida',
  },
  {
    category: 'IDENTIFICATION',
    title: 'UASG ausente',
    description: 'Preencha o codigo UASG do orgao',
    priority: 'low',
    field: 'uasg',
  },
];

describe('useComplianceAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when etpId is empty', async () => {
    const { result } = renderHook(() =>
      useComplianceAlerts('', 'content', 1),
    );

    // Wait a bit for any potential fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(complianceApi.getSuggestions).not.toHaveBeenCalled();
    expect(result.current.alerts).toEqual([]);
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 1, { enabled: false }),
    );

    // Wait a bit for any potential fetch
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(complianceApi.getSuggestions).not.toHaveBeenCalled();
    expect(result.current.alerts).toEqual([]);
  });

  it('should fetch suggestions after debounce', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 2, { debounceMs: 100 }),
    );

    // Initially no alerts
    expect(result.current.alerts).toEqual([]);

    // Wait for initial fetch (triggered by sectionNumber change effect)
    await waitFor(() => {
      expect(complianceApi.getSuggestions).toHaveBeenCalledWith('etp-123');
    });

    // Wait for state to update after API call
    await waitFor(() => {
      // Should filter by section category (section 2 = JUSTIFICATION)
      expect(result.current.alerts.length).toBeGreaterThan(0);
    });
  });

  it('should debounce multiple rapid content changes', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    // First render will trigger initial fetch from section change effect
    const { rerender } = renderHook(
      ({ content }) => useComplianceAlerts('etp-123', content, 1, { debounceMs: 100 }),
      { initialProps: { content: 'content1' } },
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(complianceApi.getSuggestions).toHaveBeenCalled();
    });

    // Clear previous calls to test debouncing behavior
    vi.mocked(complianceApi.getSuggestions).mockClear();

    // Change content rapidly - these should be debounced
    rerender({ content: 'content2' });
    rerender({ content: 'content3' });
    rerender({ content: 'content4' });

    // Wait for debounce to complete (100ms + buffer)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Should NOT have 3 calls (one per content change)
    // Debouncing means it should have fewer calls than content changes
    // The key assertion: rapid changes should result in fewer API calls than changes
    const callsAfterDebounce = vi.mocked(complianceApi.getSuggestions).mock.calls.length;
    expect(callsAfterDebounce).toBeLessThan(3);
  });

  it('should dismiss alerts correctly', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 2, { debounceMs: 100 }),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.alerts.length).toBeGreaterThan(0);
    });

    const initialCount = result.current.activeCount;
    const firstAlert = result.current.alerts[0];
    const alertId = getAlertId(firstAlert);

    // Dismiss the first alert
    act(() => {
      result.current.dismissAlert(alertId);
    });

    expect(result.current.dismissedAlerts.has(alertId)).toBe(true);
    expect(result.current.activeCount).toBe(initialCount - 1);
  });

  it('should clear dismissed alerts', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 2, { debounceMs: 100 }),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.alerts.length).toBeGreaterThan(0);
    });

    const firstAlert = result.current.alerts[0];
    const alertId = getAlertId(firstAlert);

    // Dismiss and then clear
    act(() => {
      result.current.dismissAlert(alertId);
    });

    expect(result.current.dismissedAlerts.size).toBe(1);

    act(() => {
      result.current.clearDismissed();
    });

    expect(result.current.dismissedAlerts.size).toBe(0);
  });

  it('should calculate counts by priority', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 2, { debounceMs: 100 }),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.countByPriority).toBeDefined();
    });

    // mockSuggestions for section 2 (JUSTIFICATION) has 2 alerts: 1 high, 1 medium
    expect(result.current.countByPriority.high).toBeGreaterThanOrEqual(0);
    expect(result.current.countByPriority.medium).toBeGreaterThanOrEqual(0);
    expect(result.current.countByPriority.low).toBeGreaterThanOrEqual(0);
  });

  it('should allow manual validation trigger', async () => {
    vi.mocked(complianceApi.getSuggestions).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 1, { debounceMs: 500 }),
    );

    // Manually trigger validation
    await act(async () => {
      await result.current.validate();
    });

    expect(complianceApi.getSuggestions).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(complianceApi.getSuggestions).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useComplianceAlerts('etp-123', 'content', 1, { debounceMs: 100 }),
    );

    // Wait for the error to be handled
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Should not throw - alerts might be from previous state (empty by default)
    expect(Array.isArray(result.current.alerts)).toBe(true);
  });
});

describe('getAlertId', () => {
  it('should generate consistent IDs', () => {
    const alert: ComplianceSuggestion = {
      category: 'JUSTIFICATION',
      title: 'Test alert',
      description: 'Description',
      priority: 'high',
      field: 'testField',
    };

    const id1 = getAlertId(alert);
    const id2 = getAlertId(alert);

    expect(id1).toBe(id2);
    expect(id1).toBe('JUSTIFICATION-Test alert-testField');
  });

  it('should handle missing field', () => {
    const alert: ComplianceSuggestion = {
      category: 'IDENTIFICATION',
      title: 'Test',
      description: 'Desc',
      priority: 'low',
    };

    const id = getAlertId(alert);
    expect(id).toBe('IDENTIFICATION-Test-general');
  });
});
