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
          <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja redefinir a senha de{' '}
            <strong>{user.name}</strong> ({user.email})? Ele receberá um e-mail
            com uma senha temporária e será obrigado a alterá-la no próximo
            login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isResetting}>
            {isResetting ? 'Redefinindo...' : 'Redefinir Senha'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
