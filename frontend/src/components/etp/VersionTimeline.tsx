import { Clock, User, Eye, GitCompare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EtpVersion } from '@/types/version';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
  versions: EtpVersion[];
  currentVersion?: number;
  onViewVersion: (version: EtpVersion) => void;
  onCompareVersion: (version: EtpVersion) => void;
  onRestoreVersion: (version: EtpVersion) => void;
  isLoading?: boolean;
  selectedVersionId?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(dateString);
}

export function VersionTimeline({
  versions,
  currentVersion,
  onViewVersion,
  onCompareVersion,
  onRestoreVersion,
  isLoading,
  selectedVersionId,
}: VersionTimelineProps) {
  if (versions.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma versao encontrada</p>
        <p className="text-sm mt-1">
          As versoes serao criadas automaticamente ao editar o ETP
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versions.map((version, index) => {
        const isLatest = index === 0;
        const isCurrent = version.versionNumber === currentVersion;
        const isSelected = version.id === selectedVersionId;

        return (
          <div
            key={version.id}
            className={cn(
              'relative pl-6 pb-4',
              index !== versions.length - 1 && 'border-l-2 border-muted',
            )}
          >
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute left-0 w-3 h-3 rounded-full -translate-x-[7px]',
                isLatest || isCurrent ? 'bg-primary' : 'bg-muted-foreground/50',
                isSelected && 'ring-2 ring-primary ring-offset-2',
              )}
            />

            {/* Version card */}
            <div
              className={cn(
                'p-4 rounded-lg border transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    v{version.versionNumber}
                  </span>
                  {isLatest && (
                    <Badge variant="default" className="text-xs">
                      Atual
                    </Badge>
                  )}
                  {isCurrent && !isLatest && (
                    <Badge variant="secondary" className="text-xs">
                      Em uso
                    </Badge>
                  )}
                </div>
                <span
                  className="text-sm text-muted-foreground"
                  title={formatDate(version.createdAt)}
                >
                  {formatRelativeTime(version.createdAt)}
                </span>
              </div>

              {/* Author */}
              {version.createdByName && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <User className="h-3 w-3" />
                  <span>{version.createdByName}</span>
                </div>
              )}

              {/* Change log */}
              {version.changeLog && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  &quot;{version.changeLog}&quot;
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewVersion(version)}
                  className="h-8"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCompareVersion(version)}
                  className="h-8"
                  disabled={versions.length < 2}
                  title={
                    versions.length < 2
                      ? 'Necessario pelo menos 2 versoes para comparar'
                      : 'Comparar com outra versao'
                  }
                >
                  <GitCompare className="h-3.5 w-3.5 mr-1" />
                  Comparar
                </Button>

                {!isLatest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreVersion(version)}
                    className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title="Restaurar esta versao (cria backup antes)"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Restaurar
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
