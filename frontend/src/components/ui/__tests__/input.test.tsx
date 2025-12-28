import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with correct type', () => {
      render(<Input type="email" data-testid="email-input" />);
      expect(screen.getByTestId('email-input')).toHaveAttribute(
        'type',
        'email',
      );
    });

    it('should render password type', () => {
      render(<Input type="password" data-testid="password-input" />);
      expect(screen.getByTestId('password-input')).toHaveAttribute(
        'type',
        'password',
      );
    });
  });

  describe('Apple HIG Design Tokens', () => {
    it('should use Apple-style border radius (rounded-xl)', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass('rounded-xl');
    });

    it('should use surface-secondary background for subtle appearance', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass('bg-surface-secondary');
    });

    it('should use text-apple-primary for text color', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass('text-text-apple-primary');
    });

    it('should use text-apple-tertiary for placeholder', () => {
      render(<Input placeholder="Test" data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass('placeholder:text-text-apple-tertiary');
    });

    it('should use smooth transitions with GPU acceleration', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass('transition-all');
      expect(input).toHaveClass('duration-200');
      expect(input).toHaveClass('ease-out');
    });

    it('should have focus glow with Apple accent', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      // Focus uses subtle glow (shadow) instead of hard ring
      expect(input).toHaveClass(
        'focus-visible:shadow-[0_0_0_4px_rgba(0,102,204,0.12)]',
      );
      expect(input).toHaveClass('focus-visible:border-apple-accent');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is set', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50');
      expect(input).toHaveClass('disabled:bg-surface-secondary');
    });

    it('should accept value changes', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test value');
      expect(input).toHaveValue('test value');
    });

    it('should call onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);

      await user.type(screen.getByRole('textbox'), 'a');
      expect(onChange).toHaveBeenCalled();
    });

    it('should support controlled mode', () => {
      const { rerender } = render(
        <Input value="initial" onChange={() => {}} />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('initial');

      rerender(<Input value="updated" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('updated');
    });
  });

  describe('Sizing', () => {
    it('should have correct height (h-11 for 44px touch target)', () => {
      render(<Input data-testid="sized-input" />);
      const input = screen.getByTestId('sized-input');
      expect(input).toHaveClass('h-11');
      expect(input).toHaveClass('min-h-[44px]');
    });

    it('should be full width', () => {
      render(<Input data-testid="sized-input" />);
      const input = screen.getByTestId('sized-input');
      expect(input).toHaveClass('w-full');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="custom-class" data-testid="custom-input" />);
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('rounded-xl');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <span id="help-text">Enter your username</span>
        </>,
      );
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-describedby',
        'help-text',
      );
    });
  });
});
