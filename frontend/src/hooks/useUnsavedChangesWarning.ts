import { useEffect, useCallback, useState } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router-dom';

interface UseUnsavedChangesWarningOptions {
 /**
 * Whether there are unsaved changes
 */
 isDirty: boolean;
 /**
 * Custom message for the browser beforeunload dialog (browser may ignore this)
 */
 message?: string;
}

interface UseUnsavedChangesWarningReturn {
 /**
 * Whether a navigation is being blocked
 */
 isBlocking: boolean;
 /**
 * Proceed with the blocked navigation
 */
 proceed: () => void;
 /**
 * Cancel the blocked navigation and stay on the page
 */
 reset: () => void;
}

/**
 * Hook to warn users about unsaved changes when navigating away from a page.
 *
 * Features:
 * - Blocks React Router navigation with a confirmation dialog
 * - Shows browser native dialog when closing tab/window
 * - Provides state for custom UI dialog
 *
 * @example
 * ```tsx
 * const [isDirty, setIsDirty] = useState(false);
 * const { isBlocking, proceed, reset } = useUnsavedChangesWarning({ isDirty });
 *
 * // In your JSX:
 * {isBlocking && (
 * <ConfirmDialog
 * onConfirm={proceed}
 * onCancel={reset}
 * />
 * )}
 * ```
 */
export function useUnsavedChangesWarning({
 isDirty,
 message = 'Você tem alterações não salvas. Deseja sair mesmo assim?',
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
 const [isBlocking, setIsBlocking] = useState(false);

 // Block React Router navigation
 const shouldBlock = useCallback<BlockerFunction>(
 ({ currentLocation, nextLocation }) =>
 isDirty && currentLocation.pathname !== nextLocation.pathname,
 [isDirty],
 );
 const blocker = useBlocker(shouldBlock);

 // Sync blocker state to local state for UI
 useEffect(() => {
 setIsBlocking(blocker.state === 'blocked');
 }, [blocker.state]);

 // Block browser navigation (tab close, refresh, etc.)
 useEffect(() => {
 const handleBeforeUnload = (e: BeforeUnloadEvent) => {
 if (isDirty) {
 e.preventDefault();
 // Note: Modern browsers ignore custom messages and show their own
 e.returnValue = message;
 return message;
 }
 };

 window.addEventListener('beforeunload', handleBeforeUnload);
 return () => window.removeEventListener('beforeunload', handleBeforeUnload);
 }, [isDirty, message]);

 const proceed = useCallback(() => {
 if (blocker.state === 'blocked') {
 blocker.proceed();
 }
 }, [blocker]);

 const reset = useCallback(() => {
 if (blocker.state === 'blocked') {
 blocker.reset();
 }
 }, [blocker]);

 return {
 isBlocking,
 proceed,
 reset,
 };
}
