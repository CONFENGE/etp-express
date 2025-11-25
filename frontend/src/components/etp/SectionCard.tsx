import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent',
        isActive && 'border-primary bg-accent',
      )}
      onClick={onClick}
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
      </CardContent>
    </Card>
  );
}
