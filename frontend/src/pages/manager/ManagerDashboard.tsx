import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  UserCheck,
  UserX,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotaIndicator } from '@/components/manager/QuotaIndicator';
import { useManagerStore, DomainUser } from '@/store/managerStore';

interface StatCardData {
  label: string;
  value: number;
  icon: LucideIcon;
  description: string;
  color?: string;
}

/**
 * Domain Manager Dashboard page.
 * Displays domain statistics, quota indicator, and recent user activity.
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing (space-y-8)
 * - Apple-style shadows
 * - Inter typography (inherited from globals)
 * - Minimal, focused UI
 * - Color-coded quota indicator
 *
 * @security Only accessible to users with role: domain_manager
 */
export function ManagerDashboard() {
  const { users, quota, loading, fetchUsers, fetchQuota } = useManagerStore();

  useEffect(() => {
    fetchUsers();
    fetchQuota();
  }, [fetchUsers, fetchQuota]);

  // Calculate statistics from users
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;
  const pendingPasswordChange = users.filter(
    (u) => u.mustChangePassword,
  ).length;

  const stats: StatCardData[] = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      description: 'Users in domain',
    },
    {
      label: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      description: 'Currently active',
      color: 'text-green-600',
    },
    {
      label: 'Inactive Users',
      value: inactiveUsers,
      icon: UserX,
      description: 'Deactivated accounts',
      color: 'text-gray-500',
    },
    {
      label: 'Pending Setup',
      value: pendingPasswordChange,
      icon: Clock,
      description: 'Need password change',
      color: 'text-yellow-600',
    },
  ];

  // Get recent users (last 5 by creation date)
  const recentUsers = [...users]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Domain Manager
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Manage users within your domain
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/manager/users">
              Manage Users
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Quota and Stats Row */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Quota Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">User Quota</CardTitle>
              <CardDescription>Domain capacity usage</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <QuotaIndicator quota={quota} loading={loading} size="lg" />
            </CardContent>
          </Card>

          {/* Statistics Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon
                    className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`}
                  />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className={`text-2xl font-bold ${stat.color || ''}`}>
                        {stat.value}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Users Card */}
        <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Last 5 registered users</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/manager/users">
                View all
                <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <RecentUsersSkeleton />
            ) : recentUsers.length === 0 ? (
              <EmptyUsersState />
            ) : (
              <RecentUsersList users={recentUsers} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for recent users list.
 */
function RecentUsersSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading users">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no users exist.
 */
function EmptyUsersState() {
  return (
    <div className="py-8 text-center">
      <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-muted-foreground">No users in your domain yet</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link to="/manager/users">Add your first user</Link>
      </Button>
    </div>
  );
}

interface RecentUsersListProps {
  users: DomainUser[];
}

/**
 * List of recent users with status badges.
 */
function RecentUsersList({ users }: RecentUsersListProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-1">
      {users.map((user) => (
        <Link
          key={user.id}
          to="/manager/users"
          className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
                user.isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {getInitials(user.name)}
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">
                {user.email}
                {user.cargo && ` · ${user.cargo}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(user.createdAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
