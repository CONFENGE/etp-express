import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';

/**
 * Domain Management page placeholder.
 * Will be fully implemented in sub-issue #525.
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainManagement() {
  const { domains, loading, fetchDomains } = useAdminStore();

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Domains
              </h1>
              <p className="mt-1 text-gray-600">
                Manage authorized institutional domains
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Domain
          </button>
        </div>

        {/* Domain List Placeholder */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            {loading ? (
              <p className="text-center text-gray-500">Loading domains...</p>
            ) : domains.length === 0 ? (
              <p className="text-center text-gray-500">No domains found</p>
            ) : (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {domain.domain}
                      </p>
                      <p className="text-sm text-gray-500">
                        Max users: {domain.maxUsers}
                      </p>
                    </div>
                    <Link
                      to={`/admin/domains/${domain.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
