import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, ArrowRight } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';

/**
 * System Admin Dashboard page.
 * Displays global platform statistics and quick actions.
 *
 * @security Only accessible to users with role: system_admin
 */
export function AdminDashboard() {
  const { statistics, loading, fetchStatistics } = useAdminStore();

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            System Admin
          </h1>
          <p className="mt-2 text-gray-600">
            Manage domains and users across the platform
          </p>
        </div>

        {/* Statistics Cards - Placeholder */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Domains"
            value={loading ? '-' : String(statistics?.totalDomains ?? 0)}
            icon={Building2}
          />
          <StatCard
            title="Active Domains"
            value={loading ? '-' : String(statistics?.activeDomains ?? 0)}
            icon={Building2}
          />
          <StatCard
            title="Total Users"
            value={loading ? '-' : String(statistics?.totalUsers ?? 0)}
            icon={Users}
          />
          <StatCard
            title="Active Users"
            value={loading ? '-' : String(statistics?.activeUsers ?? 0)}
            icon={Users}
          />
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <Link
            to="/admin/domains"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage Domains
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
