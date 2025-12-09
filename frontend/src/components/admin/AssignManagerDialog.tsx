import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiHelpers } from '@/lib/api';
import type { User } from '@/types/user';

interface AssignManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string;
  currentManagerId?: string;
  onAssign: (userId: string) => Promise<void>;
}

/**
 * Dialog for assigning a domain manager.
 * Fetches users from the domain and allows selection of a manager.
 *
 * @security Only accessible to users with role: system_admin
 */
export function AssignManagerDialog({
  open,
  onOpenChange,
  domainId,
  currentManagerId,
  onAssign,
}: AssignManagerDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentManagerId || '',
  );
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && domainId) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        setError(null);
        try {
          const response = await apiHelpers.get<User[]>(
            `/system-admin/domains/${domainId}/users`,
          );
          setUsers(response);
          // Pre-select current manager if exists
          if (currentManagerId) {
            setSelectedUserId(currentManagerId);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch users',
          );
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [open, domainId, currentManagerId]);

  const handleAssign = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      await onAssign(selectedUserId);
      onOpenChange(false);
    } catch {
      // Error handling is done by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedUserId(currentManagerId || '');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Domain Manager</DialogTitle>
          <DialogDescription>
            Select a user to manage this domain. The manager will have
            permissions to manage users within this domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manager-select">Manager</Label>
            {loadingUsers ? (
              <Skeleton className="h-10 w-full" />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users available in this domain
              </p>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loading}
              >
                <SelectTrigger id="manager-select">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || loading || loadingUsers}
          >
            {loading ? 'Assigning...' : 'Assign Manager'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
