import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Label',
    name: 'testField',
    children: <input id="testField" data-testid="input" />,
  };

  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('renders children (input element)', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('renders required indicator when required prop is true', () => {
      render(<FormField {...defaultProps} required />);
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByLabelText('campo obrigatório')).toBeInTheDocument();
    });

    it('does not render required indicator when required prop is false', () => {
      render(<FormField {...defaultProps} required={false} />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message when error prop is provided', () => {
      render(<FormField {...defaultProps} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows error icon when error prop is provided', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      // AlertCircle icon should be present - the icon container has the class
      const errorIconContainer = document.querySelector('svg.text-destructive');
      expect(errorIconContainer).toBeInTheDocument();
    });

    it('applies error styling to label', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-destructive');
    });
  });

  describe('valid state', () => {
    it('shows valid icon when isValid is true', () => {
      render(<FormField {...defaultProps} isValid />);
      // CheckCircle2 icon should be present - the SVG has the class directly
      const validIcon = document.querySelector(
        'svg.text-green-600, svg.text-green-500',
      );
      expect(validIcon).toBeInTheDocument();
    });

    it('applies valid styling to label', () => {
      render(<FormField {...defaultProps} isValid />);
      const label = screen.getByText('Test Label');
      expect(label.className).toMatch(/text-green-/);
    });
  });

  describe('warning state', () => {
    it('displays warning message when warning prop is provided', () => {
      render(
        <FormField {...defaultProps} warning="Consider adding more details" />,
      );
      expect(
        screen.getByText('Consider adding more details'),
      ).toBeInTheDocument();
    });

    it('shows warning icon when warning prop is provided', () => {
      render(<FormField {...defaultProps} warning="Warning message" />);
      // AlertTriangle icon should be present - the SVG has the class directly
      const warningIcon = document.querySelector(
        'svg.text-yellow-600, svg.text-yellow-500',
      );
      expect(warningIcon).toBeInTheDocument();
    });

    it('error takes precedence over warning', () => {
      render(
        <FormField
          {...defaultProps}
          error="Error message"
          warning="Warning message"
        />,
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
    });
  });

  describe('character count', () => {
    it('displays character count when charCount prop is provided', () => {
      render(
        <FormField {...defaultProps} charCount={{ current: 50, max: 200 }} />,
      );
      expect(screen.getByText('50/200')).toBeInTheDocument();
    });

    it('applies warning styling when near limit (80%+)', () => {
      render(
        <FormField {...defaultProps} charCount={{ current: 170, max: 200 }} />,
      );
      const counter = screen.getByText('170/200');
      expect(counter.className).toMatch(/text-yellow-/);
    });

    it('applies error styling when over limit', () => {
      render(
        <FormField {...defaultProps} charCount={{ current: 250, max: 200 }} />,
      );
      const counter = screen.getByText('250/200');
      expect(counter).toHaveClass('text-destructive');
    });

    it('has aria-live for accessibility', () => {
      render(
        <FormField {...defaultProps} charCount={{ current: 50, max: 200 }} />,
      );
      const counter = screen.getByText('50/200');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('help text', () => {
    it('displays help text when provided and no error/warning', () => {
      render(<FormField {...defaultProps} helpText="This is help text" />);
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('hides help text when error is present', () => {
      render(
        <FormField
          {...defaultProps}
          helpText="This is help text"
          error="Error message"
        />,
      );
      expect(screen.queryByText('This is help text')).not.toBeInTheDocument();
    });

    it('hides help text when warning is present', () => {
      render(
        <FormField
          {...defaultProps}
          helpText="This is help text"
          warning="Warning message"
        />,
      );
      expect(screen.queryByText('This is help text')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('sets aria-invalid on child input when error exists', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby linking error message', () => {
      render(<FormField {...defaultProps} error="Error message" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-describedby', 'testField-error');
    });

    it('sets aria-describedby linking help text', () => {
      render(<FormField {...defaultProps} helpText="Help text" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-describedby', 'testField-help');
    });

    it('combines aria-describedby when both error and help text exist', () => {
      render(
        <FormField
          {...defaultProps}
          error="Error message"
          helpText="Help text"
        />,
      );
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute(
        'aria-describedby',
        'testField-error testField-help',
      );
    });
  });

  describe('idle state', () => {
    it('does not show any status icon in idle state', () => {
      render(<FormField {...defaultProps} />);
      // No status icons should be present
      const statusIcons = document.querySelectorAll('.h-4.w-4');
      expect(statusIcons.length).toBe(0);
    });

    it('does not apply special styling to label in idle state', () => {
      render(<FormField {...defaultProps} />);
      const label = screen.getByText('Test Label');
      expect(label).not.toHaveClass('text-destructive');
      expect(label.className).not.toMatch(/text-green-/);
    });
  });
});
