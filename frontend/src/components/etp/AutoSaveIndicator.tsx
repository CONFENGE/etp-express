import { memo } from 'react';
import {
  Cloud,
  CloudOff,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type AutoSaveStatus } from '@/hooks/useAutoSave';

export interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  isOnline: boolean;
  onRetry?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  AutoSaveStatus,
  {
    icon: typeof Check;
    label: string;
    description: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
    animate?: boolean;
  }
> = {
  idle: {
    icon: Cloud,
    label: 'Sincronizado',
    description: 'Todas as alterações estão salvas',
    variant: 'secondary',
  },
  pending: {
    icon: Cloud,
    label: 'Alterações pendentes',
    description: 'Salvando em breve...',
    variant: 'warning',
  },
  saving: {
    icon: Loader2,
    label: 'Salvando...',
    description: 'Salvando suas alterações',
    variant: 'default',
    animate: true,
  },
  saved: {
    icon: Check,
    label: 'Salvo',
    description: 'Alterações salvas com sucesso',
    variant: 'success',
  },
  error: {
    icon: AlertCircle,
    label: 'Erro ao salvar',
    description: 'Clique para tentar novamente',
    variant: 'destructive',
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    description: 'Alterações serão salvas quando reconectar',
    variant: 'warning',
  },
};

function formatLastSaved(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'agora mesmo';
  if (diffSec < 60) return `há ${diffSec}s`;
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHour < 24) return `há ${diffHour}h`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AutoSaveIndicator = memo(function AutoSaveIndicator({
  status,
  lastSavedAt,
  isOnline,
  onRetry,
  className,
}: AutoSaveIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const showRetry = status === 'error' && onRetry;

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <p>{config.description}</p>
      {lastSavedAt && status !== 'saving' && (
        <p className="text-muted-foreground">
          Último salvamento: {formatLastSaved(lastSavedAt)}
        </p>
      )}
      {!isOnline && status !== 'offline' && (
        <p className="text-yellow-500">Você está offline</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 select-none',
              className,
            )}
          >
            <Badge
              variant={config.variant}
              className={cn(
                'gap-1.5 py-1 px-2 cursor-default',
                showRetry && 'cursor-pointer hover:opacity-80',
              )}
              onClick={showRetry ? onRetry : undefined}
              role={showRetry ? 'button' : undefined}
              tabIndex={showRetry ? 0 : undefined}
              onKeyDown={
                showRetry
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onRetry?.();
                      }
                    }
                  : undefined
              }
            >
              <Icon
                className={cn('h-3 w-3', config.animate && 'animate-spin')}
              />
              <span className="text-xs">{config.label}</span>
              {showRetry && <RefreshCw className="h-3 w-3 ml-0.5" />}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
