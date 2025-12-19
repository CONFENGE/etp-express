import { Link } from 'react-router-dom';
import { Shield, FileText, Mail } from 'lucide-react';

export function Footer() {
 const currentYear = new Date().getFullYear();

 return (
 <footer className="border-t border-border bg-background mt-auto">
 <div className="container mx-auto px-4 py-6">
 <div className="flex flex-col md:flex-row items-center justify-between gap-4">
 {/* Copyright */}
 <div className="text-sm text-muted-foreground">
 © {currentYear} ETP Express. Todos os direitos reservados.
 </div>

 {/* Links */}
 <div className="flex items-center gap-6 flex-wrap justify-center">
 <a
 href="mailto:suporte@confenge.com.br?subject=Suporte%20ETP%20Express"
 className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
 aria-label="Enviar email para suporte"
 >
 <Mail className="h-4 w-4" />
 <span>Suporte</span>
 </a>
 <Link
 to="/privacy"
 className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
 >
 <Shield className="h-4 w-4" />
 <span>Política de Privacidade</span>
 </Link>
 <Link
 to="/terms"
 className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
 >
 <FileText className="h-4 w-4" />
 <span>Termos de Uso</span>
 </Link>
 </div>

 {/* LGPD Compliance */}
 <div className="text-xs text-muted-foreground">
 Conforme LGPD (Lei 13.709/2018)
 </div>
 </div>
 </div>
 </footer>
 );
}
