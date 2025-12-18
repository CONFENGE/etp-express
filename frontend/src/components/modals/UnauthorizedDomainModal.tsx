import { AlertCircle, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnauthorizedDomainModalProps {
  open: boolean;
  onClose: () => void;
  email?: string;
}

export function UnauthorizedDomainModal({
  open,
  onClose,
  email,
}: UnauthorizedDomainModalProps) {
  const emailDomain = email ? email.split('@')[1] : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <DialogTitle>Domínio Não Autorizado</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 text-left">
            <p>
              O domínio de email{' '}
              <span className="font-semibold text-foreground">
                @{emailDomain}
              </span>{' '}
              não está autorizado para registro no sistema.
            </p>
            <p>
              Apenas organizações públicas cadastradas podem utilizar o ETP
              Express.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Deseja cadastrar sua organização?
          </h4>
          <p className="text-sm text-muted-foreground">
            Entre em contato com nossa equipe comercial para habilitar o acesso
            da sua organização:
          </p>
          <a
            href="mailto:contato@confenge.com.br?subject=Solicitação de Cadastro de Organização"
            className="text-sm text-primary underline block"
          >
            contato@confenge.com.br
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
