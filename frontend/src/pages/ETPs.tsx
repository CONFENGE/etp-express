import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useETPs } from '@/hooks/useETPs';
import { SkeletonList } from '@/components/common/LoadingState';
import { ETP_STATUS_LABELS, ETP_STATUS_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

export function ETPs() {
  const { etps, isLoading, fetchETPs } = useETPs();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchETPs();
  }, [fetchETPs]);

  const filteredETPs = etps.filter((etp) =>
    etp.title.toLowerCase().includes(search.toLowerCase()) ||
    etp.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus ETPs</h1>
            <p className="text-muted-foreground">
              Gerencie seus Estudos Técnicos Preliminares
            </p>
          </div>
          <Button asChild>
            <Link to="/etps/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo ETP
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ETPs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonList count={3} />
        ) : filteredETPs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ETP encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro ETP'}
              </p>
              {!search && (
                <Button asChild>
                  <Link to="/etps/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar ETP
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredETPs.map((etp) => (
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
                        <span className="text-sm text-muted-foreground">Progresso</span>
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
        )}
      </div>
    </MainLayout>
  );
}
