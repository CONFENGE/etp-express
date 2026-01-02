import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Users, Settings, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignManagerDialog } from '@/components/admin/AssignManagerDialog';
import { apiHelpers } from '@/lib/api';
import { useAdminStore, type AuthorizedDomain } from '@/store/adminStore';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types/user';

/**
 * Skeleton component for DomainDetail page loading state.
 */
function DomainDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Row component for displaying domain information.
 */
function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/**
 * Component for displaying the list of users in a domain.
 */
function UserList({ users, loading }: { users: User[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No users registered in this domain yet
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
            {user.role.replace('_', ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Domain Detail page for System Admin.
 * Displays domain information and user list with manager assignment functionality.
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing
 * - Apple-style shadows
 * - Minimal, focused UI
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignManager } = useAdminStore();
  const { success, error: showError } = useToast();

  const [domain, setDomain] = useState<AuthorizedDomain | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      setLoadingUsers(true);
      setError(null);

      try {
        const [domainResponse, usersResponse] = await Promise.all([
          apiHelpers.get<AuthorizedDomain>(`/system-admin/domains/${id}`),
          apiHelpers.get<User[]>(`/system-admin/domains/${id}/users`),
        ]);

        setDomain(domainResponse);
        setUsers(usersResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch domain');
      } finally {
        setLoading(false);
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAssignManager = async (userId: string) => {
    if (!id) return;

    try {
      await assignManager(id, userId);
      // Refresh domain data to get updated manager info
      const updatedDomain = await apiHelpers.get<AuthorizedDomain>(
        `/system-admin/domains/${id}`,
      );
      setDomain(updatedDomain);
      success('Manager assigned successfully');
    } catch {
      showError('Failed to assign manager');
      throw new Error('Failed to assign manager');
    }
  };

  if (loading) {
    return <DomainDetailSkeleton />;
  }

  if (error || !domain) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive">{error || 'Domain not found'}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/admin/domains')}
              >
                Back to domains
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Administração', href: '/admin' },
            { label: 'Domínios', href: '/admin/domains' },
            { label: domain.domain },
          ]}
        />

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {domain.domain}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Domain details and users
            </p>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Domain Information */}
          <Card data-testid="domain-info-card">
            <CardHeader>
              <CardTitle
                className="flex items-center gap-2"
                data-testid="domain-info-title"
              >
                <Settings className="h-5 w-5" />
                Domain Information
              </CardTitle>
              <CardDescription>
                Configuration and status details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Domain" value={domain.domain} />
              <InfoRow
                label="Max Users"
                value={domain.maxUsers.toLocaleString()}
              />
              <InfoRow
                label="Current Users"
                value={`${users.length} / ${domain.maxUsers}`}
                icon={Users}
              />
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      domain.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {domain.isActive ? 'Active' : 'Inactive'}
                  </span>
                }
              />
              <InfoRow
                label="Manager"
                value={domain.managerName || 'Not assigned'}
                icon={UserCircle}
              />

              <div className="pt-4">
                <Button
                  onClick={() => setAssignDialogOpen(true)}
                  variant="outline"
                  className="w-full"
                  data-testid="assign-manager-button"
                >
                  {domain.managerId ? 'Change Manager' : 'Assign Manager'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card data-testid="domain-users-card">
            <CardHeader>
              <CardTitle
                className="flex items-center gap-2"
                data-testid="domain-users-title"
              >
                <Users className="h-5 w-5" />
                Domain Users
              </CardTitle>
              <CardDescription data-testid="domain-users-count">
                {users.length} of {domain.maxUsers} users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserList users={users} loading={loadingUsers} />
            </CardContent>
          </Card>
        </div>

        {/* Assign Manager Dialog */}
        <AssignManagerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          domainId={id!}
          currentManagerId={domain.managerId}
          onAssign={handleAssignManager}
        />
      </div>
    </div>
  );
}
