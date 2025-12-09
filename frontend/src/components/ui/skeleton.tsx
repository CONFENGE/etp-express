import { cn } from '@/lib/utils';

/**
 * Skeleton loading placeholder component.
 * Displays an animated placeholder while content is loading.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
