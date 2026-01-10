import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Period filter options with their values in days.
 * 0 means "all time" (no filter).
 */
export const PERIOD_OPTIONS = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: '365', label: 'Ultimo ano' },
  { value: '0', label: 'Todo o periodo' },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]['value'];

const STORAGE_KEY = 'dashboard-period-filter';

interface PeriodFilterProps {
  /** Called when the period selection changes */
  onPeriodChange: (periodDays: number) => void;
  /** Default period in days (default: 30) */
  defaultPeriod?: number;
  /** Optional className for styling */
  className?: string;
}

/**
 * Period filter dropdown component for dashboard metrics.
 *
 * Part of the dashboard metrics feature (Issue #1366).
 * Allows users to filter all metrics by time period.
 * Persists selection to localStorage for session continuity.
 *
 * @example
 * ```tsx
 * <PeriodFilter
 *   onPeriodChange={(days) => {
 *     console.log(`Filter changed to ${days} days`);
 *     // Refetch metrics with new period
 *   }}
 *   defaultPeriod={30}
 * />
 * ```
 */
export function PeriodFilter({
  onPeriodChange,
  defaultPeriod = 30,
  className,
}: PeriodFilterProps) {
  // Initialize from localStorage or default
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && PERIOD_OPTIONS.some((opt) => opt.value === stored)) {
        return stored as PeriodValue;
      }
    }
    return defaultPeriod.toString() as PeriodValue;
  });

  // Persist selection to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedPeriod);
  }, [selectedPeriod]);

  // Notify parent on initial mount and changes
  useEffect(() => {
    onPeriodChange(parseInt(selectedPeriod, 10));
  }, [selectedPeriod, onPeriodChange]);

  const handleValueChange = (value: PeriodValue) => {
    setSelectedPeriod(value);
  };

  const currentLabel = PERIOD_OPTIONS.find(
    (opt) => opt.value === selectedPeriod,
  )?.label;

  return (
    <div className={className}>
      <Select value={selectedPeriod} onValueChange={handleValueChange}>
        <SelectTrigger
          className="w-[180px] h-9"
          aria-label="Selecionar periodo"
        >
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione o periodo">
            {currentLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
