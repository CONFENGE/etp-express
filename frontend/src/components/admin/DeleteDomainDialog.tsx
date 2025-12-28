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
          <AlertDialogTitle>Excluir Domínio</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{domain.domain}</strong>?
            Esta ação não pode ser desfeita e removerá todos os usuários
            associados a este domínio.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Domínio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
