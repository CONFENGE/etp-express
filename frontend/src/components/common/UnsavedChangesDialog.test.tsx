import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
 const defaultProps = {
 open: true,
 onConfirm: vi.fn(),
 onCancel: vi.fn(),
 };

 beforeEach(() => {
 vi.clearAllMocks();
 });

 describe('Rendering', () => {
 it('should render dialog when open is true', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
 });

 it('should not render dialog when open is false', () => {
 render(<UnsavedChangesDialog {...defaultProps} open={false} />);

 expect(
 screen.queryByText('Alterações não salvas'),
 ).not.toBeInTheDocument();
 });

 it('should render default title', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
 });

 it('should render default description', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(
 screen.getByText(
 'Você tem alterações que não foram salvas. Se sair agora, perderá essas alterações.',
 ),
 ).toBeInTheDocument();
 });

 it('should render default cancel button text', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(
 screen.getByRole('button', { name: 'Continuar editando' }),
 ).toBeInTheDocument();
 });

 it('should render default confirm button text', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(
 screen.getByRole('button', { name: 'Sair sem salvar' }),
 ).toBeInTheDocument();
 });
 });

 describe('Custom Props', () => {
 it('should render custom title', () => {
 render(<UnsavedChangesDialog {...defaultProps} title="Custom Title" />);

 expect(screen.getByText('Custom Title')).toBeInTheDocument();
 });

 it('should render custom description', () => {
 render(
 <UnsavedChangesDialog
 {...defaultProps}
 description="Custom description message"
 />,
 );

 expect(
 screen.getByText('Custom description message'),
 ).toBeInTheDocument();
 });

 it('should render custom cancel text', () => {
 render(<UnsavedChangesDialog {...defaultProps} cancelText="Stay here" />);

 expect(
 screen.getByRole('button', { name: 'Stay here' }),
 ).toBeInTheDocument();
 });

 it('should render custom confirm text', () => {
 render(
 <UnsavedChangesDialog {...defaultProps} confirmText="Leave anyway" />,
 );

 expect(
 screen.getByRole('button', { name: 'Leave anyway' }),
 ).toBeInTheDocument();
 });
 });

 describe('User Interactions', () => {
 it('should call onConfirm when confirm button is clicked', () => {
 const onConfirm = vi.fn();
 render(<UnsavedChangesDialog {...defaultProps} onConfirm={onConfirm} />);

 fireEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));

 expect(onConfirm).toHaveBeenCalledTimes(1);
 });

 it('should call onCancel when cancel button is clicked', () => {
 const onCancel = vi.fn();
 render(<UnsavedChangesDialog {...defaultProps} onCancel={onCancel} />);

 fireEvent.click(
 screen.getByRole('button', { name: 'Continuar editando' }),
 );

 expect(onCancel).toHaveBeenCalledTimes(1);
 });
 });

 describe('Accessibility', () => {
 it('should have proper dialog role structure', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 expect(screen.getByRole('alertdialog')).toBeInTheDocument();
 });

 it('should have visible title and description', () => {
 render(<UnsavedChangesDialog {...defaultProps} />);

 // Check that title exists and is visible
 const title = screen.getByText('Alterações não salvas');
 expect(title).toBeVisible();

 // Check that description exists and is visible
 const description = screen.getByText(
 /Você tem alterações que não foram salvas/,
 );
 expect(description).toBeVisible();
 });
 });
});
