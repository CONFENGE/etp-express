import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '../form-field';
import { Input } from '../input';

describe('FormField', () => {
 describe('Rendering', () => {
 it('should render label and children', () => {
 render(
 <FormField id="test" label="Test Label">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.getByText('Test Label')).toBeInTheDocument();
 expect(screen.getByRole('textbox')).toBeInTheDocument();
 });

 it('should render with custom className', () => {
 const { container } = render(
 <FormField id="test" label="Test" className="custom-class">
 <Input id="test" />
 </FormField>,
 );

 expect(container.firstChild).toHaveClass('custom-class');
 expect(container.firstChild).toHaveClass('space-y-2');
 });
 });

 describe('Required Indicator', () => {
 it('should show asterisk when required is true', () => {
 render(
 <FormField id="test" label="Required Field" required>
 <Input id="test" />
 </FormField>,
 );

 const asterisk = screen.getByText('*');
 expect(asterisk).toBeInTheDocument();
 expect(asterisk).toHaveClass('text-destructive');
 expect(asterisk).toHaveAttribute('aria-hidden', 'true');
 });

 it('should not show asterisk when required is false', () => {
 render(
 <FormField id="test" label="Optional Field">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.queryByText('*')).not.toBeInTheDocument();
 });

 it('should not show asterisk when required is undefined', () => {
 render(
 <FormField id="test" label="Default Field">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.queryByText('*')).not.toBeInTheDocument();
 });
 });

 describe('Helper Text (Hint)', () => {
 it('should render hint text when provided', () => {
 render(
 <FormField id="test" label="Test" hint="This is a hint">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.getByText('This is a hint')).toBeInTheDocument();
 });

 it('should have correct hint id for aria-describedby', () => {
 render(
 <FormField id="email" label="Email" hint="Use your work email">
 <Input id="email" />
 </FormField>,
 );

 const hint = screen.getByText('Use your work email');
 expect(hint).toHaveAttribute('id', 'email-hint');
 });

 it('should style hint as muted foreground', () => {
 render(
 <FormField id="test" label="Test" hint="Hint text">
 <Input id="test" />
 </FormField>,
 );

 const hint = screen.getByText('Hint text');
 expect(hint).toHaveClass('text-xs');
 expect(hint).toHaveClass('text-muted-foreground');
 });

 it('should not render hint when not provided', () => {
 render(
 <FormField id="test" label="Test">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.queryByText(/hint/i)).not.toBeInTheDocument();
 });
 });

 describe('Error State', () => {
 it('should render error message when provided', () => {
 render(
 <FormField id="test" label="Test" error="This field is required">
 <Input id="test" />
 </FormField>,
 );

 const error = screen.getByText('This field is required');
 expect(error).toBeInTheDocument();
 expect(error).toHaveAttribute('role', 'alert');
 });

 it('should have correct error id', () => {
 render(
 <FormField id="email" label="Email" error="Invalid email">
 <Input id="email" />
 </FormField>,
 );

 const error = screen.getByText('Invalid email');
 expect(error).toHaveAttribute('id', 'email-error');
 });

 it('should style error as destructive', () => {
 render(
 <FormField id="test" label="Test" error="Error message">
 <Input id="test" />
 </FormField>,
 );

 const error = screen.getByText('Error message');
 expect(error).toHaveClass('text-sm');
 expect(error).toHaveClass('text-destructive');
 });

 it('should hide hint when error is present', () => {
 render(
 <FormField
 id="test"
 label="Test"
 hint="This is a hint"
 error="This is an error"
 >
 <Input id="test" />
 </FormField>,
 );

 expect(screen.queryByText('This is a hint')).not.toBeInTheDocument();
 expect(screen.getByText('This is an error')).toBeInTheDocument();
 });

 it('should show hint when there is no error', () => {
 render(
 <FormField id="test" label="Test" hint="This is a hint">
 <Input id="test" />
 </FormField>,
 );

 expect(screen.getByText('This is a hint')).toBeInTheDocument();
 });
 });

 describe('Accessibility', () => {
 it('should link label to input via htmlFor', () => {
 render(
 <FormField id="username" label="Username">
 <Input id="username" />
 </FormField>,
 );

 const label = screen.getByText('Username');
 expect(label).toHaveAttribute('for', 'username');
 });

 it('should link hint to input via aria-describedby', () => {
 render(
 <FormField id="email" label="Email" hint="Use work email">
 <Input id="email" data-testid="email-input" />
 </FormField>,
 );

 const input = screen.getByTestId('email-input');
 expect(input).toHaveAttribute('aria-describedby', 'email-hint');
 });

 it('should link error to input via aria-describedby', () => {
 render(
 <FormField id="email" label="Email" error="Invalid email">
 <Input id="email" data-testid="email-input" />
 </FormField>,
 );

 const input = screen.getByTestId('email-input');
 expect(input).toHaveAttribute('aria-describedby', 'email-error');
 });

 it('should not set aria-describedby when no hint or error', () => {
 render(
 <FormField id="test" label="Test">
 <Input id="test" data-testid="test-input" />
 </FormField>,
 );

 const input = screen.getByTestId('test-input');
 expect(input).not.toHaveAttribute('aria-describedby');
 });

 it('should hide asterisk from screen readers', () => {
 render(
 <FormField id="test" label="Required" required>
 <Input id="test" />
 </FormField>,
 );

 const asterisk = screen.getByText('*');
 expect(asterisk).toHaveAttribute('aria-hidden', 'true');
 });
 });

 describe('Integration with different children', () => {
 it('should work with wrapped input (e.g., password with toggle)', () => {
 render(
 <FormField id="password" label="Password" required hint="Min 6 chars">
 <div className="relative">
 <Input id="password" type="password" />
 </div>
 </FormField>,
 );

 expect(screen.getByText('Password')).toBeInTheDocument();
 expect(screen.getByText('*')).toBeInTheDocument();
 expect(screen.getByText('Min 6 chars')).toBeInTheDocument();
 });

 it('should pass aria-describedby to wrapped children', () => {
 render(
 <FormField id="test" label="Test" hint="Helper text">
 <div data-testid="wrapper">
 <Input id="test" />
 </div>
 </FormField>,
 );

 const wrapper = screen.getByTestId('wrapper');
 expect(wrapper).toHaveAttribute('aria-describedby', 'test-hint');
 });
 });
});
