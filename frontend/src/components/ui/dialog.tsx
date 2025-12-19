import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog component with Apple HIG design tokens.
 *
 * Features:
 * - Backdrop blur (backdrop-blur-sm)
 * - Apple-style shadow (shadow-apple-lg)
 * - Apple-style border radius (rounded-apple-lg)
 * - Smooth scale + opacity animation
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
 // Apple HIG backdrop with blur
 'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
 // Animation
 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
 className,
 )}
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
 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4',
 // Apple HIG styles
 'border border-[var(--border-secondary)] bg-surface-primary p-6 shadow-apple-lg rounded-apple-lg',
 // Animation with Apple-style duration and easing
 'duration-apple data-[state=open]:animate-in data-[state=closed]:animate-out',
 'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
 'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
 'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
 'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
 className,
 )}
 {...props}
 >
 {children}
 <DialogPrimitive.Close
 className={cn(
 // WCAG 2.5.5: 44x44px minimum touch target
 'absolute right-2 top-2 rounded-apple min-h-touch min-w-touch',
 'flex items-center justify-center opacity-70',
 // Apple-style transition
 'transition-all duration-apple ease-apple',
 // Hover and focus states
 'hover:opacity-100 hover:bg-surface-secondary',
 'focus:outline-none focus:ring-2 focus:ring-apple-accent focus:ring-offset-2',
 'disabled:pointer-events-none',
 )}
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
 className={cn(
 'flex flex-col space-y-1.5 text-center sm:text-left',
 className,
 )}
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
 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
 className,
 )}
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
