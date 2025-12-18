/**
 * Tests for polling utilities
 * @see #222 - Frontend async UX
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pollJobStatus,
  getStatusMessage,
  PollingTimeoutError,
  JobFailedError,
  PollingAbortedError,
} from './polling';
import { apiHelpers } from './api';

// Mock the API helpers
vi.mock('./api', () => ({
  apiHelpers: {
    get: vi.fn(),
  },
}));

describe('polling utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pollJobStatus', () => {
    it('should return result when job completes successfully', async () => {
      const mockResult = {
        id: 'section-1',
        content: 'Generated content',
        etpId: 'etp-1',
        sectionNumber: 1,
        title: 'Test Section',
        isRequired: true,
        isCompleted: true,
        aiGenerated: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      vi.mocked(apiHelpers.get).mockResolvedValue({
        data: {
          jobId: 'job-123',
          status: 'completed',
          progress: 100,
          result: mockResult,
        },
      });

      const result = await pollJobStatus('job-123');

      // Result is now PollResult format with section and dataSourceStatus (#756)
      expect(result.section).toEqual(mockResult);
      expect(result.dataSourceStatus).toBeUndefined();
      expect(apiHelpers.get).toHaveBeenCalledWith('/sections/jobs/job-123');
    });

    it('should call onProgress callback with progress updates', async () => {
      const mockResult = {
        id: 'section-1',
        content: 'Generated content',
        etpId: 'etp-1',
        sectionNumber: 1,
        title: 'Test Section',
        isRequired: true,
        isCompleted: true,
        aiGenerated: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      vi.mocked(apiHelpers.get).mockResolvedValue({
        data: {
          jobId: 'job-123',
          status: 'completed',
          progress: 100,
          result: mockResult,
        },
      });

      const onProgress = vi.fn();
      await pollJobStatus('job-123', onProgress);

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should throw JobFailedError when job fails', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue({
        data: {
          jobId: 'job-123',
          status: 'failed',
          progress: 50,
          error: 'OpenAI API error',
          failedReason: 'Circuit breaker open',
        },
      });

      await expect(pollJobStatus('job-123')).rejects.toThrow(JobFailedError);
      await expect(pollJobStatus('job-123')).rejects.toThrow(
        'Circuit breaker open',
      );
    });

    it('should throw JobFailedError when job status is unknown', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue({
        data: {
          jobId: 'job-123',
          status: 'unknown',
          progress: 0,
        },
      });

      await expect(pollJobStatus('job-123')).rejects.toThrow(JobFailedError);
      await expect(pollJobStatus('job-123')).rejects.toThrow(
        'Job n\u00e3o encontrado ou expirou',
      );
    });

    it('should poll multiple times when job is active', async () => {
      const mockResult = {
        id: 'section-1',
        content: 'Generated content',
        etpId: 'etp-1',
        sectionNumber: 1,
        title: 'Test Section',
        isRequired: true,
        isCompleted: true,
        aiGenerated: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      // First call: active at 50%
      // Second call: active at 75%
      // Third call: completed at 100%
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce({
          data: { jobId: 'job-123', status: 'active', progress: 50 },
        })
        .mockResolvedValueOnce({
          data: { jobId: 'job-123', status: 'active', progress: 75 },
        })
        .mockResolvedValueOnce({
          data: {
            jobId: 'job-123',
            status: 'completed',
            progress: 100,
            result: mockResult,
          },
        });

      const onProgress = vi.fn();
      const pollPromise = pollJobStatus('job-123', onProgress, {
        intervalMs: 100,
      });

      // Advance timers to allow polling
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const result = await pollPromise;

      // Result is now PollResult format with section and dataSourceStatus (#756)
      expect(result.section).toEqual(mockResult);
      expect(result.dataSourceStatus).toBeUndefined();
      expect(apiHelpers.get).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(75);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should throw PollingTimeoutError after max attempts', async () => {
      // Use real timers for this test to avoid async timing issues
      vi.useRealTimers();

      // Always return active status
      vi.mocked(apiHelpers.get).mockResolvedValue({
        data: { jobId: 'job-123', status: 'active', progress: 50 },
      });

      // With maxAttempts=2 and intervalMs=1, should timeout quickly
      await expect(
        pollJobStatus('job-123', undefined, {
          intervalMs: 1,
          maxAttempts: 2,
        }),
      ).rejects.toThrow(PollingTimeoutError);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

      await expect(pollJobStatus('job-123')).rejects.toThrow(JobFailedError);
      await expect(pollJobStatus('job-123')).rejects.toThrow('Network error');
    });

    /**
     * Abort/Cancel tests (#611)
     * Tests for AbortController support in polling
     */
    describe('abort support (#611)', () => {
      it('should throw PollingAbortedError when signal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(
          pollJobStatus('job-123', undefined, { signal: controller.signal }),
        ).rejects.toThrow(PollingAbortedError);
      });

      it('should check abort signal before API call', async () => {
        const controller = new AbortController();

        // Mock that would return completed if called
        vi.mocked(apiHelpers.get).mockResolvedValue({
          data: {
            jobId: 'job-123',
            status: 'completed',
            progress: 100,
            result: { id: 'section-1', content: 'content' },
          },
        });

        // Abort before starting
        controller.abort();

        await expect(
          pollJobStatus('job-123', undefined, {
            signal: controller.signal,
          }),
        ).rejects.toThrow(PollingAbortedError);

        // API should not have been called
        expect(apiHelpers.get).not.toHaveBeenCalled();
      });

      it('should check abort signal after API call', async () => {
        const controller = new AbortController();
        let callCount = 0;

        // Mock API that aborts after first call
        vi.mocked(apiHelpers.get).mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Abort after first API call completes
            controller.abort();
          }
          return Promise.resolve({
            data: { jobId: 'job-123', status: 'active', progress: 50 },
          });
        });

        await expect(
          pollJobStatus('job-123', undefined, {
            signal: controller.signal,
            intervalMs: 100,
          }),
        ).rejects.toThrow(PollingAbortedError);

        // API should have been called once before abort was detected
        expect(callCount).toBe(1);
      });
    });
  });

  describe('getStatusMessage', () => {
    it('should return empty string for idle status', () => {
      expect(getStatusMessage('idle', 0)).toBe('');
    });

    it('should return queue message for queued status', () => {
      expect(getStatusMessage('queued', 0)).toBe('Na fila de processamento...');
    });

    it('should return completed message for completed status', () => {
      expect(getStatusMessage('completed', 100)).toBe('Geração concluída!');
    });

    it('should return error message for failed status', () => {
      expect(getStatusMessage('failed', 50)).toBe('Erro na geração');
    });

    describe('generating status messages based on progress', () => {
      it('should return context message for progress < 20%', () => {
        expect(getStatusMessage('generating', 10)).toBe(
          'Preparando contexto...',
        );
      });

      it('should return knowledge base message for progress 20-39%', () => {
        expect(getStatusMessage('generating', 30)).toBe(
          'Consultando base de conhecimento...',
        );
      });

      it('should return AI generation message for progress 40-59%', () => {
        expect(getStatusMessage('generating', 50)).toBe(
          'Gerando conteúdo com IA...',
        );
      });

      it('should return validation message for progress 60-79%', () => {
        expect(getStatusMessage('generating', 70)).toBe(
          'Validando citações legais...',
        );
      });

      it('should return formatting message for progress 80-94%', () => {
        expect(getStatusMessage('generating', 85)).toBe(
          'Formatando resultado...',
        );
      });

      it('should return finalizing message for progress >= 95%', () => {
        expect(getStatusMessage('generating', 98)).toBe('Finalizando...');
      });
    });
  });
});
