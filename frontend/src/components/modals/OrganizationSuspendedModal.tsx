import { Ban, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OrganizationSuspendedModalProps {
  open: boolean;
  onClose: () => void;
  organizationName?: string;
}

export function OrganizationSuspendedModal({
  open,
  onClose,
  organizationName,
}: OrganizationSuspendedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Ban className="h-6 w-6 text-destructive" />
            <DialogTitle>Organização Suspensa</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 text-left">
            <p>
              A organização{' '}
              {organizationName && (
                <span className="font-semibold text-foreground">
                  {organizationName}
                </span>
              )}{' '}
              está temporariamente suspensa e não pode realizar novos acessos ao
              sistema.
            </p>
            <p>
              Esta suspensão pode ter sido aplicada por questões
              administrativas, contratuais ou de segurança.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Precisa de ajuda?
          </h4>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o suporte para mais informações sobre a
            suspensão:
          </p>
          <a
            href="mailto:suporte@etpexpress.com.br?subject=Organização Suspensa - Solicitação de Esclarecimento"
            className="text-sm text-primary hover:underline block"
          >
            suporte@etpexpress.com.br
          </a>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="default" className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
