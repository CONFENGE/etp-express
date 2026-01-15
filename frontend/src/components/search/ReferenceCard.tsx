import { ExternalLink, Star } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Reference } from '@/types/etp';

interface ReferenceCardProps {
  reference: Reference;
}

export function ReferenceCard({ reference }: ReferenceCardProps) {
  return (
    <GlassSurface
      intensity="medium"
      className="shadow-lg group cursor-pointer"
      style={{
        transition: `
          transform var(--duration-normal) var(--ease-apple-standard),
          box-shadow var(--duration-normal) var(--ease-apple-standard)
        `,
      }}
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">
            {reference.title}
          </h4>
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            <Star className="h-3 w-3 mr-1 fill-current" />
            {Math.round(reference.relevance * 100)}%
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-2">{reference.source}</p>

        {reference.excerpt && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-3 italic">
            "{reference.excerpt}"
          </p>
        )}

        {reference.url && (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary underline"
          >
            <ExternalLink className="h-3 w-3" />
            Acessar fonte
          </a>
        )}
      </CardContent>
    </GlassSurface>
  );
}
