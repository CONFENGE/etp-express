/**
 * WCAG 2.5.5 Touch Target Size Tests
 *
 * These tests verify that all interactive elements meet the
 * minimum 44x44px touch target requirement per WCAG 2.5.5.
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

describe('WCAG 2.5.5 Touch Target Size', () => {
  describe('Button component', () => {
    it('should have 44px min height for default size', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should have 44px min height for small size', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('should have 44px min height and width for icon size', () => {
      render(<Button size="icon">X</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('min-w-[44px]');
    });

    it('should have 44px min height for large size', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
    });
  });

  describe('Input component', () => {
    it('should have min-h-[44px] for WCAG 2.5.5 touch target', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      // Input uses min-h-[44px] directly instead of min-h-touch utility
      expect(input).toHaveClass('min-h-[44px]');
    });
  });

  describe('Checkbox component', () => {
    it('should have extended touch area via ::before pseudo-element', () => {
      render(<Checkbox aria-label="Accept terms" />);
      const checkbox = screen.getByRole('checkbox');
      // Checkbox uses before:absolute before:-inset-[14px] for touch area
      expect(checkbox).toHaveClass('before:absolute');
      expect(checkbox).toHaveClass('before:-inset-[14px]');
    });
  });

  describe('Select component', () => {
    it('should have min-h-touch for trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>,
      );
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveClass('min-h-touch');
    });
  });

  describe('Tabs component', () => {
    it('should have min-h-touch for TabsList', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toHaveClass('min-h-touch');
    });
  });

  describe('Dialog component', () => {
    it('should have min-h-touch and min-w-touch for close button', async () => {
      render(
        <Dialog defaultOpen>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <p>Dialog content</p>
          </DialogContent>
        </Dialog>,
      );

      // Find the close button (X button)
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('min-h-touch');
      expect(closeButton).toHaveClass('min-w-touch');
    });
  });

  describe('AlertDialog component', () => {
    it('should have min-h-touch for action and cancel buttons', () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogTrigger asChild>
            <Button>Open Alert</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const actionButton = screen.getByRole('button', { name: /continue/i });

      expect(cancelButton).toHaveClass('min-h-touch');
      expect(actionButton).toHaveClass('min-h-touch');
    });
  });

  describe('DropdownMenu component', () => {
    it('should have min-h-touch for menu items', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger asChild>
            <Button>Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Wait for dropdown to open
      const menuItems = await screen.findAllByRole('menuitem');
      menuItems.forEach((item) => {
        expect(item).toHaveClass('min-h-touch');
      });
    });
  });
});
