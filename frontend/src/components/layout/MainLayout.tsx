import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { WarningBanner } from '@/components/common/WarningBanner';
import { SkipLink } from '@/components/common/SkipLink';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip Link for keyboard navigation - WCAG 2.4.1 */}
      <SkipLink />
      <WarningBanner />
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main
          id="main-content"
          role="main"
          aria-label="Main content"
          className={cn(
            'flex-1 transition-all duration-300 flex flex-col',
            // Responsive margin for sidebar
            sidebarOpen ? 'ml-64 lg:ml-64' : 'ml-0',
            // Mobile: no margin, sidebar overlays
            'max-lg:ml-0',
          )}
        >
          <div className="container mx-auto px-4 py-8 flex-1 sm:px-6 lg:px-8">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
