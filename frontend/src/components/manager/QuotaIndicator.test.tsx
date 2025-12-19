import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuotaIndicator } from './QuotaIndicator';
import { QuotaInfo } from '@/store/managerStore';

describe('QuotaIndicator', () => {
 const mockQuotaSafe: QuotaInfo = {
 currentUsers: 3,
 maxUsers: 10,
 available: 7,
 percentUsed: 30,
 };

 const mockQuotaWarning: QuotaInfo = {
 currentUsers: 7,
 maxUsers: 10,
 available: 3,
 percentUsed: 70,
 };

 const mockQuotaCritical: QuotaInfo = {
 currentUsers: 9,
 maxUsers: 10,
 available: 1,
 percentUsed: 90,
 };

 describe('Rendering with data', () => {
 it('should render quota values', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} />);

 expect(screen.getByText('3')).toBeInTheDocument();
 expect(screen.getByText('/ 10')).toBeInTheDocument();
 });

 it('should display percentage used', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} />);

 expect(screen.getByText('30% used')).toBeInTheDocument();
 });

 it('should display slots available', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} />);

 expect(screen.getByText('7 slots available')).toBeInTheDocument();
 });

 it('should display singular slot when 1 available', () => {
 render(<QuotaIndicator quota={mockQuotaCritical} />);

 expect(screen.getByText('1 slot available')).toBeInTheDocument();
 });

 it('should have correct aria attributes', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} />);

 const meter = screen.getByRole('meter');
 expect(meter).toHaveAttribute('aria-valuenow', '3');
 expect(meter).toHaveAttribute('aria-valuemin', '0');
 expect(meter).toHaveAttribute('aria-valuemax', '10');
 });
 });

 describe('Color thresholds', () => {
 it('should use green color for safe zone (0-60%)', () => {
 const { container } = render(<QuotaIndicator quota={mockQuotaSafe} />);

 const greenText = container.querySelector('.text-green-500');
 expect(greenText).toBeInTheDocument();
 });

 it('should use yellow color for warning zone (60-80%)', () => {
 const { container } = render(<QuotaIndicator quota={mockQuotaWarning} />);

 const yellowText = container.querySelector('.text-yellow-500');
 expect(yellowText).toBeInTheDocument();
 });

 it('should use red color for critical zone (80-100%)', () => {
 const { container } = render(
 <QuotaIndicator quota={mockQuotaCritical} />,
 );

 const redText = container.querySelector('.text-red-500');
 expect(redText).toBeInTheDocument();
 });
 });

 describe('Size variants', () => {
 it('should render small size', () => {
 const { container } = render(
 <QuotaIndicator quota={mockQuotaSafe} size="sm" />,
 );

 const svg = container.querySelector('svg');
 expect(svg).toHaveAttribute('width', '80');
 expect(svg).toHaveAttribute('height', '80');
 });

 it('should render medium size (default)', () => {
 const { container } = render(<QuotaIndicator quota={mockQuotaSafe} />);

 const svg = container.querySelector('svg');
 expect(svg).toHaveAttribute('width', '120');
 expect(svg).toHaveAttribute('height', '120');
 });

 it('should render large size', () => {
 const { container } = render(
 <QuotaIndicator quota={mockQuotaSafe} size="lg" />,
 );

 const svg = container.querySelector('svg');
 expect(svg).toHaveAttribute('width', '160');
 expect(svg).toHaveAttribute('height', '160');
 });
 });

 describe('Loading state', () => {
 it('should show loading skeleton when loading', () => {
 render(<QuotaIndicator quota={null} loading={true} />);

 const loadingElement = screen.getByRole('status', {
 name: /loading quota/i,
 });
 expect(loadingElement).toBeInTheDocument();
 });

 it('should have animate-pulse class when loading', () => {
 const { container } = render(
 <QuotaIndicator quota={null} loading={true} />,
 );

 const animatedElements = container.querySelectorAll('.animate-pulse');
 expect(animatedElements.length).toBeGreaterThan(0);
 });
 });

 describe('Null quota state', () => {
 it('should show placeholder when quota is null', () => {
 render(<QuotaIndicator quota={null} />);

 expect(screen.getByText('--')).toBeInTheDocument();
 expect(screen.getByText('No data')).toBeInTheDocument();
 });

 it('should have correct aria label for unavailable state', () => {
 render(<QuotaIndicator quota={null} />);

 const element = screen.getByRole('status', {
 name: /quota information unavailable/i,
 });
 expect(element).toBeInTheDocument();
 });
 });

 describe('Text visibility', () => {
 it('should hide text when showText is false', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} showText={false} />);

 expect(screen.queryByText('30% used')).not.toBeInTheDocument();
 expect(screen.queryByText('7 slots available')).not.toBeInTheDocument();
 });

 it('should show text by default', () => {
 render(<QuotaIndicator quota={mockQuotaSafe} />);

 expect(screen.getByText('30% used')).toBeInTheDocument();
 expect(screen.getByText('7 slots available')).toBeInTheDocument();
 });
 });

 describe('SVG ring progress', () => {
 it('should render SVG with two circles', () => {
 const { container } = render(<QuotaIndicator quota={mockQuotaSafe} />);

 const circles = container.querySelectorAll('circle');
 expect(circles.length).toBe(2); // background + progress
 });

 it('should have correct progress circle attributes', () => {
 const { container } = render(<QuotaIndicator quota={mockQuotaSafe} />);

 const circles = container.querySelectorAll('circle');
 const progressCircle = circles[1];

 expect(progressCircle).toHaveAttribute('stroke-linecap', 'round');
 expect(progressCircle).toHaveAttribute('stroke', '#22c55e'); // green for 30%
 });
 });

 describe('Custom className', () => {
 it('should apply custom className', () => {
 const { container } = render(
 <QuotaIndicator quota={mockQuotaSafe} className="custom-class" />,
 );

 expect(container.firstChild).toHaveClass('custom-class');
 });
 });
});
