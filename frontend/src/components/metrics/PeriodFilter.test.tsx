import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PeriodFilter, PERIOD_OPTIONS } from './PeriodFilter';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PeriodFilter', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('renders with default period', () => {
    const onPeriodChange = vi.fn();
    render(<PeriodFilter onPeriodChange={onPeriodChange} defaultPeriod={30} />);

    expect(screen.getByText('Ultimos 30 dias')).toBeInTheDocument();
  });

  it('calls onPeriodChange on mount with default period', () => {
    const onPeriodChange = vi.fn();
    render(<PeriodFilter onPeriodChange={onPeriodChange} defaultPeriod={30} />);

    expect(onPeriodChange).toHaveBeenCalledWith(30);
  });

  it('persists selection to localStorage', () => {
    const onPeriodChange = vi.fn();
    render(<PeriodFilter onPeriodChange={onPeriodChange} defaultPeriod={30} />);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'dashboard-period-filter',
      '30',
    );
  });

  it('loads initial value from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('90');
    const onPeriodChange = vi.fn();

    render(<PeriodFilter onPeriodChange={onPeriodChange} />);

    expect(screen.getByText('Ultimos 90 dias')).toBeInTheDocument();
    expect(onPeriodChange).toHaveBeenCalledWith(90);
  });

  it('has all period options available', () => {
    const onPeriodChange = vi.fn();
    render(<PeriodFilter onPeriodChange={onPeriodChange} />);

    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Check all options are present
    PERIOD_OPTIONS.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('has accessible label', () => {
    const onPeriodChange = vi.fn();
    render(<PeriodFilter onPeriodChange={onPeriodChange} />);

    expect(screen.getByLabelText('Selecionar periodo')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const onPeriodChange = vi.fn();
    const { container } = render(
      <PeriodFilter onPeriodChange={onPeriodChange} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
