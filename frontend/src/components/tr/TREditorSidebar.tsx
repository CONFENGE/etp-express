import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { TRSectionTemplate, TermoReferencia } from '@/types/termo-referencia';
import { cn } from '@/lib/utils';

/**
 * Sidebar component for TR Editor.
 *
 * Shows section navigation with completion status and quick navigation.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

interface TREditorSidebarProps {
  /** Section templates */
  sections: TRSectionTemplate[];
  /** Current active section number */
  activeSection: number;
  /** Handler for section navigation */
  onSectionClick: (sectionNumber: number) => void;
  /** Current TR data for checking filled status */
  currentTR: TermoReferencia;
}

export const TREditorSidebar = memo(function TREditorSidebar({
  sections,
  activeSection,
  onSectionClick,
  currentTR,
}: TREditorSidebarProps) {
  const isFilled = (field: keyof TermoReferencia): boolean => {
    const value = currentTR[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return value > 0;
    return Boolean(value);
  };

  const filledCount = sections.filter((s) => isFilled(s.field)).length;
  const requiredSections = sections.filter((s) => s.isRequired);
  const requiredFilledCount = requiredSections.filter((s) =>
    isFilled(s.field),
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card data-testid="sidebar-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Secoes preenchidas:</span>
            <Badge variant="secondary">
              {filledCount}/{sections.length}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Obrigatorias:</span>
            <Badge
              variant={
                requiredFilledCount === requiredSections.length
                  ? 'default'
                  : 'destructive'
              }
            >
              {requiredFilledCount}/{requiredSections.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      <Card data-testid="sidebar-navigation">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Secoes</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <nav className="space-y-1">
            {sections.map((section) => {
              const filled = isFilled(section.field);
              const isActive = activeSection === section.number;
              const isRequired = section.isRequired;

              return (
                <button
                  key={section.number}
                  onClick={() => onSectionClick(section.number)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    'hover:bg-muted/50',
                    isActive && 'bg-muted font-medium',
                  )}
                  data-testid={`sidebar-section-${section.number}`}
                >
                  {filled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : isRequired ? (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="truncate">{section.shortTitle}</span>
                </button>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* ETP Info Card */}
      {currentTR.etp && (
        <Card data-testid="sidebar-etp-info">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ETP de Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium truncate">
              {currentTR.etp.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Tipo: {currentTR.etp.templateType || 'N/A'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
