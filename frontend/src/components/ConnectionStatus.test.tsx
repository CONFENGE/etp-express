import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from './ConnectionStatus';

// Mock useOnlineStatus hook
const mockUseOnlineStatus = vi.fn();
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

// Mock useToast hook
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
  }),
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Inline Variant', () => {
    describe('Online State', () => {
      it('should render online indicator with green dot', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: true,
          wasOffline: false,
        });

        const { container } = render(<ConnectionStatus variant="inline" />);

        const dot = container.querySelector('.bg-green-500');
        expect(dot).toBeInTheDocument();
      });

      it('should render Wifi icon when online', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: true,
          wasOffline: false,
        });

        render(<ConnectionStatus variant="inline" />);

        // Wifi icon should be present (text-muted-foreground class)
        const icon = document.querySelector('.text-muted-foreground');
        expect(icon).toBeInTheDocument();
      });

      it('should have aria-label "Online" when online', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: true,
          wasOffline: false,
        });

        render(<ConnectionStatus variant="inline" />);

        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-label', 'Online');
      });
    });

    describe('Offline State', () => {
      it('should render offline indicator with red pulsing dot', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: false,
          wasOffline: true,
        });

        const { container } = render(<ConnectionStatus variant="inline" />);

        const dot = container.querySelector('.bg-red-500');
        expect(dot).toBeInTheDocument();
        expect(dot).toHaveClass('animate-pulse');
      });

      it('should render WifiOff icon when offline', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: false,
          wasOffline: true,
        });

        const { container } = render(<ConnectionStatus variant="inline" />);

        // WifiOff icon should have destructive color and animate-pulse
        const icon = container.querySelector('.text-destructive');
        expect(icon).toBeInTheDocument();
      });

      it('should have aria-label "Offline" when offline', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: false,
          wasOffline: true,
        });

        render(<ConnectionStatus variant="inline" />);

        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-label', 'Offline');
      });
    });

    describe('Show Label', () => {
      it('should show "Online" label when showLabel is true and online', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: true,
          wasOffline: false,
        });

        render(<ConnectionStatus variant="inline" showLabel />);

        expect(screen.getByText('Online')).toBeInTheDocument();
      });

      it('should show "Offline" label when showLabel is true and offline', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: false,
          wasOffline: true,
        });

        render(<ConnectionStatus variant="inline" showLabel />);

        expect(screen.getByText('Offline')).toBeInTheDocument();
      });

      it('should not show label when showLabel is false', () => {
        mockUseOnlineStatus.mockReturnValue({
          isOnline: true,
          wasOffline: false,
        });

        render(<ConnectionStatus variant="inline" showLabel={false} />);

        expect(screen.queryByText('Online')).not.toBeInTheDocument();
      });
    });
  });

  describe('Banner Variant', () => {
    it('should not render when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      const { container } = render(<ConnectionStatus variant="banner" />);

      expect(container.firstChild).toBeNull();
    });

    it('should render floating banner when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('fixed', 'bottom-4', 'left-4');
    });

    it('should show "Sem conexao" text in banner', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      expect(screen.getByText('Sem conexao')).toBeInTheDocument();
    });

    it('should have destructive styling in banner', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass(
        'bg-destructive',
        'text-destructive-foreground',
      );
    });

    it('should have animation classes in banner', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('animate-in', 'slide-in-from-bottom-4');
    });

    it('should have aria-live polite for accessibility', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to inline variant', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      render(<ConnectionStatus variant="inline" className="custom-class" />);

      const status = screen.getByRole('status');
      expect(status).toHaveClass('custom-class');
    });

    it('should apply custom className to banner variant', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" className="custom-class" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('custom-class');
    });
  });

  describe('Default Props', () => {
    it('should default to inline variant', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      render(<ConnectionStatus />);

      // Should render status role (inline) not alert (banner)
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should default showLabel to false', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      render(<ConnectionStatus />);

      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for inline variant', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      render(<ConnectionStatus variant="inline" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have role="alert" for banner variant', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
      });

      render(<ConnectionStatus variant="banner" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative elements', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
      });

      const { container } = render(<ConnectionStatus variant="inline" />);

      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
