import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCog, Users, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/useToast';
import type { AuthorizedDomain } from '@/store/adminStore';
import type { User } from '@/types/user';

/**
 * Info row component for displaying key-value pairs.
 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

/**
 * User list component for displaying domain users.
 */
function UserList({ users, maxUsers }: { users: User[]; maxUsers: number }) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No users in this domain yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-3">
        {users.length} of {maxUsers} users
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
            <Badge
              variant={user.role === 'domain_manager' ? 'default' : 'secondary'}
            >
              {user.role === 'domain_manager' ? 'Manager' : user.role}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for DomainDetail page.
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
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 mb-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Not found component for invalid domain.
 */
function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <CardTitle>Domain Not Found</CardTitle>
            <CardDescription>
              The domain you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/admin/domains')}>
              Back to Domains
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Domain Detail page for System Admin.
 * Displays domain information, users list, and manager assignment.
 *
 * Design: Apple Human Interface Guidelines
 * - Generous spacing
 * - Clean cards with subtle shadows
 * - Clear visual hierarchy
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const { error: showError } = useToast();
  const [domain, setDomain] = useState<AuthorizedDomain | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [domainResponse, usersResponse] = await Promise.all([
        apiHelpers.get<AuthorizedDomain>(`/system-admin/domains/${id}`),
        apiHelpers.get<User[]>(`/system-admin/domains/${id}/users`),
      ]);

      setDomain(domainResponse);
      setUsers(usersResponse);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch domain details';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignSuccess = () => {
    fetchData();
  };

  if (loading) {
    return <DomainDetailSkeleton />;
  }

  if (error || !domain) {
    return <NotFound />;
  }

  const manager = users.find((u) => u.id === domain.managerId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/domains" aria-label="Back to domains">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {domain.domain}
                </h1>
                <Badge variant={domain.isActive ? 'success' : 'secondary'}>
                  {domain.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Domain details and user management
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Domain Info Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Domain Information</CardTitle>
              </div>
              <CardDescription>
                Configuration and capacity details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <dl>
                <InfoRow label="Domain" value={domain.domain} />
                <InfoRow
                  label="Max Users"
                  value={domain.maxUsers.toLocaleString()}
                />
                <InfoRow
                  label="Current Users"
                  value={`${users.length} / ${domain.maxUsers}`}
                />
                <InfoRow
                  label="Status"
                  value={
                    <Badge
                      variant={domain.isActive ? 'success' : 'secondary'}
                      className="ml-auto"
                    >
                      {domain.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Manager"
                  value={
                    manager ? (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-primary" />
                        {manager.name}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">
                        Not assigned
                      </span>
                    )
                  }
                />
              </dl>

              <div className="pt-4">
                <Button
                  onClick={() => setAssignDialogOpen(true)}
                  className="w-full"
                  variant={domain.managerId ? 'outline' : 'default'}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  {domain.managerId ? 'Change Manager' : 'Assign Manager'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Card */}
          <Card className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Domain Users</CardTitle>
              </div>
              <CardDescription>
                Users registered with this domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserList users={users} maxUsers={domain.maxUsers} />
            </CardContent>
          </Card>
        </div>

        {/* Assign Manager Dialog */}
        <AssignManagerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          domainId={id!}
          currentManagerId={domain.managerId}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </div>
  );
}
