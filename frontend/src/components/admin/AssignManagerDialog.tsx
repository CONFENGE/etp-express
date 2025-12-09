import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiHelpers } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types/user';

interface AssignManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string;
  currentManagerId?: string;
  onSuccess?: () => void;
}

/**
 * Dialog for assigning a domain manager.
 * Fetches eligible users from the domain and allows selection.
 *
 * @security Only accessible to users with role: system_admin
 */
export function AssignManagerDialog({
  open,
  onOpenChange,
  domainId,
  currentManagerId,
  onSuccess,
}: AssignManagerDialogProps) {
  const { assignManager } = useAdminStore();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentManagerId || '',
  );
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open && domainId) {
      setLoadingUsers(true);
      setSelectedUserId(currentManagerId || '');

      apiHelpers
        .get<User[]>(`/system-admin/domains/${domainId}/users`)
        .then((data) => {
          setUsers(data);
        })
        .catch(() => {
          showError('Failed to load users');
          setUsers([]);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [open, domainId, currentManagerId, showError]);

  const handleAssign = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      await assignManager(domainId, selectedUserId);
      success('Manager assigned successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      showError('Failed to assign manager');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !selectedUserId || loading || loadingUsers;
  const buttonText = loading ? 'Assigning...' : 'Assign Manager';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Domain Manager</DialogTitle>
          <DialogDescription>
            Select a user from this domain to be the manager. The manager can
            manage users within their domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="manager-select"
              className="text-sm font-medium text-foreground"
            >
              Select Manager
            </label>
            {loadingUsers ? (
              <Skeleton className="h-10 w-full" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users found in this domain.
              </p>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loading}
              >
                <SelectTrigger id="manager-select" aria-label="Select a user">
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isDisabled}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
