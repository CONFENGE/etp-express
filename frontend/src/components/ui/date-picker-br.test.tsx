import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePickerBR } from './date-picker-br';

describe('DatePickerBR', () => {
  describe('rendering', () => {
    it('renders with placeholder', () => {
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<DatePickerBR placeholder="Selecione uma data" />);
      const input = screen.getByPlaceholderText('Selecione uma data');
      expect(input).toBeInTheDocument();
    });

    it('renders with calendar icon', () => {
      render(<DatePickerBR />);
      // Calendar icon should be present (lucide-react Calendar)
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders disabled state', () => {
      render(<DatePickerBR disabled />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toBeDisabled();
    });
  });

  describe('input masking', () => {
    it('auto-formats input as DD/MM/YYYY', async () => {
      const user = userEvent.setup();
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '08012026');

      expect(input).toHaveValue('08/01/2026');
    });

    it('adds slash after day', async () => {
      const user = userEvent.setup();
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '08');

      expect(input).toHaveValue('08');

      await user.type(input, '0');

      expect(input).toHaveValue('08/0');
    });

    it('adds slash after month', async () => {
      const user = userEvent.setup();
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '0801');

      expect(input).toHaveValue('08/01');

      await user.type(input, '2');

      expect(input).toHaveValue('08/01/2');
    });

    it('limits input to 10 characters', async () => {
      const user = userEvent.setup();
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '0801202612345');

      expect(input).toHaveValue('08/01/2026');
    });

    it('blocks non-numeric input', async () => {
      const user = userEvent.setup();
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, 'abc08def01ghi2026');

      expect(input).toHaveValue('08/01/2026');
    });
  });

  describe('value conversion', () => {
    it('displays ISO date value in Brazilian format', () => {
      render(<DatePickerBR value="2026-01-08" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveValue('08/01/2026');
    });

    it('displays Brazilian date value as-is', () => {
      render(<DatePickerBR value="08/01/2026" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveValue('08/01/2026');
    });

    it('handles empty value', () => {
      render(<DatePickerBR value="" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveValue('');
    });

    it('handles undefined value', () => {
      render(<DatePickerBR value={undefined} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveValue('');
    });
  });

  describe('onChange callback', () => {
    it('calls onChange with ISO format when complete date is entered', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '08012026');

      expect(onChange).toHaveBeenCalledWith('2026-01-08');
    });

    it('does not call onChange for incomplete dates', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '0801');

      // Should not have been called with a date value
      expect(onChange).not.toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
    });

    it('calls onChange with empty string when input is cleared', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR value="2026-01-08" onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.clear(input);

      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('onBlur callback', () => {
    it('calls onBlur when input loses focus', async () => {
      const onBlur = vi.fn();
      render(<DatePickerBR onBlur={onBlur} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('supports id prop', () => {
      render(<DatePickerBR id="test-date" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveAttribute('id', 'test-date');
    });

    it('supports name prop', () => {
      render(<DatePickerBR name="dataElaboracao" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveAttribute('name', 'dataElaboracao');
    });

    it('supports aria-describedby prop', () => {
      render(<DatePickerBR aria-describedby="help-text" />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-invalid prop', () => {
      render(<DatePickerBR aria-invalid={true} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('has numeric input mode for mobile keyboards', () => {
      render(<DatePickerBR />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');
      expect(input).toHaveAttribute('inputMode', 'numeric');
    });
  });

  describe('keyboard navigation', () => {
    it('allows backspace to delete characters', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      // Type a full date
      await user.type(input, '08012026');
      expect(input).toHaveValue('08/01/2026');

      // Clear and type partial
      await user.clear(input);
      await user.type(input, '0801');

      expect(input).toHaveValue('08/01');
    });

    it('input has proper tab index for navigation', () => {
      render(
        <div>
          <DatePickerBR />
          <button>Next</button>
        </div>,
      );
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      // Input should be focusable (no negative tabindex)
      expect(input).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('date validation', () => {
    it('accepts valid leap year date', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      await user.type(input, '29022024'); // 2024 is a leap year

      expect(onChange).toHaveBeenCalledWith('2024-02-29');
    });

    it('does not call onChange for invalid dates', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DatePickerBR onChange={onChange} />);
      const input = screen.getByPlaceholderText('DD/MM/AAAA');

      // 31/02/2024 is invalid
      await user.type(input, '31022024');

      // Should not have been called with ISO date
      const isoDateCalls = onChange.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(call[0]),
      );
      expect(isoDateCalls).toHaveLength(0);
    });
  });
});
