import { cn } from '@/lib/utils';
import { QuotaInfo } from '@/store/managerStore';

interface QuotaIndicatorProps {
  quota: QuotaInfo | null;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * Ring progress indicator for domain user quota.
 * Apple HIG style with color-coded thresholds.
 *
 * Colors:
 * - Green (0-60%): Safe zone
 * - Yellow (60-80%): Warning zone
 * - Red (80-100%): Critical zone
 *
 * @security Only renders data passed from parent.
 * Parent component is responsible for auth checks.
 */
export function QuotaIndicator({
  quota,
  loading = false,
  size = 'md',
  showText = true,
  className,
}: QuotaIndicatorProps) {
  const sizeConfig = {
    sm: { width: 80, strokeWidth: 6, fontSize: 'text-sm', gap: 'gap-1' },
    md: { width: 120, strokeWidth: 8, fontSize: 'text-lg', gap: 'gap-2' },
    lg: { width: 160, strokeWidth: 10, fontSize: 'text-2xl', gap: 'gap-3' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const percentUsed = quota?.percentUsed ?? 0;
  const strokeDashoffset = circumference - (percentUsed / 100) * circumference;

  // Color based on percentage thresholds (Apple HIG)
  const getColor = (percent: number): string => {
    if (percent >= 80) return 'text-red-500';
    if (percent >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStrokeColor = (percent: number): string => {
    if (percent >= 80) return '#ef4444'; // red-500
    if (percent >= 60) return '#eab308'; // yellow-500
    return '#22c55e'; // green-500
  };

  if (loading) {
    return (
      <div
        className={cn('flex flex-col items-center', config.gap, className)}
        role="status"
        aria-label="Loading quota information"
      >
        <div
          className="animate-pulse rounded-full bg-muted"
          style={{ width: config.width, height: config.width }}
        />
        {showText && (
          <div className="space-y-1 text-center">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        )}
      </div>
    );
  }

  if (!quota) {
    return (
      <div
        className={cn('flex flex-col items-center', config.gap, className)}
        role="status"
        aria-label="Quota information unavailable"
      >
        <div
          className="flex items-center justify-center rounded-full border-4 border-muted"
          style={{ width: config.width, height: config.width }}
        >
          <span className="text-muted-foreground">--</span>
        </div>
        {showText && <p className="text-sm text-muted-foreground">Sem dados</p>}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col items-center', config.gap, className)}
      role="meter"
      aria-valuenow={quota.currentUsers}
      aria-valuemin={0}
      aria-valuemax={quota.maxUsers}
      aria-label={`User quota: ${quota.currentUsers} of ${quota.maxUsers} users`}
    >
      {/* Ring Progress SVG */}
      <div
        className="relative"
        style={{ width: config.width, height: config.width }}
      >
        <svg
          width={config.width}
          height={config.width}
          className="-rotate-90 transform"
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor(percentUsed)}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('font-bold', config.fontSize, getColor(percentUsed))}
          >
            {quota.currentUsers}
          </span>
          <span className="text-xs text-muted-foreground">
            / {quota.maxUsers}
          </span>
        </div>
      </div>

      {/* Text below ring */}
      {showText && (
        <div className="text-center">
          <p className={cn('font-medium', getColor(percentUsed))}>
            {percentUsed.toFixed(0)}% utilizado
          </p>
          <p className="text-sm text-muted-foreground">
            {quota.available} {quota.available === 1 ? 'vaga' : 'vagas'}{' '}
            {quota.available === 1 ? 'disponível' : 'disponíveis'}
          </p>
        </div>
      )}
    </div>
  );
}
