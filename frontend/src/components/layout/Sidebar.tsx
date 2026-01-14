import { NavLink } from 'react-router';
import {
  FileText,
  Home,
  PlusCircle,
  FileSearch,
  Shield,
  Users,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/user';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Meus ETPs', href: '/etps', icon: FileText },
  { name: 'Import & Analysis', href: '/analysis', icon: FileSearch },
  {
    name: 'Administração',
    href: '/admin',
    icon: Shield,
    roles: ['system_admin'],
  },
  {
    name: 'Gerenciamento',
    href: '/manager',
    icon: Users,
    roles: ['domain_manager'],
  },
];

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const user = useAuthStore((state) => state.user);

  if (!sidebarOpen) return null;

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    // If no roles specified, show to everyone
    if (!item.roles) return true;
    // If user not loaded yet, hide role-restricted items
    if (!user) return false;
    // Show if user has one of the required roles
    return item.roles.includes(user.role);
  });

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      data-tour="sidebar-nav"
      className={cn(
        // Liquid Glass effect - mais intenso para sidebar
        'bg-white/80 dark:bg-zinc-900/80',
        'backdrop-blur-xl backdrop-saturate-200',
        // Border sutil do lado direito
        'border-r border-white/20 dark:border-white/10',
        // Fixed positioning
        'fixed left-0 top-16 z-[var(--z-fixed,300)] h-[calc(100vh-4rem)] w-64 overflow-y-auto',
        // Responsive: overlay on mobile
        'lg:translate-x-0',
        'max-lg:shadow-lg',
      )}
      style={{
        paddingLeft: 'var(--safe-area-left)',
        paddingBottom: 'var(--safe-area-bottom)',
      }}
    >
      <div
        className="flex flex-col"
        style={{
          gap: 'var(--space-4)',
          padding: 'var(--space-4)',
        }}
      >
        {/* New ETP button with touch target */}
        <Button
          asChild
          className="w-full min-h-touch"
          data-tour="new-etp-button"
        >
          <NavLink to="/etps/new" aria-label="Create new ETP">
            <PlusCircle
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginRight: 'var(--space-2)' }}
            />
            Novo ETP
          </NavLink>
        </Button>

        <nav
          aria-label="Primary navigation"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  // Base styles with touch target
                  'flex items-center rounded-lg min-h-touch text-sm font-medium transition-colors',
                  // Focus visible for keyboard navigation
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
              style={{
                gap: 'var(--space-2)',
                paddingLeft: 'var(--space-3)',
                paddingRight: 'var(--space-3)',
              }}
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
        <aside
          aria-label="Helpful tip"
          className="mt-auto border-t"
          style={{
            paddingTop: 'var(--space-4)',
          }}
        >
          <div
            className="rounded-lg bg-muted"
            style={{ padding: 'var(--space-4)' }}
          >
            <h3
              className="text-sm font-semibold text-a11y-primary"
              style={{ marginBottom: 'var(--space-2)' }}
            >
              Dica
            </h3>
            <p className="text-xs text-a11y-secondary">
              Use o botão "Gerar Sugestão" para criar sugestões de conteúdo para
              cada seção.
            </p>
          </div>
        </aside>
      </div>
    </aside>
  );
}
