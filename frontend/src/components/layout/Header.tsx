import { useNavigate } from 'react-router';
import { FileText, HelpCircle, LogOut, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { APP_NAME } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import { useTour } from '@/hooks/useTour';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { handleRestart: restartTour } = useTour();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-[var(--z-sticky,200)] w-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-lg backdrop-saturate-180 border-b border-white/15 dark:border-white/8"
      style={{
        paddingTop: 'var(--safe-area-top)',
        paddingLeft: 'var(--safe-area-left)',
        paddingRight: 'var(--safe-area-right)',
      }}
    >
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Menu button with touch target size */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={false}
            className="min-w-touch min-h-touch"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Logo/Home button with touch target */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity min-h-touch px-2 rounded-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2"
            aria-label={`${APP_NAME} - Go to home`}
          >
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="hidden xs:inline">{APP_NAME}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ConnectionStatus variant="inline" />
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative min-w-touch min-h-touch rounded-full p-0"
                  aria-label={`User menu for ${user.name}`}
                  aria-haspopup="menu"
                  data-testid="user-menu-trigger"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {getInitials(user.name)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {user.organization && (
                      <p className="text-xs leading-none text-muted-foreground font-semibold mt-1">
                        {user.organization.name}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard')}
                  className="min-h-touch cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigate('/dashboard');
                    setTimeout(restartTour, 500);
                  }}
                  className="min-h-touch cursor-pointer"
                >
                  <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>Reiniciar Tour</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="min-h-touch cursor-pointer"
                  data-testid="logout-button"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
