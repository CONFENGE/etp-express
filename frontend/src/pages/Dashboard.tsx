import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useETPs } from '@/hooks/useETPs';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/common/LoadingState';
import { ETP_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export function Dashboard() {
  const { user } = useAuth();
  const { etps, isLoading, fetchETPs } = useETPs();

  useEffect(() => {
    fetchETPs();
  }, []);

  const stats = {
    total: etps.length,
    inProgress: etps.filter((e) => e.status === 'in_progress').length,
    completed: etps.filter((e) => e.status === 'completed').length,
  };

  const recentETPs = etps.slice(0, 5);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus Estudos Técnicos Preliminares
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de ETPs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Criados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando conclusão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Prontos para uso
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ETPs Recentes</CardTitle>
                <CardDescription>
                  Seus estudos mais recentes
                </CardDescription>
              </div>
              <Button asChild>
                <Link to="/etps/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo ETP
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message="Carregando ETPs..." />
            ) : recentETPs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum ETP encontrado</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando seu primeiro Estudo Técnico Preliminar
                </p>
                <Button asChild className="mt-4">
                  <Link to="/etps/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar ETP
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentETPs.map((etp) => (
                  <Link
                    key={etp.id}
                    to={`/etps/${etp.id}`}
                    className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{etp.title}</h3>
                        {etp.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {etp.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {ETP_STATUS_LABELS[etp.status]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(etp.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary">
                          {etp.progress}%
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
