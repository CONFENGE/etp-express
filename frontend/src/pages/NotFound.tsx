import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
 const navigate = useNavigate();

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
 <div className="text-center max-w-md">
 {/* 404 Illustration */}
 <div className="mb-8">
 <div className="relative inline-block">
 <span
 className="text-[150px] font-bold text-muted-foreground/20 select-none"
 aria-hidden="true"
 >
 404
 </span>
 <FileQuestion
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 text-primary animate-pulse"
 aria-hidden="true"
 />
 </div>
 </div>

 {/* Message */}
 <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
 <p className="text-muted-foreground mb-8">
 A página que você está procurando não existe ou foi movida. Que tal
 voltar para um lugar seguro?
 </p>

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <Button
 onClick={() => navigate(-1)}
 variant="outline"
 data-testid="back-button"
 >
 <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
 Voltar
 </Button>
 <Button asChild data-testid="home-button">
 <Link to="/">
 <Home className="mr-2 h-4 w-4" aria-hidden="true" />
 Ir para início
 </Link>
 </Button>
 </div>

 {/* Useful links */}
 <div className="mt-8 pt-8 border-t">
 <p className="text-sm text-muted-foreground mb-4">
 Talvez você esteja procurando:
 </p>
 <nav
 className="flex flex-wrap justify-center gap-4 text-sm"
 aria-label="Links úteis"
 >
 <Link
 to="/etps"
 className="text-primary hover:underline transition-colors"
 >
 Meus ETPs
 </Link>
 <Link
 to="/dashboard"
 className="text-primary hover:underline transition-colors"
 >
 Dashboard
 </Link>
 </nav>
 </div>
 </div>
 </div>
 );
}
