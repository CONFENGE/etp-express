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
import type { User } from '@/types/user';

interface AssignManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string;
  currentManagerId?: string;
  onAssign: (userId: string) => Promise<void>;
  users: User[];
}

/**
 * Dialog for assigning a domain manager.
 * Receives users from parent component (DomainDetail) to avoid separate API call.
 *
 * @security Only accessible to users with role: system_admin
 */
export function AssignManagerDialog({
  open,
  onOpenChange,
  currentManagerId,
  onAssign,
  users,
}: AssignManagerDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentManagerId || '',
  );
  const [loading, setLoading] = useState(false);

  // Update selectedUserId when currentManagerId changes
  useEffect(() => {
    if (currentManagerId) {
      setSelectedUserId(currentManagerId);
    }
  }, [currentManagerId]);

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
            {users.length === 0 ? (
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
          <Button onClick={handleAssign} disabled={!selectedUserId || loading}>
            {loading ? 'Assigning...' : 'Assign Manager'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
