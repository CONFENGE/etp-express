import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates } from '@/hooks/useTemplates';
import {
  EtpTemplate,
  TEMPLATE_ICONS,
  TEMPLATE_TYPE_LABELS,
} from '@/types/template';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (template: EtpTemplate) => void;
  className?: string;
}

interface TemplateCardProps {
  template: EtpTemplate;
  selected: boolean;
  onSelect: (template: EtpTemplate) => void;
}

/**
 * Individual template card with selection state.
 */
function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const icon = TEMPLATE_ICONS[template.type];
  const typeLabel = TEMPLATE_TYPE_LABELS[template.type];

  return (
    <Card
      interactive
      onClick={() => onSelect(template)}
      className={cn(
        'relative cursor-pointer transition-all',
        selected && 'ring-2 ring-primary border-primary',
      )}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(template);
        }
      }}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl" role="img" aria-label={typeLabel}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">
              {template.name}
            </CardTitle>
            <Badge variant="secondary" className="mt-1">
              {typeLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="line-clamp-2 mb-3">
          {template.description}
        </CardDescription>

        {/* Required fields count */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">
              {template.requiredFields.length}
            </span>
            <span>campos obrigatorios</span>
          </div>
        </div>

        {/* Legal references preview */}
        {template.legalReferences.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">
              Referencias legais:
            </p>
            <div className="flex flex-wrap gap-1">
              {template.legalReferences.slice(0, 2).map((ref, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {ref}
                </Badge>
              ))}
              {template.legalReferences.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{template.legalReferences.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for template cards.
 */
function TemplateSkeleton() {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error state component.
 */
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar templates</h3>
      <p className="text-muted-foreground mb-4">{message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

/**
 * Empty state when no templates are available.
 */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="text-lg font-semibold mb-2">Nenhum template disponivel</h3>
      <p className="text-muted-foreground">
        Os templates de ETP ainda nao foram configurados.
      </p>
    </div>
  );
}

/**
 * Template selector component for ETP creation.
 * Displays available templates as interactive cards in a responsive grid.
 *
 * Issue #1238 - [TMPL-1161d] Create TemplateSelector frontend component
 *
 * Features:
 * - Visual cards with icons per template type
 * - Selection state with visual feedback
 * - Responsive grid (2x2 on desktop, 1 column on mobile)
 * - Loading skeletons during fetch
 * - Error state with retry option
 * - Keyboard accessible (Enter/Space to select)
 */
export function TemplateSelector({
  selectedTemplateId,
  onSelect,
  className,
}: TemplateSelectorProps) {
  const { templates, isLoading, error, refetch } = useTemplates();

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}
        role="listbox"
        aria-label="Selecione um template"
        aria-busy="true"
      >
        {[1, 2, 3, 4].map((i) => (
          <TemplateSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('grid grid-cols-1', className)}>
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className={cn('grid grid-cols-1', className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}
      role="listbox"
      aria-label="Selecione um template"
    >
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          selected={selectedTemplateId === template.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
