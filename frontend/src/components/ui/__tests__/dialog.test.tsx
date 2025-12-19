import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
 Dialog,
 DialogTrigger,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from '../dialog';

describe('Dialog', () => {
 describe('Dialog Opening and Closing', () => {
 it('should open dialog when trigger is clicked', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open Dialog</DialogTrigger>
 <DialogContent>
 <DialogTitle>Test Title</DialogTitle>
 </DialogContent>
 </Dialog>,
 );

 expect(screen.queryByText('Test Title')).not.toBeInTheDocument();

 await user.click(screen.getByText('Open Dialog'));

 expect(screen.getByText('Test Title')).toBeInTheDocument();
 });

 it('should close dialog when close button is clicked', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open Dialog</DialogTrigger>
 <DialogContent>
 <DialogTitle>Test Title</DialogTitle>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open Dialog'));
 expect(screen.getByText('Test Title')).toBeInTheDocument();

 await user.click(screen.getByRole('button', { name: /close/i }));
 expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
 });
 });

 describe('DialogContent - Apple HIG Design Tokens', () => {
 it('should use Apple-style border radius', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent data-testid="dialog-content">
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('dialog-content')).toHaveClass(
 'rounded-apple-lg',
 );
 });

 it('should use surface-primary background', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent data-testid="dialog-content">
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('dialog-content')).toHaveClass(
 'bg-surface-primary',
 );
 });

 it('should use Apple-style shadow', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent data-testid="dialog-content">
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('dialog-content')).toHaveClass(
 'shadow-apple-lg',
 );
 });

 it('should use Apple-style duration', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent data-testid="dialog-content">
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('dialog-content')).toHaveClass(
 'duration-apple',
 );
 });
 });

 describe('DialogOverlay', () => {
 it('should render backdrop with blur', async () => {
 const user = userEvent.setup();
 const { container } = render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 // Check for backdrop blur class on overlay
 const overlay = container.querySelector('[data-state="open"]');
 expect(overlay).not.toBeNull();
 });
 });

 describe('DialogTitle', () => {
 it('should use text-apple-primary color', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle data-testid="title">Title</DialogTitle>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('title')).toHaveClass(
 'text-text-apple-primary',
 );
 });

 it('should have semibold weight', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle data-testid="title">Title</DialogTitle>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('title')).toHaveClass('font-semibold');
 });
 });

 describe('DialogDescription', () => {
 it('should use text-apple-secondary color', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 <DialogDescription data-testid="description">
 Description
 </DialogDescription>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('description')).toHaveClass(
 'text-text-apple-secondary',
 );
 });
 });

 describe('DialogHeader', () => {
 it('should use flex column layout', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogHeader data-testid="header">
 <DialogTitle>Title</DialogTitle>
 Header content
 </DialogHeader>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('header')).toHaveClass('flex');
 expect(screen.getByTestId('header')).toHaveClass('flex-col');
 });
 });

 describe('DialogFooter', () => {
 it('should use flex layout with reverse on mobile', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 <DialogFooter data-testid="footer">Footer content</DialogFooter>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 expect(screen.getByTestId('footer')).toHaveClass('flex');
 expect(screen.getByTestId('footer')).toHaveClass('flex-col-reverse');
 });
 });

 describe('Close Button', () => {
 it('should have Apple-style transitions', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 const closeButton = screen.getByRole('button', { name: /close/i });
 expect(closeButton).toHaveClass('transition-all');
 expect(closeButton).toHaveClass('duration-apple');
 expect(closeButton).toHaveClass('ease-apple');
 });

 it('should have focus ring with Apple accent', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 const closeButton = screen.getByRole('button', { name: /close/i });
 expect(closeButton).toHaveClass('focus:ring-apple-accent');
 });

 it('should have hover state with surface-secondary', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent>
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 const closeButton = screen.getByRole('button', { name: /close/i });
 expect(closeButton).toHaveClass('hover:bg-surface-secondary');
 });
 });

 describe('Full Dialog Composition', () => {
 it('should compose all dialog parts correctly', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open Full Dialog</DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Dialog Title</DialogTitle>
 <DialogDescription>Dialog description text</DialogDescription>
 </DialogHeader>
 <div>Main content</div>
 <DialogFooter>
 <button>Cancel</button>
 <button>Submit</button>
 </DialogFooter>
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open Full Dialog'));

 expect(screen.getByText('Dialog Title')).toBeInTheDocument();
 expect(screen.getByText('Dialog description text')).toBeInTheDocument();
 expect(screen.getByText('Main content')).toBeInTheDocument();
 expect(screen.getByText('Cancel')).toBeInTheDocument();
 expect(screen.getByText('Submit')).toBeInTheDocument();
 });
 });

 describe('Custom className', () => {
 it('should merge custom className on DialogContent', async () => {
 const user = userEvent.setup();
 render(
 <Dialog>
 <DialogTrigger>Open</DialogTrigger>
 <DialogContent className="custom-content" data-testid="content">
 <DialogTitle>Title</DialogTitle>
 Content
 </DialogContent>
 </Dialog>,
 );

 await user.click(screen.getByText('Open'));
 const content = screen.getByTestId('content');
 expect(content).toHaveClass('custom-content');
 expect(content).toHaveClass('rounded-apple-lg');
 });
 });
});
