import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFormProgress } from './useFormProgress';

describe('useFormProgress', () => {
  // Mock watch function factory
  const createMockWatch = (values: Record<string, unknown>) => {
    return vi.fn((fieldNames: string[]) => {
      if (Array.isArray(fieldNames)) {
        return fieldNames.map((name) => values[name]);
      }
      return values[fieldNames as unknown as string];
    });
  };

  describe('progress calculation', () => {
    it('calculates 0% progress when no fields are filled', () => {
      const watch = createMockWatch({ title: '', description: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
        }),
      );

      expect(result.current.progress).toBe(0);
      expect(result.current.filledFields).toBe(0);
      expect(result.current.totalFields).toBe(2);
    });

    it('calculates 50% progress when half fields are filled', () => {
      const watch = createMockWatch({ title: 'Test', description: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
        }),
      );

      expect(result.current.progress).toBe(50);
      expect(result.current.filledFields).toBe(1);
    });

    it('calculates 100% progress when all fields are filled', () => {
      const watch = createMockWatch({ title: 'Test', description: 'Desc' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
        }),
      );

      expect(result.current.progress).toBe(100);
      expect(result.current.filledFields).toBe(2);
    });

    it('handles single field correctly', () => {
      const watch = createMockWatch({ title: 'Test' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
        }),
      );

      expect(result.current.progress).toBe(100);
      expect(result.current.filledFields).toBe(1);
      expect(result.current.totalFields).toBe(1);
    });

    it('handles empty fieldNames array', () => {
      const watch = createMockWatch({});

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: [],
        }),
      );

      expect(result.current.progress).toBe(0);
      expect(result.current.filledFields).toBe(0);
      expect(result.current.totalFields).toBe(0);
    });
  });

  describe('field value detection', () => {
    it('treats empty string as not filled', () => {
      const watch = createMockWatch({ title: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats whitespace-only string as not filled', () => {
      const watch = createMockWatch({ title: '   ' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats null as not filled', () => {
      const watch = createMockWatch({ title: null });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats undefined as not filled', () => {
      const watch = createMockWatch({ title: undefined });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats number 0 as filled', () => {
      const watch = createMockWatch({ quantity: 0 });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['quantity'],
        }),
      );

      expect(result.current.filledFields).toBe(1);
    });

    it('treats NaN as not filled', () => {
      const watch = createMockWatch({ quantity: NaN });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['quantity'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats boolean false as filled', () => {
      const watch = createMockWatch({ isActive: false });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['isActive'],
        }),
      );

      expect(result.current.filledFields).toBe(1);
    });

    it('treats boolean true as filled', () => {
      const watch = createMockWatch({ isActive: true });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['isActive'],
        }),
      );

      expect(result.current.filledFields).toBe(1);
    });

    it('treats empty array as not filled', () => {
      const watch = createMockWatch({ tags: [] });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['tags'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats non-empty array as filled', () => {
      const watch = createMockWatch({ tags: ['tag1', 'tag2'] });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['tags'],
        }),
      );

      expect(result.current.filledFields).toBe(1);
    });

    it('treats empty object as not filled', () => {
      const watch = createMockWatch({ metadata: {} });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['metadata'],
        }),
      );

      expect(result.current.filledFields).toBe(0);
    });

    it('treats non-empty object as filled', () => {
      const watch = createMockWatch({ metadata: { key: 'value' } });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['metadata'],
        }),
      );

      expect(result.current.filledFields).toBe(1);
    });
  });

  describe('isComplete calculation', () => {
    it('returns isComplete true when no required fields', () => {
      const watch = createMockWatch({ title: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
          requiredFields: [],
        }),
      );

      expect(result.current.isComplete).toBe(true);
    });

    it('returns isComplete true when all required fields are filled', () => {
      const watch = createMockWatch({ title: 'Test', description: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
          requiredFields: ['title'],
        }),
      );

      expect(result.current.isComplete).toBe(true);
    });

    it('returns isComplete false when required fields are empty', () => {
      const watch = createMockWatch({ title: '', description: 'Desc' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
          requiredFields: ['title'],
        }),
      );

      expect(result.current.isComplete).toBe(false);
    });

    it('handles multiple required fields', () => {
      const watch = createMockWatch({
        title: 'Test',
        description: 'Desc',
        objeto: '',
      });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description', 'objeto'],
          requiredFields: ['title', 'objeto'],
        }),
      );

      expect(result.current.isComplete).toBe(false);
    });
  });

  describe('error counting', () => {
    it('returns 0 error count when no errors', () => {
      const watch = createMockWatch({ title: 'Test' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
          errors: {},
        }),
      );

      expect(result.current.errorCount).toBe(0);
    });

    it('counts errors correctly', () => {
      const watch = createMockWatch({ title: '', description: '' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title', 'description'],
          errors: {
            title: { type: 'required', message: 'Required' },
            description: { type: 'required', message: 'Required' },
          },
        }),
      );

      expect(result.current.errorCount).toBe(2);
    });

    it('handles undefined errors object', () => {
      const watch = createMockWatch({ title: 'Test' });

      const { result } = renderHook(() =>
        useFormProgress({
          watch,
          fieldNames: ['title'],
          errors: undefined,
        }),
      );

      expect(result.current.errorCount).toBe(0);
    });
  });
});
