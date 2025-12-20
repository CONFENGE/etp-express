import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
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
import { EmptyState } from '@/components/common/EmptyState';

interface ETPListProps {
  etps: ETP[];
}

export function ETPList({ etps }: ETPListProps) {
  const navigate = useNavigate();

  if (etps.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            type="documents"
            title="Nenhum ETP encontrado"
            description="Comece criando seu primeiro Estudo Técnico Preliminar para organizar suas contratações."
            action={{
              label: 'Criar ETP',
              onClick: () => navigate('/etps/new'),
              icon: PlusCircle,
            }}
            size="md"
          />
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
