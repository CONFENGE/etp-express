import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoSaveIndicator } from './AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  describe('Status Display', () => {
    it('should display idle status correctly', () => {
      render(
        <AutoSaveIndicator status="idle" lastSavedAt={null} isOnline={true} />,
      );

      expect(screen.getByText('Sincronizado')).toBeInTheDocument();
    });

    it('should display pending status correctly', () => {
      render(
        <AutoSaveIndicator
          status="pending"
          lastSavedAt={null}
          isOnline={true}
        />,
      );

      expect(screen.getByText('Alterações pendentes')).toBeInTheDocument();
    });

    it('should display saving status with animation', () => {
      render(
        <AutoSaveIndicator
          status="saving"
          lastSavedAt={null}
          isOnline={true}
        />,
      );

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
      // Check for spinning animation class
      const icon = document.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });

    it('should display saved status correctly', () => {
      render(
        <AutoSaveIndicator
          status="saved"
          lastSavedAt={new Date()}
          isOnline={true}
        />,
      );

      expect(screen.getByText('Salvo')).toBeInTheDocument();
    });

    it('should display error status with retry button', () => {
      const onRetry = vi.fn();
      render(
        <AutoSaveIndicator
          status="error"
          lastSavedAt={null}
          isOnline={true}
          onRetry={onRetry}
        />,
      );

      expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    });

    it('should display offline status correctly', () => {
      render(
        <AutoSaveIndicator
          status="offline"
          lastSavedAt={null}
          isOnline={false}
        />,
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when clicking on error status', () => {
      const onRetry = vi.fn();
      render(
        <AutoSaveIndicator
          status="error"
          lastSavedAt={null}
          isOnline={true}
          onRetry={onRetry}
        />,
      );

      const badge = screen.getByRole('button');
      fireEvent.click(badge);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry on Enter key press', () => {
      const onRetry = vi.fn();
      render(
        <AutoSaveIndicator
          status="error"
          lastSavedAt={null}
          isOnline={true}
          onRetry={onRetry}
        />,
      );

      const badge = screen.getByRole('button');
      fireEvent.keyDown(badge, { key: 'Enter' });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry on Space key press', () => {
      const onRetry = vi.fn();
      render(
        <AutoSaveIndicator
          status="error"
          lastSavedAt={null}
          isOnline={true}
          onRetry={onRetry}
        />,
      );

      const badge = screen.getByRole('button');
      fireEvent.keyDown(badge, { key: ' ' });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not be clickable when not in error state', () => {
      const onRetry = vi.fn();
      render(
        <AutoSaveIndicator
          status="saved"
          lastSavedAt={new Date()}
          isOnline={true}
          onRetry={onRetry}
        />,
      );

      // Should not have role="button"
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Last Saved Time', () => {
    it('should render with lastSavedAt date', () => {
      const recentDate = new Date(Date.now() - 5000); // 5 seconds ago
      render(
        <AutoSaveIndicator
          status="saved"
          lastSavedAt={recentDate}
          isOnline={true}
        />,
      );

      // Just verify it renders without error
      expect(screen.getByText('Salvo')).toBeInTheDocument();
    });
  });

  describe('Badge Variants', () => {
    it('should render different variants for different statuses', () => {
      const { rerender } = render(
        <AutoSaveIndicator status="idle" lastSavedAt={null} isOnline={true} />,
      );

      expect(screen.getByText('Sincronizado')).toBeInTheDocument();

      rerender(
        <AutoSaveIndicator
          status="pending"
          lastSavedAt={null}
          isOnline={true}
        />,
      );

      expect(screen.getByText('Alterações pendentes')).toBeInTheDocument();

      rerender(
        <AutoSaveIndicator
          status="saved"
          lastSavedAt={new Date()}
          isOnline={true}
        />,
      );

      expect(screen.getByText('Salvo')).toBeInTheDocument();

      rerender(
        <AutoSaveIndicator
          status="error"
          lastSavedAt={null}
          isOnline={true}
          onRetry={() => {}}
        />,
      );

      expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <AutoSaveIndicator
          status="idle"
          lastSavedAt={null}
          isOnline={true}
          className="custom-class"
        />,
      );

      const container = screen
        .getByText('Sincronizado')
        .closest('.custom-class');
      expect(container).toBeInTheDocument();
    });
  });
});
