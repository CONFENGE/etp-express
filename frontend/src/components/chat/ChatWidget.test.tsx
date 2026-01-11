import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWidget } from './ChatWidget';
import api from '@/lib/api';

// Mock the api module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock logger to avoid console output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChatWidget', () => {
  const mockEtpId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  describe('Floating Button', () => {
    it('should render floating action button', () => {
      render(<ChatWidget etpId={mockEtpId} />);

      expect(
        screen.getByRole('button', { name: /abrir assistente/i }),
      ).toBeInTheDocument();
    });

    it('should show message count badge when there are messages', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [
          { id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
          { id: '2', role: 'assistant', content: 'Hi', createdAt: new Date().toISOString() },
        ],
      });

      render(<ChatWidget etpId={mockEtpId} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show 9+ when more than 9 messages', async () => {
      const messages = Array.from({ length: 12 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: new Date().toISOString(),
      }));
      vi.mocked(api.get).mockResolvedValue({ data: messages });

      render(<ChatWidget etpId={mockEtpId} />);

      await waitFor(() => {
        expect(screen.getByText('9+')).toBeInTheDocument();
      });
    });

    it('should not show badge when chat is open', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        data: [
          { id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
        ],
      });

      render(<ChatWidget etpId={mockEtpId} />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Badge should be hidden when panel is open
      // The button itself is hidden when open
      await waitFor(() => {
        expect(openButton).toHaveClass('opacity-0');
      });
    });
  });

  describe('Chat Panel', () => {
    it('should open chat panel when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatWidget etpId={mockEtpId} />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      await waitFor(() => {
        // Use dialog role to find the panel, then check header within it
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should show current field context in header', async () => {
      const user = userEvent.setup();
      render(<ChatWidget etpId={mockEtpId} currentField="Justificativa" />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/contexto: justificativa/i)).toBeInTheDocument();
      });
    });

    it('should close panel when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Close panel
      const closeButton = screen.getByRole('button', { name: /fechar chat/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Assistente ETP')).not.toBeInTheDocument();
      });
    });
  });

  describe('Message Sending', () => {
    it('should send message and show in chat', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Here is my response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Type and send message
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Here is my response')).toBeInTheDocument();
      });
    });

    it('should include context field with message', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      render(<ChatWidget etpId={mockEtpId} currentField="Riscos" />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Type and send message
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Help');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ contextField: 'Riscos' }),
        );
      });
    });
  });

  describe('Suggestions', () => {
    it('should send suggestion prompt when clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Click suggestion
      const suggestion = screen.getByText('O que escrever aqui?');
      await user.click(suggestion);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Clear History', () => {
    it('should show clear button when messages exist', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        data: [
          { id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
        ],
      });

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /limpar historico/i })).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog when clear is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        data: [
          { id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
        ],
      });

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Click clear button
      await waitFor(async () => {
        const clearButton = screen.getByRole('button', { name: /limpar historico/i });
        await user.click(clearButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/limpar historico\?/i)).toBeInTheDocument();
      });
    });

    it('should clear history when confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({
        data: [
          { id: '1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
        ],
      });
      vi.mocked(api.delete).mockResolvedValue({
        data: { success: true, deletedCount: 1 },
      });

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Click clear button
      await waitFor(async () => {
        const clearButton = screen.getByRole('button', { name: /limpar historico/i });
        await user.click(clearButton);
      });

      // Confirm
      await waitFor(async () => {
        const confirmButton = screen.getByRole('button', { name: /^limpar$/i });
        await user.click(confirmButton);
      });

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith(`/chat/etp/${mockEtpId}/history`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error banner when send fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Type and send message
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      render(<ChatWidget etpId={mockEtpId} />);

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Type and send message
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();
      });
    });
  });

  describe('Insert Suggestion', () => {
    it('should call onInsertSuggestion when suggestion is inserted', async () => {
      const user = userEvent.setup();
      const onInsertSuggestion = vi.fn();
      vi.mocked(api.post).mockResolvedValue({
        data: {
          id: 'response-1',
          content: 'Response',
          suggestedContent: 'Suggested text to insert',
          metadata: { tokens: 100, latencyMs: 500 },
        },
      });

      render(
        <ChatWidget
          etpId={mockEtpId}
          onInsertSuggestion={onInsertSuggestion}
        />,
      );

      // Open panel
      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      // Send message to get a response with suggestion
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      // Wait for response and click insert button
      await waitFor(async () => {
        const insertButton = screen.getByText('Inserir no campo');
        await user.click(insertButton);
      });

      expect(onInsertSuggestion).toHaveBeenCalledWith('Suggested text to insert');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-expanded attribute on FAB', async () => {
      const user = userEvent.setup();
      render(<ChatWidget etpId={mockEtpId} />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      expect(openButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(openButton);

      expect(openButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls on FAB', () => {
      render(<ChatWidget etpId={mockEtpId} />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      expect(openButton).toHaveAttribute('aria-controls', 'chat-panel');
    });

    it('should have accessible dialog when open', async () => {
      const user = userEvent.setup();
      render(<ChatWidget etpId={mockEtpId} />);

      const openButton = screen.getByRole('button', { name: /abrir assistente/i });
      await user.click(openButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });
  });
});
