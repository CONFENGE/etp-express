import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DomainUser } from '@/store/managerStore';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DomainUser | null;
  onConfirm: () => Promise<void>;
  isResetting: boolean;
}

/**
 * Confirmation dialog for resetting a user's password.
 * Password will be reset to a default value and user must change it on next login.
 *
 * Design: Apple Human Interface Guidelines
 * - Clear action description
 * - User name highlighted for clarity
 * - Loading state feedback
 *
 * @security Only accessible to users with role: domain_manager
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isResetting,
}: ResetPasswordDialogProps) {
  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset the password for{' '}
            <strong>{user.name}</strong> ({user.email})? They will receive an
            email with a temporary password and will be required to change it on
            their next login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Reset Password'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
