import { useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/useToast';

interface ConnectionStatusProps {
  /** Show inline indicator (for header) vs floating banner */
  variant?: 'inline' | 'banner';
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Connection status indicator component.
 * Shows online/offline status with visual feedback and toast notifications.
 *
 * @example
 * // Inline indicator for header
 * <ConnectionStatus variant="inline" showLabel />
 *
 * // Floating banner for layout
 * <ConnectionStatus variant="banner" />
 */
export function ConnectionStatus({
  variant = 'inline',
  showLabel = false,
  className,
}: ConnectionStatusProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { success, error } = useToast();
  const previousOnlineRef = useRef(isOnline);
  const hasShownInitialToast = useRef(false);

  // Show toast when connection status changes
  useEffect(() => {
    // Skip initial render toast
    if (!hasShownInitialToast.current) {
      hasShownInitialToast.current = true;
      previousOnlineRef.current = isOnline;
      return;
    }

    // Only show toast on actual change
    if (previousOnlineRef.current !== isOnline) {
      if (isOnline && wasOffline) {
        success('Conexao restaurada', 'Online');
      } else if (!isOnline) {
        error(
          'Voce esta offline. Algumas funcionalidades podem nao estar disponiveis.',
          'Sem conexao',
        );
      }
      previousOnlineRef.current = isOnline;
    }
  }, [isOnline, wasOffline, success, error]);

  if (variant === 'banner') {
    // Only show banner when offline
    if (isOnline) return null;

    return (
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          'fixed bottom-4 left-4 z-50',
          'bg-destructive text-destructive-foreground',
          'px-4 py-3 rounded-lg shadow-lg',
          'flex items-center gap-2',
          'animate-in slide-in-from-bottom-4 duration-300',
          className,
        )}
      >
        <WifiOff className="h-5 w-5" aria-hidden="true" />
        <span>Sem conexao</span>
      </div>
    );
  }

  // Inline variant
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isOnline ? 'Online' : 'Offline'}
      className={cn('flex items-center gap-1.5', className)}
    >
      <div
        className={cn(
          'h-2 w-2 rounded-full transition-colors duration-300',
          isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse',
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
      {isOnline ? (
        <Wifi
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      ) : (
        <WifiOff
          className="h-3.5 w-3.5 text-destructive animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
