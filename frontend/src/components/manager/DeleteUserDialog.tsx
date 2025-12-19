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

interface DeleteUserDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 user: DomainUser | null;
 onConfirm: () => Promise<void>;
 isDeleting: boolean;
}

/**
 * Confirmation dialog for deleting a user.
 * Requires explicit confirmation before deletion.
 *
 * Design: Apple Human Interface Guidelines
 * - Clear destructive action warning
 * - User name highlighted for clarity
 * - Loading state feedback
 *
 * @security Only accessible to users with role: domain_manager
 */
export function DeleteUserDialog({
 open,
 onOpenChange,
 user,
 onConfirm,
 isDeleting,
}: DeleteUserDialogProps) {
 if (!user) return null;

 return (
 <AlertDialog open={open} onOpenChange={onOpenChange}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Delete User</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to delete <strong>{user.name}</strong> (
 {user.email})? This action cannot be undone and will remove all
 their data from the system.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
 <AlertDialogAction
 onClick={onConfirm}
 disabled={isDeleting}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 {isDeleting ? 'Deleting...' : 'Delete User'}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
}
