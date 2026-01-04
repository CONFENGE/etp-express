import { Progress } from '@/components/ui/progress';

interface ETPEditorProgressProps {
  progress: number;
}

export function ETPEditorProgress({ progress }: ETPEditorProgressProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso Geral</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} data-testid="etp-progress" />
      </div>
    </div>
  );
}
