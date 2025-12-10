import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  describe('Base Card', () => {
    it('should render card container', () => {
      render(<Card data-testid="card">Card content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should use Apple-style border radius', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('rounded-apple-lg');
    });

    it('should use surface-primary background', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('bg-surface-primary');
    });

    it('should use Apple-style shadow', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('shadow-apple');
    });

    it('should use text-apple-primary for text color', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('text-text-apple-primary');
    });

    it('should use Apple-style transitions', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-apple');
      expect(card).toHaveClass('ease-apple');
    });
  });

  describe('Interactive Card', () => {
    it('should apply interactive styles when interactive prop is true', () => {
      render(
        <Card interactive data-testid="interactive-card">
          Interactive
        </Card>,
      );
      const card = screen.getByTestId('interactive-card');
      expect(card).toHaveClass('hover:shadow-apple-lg');
      expect(card).toHaveClass('hover:scale-[1.01]');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should not apply interactive styles when interactive is false', () => {
      render(<Card data-testid="static-card">Static</Card>);
      const card = screen.getByTestId('static-card');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('CardHeader', () => {
    it('should render header section', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('should use flex column layout', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveClass('flex');
      expect(screen.getByTestId('header')).toHaveClass('flex-col');
    });

    it('should have correct padding', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveClass('p-6');
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should use text-apple-primary color', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass(
        'text-text-apple-primary',
      );
    });

    it('should have semibold weight', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('font-semibold');
    });

    it('should have tight leading', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('leading-none');
    });
  });

  describe('CardDescription', () => {
    it('should render paragraph element', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should use text-apple-secondary color', () => {
      render(
        <CardDescription data-testid="description">
          Description
        </CardDescription>,
      );
      expect(screen.getByTestId('description')).toHaveClass(
        'text-text-apple-secondary',
      );
    });
  });

  describe('CardContent', () => {
    it('should render content section', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should have correct padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });
  });

  describe('CardFooter', () => {
    it('should render footer section', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('should use flex layout', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveClass('flex');
      expect(screen.getByTestId('footer')).toHaveClass('items-center');
    });

    it('should have correct padding', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('p-6');
      expect(footer).toHaveClass('pt-0');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className on Card', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Card
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-apple-lg');
    });

    it('should merge custom className on subcomponents', () => {
      render(
        <CardTitle className="custom-title" data-testid="title">
          Title
        </CardTitle>,
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('Full Card Composition', () => {
    it('should compose all card parts correctly', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>Main content goes here</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>,
      );

      expect(screen.getByTestId('full-card')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Card Title' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Card description text')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByText('Footer actions')).toBeInTheDocument();
    });
  });
});
