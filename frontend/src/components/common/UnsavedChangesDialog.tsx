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

interface UnsavedChangesDialogProps {
 /**
 * Whether the dialog is open
 */
 open: boolean;
 /**
 * Called when user confirms leaving without saving
 */
 onConfirm: () => void;
 /**
 * Called when user cancels and wants to stay
 */
 onCancel: () => void;
 /**
 * Custom title for the dialog
 */
 title?: string;
 /**
 * Custom description for the dialog
 */
 description?: string;
 /**
 * Custom text for the confirm button
 */
 confirmText?: string;
 /**
 * Custom text for the cancel button
 */
 cancelText?: string;
}

/**
 * Dialog component to warn users about unsaved changes.
 *
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 * open={isBlocking}
 * onConfirm={proceed}
 * onCancel={reset}
 * />
 * ```
 */
export function UnsavedChangesDialog({
 open,
 onConfirm,
 onCancel,
 title = 'Alterações não salvas',
 description = 'Você tem alterações que não foram salvas. Se sair agora, perderá essas alterações.',
 confirmText = 'Sair sem salvar',
 cancelText = 'Continuar editando',
}: UnsavedChangesDialogProps) {
 return (
 <AlertDialog open={open}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{title}</AlertDialogTitle>
 <AlertDialogDescription>{description}</AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
 <AlertDialogAction onClick={onConfirm}>
 {confirmText}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
}
