import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Generic loading state with spinner.
 * Use skeleton components for a more premium UX.
 */
export function LoadingState({
  message = 'Carregando...',
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-8',
        className,
      )}
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Skeleton card for loading lists.
 * Mimics the structure of an ETP card.
 */
export function SkeletonCard() {
  return (
    <div
      className="rounded-lg border bg-card p-6 space-y-3"
      role="status"
      aria-label="Loading card"
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
}

/**
 * Skeleton list for loading multiple cards.
 */
export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

/**
 * Skeleton table for loading tabular data.
 * Mimics a table structure with header and rows.
 */
export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div
      className="rounded-lg border bg-card overflow-hidden"
      role="status"
      aria-label="Loading table"
    >
      {/* Table Header */}
      <div className="bg-muted/50 px-6 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${Math.floor(Math.random() * 40) + 60}px` }}
          />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 flex gap-6">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4"
                style={{
                  width: `${Math.floor(Math.random() * 60) + 40}px`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton stats cards for dashboard statistics.
 * Displays 3 cards by default.
 */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16 mt-2" />
          <Skeleton className="h-3 w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for recent items list (dashboard).
 * Mimics the structure of recent ETP items.
 */
export function SkeletonRecentItems({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading recent items">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border flex items-start justify-between"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard page.
 * Combines stats and recent items skeletons.
 */
export function SkeletonDashboard() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <SkeletonStats count={3} />
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="p-6">
          <SkeletonRecentItems count={5} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for ETP grid cards.
 * Mimics the ETP card structure with progress bar.
 */
export function SkeletonETPGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading ETPs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
          {/* Header with title and badge */}
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          {/* Description */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for ETP/TR Editor page.
 * Mimics the full editor layout: breadcrumb, header, progress, tabs, and sidebar.
 */
export function SkeletonEditor() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading editor"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main card (3 columns) */}
        <div className="lg:col-span-3 rounded-lg border bg-card">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-6">
            {/* Tab list */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 shrink-0 rounded" />
              ))}
            </div>
            {/* Tab content */}
            <div className="space-y-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              {/* Editor area */}
              <div className="space-y-2 mt-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-40 w-full rounded" />
              </div>
              {/* Generate button */}
              <Skeleton className="h-10 w-40 mt-4" />
            </div>
          </div>
        </div>

        {/* Sidebar (1 column) */}
        <div className="space-y-4">
          {/* Sidebar card 1 */}
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
          {/* Sidebar card 2 */}
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="flex items-center justify-center py-4">
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mt-2" />
          </div>
          {/* Sidebar card 3 */}
          <div className="rounded-lg border bg-card p-4">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
