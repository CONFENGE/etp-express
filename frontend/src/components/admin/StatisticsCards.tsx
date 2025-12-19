import {
  Building2,
  CheckCircle,
  Users,
  UserCheck,
  LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      label: 'Total Domains',
      value: statistics?.totalDomains ?? 0,
      icon: Building2,
      description: 'Registered domains',
    },
    {
      label: 'Active Domains',
      value: statistics?.activeDomains ?? 0,
      icon: CheckCircle,
      description: 'Currently active',
    },
    {
      label: 'Total Users',
      value: statistics?.totalUsers ?? 0,
      icon: Users,
      description: 'Registered users',
    },
    {
      label: 'Active Users',
      value: statistics?.activeUsers ?? 0,
      icon: UserCheck,
      description: 'Active this month',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
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
        </Card>
      ))}
    </div>
  );
}
