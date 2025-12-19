import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UndoToast, UndoToastContainer } from './undo-toast';
import { UndoToastState } from '@/hooks/useUndoToast';

describe('UndoToast', () => {
 const defaultToast: UndoToastState = {
 id: 'test-toast-1',
 message: 'Item deleted',
 countdown: 5,
 totalDuration: 5,
 };

 const defaultProps = {
 toast: defaultToast,
 onUndo: vi.fn(),
 onDismiss: vi.fn(),
 };

 describe('rendering', () => {
 it('should render the message', () => {
 render(<UndoToast {...defaultProps} />);
 expect(screen.getByText('Item deleted')).toBeInTheDocument();
 });

 it('should render the countdown', () => {
 render(<UndoToast {...defaultProps} />);
 expect(screen.getByText('5s')).toBeInTheDocument();
 });

 it('should render the undo button', () => {
 render(<UndoToast {...defaultProps} />);
 expect(
 screen.getByRole('button', { name: /desfazer/i }),
 ).toBeInTheDocument();
 });

 it('should render the dismiss button', () => {
 render(<UndoToast {...defaultProps} />);
 expect(
 screen.getByRole('button', { name: /fechar/i }),
 ).toBeInTheDocument();
 });

 it('should have correct ARIA attributes', () => {
 render(<UndoToast {...defaultProps} />);
 const alert = screen.getByRole('alert');
 expect(alert).toHaveAttribute('aria-live', 'polite');
 expect(alert).toHaveAttribute('aria-atomic', 'true');
 });
 });

 describe('countdown display', () => {
 it('should show countdown label', () => {
 render(<UndoToast {...defaultProps} />);
 expect(screen.getByLabelText('5 segundos restantes')).toBeInTheDocument();
 });

 it('should apply urgent styling when countdown <= 2', () => {
 const urgentToast: UndoToastState = {
 ...defaultToast,
 countdown: 2,
 };
 render(<UndoToast {...defaultProps} toast={urgentToast} />);
 const countdownElement = screen.getByText('2s');
 expect(countdownElement).toHaveClass('font-semibold');
 });

 it('should NOT apply urgent styling when countdown > 2', () => {
 render(<UndoToast {...defaultProps} />);
 const countdownElement = screen.getByText('5s');
 expect(countdownElement).not.toHaveClass('font-semibold');
 });
 });

 describe('progress bar', () => {
 it('should show progress bar with correct width', () => {
 render(<UndoToast {...defaultProps} />);
 const progressBar = document.querySelector('[aria-hidden="true"]');
 expect(progressBar).toHaveStyle({ width: '100%' });
 });

 it('should update progress bar width based on countdown', () => {
 const halfwayToast: UndoToastState = {
 ...defaultToast,
 countdown: 2.5,
 totalDuration: 5,
 };
 render(<UndoToast {...defaultProps} toast={halfwayToast} />);
 const progressBar = document.querySelector('[aria-hidden="true"]');
 expect(progressBar).toHaveStyle({ width: '50%' });
 });
 });

 describe('interactions', () => {
 it('should call onUndo with toast ID when undo button is clicked', () => {
 const onUndo = vi.fn();
 render(<UndoToast {...defaultProps} onUndo={onUndo} />);

 fireEvent.click(screen.getByRole('button', { name: /desfazer/i }));

 expect(onUndo).toHaveBeenCalledTimes(1);
 expect(onUndo).toHaveBeenCalledWith('test-toast-1');
 });

 it('should call onDismiss with toast ID when dismiss button is clicked', () => {
 const onDismiss = vi.fn();
 render(<UndoToast {...defaultProps} onDismiss={onDismiss} />);

 fireEvent.click(screen.getByRole('button', { name: /fechar/i }));

 expect(onDismiss).toHaveBeenCalledTimes(1);
 expect(onDismiss).toHaveBeenCalledWith('test-toast-1');
 });
 });

 describe('processing state', () => {
 it('should disable undo button when isProcessing is true', () => {
 render(<UndoToast {...defaultProps} isProcessing={true} />);
 expect(screen.getByRole('button', { name: /desfazer/i })).toBeDisabled();
 });

 it('should disable dismiss button when isProcessing is true', () => {
 render(<UndoToast {...defaultProps} isProcessing={true} />);
 expect(screen.getByRole('button', { name: /fechar/i })).toBeDisabled();
 });

 it('should NOT disable buttons when isProcessing is false', () => {
 render(<UndoToast {...defaultProps} isProcessing={false} />);
 expect(
 screen.getByRole('button', { name: /desfazer/i }),
 ).not.toBeDisabled();
 expect(
 screen.getByRole('button', { name: /fechar/i }),
 ).not.toBeDisabled();
 });
 });

 describe('custom className', () => {
 it('should apply custom className', () => {
 render(<UndoToast {...defaultProps} className="custom-class" />);
 const alert = screen.getByRole('alert');
 expect(alert).toHaveClass('custom-class');
 });
 });
});

