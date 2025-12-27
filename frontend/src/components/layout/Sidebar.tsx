import { NavLink } from 'react-router';
import { FileText, Home, PlusCircle, FileSearch } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { CREATE_ETP_MODAL_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Meus ETPs', href: '/etps', icon: FileText },
  { name: 'Import & Analysis', href: '/analysis', icon: FileSearch },
];

export function Sidebar() {
  const { sidebarOpen, openModal } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      data-tour="sidebar-nav"
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background overflow-y-auto',
        // Responsive: overlay on mobile
        'lg:translate-x-0',
        'max-lg:shadow-lg',
      )}
    >
      <div className="flex flex-col gap-4 p-4">
        {/* New ETP button with touch target */}
        <Button
          className="w-full min-h-touch"
          data-tour="new-etp-button"
          onClick={() => openModal(CREATE_ETP_MODAL_ID)}
          aria-label="Create new ETP"
        >
          <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo ETP
        </Button>

        <nav aria-label="Primary navigation" className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  // Base styles with touch target
                  'flex items-center gap-3 rounded-lg px-3 min-h-touch text-sm font-medium transition-colors',
                  // Focus visible for keyboard navigation
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span aria-current={isActive ? 'page' : undefined}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Tip section with better contrast */}
        <aside aria-label="Helpful tip" className="mt-auto pt-4 border-t">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="text-sm font-semibold mb-2 text-a11y-primary">
              Dica
            </h3>
            <p className="text-xs text-a11y-secondary">
              Use o botao "Gerar Sugestao" para criar sugestoes de conteudo para
              cada secao.
            </p>
          </div>
        </aside>
      </div>
    </aside>
  );
}
