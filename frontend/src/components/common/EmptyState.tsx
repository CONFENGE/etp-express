import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyDocuments, NoResults, Welcome } from '@/assets/illustrations';
import { cn } from '@/lib/utils';

export type EmptyStateType = 'documents' | 'search' | 'welcome' | 'custom';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export interface EmptyStateProps {
  /** Type of empty state - determines which illustration to show */
  type: EmptyStateType;
  /** Main heading text */
  title: string;
  /** Optional description text below the title */
  description?: string;
  /** Optional primary action button */
  action?: EmptyStateAction;
  /** Custom illustration (only used when type is 'custom') */
  illustration?: ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Size variant for the illustration */
  size?: 'sm' | 'md' | 'lg';
}

const illustrations: Record<
  Exclude<EmptyStateType, 'custom'>,
  React.FC<{ className?: string }>
> = {
  documents: EmptyDocuments,
  search: NoResults,
  welcome: Welcome,
};

const sizeClasses = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
};

/**
 * EmptyState component - displays a centered illustration with text and optional action
 * Used for empty lists, no search results, and onboarding states
 *
 * @example
 * <EmptyState
 *   type="documents"
 *   title="Nenhum ETP encontrado"
 *   description="Comece criando seu primeiro ETP"
 *   action={{ label: "Criar ETP", onClick: () => navigate('/etps/new'), icon: PlusCircle }}
 * />
 */
export function EmptyState({
  type,
  title,
  description,
  action,
  illustration,
  className,
  size = 'md',
}: EmptyStateProps) {
  const Illustration = type === 'custom' ? null : illustrations[type];
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className,
      )}
      role="status"
      aria-label={title}
    >
      <div className="mb-6 animate-in fade-in-50 duration-500">
        {type === 'custom' ? (
          illustration
        ) : Illustration ? (
          <Illustration className={cn(sizeClasses[size], 'mx-auto')} />
        ) : null}
      </div>

      <h3 className="text-xl font-semibold mb-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-500 delay-100">
        {title}
      </h3>

      {description && (
        <p className="text-muted-foreground max-w-md mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500 delay-150">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant ?? 'default'}
          className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500 delay-200"
        >
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
