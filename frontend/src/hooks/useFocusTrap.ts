import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals and dialogs (WCAG 2.1 AA compliance).
 *
 * Automatically traps focus within the container when opened:
 * - Focus moves to first focusable element on open
 * - Tab key cycles through focusable elements
 * - Shift+Tab reverses direction
 * - Focus wraps from last to first element
 *
 * @param isOpen - Whether the focus trap is active
 * @returns containerRef - Ref to attach to the container element
 *
 * @example
 * const containerRef = useFocusTrap(isOpen);
 * return <div ref={containerRef}>...</div>;
 */
export const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Query for all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store previously focused element to restore on close
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: reverse direction
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: forward direction
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element on mount
    firstElement?.focus();

    // Add event listener
    document.addEventListener('keydown', handleTabKey);

    // Cleanup: restore focus and remove listener
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen]);

  return containerRef;
};
