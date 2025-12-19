import { ExternalLink, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Reference } from '@/types/etp';

interface ReferenceCardProps {
  reference: Reference;
}

export function ReferenceCard({ reference }: ReferenceCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
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
    </Card>
  );
}
