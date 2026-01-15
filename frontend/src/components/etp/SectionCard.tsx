import { CheckCircle, Circle, AlertCircle, AlertTriangle } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Section } from '@/types/etp';

interface SectionCardProps {
  section: Section;
  isActive?: boolean;
  onClick?: () => void;
}

export function SectionCard({ section, isActive, onClick }: SectionCardProps) {
  const Icon = section.isCompleted
    ? CheckCircle
    : section.isRequired
      ? AlertCircle
      : Circle;

  return (
    <GlassSurface
      intensity="medium"
      className={cn(
        'cursor-pointer group',
        isActive && 'border-primary ring-2 ring-primary',
      )}
      style={{
        transition: `
          transform var(--duration-normal) var(--ease-apple-standard),
          box-shadow var(--duration-normal) var(--ease-apple-standard)
        `,
      }}
      onClick={onClick}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                'h-5 w-5',
                section.isCompleted
                  ? 'text-green-500'
                  : section.isRequired
                    ? 'text-yellow-500'
                    : 'text-muted-foreground',
              )}
            />
            <CardTitle className="text-sm">{section.title}</CardTitle>
          </div>
          {section.aiGenerated && (
            <Badge variant="secondary" className="text-xs">
              IA
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {section.content || 'Nenhum conteúdo ainda'}
        </p>
        {section.hasEnrichmentWarning && section.aiGenerated && (
          <Alert variant="warning" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta seção foi gerada sem busca de fundamentação externa.
              Recomendamos revisar e adicionar referências manualmente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </GlassSurface>
  );
}
