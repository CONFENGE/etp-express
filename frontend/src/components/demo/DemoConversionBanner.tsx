import { useState, useCallback } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoConversionBannerProps {
  /** Callback when user closes the banner */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CTA banner for demo users to convert to paying customers.
 *
 * Displays a non-intrusive floating banner in the bottom-right corner
 * with a WhatsApp contact link. Follows Apple Human Interface Guidelines
 * for subtle, professional design.
 *
 * @example
 * ```tsx
 * <DemoConversionBanner onClose={() => setShowBanner(false)} />
 * ```
 */
export function DemoConversionBanner({
  onClose,
  className,
}: DemoConversionBannerProps) {
  const [isClosing, setIsClosing] = useState(false);

  const whatsappUrl =
    'https://wa.me/5548988344559?text=Ol%C3%A1!%20Testei%20o%20ETP%20Express%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20contrata%C3%A7%C3%A3o.';

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-sm',
        'bg-white rounded-xl p-4 border border-gray-100',
        'shadow-lg shadow-gray-200/50',
        'transition-all duration-200 ease-out',
        isClosing
          ? 'opacity-0 translate-y-2'
          : 'opacity-100 translate-y-0 animate-in slide-in-from-bottom-4',
        className,
      )}
      role="complementary"
      aria-label="Convite para contratação"
    >
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        aria-label="Fechar banner"
      >
        <X size={16} />
      </button>

      <h3 className="font-semibold text-gray-900 mb-1 pr-6">
        Gostou do ETP Express?
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        Contrate agora e transforme sua gestão de licitações.
      </p>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-center justify-center gap-2',
          'bg-green-500 hover:bg-green-600',
          'text-white px-4 py-2 rounded-lg',
          'font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
        )}
      >
        <MessageCircle size={18} aria-hidden="true" />
        Fale com Tiago Sasaki
      </a>
      <p className="text-xs text-gray-500 mt-2 text-center">
        WhatsApp: (48) 9 8834-4559
      </p>
    </div>
  );
}
