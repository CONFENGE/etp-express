import { AlertTriangle } from 'lucide-react';
import { WARNING_MESSAGE } from '@/lib/constants';

export function WarningBanner() {
 return (
 <div className="sticky top-0 z-50 w-full bg-yellow-100 border-b-2 border-yellow-300">
 <div className="container mx-auto px-4 py-3">
 <div className="flex items-center justify-center gap-3 text-yellow-900">
 <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
 <p className="text-sm font-medium text-center" role="alert">
 {WARNING_MESSAGE}
 </p>
 </div>
 </div>
 </div>
 );
}
