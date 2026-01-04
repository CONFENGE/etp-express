import { AlertTriangle } from 'lucide-react';
import { WARNING_MESSAGE } from '@/lib/constants';

export function WarningBanner() {
  return (
    <div className="sticky top-0 z-50 w-full bg-yellow-100 dark:bg-yellow-950/30 border-b-2 border-yellow-300 dark:border-yellow-600">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-yellow-900 dark:text-yellow-100">
          <AlertTriangle
            className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-center" role="alert">
            {WARNING_MESSAGE}
          </p>
        </div>
      </div>
    </div>
  );
}
