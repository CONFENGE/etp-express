import { useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatisticsCards } from '@/components/admin/StatisticsCards';
import { ProductivityRanking } from '@/components/admin/ProductivityRanking';
import { useAdminStore } from '@/store/adminStore';

/**
 * System Admin Dashboard page.
 * Displays global platform statistics and quick actions.
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing (space-y-8)
 * - Apple-style shadows
 * - Inter typography (inherited from globals)
 * - Minimal, focused UI
 *
 * @security Only accessible to users with role: system_admin
 */
export function AdminDashboard() {
  const {
    statistics,
    loading,
    fetchStatistics,
    fetchDomains,
    domains,
    demoUsers,
    fetchDemoUsers,
  } = useAdminStore();

  useEffect(() => {
    fetchStatistics();
    fetchDomains();
    fetchDemoUsers();
  }, [fetchStatistics, fetchDomains, fetchDemoUsers]);

  const recentDomains = domains.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Administração do Sistema
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gerencie domínios e usuários da plataforma
          </p>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards statistics={statistics} loading={loading} />

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="mr-2 h-5 w-5" />
                Gerenciar Domínios
              </CardTitle>
              <CardDescription>
                Controle domínios institucionais autorizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/domains">
                  Acessar Gestão de Domínios
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Usuários Demo
              </CardTitle>
              <CardDescription>
                Gerenciar contas de teste com limite de ETPs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Total: {demoUsers.length} conta(s) demo
                </div>
                <Button asChild className="w-full">
                  <Link to="/admin/demo-users">
                    Gerenciar Usuários Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Domains Preview */}
        <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Dominios Recentes</CardTitle>
              <CardDescription>Ultimos 5 dominios registrados</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/domains">
                Ver todos
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : recentDomains.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum dominio registrado ainda
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/admin/domains">Adicionar primeiro dominio</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentDomains.map((domain) => (
                  <Link
                    key={domain.id}
                    to={`/admin/domains/${domain.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{domain.domain}</p>
                      <p className="text-sm text-muted-foreground">
                        {domain.currentUsers ?? 0} / {domain.maxUsers} usuarios
                        {domain.managerName &&
                          ` \u00B7 Gestor: ${domain.managerName}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        domain.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {domain.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productivity Ranking (#1367) */}
        <ProductivityRanking />
      </div>
    </div>
  );
}
