import { Plus, Minus, Edit3, ArrowRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VersionComparisonResult } from '@/types/version';
import { cn } from '@/lib/utils';

interface VersionDiffProps {
  comparison: VersionComparisonResult;
  isLoading?: boolean;
}

function DiffBadge({
  type,
}: {
  type: 'added' | 'removed' | 'modified';
}): React.ReactElement {
  const config = {
    added: { label: 'Adicionado', className: 'bg-green-100 text-green-800' },
    removed: { label: 'Removido', className: 'bg-red-100 text-red-800' },
    modified: {
      label: 'Modificado',
      className: 'bg-amber-100 text-amber-800',
    },
  };

  const { label, className } = config[type];
  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {label}
    </Badge>
  );
}

function MetadataChange({
  field,
  oldValue,
  newValue,
}: {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}): React.ReactElement {
  const fieldLabels: Record<string, string> = {
    title: 'Titulo',
    description: 'Descricao',
    objeto: 'Objeto',
    status: 'Status',
  };

  return (
    <div className="p-3 border rounded-lg bg-amber-50/50 border-amber-200">
      <div className="flex items-center gap-2 mb-2">
        <Edit3 className="h-4 w-4 text-amber-600" />
        <span className="font-medium text-sm">
          {fieldLabels[field] || field}
        </span>
        <DiffBadge type="modified" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="line-through text-muted-foreground">
          {String(oldValue || '(vazio)')}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-foreground font-medium">
          {String(newValue || '(vazio)')}
        </span>
      </div>
    </div>
  );
}

function SectionChange({
  type,
  title,
  sectionType,
  changes,
}: {
  type: 'added' | 'removed' | 'modified';
  title: string;
  sectionType: string;
  changes?: Record<string, unknown>;
}): React.ReactElement {
  const config = {
    added: {
      icon: Plus,
      bgClass: 'bg-green-50/50 border-green-200',
      iconClass: 'text-green-600',
    },
    removed: {
      icon: Minus,
      bgClass: 'bg-red-50/50 border-red-200',
      iconClass: 'text-red-600',
    },
    modified: {
      icon: Edit3,
      bgClass: 'bg-amber-50/50 border-amber-200',
      iconClass: 'text-amber-600',
    },
  };

  const { icon: Icon, bgClass, iconClass } = config[type];

  return (
    <div className={cn('p-3 border rounded-lg', bgClass)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', iconClass)} />
        <span className="font-medium text-sm">{title || sectionType}</span>
        <DiffBadge type={type} />
      </div>
      <p className="text-xs text-muted-foreground ml-6">Tipo: {sectionType}</p>

      {changes && type === 'modified' && (
        <div className="mt-2 ml-6 space-y-1 text-xs">
          {Object.entries(changes).map(([key, value]) => (
            <div key={key} className="text-muted-foreground">
              <span className="font-medium">{key}:</span>{' '}
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : 'alterado'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VersionDiff({
  comparison,
  isLoading,
}: VersionDiffProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { differences } = comparison;
  const hasMetadataChanges = Object.keys(differences.metadata).length > 0;
  const hasSectionChanges =
    differences.sections.added.length > 0 ||
    differences.sections.removed.length > 0 ||
    differences.sections.modified.length > 0;
  const hasAnyChanges = hasMetadataChanges || hasSectionChanges;

  if (!hasAnyChanges) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma diferenca encontrada entre as versoes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version headers */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="text-sm">
          <span className="text-muted-foreground">De:</span>{' '}
          <span className="font-medium">
            v{comparison.version1.versionNumber}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm">
          <span className="text-muted-foreground">Para:</span>{' '}
          <span className="font-medium">
            v{comparison.version2.versionNumber}
          </span>
        </div>
      </div>

      {/* Metadata changes */}
      {hasMetadataChanges && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Metadados do ETP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(differences.metadata).map(([field, change]) => (
              <MetadataChange
                key={field}
                field={field}
                oldValue={(change as { old: unknown; new: unknown }).old}
                newValue={(change as { old: unknown; new: unknown }).new}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section changes */}
      {hasSectionChanges && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Secoes ({differences.sections.added.length} adicionadas,{' '}
              {differences.sections.removed.length} removidas,{' '}
              {differences.sections.modified.length} modificadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Added sections */}
            {differences.sections.added.map((section) => (
              <SectionChange
                key={section.id}
                type="added"
                title={section.title}
                sectionType={section.type}
              />
            ))}

            {/* Removed sections */}
            {differences.sections.removed.map((section) => (
              <SectionChange
                key={section.id}
                type="removed"
                title={section.title}
                sectionType={section.type}
              />
            ))}

            {/* Modified sections */}
            {differences.sections.modified.map((section) => (
              <SectionChange
                key={section.id}
                type="modified"
                title=""
                sectionType={section.type}
                changes={section.changes}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
