import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Globe, Server, Brain, Search } from 'lucide-react';

interface InternationalTransferModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function InternationalTransferModal({
  open,
  onAccept,
  onDecline,
}: InternationalTransferModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleAccept = () => {
    if (confirmed) {
      onAccept();
      setConfirmed(false);
    }
  };

  const handleDecline = () => {
    setConfirmed(false);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <DialogTitle>Transferência Internacional de Dados</DialogTitle>
          </div>
          <DialogDescription>
            Informações sobre o processamento de seus dados em servidores
            internacionais conforme LGPD Art. 33.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm">
            Para fornecer nossos serviços de geração de ETPs com inteligência
            artificial, seus dados são processados nos seguintes provedores:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Server className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Railway (Estados Unidos)</p>
                <p className="text-xs text-muted-foreground">
                  Hospedagem da aplicação e banco de dados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Brain className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">OpenAI (Estados Unidos)</p>
                <p className="text-xs text-muted-foreground">
                  Geração de texto por inteligência artificial
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Search className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  Exa (Estados Unidos)
                </p>
                <p className="text-xs text-muted-foreground">
                  Pesquisa de fundamentação legal e técnica
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>LGPD Art. 33:</strong> A transferência internacional de
              dados pessoais somente é permitida mediante consentimento
              específico do titular, que será informado sobre o caráter
              internacional da operação.
            </p>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="transferConsent"
              checked={confirmed}
              onCheckedChange={(checked: boolean) =>
                setConfirmed(checked === true)
              }
            />
            <Label
              htmlFor="transferConsent"
              className="text-sm leading-relaxed cursor-pointer"
            >
              Li e compreendo que meus dados pessoais serão transferidos para
              servidores localizados nos Estados Unidos para processamento pelos
              provedores listados acima.
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDecline}>
            Não aceito
          </Button>
          <Button onClick={handleAccept} disabled={!confirmed}>
            Aceito a transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
