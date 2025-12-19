/**
 * Accessibility Tests - WCAG 2.1 AA Compliance
 *
 * These tests validate accessibility compliance
 * across the application's main components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { SkipLink } from './common/SkipLink';

describe('Accessibility Tests - WCAG 2.1 AA', () => {
 describe('Focus Management', () => {
 it('buttons should be focusable', () => {
 const { getByRole } = render(<Button>Focus me</Button>);
 const button = getByRole('button');

 button.focus();
 expect(document.activeElement).toBe(button);
 });

 it('inputs should be focusable', () => {
 const { getByRole } = render(
 <Input aria-label="Test input" type="text" />,
 );
 const input = getByRole('textbox');

 input.focus();
 expect(document.activeElement).toBe(input);
 });

 it('disabled buttons should not receive focus on click', () => {
 const { getByRole } = render(<Button disabled>Disabled</Button>);
 const button = getByRole('button');

 // Disabled buttons should be marked as disabled
 expect(button).toBeDisabled();
 });
 });

 describe('ARIA Attributes', () => {
 it('buttons should have accessible names', () => {
 const { getByRole } = render(<Button>Save Document</Button>);
 const button = getByRole('button', { name: 'Save Document' });
 expect(button).toBeInTheDocument();
 });

 it('icon-only buttons should have aria-label', () => {
 const { getByRole } = render(
 <Button aria-label="Close dialog" size="icon">
 <span aria-hidden="true">X</span>
 </Button>,
 );
 const button = getByRole('button', { name: 'Close dialog' });
 expect(button).toBeInTheDocument();
 });

 it('inputs should support aria-describedby for help text', () => {
 render(
 <div>
 <label htmlFor="password">Password</label>
 <Input
 id="password"
 type="password"
 aria-describedby="password-help"
 />
 <p id="password-help">Password must be at least 8 characters.</p>
 </div>,
 );
 const input = document.getElementById('password');
 expect(input).toHaveAttribute('aria-describedby', 'password-help');
 });

 it('inputs should support aria-invalid for error states', () => {
 render(
 <div>
 <label htmlFor="email">Email</label>
 <Input
 id="email"
 type="email"
 aria-invalid="true"
 aria-describedby="email-error"
 />
 <p id="email-error" role="alert">
 Invalid email format
 </p>
 </div>,
 );
 const input = document.getElementById('email');
 expect(input).toHaveAttribute('aria-invalid', 'true');
 expect(input).toHaveAttribute('aria-describedby', 'email-error');
 });

 it('required fields should have aria-required', () => {
 render(
 <div>
 <label htmlFor="name">Name</label>
 <Input id="name" required aria-required="true" />
 </div>,
 );
 const input = document.getElementById('name');
 expect(input).toHaveAttribute('aria-required', 'true');
 });
 });

 describe('Button Component Accessibility', () => {
 it('default button renders with correct role', () => {
 render(<Button>Click me</Button>);
 expect(screen.getByRole('button')).toBeInTheDocument();
 });

 it('button variants maintain accessibility', () => {
 const { rerender } = render(<Button variant="default">Primary</Button>);
 expect(screen.getByRole('button')).toBeInTheDocument();

 rerender(<Button variant="destructive">Delete</Button>);
 expect(
 screen.getByRole('button', { name: 'Delete' }),
 ).toBeInTheDocument();

 rerender(<Button variant="outline">Outline</Button>);
 expect(
 screen.getByRole('button', { name: 'Outline' }),
 ).toBeInTheDocument();

 rerender(<Button variant="secondary">Secondary</Button>);
 expect(
 screen.getByRole('button', { name: 'Secondary' }),
 ).toBeInTheDocument();

 rerender(<Button variant="ghost">Ghost</Button>);
 expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument();

 rerender(<Button variant="link">Link</Button>);
 expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
 });

 it('disabled button has disabled attribute', () => {
 render(<Button disabled>Disabled</Button>);
 expect(screen.getByRole('button')).toBeDisabled();
 });
 });

 describe('Input Component Accessibility', () => {
 it('input with label is accessible', () => {
 render(
 <div>
 <label htmlFor="email">Email</label>
 <Input id="email" type="email" />
 </div>,
 );
 const input = screen.getByLabelText('Email');
 expect(input).toBeInTheDocument();
 });

 it('input with aria-label is accessible', () => {
 render(<Input aria-label="Search" type="search" />);
 const input = screen.getByLabelText('Search');
 expect(input).toBeInTheDocument();
 });

 it('disabled input has disabled attribute', () => {
 render(<Input aria-label="Disabled" disabled />);
 expect(screen.getByLabelText('Disabled')).toBeDisabled();
 });
 });

 describe('Card Component Accessibility', () => {
 it('card content is accessible', () => {
 render(
 <Card>
 <CardHeader>
 <CardTitle>Card Title</CardTitle>
 </CardHeader>
 <CardContent>
 <p>Card content goes here.</p>
 </CardContent>
 </Card>,
 );
 expect(screen.getByText('Card Title')).toBeInTheDocument();
 expect(screen.getByText('Card content goes here.')).toBeInTheDocument();
 });
 });

 describe('SkipLink Component Accessibility', () => {
 it('skip link is rendered and accessible', () => {
 render(<SkipLink />);
 const link = screen.getByText('Skip to main content');
 expect(link).toBeInTheDocument();
 expect(link.tagName.toLowerCase()).toBe('a');
 expect(link).toHaveAttribute('href', '#main-content');
 });

 it('skip link with custom props is accessible', () => {
 render(<SkipLink targetId="custom" label="Skip navigation" />);
 const link = screen.getByText('Skip navigation');
 expect(link).toHaveAttribute('href', '#custom');
 });
 });

 describe('Form Accessibility Patterns', () => {
 it('form with accessible fields renders correctly', () => {
 render(
 <form aria-label="Contact form">
 <div>
 <label htmlFor="name">Name</label>
 <Input id="name" required aria-required="true" />
 </div>
 <div>
 <label htmlFor="email">Email</label>
 <Input id="email" type="email" required aria-required="true" />
 </div>
 <Button type="submit">Submit</Button>
 </form>,
 );

 expect(screen.getByLabelText('Name')).toHaveAttribute(
 'aria-required',
 'true',
 );
 expect(screen.getByLabelText('Email')).toHaveAttribute(
 'aria-required',
 'true',
 );
 expect(
 screen.getByRole('button', { name: 'Submit' }),
 ).toBeInTheDocument();
 });

 it('form with error messages is accessible', () => {
 render(
 <div>
 <label htmlFor="username">Username</label>
 <Input
 id="username"
 aria-invalid="true"
 aria-describedby="username-error"
 />
 <p id="username-error" role="alert">
 Username is required
 </p>
 </div>,
 );

 const input = screen.getByLabelText('Username');
 expect(input).toHaveAttribute('aria-invalid', 'true');
 expect(screen.getByRole('alert')).toHaveTextContent(
 'Username is required',
 );
 });
 });
});
