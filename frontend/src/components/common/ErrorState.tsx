import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Standardized error state component for displaying errors consistently
 * across the application.
 *
 * Features:
 * - Three variants: default, compact, fullscreen
 * - Optional action buttons: retry, back, home
 * - Accessible with ARIA role="alert"
 * - Apple HIG design tokens
 *
 * @example
 * // Basic usage
 * <ErrorState
 *   title="Erro ao carregar dados"
 *   message="Não foi possível carregar os dados. Tente novamente."
 *   onRetry={() => refetch()}
 * />
 *
 * @example
 * // Fullscreen variant
 * <ErrorState
 *   variant="fullscreen"
 *   title="Página não encontrada"
 *   message="O recurso solicitado não existe."
 *   onHome={() => navigate('/')}
 * />
 */

export interface ErrorStateProps {
  /** Error title displayed prominently */
  title?: string;
  /** Detailed error message */
  message?: string;
  /** Display variant */
  variant?: 'default' | 'compact' | 'fullscreen';
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for back navigation */
  onBack?: () => void;
  /** Callback for home navigation */
  onHome?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Não foi possível carregar o conteúdo. Tente novamente.',
  variant = 'default',
  onRetry,
  onBack,
  onHome,
  className,
}: ErrorStateProps) {
  const hasActions = onRetry || onBack || onHome;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'fullscreen' && 'min-h-screen px-4',
        variant === 'default' && 'py-12 px-4',
        variant === 'compact' && 'py-6 px-4',
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon with background */}
      <div
        className={cn(
          'mb-4 rounded-full bg-apple-red/10 flex items-center justify-center',
          variant === 'compact' ? 'p-3' : 'p-4',
        )}
      >
        <AlertCircle
          className={cn(
            'text-apple-red',
            variant === 'compact' ? 'h-8 w-8' : 'h-12 w-12',
          )}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h2
        className={cn(
          'font-semibold text-text-apple-primary mb-2',
          variant === 'compact' ? 'text-lg' : 'text-xl',
        )}
      >
        {title}
      </h2>

      {/* Message */}
      <p
        className={cn(
          'text-text-apple-secondary max-w-md',
          hasActions ? 'mb-6' : 'mb-0',
        )}
      >
        {message}
      </p>

      {/* Action buttons */}
      {hasActions && (
        <div className="flex flex-wrap gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </Button>
          )}
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
          )}
          {onHome && (
            <Button onClick={onHome} variant="ghost">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Início
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
