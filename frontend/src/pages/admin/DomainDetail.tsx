import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import type { AuthorizedDomain } from '@/store/adminStore';

/**
 * Domain Detail page placeholder.
 * Will be fully implemented in sub-issue #526.
 *
 * @security Only accessible to users with role: system_admin
 */
export function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<AuthorizedDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDomain = async () => {
      if (!id) return;

      try {
        const response = await apiHelpers.get<AuthorizedDomain>(
          `/system-admin/domains/${id}`,
        );
        setDomain(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch domain');
      } finally {
        setLoading(false);
      }
    };

    fetchDomain();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading domain...</p>
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-700">{error || 'Domain not found'}</p>
            <button
              type="button"
              onClick={() => navigate('/admin/domains')}
              className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Back to domains
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/admin/domains"
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Back to domains"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {domain.domain}
            </h1>
            <p className="mt-1 text-gray-600">Domain details and management</p>
          </div>
        </div>

        {/* Domain Info Card - Placeholder */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Domain Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Domain</dt>
                <dd className="text-gray-900">{domain.domain}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Max Users</dt>
                <dd className="text-gray-900">{domain.maxUsers}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      domain.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {domain.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Manager</dt>
                <dd className="text-gray-900">
                  {domain.managerName || 'Not assigned'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Domain Users
            </h2>
            <p className="text-gray-500">
              User list will be implemented in #526
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
