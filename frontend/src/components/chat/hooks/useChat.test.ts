import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import api from '@/lib/api';

// Mock the api module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock logger to avoid console output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useChat', () => {
  const mockEtpId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for history fetch
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty messages', async () => {
      const { result } = renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });
    });

    it('should start with isLoading false', async () => {
      const { result } = renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should start with no error', async () => {
      const { result } = renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should fetch history on mount', async () => {
      renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/chat/etp/${mockEtpId}/history`);
      });
    });
  });

  describe('History Loading', () => {
    it('should load history messages on mount', async () => {
      const historyData = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          createdAt: '2026-01-10T10:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Hi there!',
          createdAt: '2026-01-10T10:00:05Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: historyData });

      const { result } = renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello');
        expect(result.current.messages[1].content).toBe('Hi there!');
      });
    });

    it('should handle history fetch error gracefully', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChat(mockEtpId));

      await waitFor(() => {
        // Should not crash, messages should be empty
        expect(result.current.messages).toEqual([]);
        expect(result.current.error).toBeNull();
      });
    });

    it('should not fetch history if etpId is empty', async () => {
      renderHook(() => useChat(''));

      // Wait a bit to ensure no call is made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('Sending Messages', () => {
    it('should add user message immediately', async () => {
      let resolvePost: (value: unknown) => void;
      vi.mocked(api.post).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          }),
      );

      const { result } = renderHook(() => useChat(mockEtpId));

      // Start sending the message (don't await)
      act(() => {
        result.current.sendMessage('Hello');
      });

      // User message should be added immediately (before response)
      expect(result.current.messages.some((m) => m.content === 'Hello')).toBe(
        true,
      );

      // Cleanup: resolve the pending promise
      await act(async () => {
        resolvePost!({
          data: {
            id: 'response-1',
            content: 'Response',
            metadata: { tokens: 100, latencyMs: 500 },
          },
        });
      });
    });

    it('should show loading indicator while waiting for response', async () => {
      let resolvePost: (value: unknown) => void;
      vi.mocked(api.post).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          }),
      );

      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the request
      await act(async () => {
        resolvePost!({
          data: {
            id: 'response-1',
            content: 'Response',
            metadata: { tokens: 100, latencyMs: 500 },
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should call API with correct parameters when sending message', async () => {
      const mockResponse = {
        id: 'response-1',
        content: 'AI Response',
        suggestedContent: 'Suggested text',
        relatedLegislation: ['Art. 6, Lei 14.133/2021'],
        metadata: { tokens: 100, latencyMs: 500 },
      };
      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      const { result } = renderHook(() => useChat(mockEtpId));

      // Send message
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      // Verify the API was called correctly
      expect(api.post).toHaveBeenCalledWith(
        `/chat/etp/${mockEtpId}/message`,
        expect.objectContaining({ message: 'Hello' }),
      );

      // After the send, loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should send context field with message', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        await result.current.sendMessage('Help me', 'Justificativa');
      });

      expect(api.post).toHaveBeenCalledWith(`/chat/etp/${mockEtpId}/message`, {
        message: 'Help me',
        contextField: 'Justificativa',
      });
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('should trim message content', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        await result.current.sendMessage('  Hello world  ');
      });

      expect(api.post).toHaveBeenCalledWith(`/chat/etp/${mockEtpId}/message`, {
        message: 'Hello world',
        contextField: undefined,
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error on send failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.error?.message).toBe('API Error');
      });
    });

    it('should call onError callback on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('API Error'));
      const onError = vi.fn();

      const { result } = renderHook(() => useChat(mockEtpId, { onError }));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should remove loading message on error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useChat(mockEtpId));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        const loadingMessage = result.current.messages.find(
          (m) => m.isLoading,
        );
        expect(loadingMessage).toBeUndefined();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should retry last failed message', async () => {
      // First call fails, second succeeds
      vi.mocked(api.post)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: {
            id: 'response-1',
            content: 'Success',
            metadata: { tokens: 100, latencyMs: 500 },
          },
        });

      const { result } = renderHook(() => useChat(mockEtpId));

      // Send message (fails)
      await act(async () => {
        await result.current.sendMessage('Hello', 'Context');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Retry
      await act(async () => {
        await result.current.retryLastMessage();
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Clear History', () => {
    it('should clear all messages', async () => {
      vi.mocked(api.delete).mockResolvedValue({
        data: { success: true, deletedCount: 5 },
      });
      vi.mocked(api.get).mockResolvedValue({
        data: [{ id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() }],
      });

      const { result } = renderHook(() => useChat(mockEtpId));

      // Wait for history to load
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      // Clear history
      await act(async () => {
        await result.current.clearHistory();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(api.delete).toHaveBeenCalledWith(`/chat/etp/${mockEtpId}/history`);
    });

    it('should handle clear history error', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete failed'));
      const onError = vi.fn();

      const { result } = renderHook(() => useChat(mockEtpId, { onError }));

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess after successful message', async () => {
      const onSuccess = vi.fn();
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      const { result } = renderHook(() => useChat(mockEtpId, { onSuccess }));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'response-1',
            content: 'Response',
          }),
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePost: (value: unknown) => void;
      vi.mocked(api.post).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          }),
      );

      const { result, unmount } = renderHook(() => useChat(mockEtpId));

      // Start sending a message
      act(() => {
        result.current.sendMessage('Hello');
      });

      // Unmount before response
      unmount();

      // Resolve the request after unmount
      await act(async () => {
        resolvePost!({
          data: {
            id: 'response-1',
            content: 'Response',
            metadata: { tokens: 100, latencyMs: 500 },
          },
        });
      });

      // Should not throw or cause issues
      // The hook should have prevented state updates
    });
  });
});
