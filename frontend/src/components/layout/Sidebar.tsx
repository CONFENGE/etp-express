import { NavLink } from 'react-router-dom';
import { FileText, Home, PlusCircle } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Meus ETPs', href: '/etps', icon: FileText },
];

export function Sidebar() {
  const { sidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 border-r bg-background overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        <Button asChild className="w-full">
          <NavLink to="/etps/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo ETP
          </NavLink>
        </Button>

        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="text-sm font-semibold mb-2">Dica</h3>
            <p className="text-xs text-muted-foreground">
              Use o botão "Gerar com IA" para acelerar a criação das seções do
              ETP.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
