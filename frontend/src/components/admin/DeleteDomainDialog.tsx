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
import { AuthorizedDomain } from '@/store/adminStore';

interface DeleteDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: AuthorizedDomain | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

/**
 * Confirmation dialog for deleting a domain.
 * Requires explicit confirmation before deletion.
 *
 * @security Only accessible to users with role: system_admin
 */
export function DeleteDomainDialog({
  open,
  onOpenChange,
  domain,
  onConfirm,
  isDeleting,
}: DeleteDomainDialogProps) {
  if (!domain) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Domain</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{domain.domain}</strong>?
            This action cannot be undone and will remove all users associated
            with this domain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Domain'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
