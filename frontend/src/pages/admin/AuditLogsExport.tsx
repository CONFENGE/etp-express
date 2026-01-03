import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { API_URL } from '@/lib/constants';

/**
 * Audit action types matching backend enum
 */
const AUDIT_ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'user_data_export', label: 'User Data Export' },
  { value: 'account_deletion_soft', label: 'Account Deletion (Soft)' },
  { value: 'account_deletion_hard', label: 'Account Deletion (Hard)' },
  { value: 'account_deletion_cancelled', label: 'Deletion Cancelled' },
  { value: 'password_change', label: 'Password Change' },
  { value: 'password_reset_request', label: 'Password Reset Request' },
  { value: 'profile_view', label: 'Profile View' },
  { value: 'profile_update', label: 'Profile Update' },
  { value: 'data_access', label: 'Data Access' },
  { value: 'tenant_blocked', label: 'Tenant Blocked' },
];

type ExportFormat = 'csv' | 'json';

interface ExportFilters {
  format: ExportFormat;
  startDate: string;
  endDate: string;
  userId: string;
  action: string;
  limit: number;
}

/**
 * Audit Logs Export page.
 * Allows administrators to export audit logs in CSV or JSON format
 * for LGPD compliance reporting (Art. 37).
 *
 * @security Only accessible to users with role: ADMIN
 */
export function AuditLogsExport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    format: 'json',
    startDate: '',
    endDate: '',
    userId: '',
    action: 'all',
    limit: 10000,
  });

  const handleFilterChange = (
    key: keyof ExportFilters,
    value: string | number,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const buildExportUrl = (): string => {
    const params = new URLSearchParams();
    params.set('format', filters.format);

    if (filters.startDate) {
      params.set('startDate', new Date(filters.startDate).toISOString());
    }
    if (filters.endDate) {
      params.set('endDate', new Date(filters.endDate).toISOString());
    }
    if (filters.userId) {
      params.set('userId', filters.userId);
    }
    if (filters.action && filters.action !== 'all') {
      params.set('action', filters.action);
    }
    if (filters.limit) {
      params.set('limit', String(filters.limit));
    }

    return `${API_URL}/audit/export?${params.toString()}`;
  };

  const handleExport = async () => {
    setLoading(true);

    try {
      const url = buildExportUrl();

      // Use fetch with credentials to include the auth cookie
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin role required.');
        }
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `audit-logs.${filters.format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Export successful',
        description: `Audit logs exported as ${filename}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export audit logs';
      toast({
        title: 'Export failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Set default date range (last 30 days)
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div data-testid="audit-export-header">
          <h1
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            data-testid="audit-export-title"
          >
            Export Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Download audit logs for LGPD compliance reporting (Art. 37)
          </p>
        </div>

        {/* Export Card */}
        <Card
          className="shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          data-testid="export-options-card"
        >
          <CardHeader>
            <CardTitle data-testid="export-options-title">
              Export Options
            </CardTitle>
            <CardDescription>
              Configure filters and format for your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select
                  value={filters.format}
                  onValueChange={(value) =>
                    handleFilterChange('format', value as ExportFormat)
                  }
                >
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        JSON
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action Type</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => handleFilterChange('action', value)}
                >
                  <SelectTrigger id="action">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || getDefaultStartDate()}
                  onChange={(e) =>
                    handleFilterChange('startDate', e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || getDefaultEndDate()}
                  onChange={(e) =>
                    handleFilterChange('endDate', e.target.value)
                  }
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (optional)</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="UUID of specific user"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Max Records</Label>
                <Input
                  id="limit"
                  type="number"
                  min={1}
                  max={50000}
                  value={filters.limit}
                  onChange={(e) =>
                    handleFilterChange('limit', parseInt(e.target.value, 10))
                  }
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleExport}
                disabled={loading}
                className="min-w-[160px]"
                data-testid="export-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {filters.format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card
          className="border-blue-200 bg-blue-50/50"
          data-testid="lgpd-info-card"
        >
          <CardContent className="pt-6">
            <h3
              className="font-medium text-blue-900"
              data-testid="lgpd-info-title"
            >
              About LGPD Compliance Exports
            </h3>
            <p className="mt-2 text-sm text-blue-800">
              This export tool helps you comply with LGPD Article 37, which
              requires maintaining records of personal data processing
              operations. The exported logs include user actions, data access
              events, and authentication activities.
            </p>
            <ul className="mt-3 list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>CSV format is ideal for spreadsheet analysis</li>
              <li>
                JSON format preserves all metadata and is machine-readable
              </li>
              <li>Exports are limited to 50,000 records per request</li>
              <li>Date filters are recommended for large datasets</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
