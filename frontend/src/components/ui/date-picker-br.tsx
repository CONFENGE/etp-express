import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export interface DatePickerBRProps {
  value?: string; // ISO format (YYYY-MM-DD) or Brazilian format (DD/MM/YYYY)
  onChange?: (isoDate: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Brazilian Date Picker component that accepts DD/MM/YYYY format.
 *
 * Features:
 * - Accepts both Brazilian (DD/MM/YYYY) and ISO (YYYY-MM-DD) formats
 * - Auto-formats input as user types (adds slashes automatically)
 * - Returns ISO format for form submission
 * - Displays in Brazilian format to users
 * - Native date picker fallback on mobile
 * - WCAG 2.1 AA compliant
 */
export function DatePickerBR({
  value,
  onChange,
  onBlur,
  name,
  id,
  placeholder = 'DD/MM/AAAA',
  disabled = false,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: DatePickerBRProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = React.useState('');
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile for native date picker
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768,
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert ISO to Brazilian format for display
  React.useEffect(() => {
    if (value) {
      // Check if value is already in Brazilian format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        setDisplayValue(value);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // ISO format - convert to Brazilian
        const date = parse(value, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          setDisplayValue(format(date, 'dd/MM/yyyy', { locale: ptBR }));
        }
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Apply mask as user types: auto-add slashes
  const applyMask = (input: string): string => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');

    // Apply mask: DD/MM/YYYY
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  // Parse Brazilian date to ISO format
  const parseToISO = (brDate: string): string | null => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) {
      return null;
    }

    const date = parse(brDate, 'dd/MM/yyyy', new Date());
    if (!isValid(date)) {
      return null;
    }

    return format(date, 'yyyy-MM-dd');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMobile) {
      // Native date picker returns ISO format
      const isoValue = e.target.value;
      onChange?.(isoValue);
      return;
    }

    const maskedValue = applyMask(e.target.value);
    setDisplayValue(maskedValue);

    // Only call onChange when we have a complete valid date
    if (maskedValue.length === 10) {
      const isoDate = parseToISO(maskedValue);
      if (isoDate) {
        onChange?.(isoDate);
      }
    } else if (maskedValue.length === 0) {
      onChange?.('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (
      [8, 46, 9, 27, 13].includes(e.keyCode) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      return;
    }

    // Block non-numeric keys
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const inputClasses = cn(
    // Base styles with Apple HIG tokens
    'flex h-10 min-h-touch w-full rounded-apple border border-[var(--border-primary)] bg-surface-primary px-3 py-2 text-sm text-text-apple-primary',
    // Placeholder with WCAG 2.1 AA compliant color
    'placeholder:text-text-apple-placeholder',
    // Apple-style transition
    'transition-all duration-200 ease-out',
    // Focus state
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2 focus-visible:border-apple-accent',
    'focus-visible:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]',
    // Disabled state
    'disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-apple-tertiary',
    // Hover state
    'hover:border-[var(--border-focus)]',
    // Reduced motion
    'motion-reduce:transition-none',
    // Padding for calendar icon
    !isMobile && 'pr-10',
    className,
  );

  if (isMobile) {
    // Use native date picker on mobile for better UX
    return (
      <input
        ref={inputRef}
        type="date"
        id={id}
        name={name}
        value={value || ''}
        onChange={handleNativeDateChange}
        onBlur={onBlur}
        disabled={disabled}
        className={inputClasses}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={10}
        className={inputClasses}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        autoComplete="off"
      />
      <Calendar
        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-apple-secondary pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