describe('UndoToastContainer', () => {
 const toasts: UndoToastState[] = [
 {
 id: 'toast-1',
 message: 'Item 1 deleted',
 countdown: 5,
 totalDuration: 5,
 },
 {
 id: 'toast-2',
 message: 'Item 2 deleted',
 countdown: 3,
 totalDuration: 5,
 },
 ];

 const defaultProps = {
 toasts,
 onUndo: vi.fn(),
 onDismiss: vi.fn(),
 };

 describe('rendering', () => {
 it('should render nothing when toasts array is empty', () => {
 const { container } = render(
 <UndoToastContainer {...defaultProps} toasts={[]} />,
 );
 expect(container.firstChild).toBeNull();
 });

 it('should render all toasts', () => {
 render(<UndoToastContainer {...defaultProps} />);
 expect(screen.getByText('Item 1 deleted')).toBeInTheDocument();
 expect(screen.getByText('Item 2 deleted')).toBeInTheDocument();
 });

 it('should have correct region role', () => {
 render(<UndoToastContainer {...defaultProps} />);
 expect(screen.getByRole('region')).toBeInTheDocument();
 });

 it('should have accessible label', () => {
 render(<UndoToastContainer {...defaultProps} />);
 expect(
 screen.getByRole('region', { name: /notificações de desfazer/i }),
 ).toBeInTheDocument();
 });
 });

 describe('interactions', () => {
 it('should call onUndo with correct toast ID', () => {
 const onUndo = vi.fn();
 render(<UndoToastContainer {...defaultProps} onUndo={onUndo} />);

 // Click undo on first toast
 const undoButtons = screen.getAllByRole('button', { name: /desfazer/i });
 fireEvent.click(undoButtons[0]);

 expect(onUndo).toHaveBeenCalledWith('toast-1');
 });

 it('should call onDismiss with correct toast ID', () => {
 const onDismiss = vi.fn();
 render(<UndoToastContainer {...defaultProps} onDismiss={onDismiss} />);

 // Click dismiss on second toast
 const dismissButtons = screen.getAllByRole('button', { name: /fechar/i });
 fireEvent.click(dismissButtons[1]);

 expect(onDismiss).toHaveBeenCalledWith('toast-2');
 });
 });

 describe('processing state', () => {
 it('should pass isProcessing to all toasts', () => {
 render(<UndoToastContainer {...defaultProps} isProcessing={true} />);
 const undoButtons = screen.getAllByRole('button', { name: /desfazer/i });
 undoButtons.forEach((button) => {
 expect(button).toBeDisabled();
 });
 });
 });

 describe('custom className', () => {
 it('should apply custom className to container', () => {
 render(
 <UndoToastContainer {...defaultProps} className="custom-container" />,
 );
 expect(screen.getByRole('region')).toHaveClass('custom-container');
 });
 });
});
