import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { BookOpen, PlusCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Welcome } from '@/assets/illustrations/Welcome';

const WELCOME_MODAL_STORAGE_KEY = 'etp-express-welcome-dismissed';

interface WelcomeModalProps {
  /**
   * Force the modal to be open regardless of localStorage state.
   * Useful for testing.
   */
  forceOpen?: boolean;
}

/**
 * Welcome modal displayed to first-time users.
 *
 * Features:
 * - Shows brief system explanation
 * - Link to user manual
 * - CTA to create first ETP
 * - Automatically dismissed after first view (persisted in localStorage)
 */
export function WelcomeModal({ forceOpen = false }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    const dismissed = localStorage.getItem(WELCOME_MODAL_STORAGE_KEY);
    if (!dismissed) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  // Always persist dismissal to localStorage when closing (#1327)
  const handleClose = useCallback(() => {
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  const handleCreateETP = useCallback(() => {
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    setIsOpen(false);
    navigate('/etps/new');
  }, [navigate]);

  const handleOpenManual = useCallback(() => {
    localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  // Handle dialog open state changes (ESC key, clicking outside) - always persist
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      localStorage.setItem(WELCOME_MODAL_STORAGE_KEY, 'true');
    }
    setIsOpen(open);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="welcome-description"
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="flex justify-center mb-4">
            <Welcome className="w-32 h-32" />
          </div>
          <DialogTitle className="text-xl">
            Bem-vindo ao ETP Express!
          </DialogTitle>
          <DialogDescription id="welcome-description" className="text-base">
            Elabore Estudos Técnicos Preliminares em conformidade com a Lei
            14.133/2021.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex flex-col gap-3">
            <Button onClick={handleCreateETP} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar meu primeiro ETP
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenManual}
              className="w-full"
              asChild
            >
              <Link to="/user-manual">
                <BookOpen className="mr-2 h-4 w-4" />
                Ler o manual do usuário
              </Link>
            </Button>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to reset the welcome modal state (for testing or admin purposes)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useResetWelcomeModal() {
  return useCallback(() => {
    localStorage.removeItem(WELCOME_MODAL_STORAGE_KEY);
  }, []);
}

/**
 * Check if the welcome modal has been dismissed
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isWelcomeModalDismissed(): boolean {
  return localStorage.getItem(WELCOME_MODAL_STORAGE_KEY) === 'true';
}
