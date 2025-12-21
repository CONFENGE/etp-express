import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useBreadcrumb } from './useBreadcrumb';

// Wrapper component for router context
const createWrapper =
  (initialEntries: string[] = ['/']) =>
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );

describe('useBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('automatic generation', () => {
    it('should generate breadcrumb items for admin routes', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/admin/domains']),
      });

      expect(result.current.items).toEqual([
        { label: 'Administração', href: '/admin' },
        { label: 'Domínios' },
      ]);
    });

    it('should generate breadcrumb items for admin domain detail', () => {
      // When using useBreadcrumb without useParams context,
      // UUIDs are kept as-is in the label
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/admin/domains/example-domain']),
      });

      expect(result.current.items).toEqual([
        { label: 'Administração', href: '/admin' },
        { label: 'Domínios', href: '/admin/domains' },
        { label: 'Example-domain' },
      ]);
    });

    it('should generate breadcrumb items for manager routes', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/manager/users']),
      });

      expect(result.current.items).toEqual([
        { label: 'Gerenciamento', href: '/manager' },
        { label: 'Usuários' },
      ]);
    });

    it('should generate breadcrumb items for ETP routes', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/etps/my-etp-title']),
      });

      // Without useParams context, ID segment is capitalized
      expect(result.current.items).toEqual([
        { label: 'ETPs', href: '/etps' },
        { label: 'My-etp-title' },
      ]);
    });
  });

  describe('custom current page label', () => {
    it('should use custom label for current page', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumb({
            currentPageLabel: 'example.com',
          }),
        {
          wrapper: createWrapper(['/admin/domains/123']),
        },
      );

      expect(result.current.items[result.current.items.length - 1].label).toBe(
        'example.com',
      );
    });

    it('should use custom label for ETP editor', () => {
      const { result } = renderHook(
        () =>
          useBreadcrumb({
            currentPageLabel: 'Meu ETP',
          }),
        {
          wrapper: createWrapper(['/etps/abc-123']),
        },
      );

      expect(result.current.items).toEqual([
        { label: 'ETPs', href: '/etps' },
        { label: 'Meu ETP' },
      ]);
    });
  });

  describe('custom items override', () => {
    it('should use custom items when provided', () => {
      const customItems = [
        { label: 'Custom', href: '/custom' },
        { label: 'Path' },
      ];

      const { result } = renderHook(
        () =>
          useBreadcrumb({
            customItems,
          }),
        {
          wrapper: createWrapper(['/admin/domains']),
        },
      );

      expect(result.current.items).toEqual(customItems);
    });

    it('should ignore automatic generation when custom items provided', () => {
      const customItems = [{ label: 'Only Item' }];

      const { result } = renderHook(
        () =>
          useBreadcrumb({
            customItems,
            currentPageLabel: 'Should Be Ignored',
          }),
        {
          wrapper: createWrapper(['/admin/domains']),
        },
      );

      expect(result.current.items).toEqual(customItems);
    });
  });

  describe('fallback generation', () => {
    it('should generate from pathname segments for unknown routes', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/unknown/path/here']),
      });

      expect(result.current.items).toEqual([
        { label: 'Unknown', href: '/unknown' },
        { label: 'Path', href: '/unknown/path' },
        { label: 'Here' },
      ]);
    });

    it('should return empty array for root path', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/']),
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe('pathname exposure', () => {
    it('should expose current pathname', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/admin/domains']),
      });

      expect(result.current.pathname).toBe('/admin/domains');
    });
  });

  describe('route labels', () => {
    it('should use mapped labels for known segments', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/dashboard']),
      });

      expect(result.current.items[0].label).toBe('Dashboard');
    });

    it('should capitalize unknown segments', () => {
      const { result } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/custompage']),
      });

      expect(result.current.items[0].label).toBe('Custompage');
    });
  });

  describe('memoization', () => {
    it('should return stable items reference when pathname unchanged', () => {
      const { result, rerender } = renderHook(() => useBreadcrumb(), {
        wrapper: createWrapper(['/admin/domains']),
      });

      const items1 = result.current.items;
      rerender();
      const items2 = result.current.items;

      expect(items1).toBe(items2);
    });
  });
});
