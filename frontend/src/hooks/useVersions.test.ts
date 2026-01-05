import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVersions } from './useVersions';
import { apiHelpers } from '@/lib/api';

// Mock the api module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockVersion = {
  id: 'version-1',
  versionNumber: 1,
  snapshot: {
    title: 'Test ETP',
    description: 'Test description',
    objeto: 'Test objeto',
    status: 'draft',
    sections: [],
    metadata: {},
  },
  changeLog: 'Initial version',
  createdByName: 'Test User',
  etpId: 'etp-1',
  createdAt: '2026-01-05T10:00:00Z',
};

const mockVersionsResponse = {
  data: [mockVersion],
  disclaimer: 'Test disclaimer',
};

describe('useVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVersions', () => {
    it('should fetch versions successfully', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockVersionsResponse);

      const { result } = renderHook(() => useVersions());

      await act(async () => {
        await result.current.fetchVersions('etp-1');
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/versions/etp/etp-1');
      expect(result.current.versions).toHaveLength(1);
      expect(result.current.versions[0].id).toBe('version-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValueOnce(
        new Error('Failed to fetch'),
      );

      const { result } = renderHook(() => useVersions());

      try {
        await act(async () => {
          await result.current.fetchVersions('etp-1');
        });
      } catch {
        // Expected error
      }

      expect(apiHelpers.get).toHaveBeenCalledWith('/versions/etp/etp-1');
    });
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      const newVersion = { ...mockVersion, versionNumber: 2 };
      vi.mocked(apiHelpers.post).mockResolvedValueOnce({
        data: newVersion,
        disclaimer: 'Test disclaimer',
      });

      const { result } = renderHook(() => useVersions());

      let createdVersion;
      await act(async () => {
        createdVersion = await result.current.createVersion(
          'etp-1',
          'New version',
        );
      });

      expect(apiHelpers.post).toHaveBeenCalledWith('/versions/etp/etp-1', {
        changeLog: 'New version',
      });
      expect(createdVersion).toEqual(newVersion);
      expect(result.current.versions).toContainEqual(newVersion);
    });

    it('should handle create error', async () => {
      vi.mocked(apiHelpers.post).mockRejectedValueOnce(
        new Error('Failed to create'),
      );

      const { result } = renderHook(() => useVersions());

      try {
        await act(async () => {
          await result.current.createVersion('etp-1', 'New version');
        });
      } catch {
        // Expected error
      }

      expect(apiHelpers.post).toHaveBeenCalledWith('/versions/etp/etp-1', {
        changeLog: 'New version',
      });
    });
  });

  describe('getVersion', () => {
    it('should get a specific version', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce({
        data: mockVersion,
        disclaimer: 'Test disclaimer',
      });

      const { result } = renderHook(() => useVersions());

      let version;
      await act(async () => {
        version = await result.current.getVersion('version-1');
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/versions/version-1');
      expect(version).toEqual(mockVersion);
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions', async () => {
      const comparisonResult = {
        version1: { id: 'v1', versionNumber: 1, createdAt: '2026-01-01' },
        version2: { id: 'v2', versionNumber: 2, createdAt: '2026-01-02' },
        differences: {
          metadata: { title: { old: 'Old', new: 'New' } },
          sections: { added: [], removed: [], modified: [] },
        },
        disclaimer: 'Test',
      };

      vi.mocked(apiHelpers.get).mockResolvedValueOnce(comparisonResult);

      const { result } = renderHook(() => useVersions());

      let comparison;
      await act(async () => {
        comparison = await result.current.compareVersions('v1', 'v2');
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/versions/compare/v1/v2');
      expect(comparison).toEqual(comparisonResult);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a version successfully', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValueOnce({
        data: {},
        message: 'Restored',
        disclaimer: 'Test',
      });

      const { result } = renderHook(() => useVersions());

      await act(async () => {
        await result.current.restoreVersion('version-1');
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/versions/version-1/restore',
      );
      expect(result.current.error).toBeNull();
    });

    it('should handle restore error', async () => {
      vi.mocked(apiHelpers.post).mockRejectedValueOnce(
        new Error('Failed to restore'),
      );

      const { result } = renderHook(() => useVersions());

      try {
        await act(async () => {
          await result.current.restoreVersion('version-1');
        });
      } catch {
        // Expected error
      }

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/versions/version-1/restore',
      );
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useVersions());

      // Start with no error
      expect(result.current.error).toBeNull();

      // Clear error should still work
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useVersions());

      expect(result.current.versions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
