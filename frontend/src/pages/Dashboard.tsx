import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, TrendingUp, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useETPs } from '@/hooks/useETPs';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonRecentItems } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { WelcomeModal } from '@/components/common/WelcomeModal';
import { ETP_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { etps, isLoading, fetchETPs } = useETPs();

  useEffect(() => {
    fetchETPs();
  }, [fetchETPs]);

  const stats = useMemo(() => {
    return etps.reduce(
      (acc, etp) => {
        acc.total++;
        if (etp.status === 'in_progress') acc.inProgress++;
        if (etp.status === 'completed') acc.completed++;
        return acc;
      },
      { total: 0, inProgress: 0, completed: 0 },
    );
  }, [etps]);

  const recentETPs = etps.slice(0, 5);

  return (
    <MainLayout>
      <WelcomeModal />
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus Estudos Técnicos Preliminares
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3" data-tour="dashboard-stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de ETPs
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24 mt-2" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Criados no sistema
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Progresso
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-28 mt-2" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando conclusão
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20 mt-2" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <p className="text-xs text-muted-foreground">
                    Prontos para uso
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card data-tour="recent-etps">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ETPs Recentes</CardTitle>
                <CardDescription>Seus estudos mais recentes</CardDescription>
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
              <SkeletonRecentItems count={5} />
            ) : recentETPs.length === 0 ? (
              <EmptyState
                type="welcome"
                title="Bem-vindo ao ETP Express!"
                description="Comece criando seu primeiro Estudo Técnico Preliminar e simplifique seu trabalho"
                action={{
                  label: 'Criar ETP',
                  onClick: () => navigate('/etps/new'),
                  icon: PlusCircle,
                }}
                size="md"
              />
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
