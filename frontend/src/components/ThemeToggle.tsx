import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

/**
 * Theme toggle component with dropdown menu.
 *
 * Features:
 * - Displays current theme icon in trigger button
 * - Dropdown with light, dark, and system options
 * - Apple HIG design with smooth transitions
 * - Accessible with keyboard navigation
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Get the icon for the trigger button based on resolved theme
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            // WCAG 2.5.5: 44x44px minimum touch target (handled by size="icon")
            'transition-all duration-apple ease-apple',
            'hover:bg-surface-secondary',
            'focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
          )}
          aria-label={`Tema atual: ${resolvedTheme === 'dark' ? 'escuro' : 'claro'}. Clique para alterar.`}
        >
          <CurrentIcon
            className={cn(
              'h-5 w-5',
              'transition-transform duration-apple ease-apple',
              'text-text-apple-secondary',
            )}
          />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          'min-w-[140px]',
          'bg-surface-primary',
          'border border-[var(--border-primary)]',
          'shadow-apple-lg',
          'rounded-apple',
        )}
      >
        {themeOptions.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              'cursor-pointer',
              'transition-colors duration-apple ease-apple',
              'hover:bg-surface-secondary',
              'focus:bg-surface-secondary',
              'rounded-apple',
              theme === value && 'bg-apple-accent-light text-apple-accent',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                theme === value
                  ? 'text-apple-accent'
                  : 'text-text-apple-secondary',
              )}
            />
            <span
              className={cn(
                'text-sm',
                theme === value
                  ? 'font-medium text-apple-accent'
                  : 'text-text-apple-primary',
              )}
            >
              {label}
            </span>
            {theme === value && (
              <span className="ml-auto text-apple-accent" aria-hidden="true">
                ✓
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
