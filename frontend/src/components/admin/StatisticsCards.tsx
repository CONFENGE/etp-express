import {
  Building2,
  CheckCircle,
  Users,
  FileText,
  LucideIcon,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalStatistics } from '@/store/adminStore';

interface StatCardData {
  label: string;
  value: number;
  icon: LucideIcon;
  description: string;
}

interface StatisticsCardsProps {
  statistics: GlobalStatistics | null;
  loading: boolean;
}

/**
 * Statistics cards grid for System Admin dashboard.
 * Displays 4 key metrics with Apple HIG styling.
 *
 * @security Only renders data passed from parent.
 * Parent component is responsible for auth checks.
 */
export function StatisticsCards({ statistics, loading }: StatisticsCardsProps) {
  const cards: StatCardData[] = [
    {
      label: 'Total de Dominios',
      value: statistics?.totalDomains ?? 0,
      icon: Building2,
      description: 'Dominios registrados',
    },
    {
      label: 'Dominios Ativos',
      value: statistics?.activeDomains ?? 0,
      icon: CheckCircle,
      description: 'Atualmente ativos',
    },
    {
      label: 'Total de Usuarios',
      value: statistics?.totalUsers ?? 0,
      icon: Users,
      description: 'Usuarios ativos',
    },
    {
      label: 'Total de ETPs',
      value: statistics?.totalEtps ?? 0,
      icon: FileText,
      description: 'Documentos criados',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <GlassSurface
          key={card.label}
          intensity="medium"
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </>
            )}
          </CardContent>
        </GlassSurface>
      ))}
    </div>
  );
}
