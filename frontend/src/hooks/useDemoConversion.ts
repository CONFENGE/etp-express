import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Trigger events that should show the conversion banner for demo users.
 *
 * Only completion events trigger the banner to avoid interrupting active work:
 * - etp_completion: User finished the ETP (100% progress)
 * - pdf_export: User exported the document (PDF or DOCX)
 *
 * Note: 'ai_generation' was removed (#1346) as it was considered intrusive
 * during active work. The banner should only appear after successful completion
 * of a workflow, not during intermediate steps.
 */
export type DemoConversionTrigger = 'etp_completion' | 'pdf_export';

const SESSION_KEY = 'demo-banner-dismissed';

/**
 * Hook to manage demo user conversion banner state.
 *
 * The banner is shown only for demo users after specific trigger events:
 * - AI generation completion
 * - ETP completion (100% progress)
 * - PDF export
 *
 * When the user closes the banner, it remains hidden until the next trigger.
 *
 * @returns Object with banner visibility state and trigger/dismiss functions
 *
 * @example
 * ```tsx
 * const { showBanner, triggerBanner, dismissBanner } = useDemoConversion();
 *
 * // After AI generation
 * await generateSection();
 * triggerBanner('ai_generation');
 *
 * // In render
 * {showBanner && <DemoConversionBanner onClose={dismissBanner} />}
 * ```
 */
export function useDemoConversion() {
  const { user } = useAuthStore();
  const [showBanner, setShowBanner] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<DemoConversionTrigger | null>(
    null,
  );

  const isDemoUser = user?.role === 'demo';

  // Check if banner was recently dismissed in this session
  const wasDismissedRecently = useCallback(() => {
    try {
      const dismissedAt = sessionStorage.getItem(SESSION_KEY);
      if (!dismissedAt) return false;

      // Consider "recently" as within the last 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return parseInt(dismissedAt, 10) > fiveMinutesAgo;
    } catch {
      // sessionStorage might not be available
      return false;
    }
  }, []);

  /**
   * Trigger the banner to show after a specific event.
   * Only shows for demo users and if not recently dismissed.
   */
  const triggerBanner = useCallback(
    (trigger: DemoConversionTrigger) => {
      if (!isDemoUser) return;
      if (wasDismissedRecently()) return;

      setLastTrigger(trigger);
      setShowBanner(true);
    },
    [isDemoUser, wasDismissedRecently],
  );

  /**
   * Dismiss the banner and prevent it from showing again
   * until the next trigger event (after a cooldown period).
   */
  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    setLastTrigger(null);

    try {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    } catch {
      // sessionStorage might not be available
    }
  }, []);

  // Reset banner state when user changes
  useEffect(() => {
    if (!isDemoUser) {
      setShowBanner(false);
      setLastTrigger(null);
    }
  }, [isDemoUser]);

  return {
    /** Whether the banner should be shown */
    showBanner,
    /** The event that triggered the banner (for analytics) */
    lastTrigger,
    /** Whether the current user is a demo user */
    isDemoUser,
    /** Trigger the banner to show after an event */
    triggerBanner,
    /** Dismiss the banner */
    dismissBanner,
  };
}
