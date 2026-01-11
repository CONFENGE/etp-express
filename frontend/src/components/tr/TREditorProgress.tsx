import { memo } from 'react';
import { Progress } from '@/components/ui/progress';

/**
 * Progress bar component for TR Editor.
 *
 * Displays the completion percentage of the TR based on filled sections.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

interface TREditorProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
}

export const TREditorProgress = memo(function TREditorProgress({
  progress,
}: TREditorProgressProps) {
  const roundedProgress = Math.round(progress);

  return (
    <div className="space-y-2" data-testid="tr-progress-container">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progresso do TR</span>
        <span
          className={
            roundedProgress === 100
              ? 'text-green-600 font-medium'
              : 'text-muted-foreground'
          }
          data-testid="progress-percentage"
        >
          {roundedProgress}%
        </span>
      </div>
      <Progress
        value={roundedProgress}
        className="h-2"
        data-testid="progress-bar"
      />
    </div>
  );
});
