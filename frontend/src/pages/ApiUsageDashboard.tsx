import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useApiUsage } from '@/hooks/useApiUsage';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Key,
  Copy,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * ApiUsageDashboard - Dashboard for API usage metrics and key management (#1689).
 *
 * Features:
 * - Current plan display (Free/Pro/Enterprise)
 * - Quota usage with progress bar
 * - Request timeline chart (last 30 days)
 * - Top endpoints bar chart
 * - Success/error metrics
 * - API key display and regeneration
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1689 - Criar dashboard de uso da API no frontend
 * - Backend: #1688 - ApiUsage tracking
 */
export function ApiUsageDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data, isLoading, regenerateApiKey, isRegenerating } = useApiUsage();

  const handleCopyApiKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      toast({
        title: 'API Key copiada',
        description: 'A chave foi copiada para a área de transferência.',
      });
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      await regenerateApiKey();
      setShowRegenerateDialog(false);
      toast({
        title: 'API Key regenerada',
        description:
          'Sua nova chave foi gerada. A chave antiga foi invalidada.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao regenerar chave',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      free: 'secondary',
      pro: 'default',
      enterprise: 'outline',
    };
    return (
      <Badge variant={variants[plan] || 'default'} className="text-sm">
        {plan.toUpperCase()}
      </Badge>
    );
  };

  const quotaPercentage = data?.quota
    ? (data.quota.consumedQuota / data.quota.totalQuota) * 100
    : 0;

  return (
    <MainLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-16)',
        }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard de Uso da API
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o consumo da API pública de preços
          </p>
        </div>

        {/* Plan and Quota Section */}
        <div
          style={{ display: 'grid', gap: 'var(--space-4)' }}
          className="md:grid-cols-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Plano Atual</CardTitle>
                {data?.quota && getPlanBadge(user?.apiPlan || 'free')}
              </div>
              <CardDescription>
                Seu plano de acesso à API pública
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-16 animate-pulse bg-muted rounded" />
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {data?.quota?.consumedQuota || 0}
                    </span>
                    <span className="text-muted-foreground">
                      / {data?.quota?.totalQuota || 0} requisições
                    </span>
                  </div>
                  <Progress
                    value={quotaPercentage}
                    className="mt-4"
                    data-testid="quota-progress"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Período: {formatDate(data?.quota?.periodStart || new Date())}{' '}
                    - {formatDate(data?.quota?.periodEnd || new Date())}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
              <CardDescription>
                Chave de autenticação para a API pública
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                    {showApiKey
                      ? user?.apiKey || 'Nenhuma chave gerada'
                      : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyApiKey}
                    title="Copiar chave"
                    disabled={!user?.apiKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={isRegenerating}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Section */}
        <div
          style={{ display: 'grid', gap: 'var(--space-4)' }}
          className="md:grid-cols-4"
        >
          <Card>
            <CardHeader
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-2)',
              }}
              className="space-y-0"
            >
              <CardTitle className="text-sm font-medium">
                Total de Requisições
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.usage?.totalRequests || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Este mês</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-2)',
              }}
              className="space-y-0"
            >
              <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.usage?.successfulRequests || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.usage?.totalRequests
                      ? Math.round(
                          (data.usage.successfulRequests /
                            data.usage.totalRequests) *
                            100,
                        )
                      : 0}
                    % taxa de sucesso
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-2)',
              }}
              className="space-y-0"
            >
              <CardTitle className="text-sm font-medium">Erros</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.usage?.failedRequests || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.usage?.totalRequests
                      ? Math.round(
                          (data.usage.failedRequests /
                            data.usage.totalRequests) *
                            100,
                        )
                      : 0}
                    % taxa de erro
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-2)',
              }}
              className="space-y-0"
            >
              <CardTitle className="text-sm font-medium">
                Tempo Médio
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.usage?.averageResponseTime || 0}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo de resposta
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Endpoints Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoints Mais Utilizados</CardTitle>
            <CardDescription>Top 5 endpoints por número de requisições</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 animate-pulse bg-muted rounded" />
            ) : data?.usage?.topEndpoints?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.usage.topEndpoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Requisições" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="mr-2 h-4 w-4" />
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regenerate API Key Dialog */}
        <AlertDialog
          open={showRegenerateDialog}
          onOpenChange={setShowRegenerateDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerar API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá invalidar sua chave atual. Todas as integrações
                que usam a chave antiga deixarão de funcionar. Esta ação não
                pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRegenerateApiKey}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Regenerar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
