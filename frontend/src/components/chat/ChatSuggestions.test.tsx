import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ChatSuggestions,
  DEFAULT_SUGGESTIONS,
  FIELD_SUGGESTIONS,
} from './ChatSuggestions';

describe('ChatSuggestions', () => {
  describe('Default Suggestions', () => {
    it('should render default suggestions when no field context', () => {
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} />);

      expect(screen.getByText('O que escrever aqui?')).toBeInTheDocument();
      expect(screen.getByText('Ver legislacao')).toBeInTheDocument();
      expect(screen.getByText('Riscos do campo')).toBeInTheDocument();
      expect(screen.getByText('Como estimar')).toBeInTheDocument();
    });

    it('should call onSelect with prompt when suggestion is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} />);

      const button = screen.getByText('O que escrever aqui?');
      await user.click(button);

      expect(onSelect).toHaveBeenCalledWith(DEFAULT_SUGGESTIONS[0].prompt);
    });
  });

  describe('Context-Aware Suggestions', () => {
    it('should show justificativa-specific suggestions', () => {
      const onSelect = vi.fn();
      render(
        <ChatSuggestions onSelect={onSelect} currentField="Justificativa" />,
      );

      expect(screen.getByText('Exemplo de justificativa')).toBeInTheDocument();
      expect(screen.getByText('Base legal')).toBeInTheDocument();
    });

    it('should show riscos-specific suggestions', () => {
      const onSelect = vi.fn();
      render(
        <ChatSuggestions onSelect={onSelect} currentField="Matriz de Riscos" />,
      );

      expect(screen.getByText('Matriz de riscos')).toBeInTheDocument();
    });

    it('should include some default suggestions with field-specific ones', () => {
      const onSelect = vi.fn();
      render(
        <ChatSuggestions onSelect={onSelect} currentField="Justificativa" />,
      );

      // Should have field-specific
      expect(screen.getByText('Exemplo de justificativa')).toBeInTheDocument();
      // Plus some defaults
      expect(screen.getByText('O que escrever aqui?')).toBeInTheDocument();
    });

    it('should be case-insensitive for field matching', () => {
      const onSelect = vi.fn();
      render(
        <ChatSuggestions onSelect={onSelect} currentField="JUSTIFICATIVA" />,
      );

      expect(screen.getByText('Exemplo de justificativa')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call onSelect when disabled and clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} disabled />);

      const button = screen.getByText('O que escrever aqui?');
      await user.click(button);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have group role with aria-label', () => {
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} />);

      expect(
        screen.getByRole('group', { name: /sugestoes de perguntas/i }),
      ).toBeInTheDocument();
    });

    it('should have aria-label on suggestion buttons', () => {
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} />);

      const button = screen.getByText('O que escrever aqui?').closest('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Perguntar'));
    });
  });

  describe('Icons', () => {
    it('should render icons for each suggestion', () => {
      const onSelect = vi.fn();
      const { container } = render(<ChatSuggestions onSelect={onSelect} />);

      // Each button should have an SVG icon
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Field-Specific Prompts', () => {
    it('should have correct prompt for justificativa field', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <ChatSuggestions onSelect={onSelect} currentField="Justificativa" />,
      );

      const button = screen.getByText('Exemplo de justificativa');
      await user.click(button);

      expect(onSelect).toHaveBeenCalledWith(
        FIELD_SUGGESTIONS.justificativa[0].prompt,
      );
    });

    it('should have correct prompt for riscos field', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<ChatSuggestions onSelect={onSelect} currentField="Riscos" />);

      const button = screen.getByText('Matriz de riscos');
      await user.click(button);

      expect(onSelect).toHaveBeenCalledWith(FIELD_SUGGESTIONS.riscos[0].prompt);
    });
  });

  describe('Scrolling', () => {
    it('should have overflow-x-auto for horizontal scrolling', () => {
      const onSelect = vi.fn();
      const { container } = render(<ChatSuggestions onSelect={onSelect} />);

      const suggestionContainer = container.querySelector('.overflow-x-auto');
      expect(suggestionContainer).toBeInTheDocument();
    });
  });
});
