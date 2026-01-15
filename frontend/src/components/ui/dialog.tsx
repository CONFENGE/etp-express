import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog component with Liquid Glass effect (Apple HIG 2025).
 *
 * Features:
 * - Liquid Glass: translucent background with backdrop-blur-xl
 * - Saturated colors (backdrop-saturate-200)
 * - Soft borders (border-white/20)
 * - Deep shadows (shadow-2xl)
 * - Rounded corners (rounded-3xl - Apple concentricity)
 * - Smooth scale + opacity animation with Apple easing
 * - Apple HIG spacing tokens: --space-6 (mobile) / --space-8 (desktop)
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Liquid Glass: backdrop with blur sutil
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
      // Animation with Apple HIG tokens
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    style={{
      transitionProperty: 'opacity',
      transitionDuration: 'var(--duration-normal)',
      transitionTimingFunction: 'var(--ease-apple-standard)',
    }}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Position and layout
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
        // Liquid Glass effect
        'bg-white/85 dark:bg-zinc-900/85',
        'backdrop-blur-xl backdrop-saturate-200',
        // Border and shadow for depth
        'border border-white/20 dark:border-white/10',
        'shadow-2xl',
        // Rounded corners (Apple concentricity)
        'rounded-3xl',
        // Animation with Apple HIG motion tokens
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className,
      )}
      style={{
        gap: 'var(--space-4)',
        padding: 'var(--space-6)', // Mobile: 24px | Desktop: Same (can be overridden via media query if needed)
        // Apple HIG Motion Design tokens (fade + scale)
        transitionProperty: 'opacity, transform',
        transitionDuration: 'var(--duration-normal)', // 200ms
        transitionTimingFunction: 'var(--ease-apple-standard)', // cubic-bezier(0.25, 0.1, 0.25, 1)
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          // WCAG 2.5.5: 44x44px minimum touch target
          'absolute rounded-apple min-h-touch min-w-touch',
          'flex items-center justify-center opacity-70',
          // Hover and focus states
          'hover:opacity-100 hover:bg-surface-secondary',
          'focus:outline-none focus:ring-2 focus:ring-apple-accent focus:ring-offset-2',
          'disabled:pointer-events-none',
        )}
        style={{
          right: 'var(--space-2)',
          top: 'var(--space-2)',
          // Apple HIG Motion tokens for button interactions
          transitionProperty: 'opacity, background-color',
          transitionDuration: 'var(--duration-fast)', // 150ms
          transitionTimingFunction: 'var(--ease-apple-standard)',
        }}
      >
        <X className="h-4 w-4 text-text-apple-secondary" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col text-center sm:text-left', className)}
    style={{ gap: 'var(--space-1-5, 6px)' }} // space-1.5 equivalent
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end',
      className,
    )}
    style={{
      gap: 'var(--space-2)', // Margin de botões: --space-4 conforme spec
    }}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      // Apple HIG typography
      'text-apple-lg font-semibold leading-none tracking-tight text-text-apple-primary',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      // Apple HIG secondary text
      'text-apple-sm text-text-apple-secondary',
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
