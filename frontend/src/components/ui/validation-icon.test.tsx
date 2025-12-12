import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationIcon } from './validation-icon';

describe('ValidationIcon', () => {
  describe('Idle State', () => {
    it('should not render anything when state is idle', () => {
      const { container } = render(<ValidationIcon state="idle" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Valid State', () => {
    it('should render check icon when state is valid', () => {
      render(<ValidationIcon state="valid" />);

      const checkIcon = screen.getByTestId('validation-check');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should have green color for check icon', () => {
      render(<ValidationIcon state="valid" />);

      const checkIcon = screen.getByTestId('validation-check');
      expect(checkIcon).toHaveClass('text-apple-green');
    });

    it('should have correct size for check icon', () => {
      render(<ValidationIcon state="valid" />);

      const checkIcon = screen.getByTestId('validation-check');
      expect(checkIcon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Invalid State', () => {
    it('should render alert icon when state is invalid', () => {
      render(<ValidationIcon state="invalid" />);

      const alertIcon = screen.getByTestId('validation-alert');
      expect(alertIcon).toBeInTheDocument();
    });

    it('should have red color for alert icon', () => {
      render(<ValidationIcon state="invalid" />);

      const alertIcon = screen.getByTestId('validation-alert');
      expect(alertIcon).toHaveClass('text-apple-red');
    });

    it('should have correct size for alert icon', () => {
      render(<ValidationIcon state="invalid" />);

      const alertIcon = screen.getByTestId('validation-alert');
      expect(alertIcon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Animation', () => {
    it('should have scale-in animation class', () => {
      const { container } = render(<ValidationIcon state="valid" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('animate-scale-in');
    });
  });

  describe('Positioning', () => {
    it('should have absolute positioning classes', () => {
      const { container } = render(<ValidationIcon state="valid" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('absolute');
      expect(wrapper).toHaveClass('right-3');
      expect(wrapper).toHaveClass('top-1/2');
      expect(wrapper).toHaveClass('-translate-y-1/2');
    });

    it('should accept custom className for positioning override', () => {
      const { container } = render(
        <ValidationIcon state="valid" className="right-10" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('right-10');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden on wrapper', () => {
      const { container } = render(<ValidationIcon state="valid" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
