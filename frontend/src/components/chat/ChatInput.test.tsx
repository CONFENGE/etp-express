import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      expect(
        screen.getByPlaceholderText('Digite sua pergunta...'),
      ).toBeInTheDocument();
    });

    it('should render send button', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      expect(
        screen.getByRole('button', { name: /enviar/i }),
      ).toBeInTheDocument();
    });

    it('should render character count', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      expect(screen.getByText('0/2000')).toBeInTheDocument();
    });

    it('should render keyboard hint', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      expect(
        screen.getByText(/enter para enviar/i),
      ).toBeInTheDocument();
    });

    it('should use custom placeholder when provided', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} placeholder="Pergunte algo..." />);

      expect(
        screen.getByPlaceholderText('Pergunte algo...'),
      ).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5/2000')).toBeInTheDocument();
    });

    it('should show error styling when over character limit', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(2001);

      // Use fireEvent for very long text to avoid timeout
      fireEvent.change(textarea, { target: { value: longText } });

      const charCount = screen.getByText('2001/2000');
      expect(charCount).toHaveClass('text-apple-red');
    });
  });

  describe('Send Functionality', () => {
    it('should call onSend with trimmed message when send button is clicked', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '  Hello World  ');

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith('Hello World');
    });

    it('should call onSend when Enter is pressed', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      expect(onSend).toHaveBeenCalledWith('Hello');
    });

    it('should not send when Shift+Enter is pressed (new line)', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      expect(textarea).toHaveValue('');
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   ');

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not send when over character limit', async () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(2001);
      fireEvent.change(textarea, { target: { value: longText } });

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      fireEvent.click(sendButton);

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should disable send button when disabled prop is true', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} disabled />);

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable input when isLoading is true', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} isLoading />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should show loading spinner when isLoading is true', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} isLoading />);

      const sendButton = screen.getByRole('button', { name: /enviando/i });
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible textarea with label', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByLabelText(/digite sua mensagem/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should have aria-describedby for character count', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count');
    });

    it('should have accessible send button with proper label', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const sendButton = screen.getByRole('button', { name: /enviar mensagem/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should announce character count changes', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const charCount = screen.getByText('0/2000');
      expect(charCount).toHaveAttribute('aria-live', 'polite');
    });
  });
});
