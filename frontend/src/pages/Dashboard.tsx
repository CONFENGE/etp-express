import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, TrendingUp, FileText, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useETPs } from '@/hooks/useETPs';
import { useAuth } from '@/hooks/useAuth';
import {
  SkeletonRecentItems,
  SkeletonStats,
} from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
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
  const hasNoETPs = !isLoading && stats.total === 0;

  // Show prominent empty state for first-time users
  if (hasNoETPs) {
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

          <Card className="border-dashed" data-tour="dashboard-empty">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <EmptyState
                  type="welcome"
                  title="Crie seu primeiro ETP"
                  description="O ETP Express ajuda você a criar Estudos Técnicos Preliminares de forma rápida e estruturada. Comece agora e simplifique seu trabalho."
                  size="lg"
                />

                <div className="mt-6 space-y-4 w-full max-w-sm">
                  <Button
                    size="lg"
                    className="w-full text-base"
                    onClick={() => navigate('/etps/new')}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Criar meu primeiro ETP
                  </Button>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Processo guiado passo a passo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estrutura completa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Todas as seções exigidas pela legislação organizadas de forma
                  clara.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sugestões inteligentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Receba sugestões contextualizadas para cada seção do seu ETP.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exportação fácil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Exporte seu ETP em formatos prontos para uso e
                  compartilhamento.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

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

        {isLoading ? (
          <SkeletonStats />
        ) : (
          <div className="grid gap-4 md:grid-cols-3" data-tour="dashboard-stats">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de ETPs
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Em Progresso
                </CardTitle>
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
        )}

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
