import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { PlusCircle, TrendingUp, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useETPs } from '@/hooks/useETPs';
import { useAuth } from '@/hooks/useAuth';
import { useSuccessRate } from '@/hooks/useSuccessRate';
import { useAvgCompletionTime } from '@/hooks/useAvgCompletionTime';
import { useStatusDistribution } from '@/hooks/useStatusDistribution';
import {
  SkeletonRecentItems,
  SkeletonStats,
} from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { WelcomeModal } from '@/components/common/WelcomeModal';
import { OnboardingChecklist } from '@/components/common/OnboardingChecklist';
import {
  SuccessRateCard,
  AvgCompletionTimeCard,
  StatusDistributionChart,
  PeriodFilter,
} from '@/components/metrics';
import { ETP_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { ComplianceBadge } from '@/components/etp/ComplianceBadge';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Period filter state (#1366)
  const [periodDays, setPeriodDays] = useState(30);

  // Stable callback to prevent re-renders
  const handlePeriodChange = useCallback((days: number) => {
    setPeriodDays(days);
  }, []);

  // useETPs hook auto-fetches when etps.length === 0, no manual fetch needed (#983)
  const { etps, isLoading } = useETPs();

  // Success rate metric (#1363) - now uses periodDays filter (#1366)
  const {
    data: successRateData,
    isLoading: isLoadingSuccessRate,
  } = useSuccessRate({ periodDays, autoFetch: true });

  // Average completion time metric (#1364) - now uses periodDays filter (#1366)
  const {
    data: avgCompletionTimeData,
    isLoading: isLoadingAvgTime,
  } = useAvgCompletionTime({ periodDays, autoFetch: true });

  // Status distribution metric (#1365) - now uses periodDays filter (#1366)
  const {
    data: statusDistributionData,
    isLoading: isLoadingDistribution,
  } = useStatusDistribution({ periodDays, autoFetch: true });

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus Estudos Tecnicos Preliminares
            </p>
          </div>

          <Card className="border-dashed" data-tour="dashboard-empty">
            <CardContent style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
              <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <EmptyState
                  type="welcome"
                  title="Crie seu primeiro ETP"
                  description="Crie Estudos Tecnicos Preliminares estruturados e em conformidade com a Lei 14.133/2021."
                  size="lg"
                />

                <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', maxWidth: '32rem' }}>
                  <Button
                    size="lg"
                    className="w-full text-base"
                    onClick={() => navigate('/etps/new')}
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Criar meu primeiro ETP
                  </Button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.875rem' }} className="text-muted-foreground justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Processo guiado passo a passo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(1, 1fr)' }} className="md:grid-cols-3">
            <Card className="bg-muted/30">
              <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estrutura completa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Todas as secoes exigidas pela legislacao organizadas de forma
                  clara.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sugestoes contextuais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Receba sugestoes para cada secao do seu ETP.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exportacao facil
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
      <WelcomeModal />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus Estudos Tecnicos Preliminares
            </p>
          </div>

          {/* Period Filter (#1366) */}
          <PeriodFilter
            onPeriodChange={handlePeriodChange}
            defaultPeriod={30}
            className="self-start sm:self-auto"
          />
        </div>

        {/* Demo User Blocked Banner (#1446) */}
        {user?.isDemoBlocked && (
          <Alert variant="warning" className="border-yellow-500" data-testid="demo-blocked-banner">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Limite de ETPs atingido</AlertTitle>
            <AlertDescription>
              Seu limite de 3 ETPs foi atingido. Você pode visualizar seus ETPs existentes, mas não criar novos.
            </AlertDescription>
          </Alert>
        )}

        {/* Onboarding Checklist for new users */}
        <OnboardingChecklist
          data-tour="onboarding-checklist"
          hasETPs={stats.total > 0}
        />

        {isLoading ? (
          <SkeletonStats />
        ) : (
          <div
            style={{ display: 'grid', gap: 'var(--space-4)' }}
            className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            data-tour="dashboard-stats"
          >
            <Card>
              <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-2)' }} className="space-y-0">
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
              <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-2)' }} className="space-y-0">
                <CardTitle className="text-sm font-medium">
                  Em Progresso
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">
                  Aguardando conclusao
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-2)' }} className="space-y-0">
                <CardTitle className="text-sm font-medium">
                  Concluidos
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">
                  Prontos para uso
                </p>
              </CardContent>
            </Card>

            {/* Success Rate Card (#1363) */}
            <SuccessRateCard
              data={successRateData}
              isLoading={isLoadingSuccessRate}
            />

            {/* Average Completion Time Card (#1364) */}
            <AvgCompletionTimeCard
              data={avgCompletionTimeData}
              isLoading={isLoadingAvgTime}
            />
          </div>
        )}

        {/* Status Distribution Chart and Recent ETPs row */}
        <div style={{ display: 'grid', gap: 'var(--space-4)' }} className="md:grid-cols-3">
          {/* Status Distribution Chart (#1365) */}
          <StatusDistributionChart
            data={statusDistributionData}
            isLoading={isLoadingDistribution}
            className="md:col-span-1"
          />

          <Card data-tour="recent-etps" className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ETPs Recentes</CardTitle>
                  <CardDescription>Seus estudos mais recentes</CardDescription>
                </div>
                {user?.isDemoBlocked ? (
                  <Button disabled title="Limite de ETPs atingido" data-testid="create-etp-button-disabled">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo ETP
                  </Button>
                ) : (
                  <Button asChild data-testid="create-etp-button">
                    <Link to="/etps/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Novo ETP
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonRecentItems count={5} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {recentETPs.map((etp) => {
                    // Check if ETP was created by another user (#1351)
                    const isOtherUser =
                      etp.createdBy && etp.createdBy.id !== user?.id;

                    return (
                      <Link
                        key={etp.id}
                        to={`/etps/${etp.id}`}
                        className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{etp.title}</h3>
                            {/* Show author name if ETP belongs to another user (#1351) */}
                            {isOtherUser && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Por: {etp.createdBy?.name}
                              </p>
                            )}
                            {etp.description && (
                              <p style={{ marginTop: 'var(--space-1)' }} className="text-sm text-muted-foreground">
                                {etp.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                              <ComplianceBadge
                                etpId={etp.id}
                                size="sm"
                                showScore
                                showTooltip
                              />
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
