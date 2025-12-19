import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoConversionBanner } from './DemoConversionBanner';

describe('DemoConversionBanner', () => {
 const mockOnClose = vi.fn();

 beforeEach(() => {
 vi.clearAllMocks();
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 describe('Rendering', () => {
 it('should render the banner with correct content', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 expect(screen.getByText('Gostou do ETP Express?')).toBeInTheDocument();
 expect(
 screen.getByText(
 'Contrate agora e transforme sua gestão de licitações.',
 ),
 ).toBeInTheDocument();
 expect(
 screen.getByRole('link', { name: /Fale com Tiago Sasaki/i }),
 ).toBeInTheDocument();
 expect(
 screen.getByText('WhatsApp: (48) 9 8834-4559'),
 ).toBeInTheDocument();
 });

 it('should have correct aria attributes for accessibility', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const banner = screen.getByRole('complementary', {
 name: /convite para contratação/i,
 });
 expect(banner).toBeInTheDocument();

 const closeButton = screen.getByRole('button', {
 name: /fechar banner/i,
 });
 expect(closeButton).toBeInTheDocument();
 });

 it('should apply custom className when provided', () => {
 render(
 <DemoConversionBanner onClose={mockOnClose} className="custom-class" />,
 );

 const banner = screen.getByRole('complementary');
 expect(banner).toHaveClass('custom-class');
 });
 });

 describe('WhatsApp Link', () => {
 it('should have correct WhatsApp URL with pre-filled message', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const whatsappLink = screen.getByRole('link', {
 name: /Fale com Tiago Sasaki/i,
 });

 expect(whatsappLink).toHaveAttribute(
 'href',
 expect.stringContaining('wa.me/5548988344559'),
 );
 expect(whatsappLink).toHaveAttribute(
 'href',
 expect.stringContaining('text='),
 );
 });

 it('should open WhatsApp link in new tab', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const whatsappLink = screen.getByRole('link', {
 name: /Fale com Tiago Sasaki/i,
 });

 expect(whatsappLink).toHaveAttribute('target', '_blank');
 expect(whatsappLink).toHaveAttribute('rel', 'noopener noreferrer');
 });
 });

 describe('Close Behavior', () => {
 it('should call onClose when close button is clicked', async () => {
 const user = userEvent.setup();
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const closeButton = screen.getByRole('button', {
 name: /fechar banner/i,
 });
 await user.click(closeButton);

 // Wait for animation timeout
 await waitFor(
 () => {
 expect(mockOnClose).toHaveBeenCalledTimes(1);
 },
 { timeout: 300 },
 );
 });

 it('should apply exit animation when closing', async () => {
 const user = userEvent.setup();
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const banner = screen.getByRole('complementary');
 const closeButton = screen.getByRole('button', {
 name: /fechar banner/i,
 });

 // Initially visible
 expect(banner).toHaveClass('opacity-100');

 await user.click(closeButton);

 // After clicking, should start exit animation
 expect(banner).toHaveClass('opacity-0');
 });
 });

 describe('Styling', () => {
 it('should be positioned fixed at bottom-right', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const banner = screen.getByRole('complementary');
 expect(banner).toHaveClass('fixed', 'bottom-4', 'right-4');
 });

 it('should have shadow and border styling', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const banner = screen.getByRole('complementary');
 expect(banner).toHaveClass('shadow-lg', 'border', 'rounded-xl');
 });

 it('should have WhatsApp green button styling', () => {
 render(<DemoConversionBanner onClose={mockOnClose} />);

 const whatsappLink = screen.getByRole('link', {
 name: /Fale com Tiago Sasaki/i,
 });
 expect(whatsappLink).toHaveClass('bg-green-500');
 });
 });
});
