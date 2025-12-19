import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ETP } from '@/types/etp';
import { ETP_STATUS_LABELS, ETP_STATUS_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface ETPListProps {
  etps: ETP[];
}

export function ETPList({ etps }: ETPListProps) {
  if (etps.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum ETP encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Comece criando seu primeiro Estudo Técnico Preliminar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {etps.map((etp) => (
        <Card key={etp.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{etp.title}</CardTitle>
              <Badge className={ETP_STATUS_COLORS[etp.status]}>
                {ETP_STATUS_LABELS[etp.status]}
              </Badge>
            </div>
            {etp.description && (
              <CardDescription className="line-clamp-2">
                {etp.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Progresso
                  </span>
                  <span className="text-sm font-medium">{etp.progress}%</span>
                </div>
                <Progress value={etp.progress} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Atualizado em {formatDate(etp.updatedAt)}
                </span>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link to={`/etps/${etp.id}`}>Abrir ETP</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
