/**
 * Apple HIG Grid System - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  GridContainer,
  GridRow,
  GridCol,
  Grid,
} from './Grid';

describe('GridContainer', () => {
  it('should render children correctly', () => {
    render(
      <GridContainer>
        <div data-testid="child">Test Content</div>
      </GridContainer>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply grid-container class', () => {
    const { container } = render(
      <GridContainer>
        <div>Content</div>
      </GridContainer>
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.className).toContain('grid-container');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GridContainer className="custom-class">
        <div>Content</div>
      </GridContainer>
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.className).toContain('custom-class');
    expect(gridContainer.className).toContain('grid-container');
  });

  it('should render as different HTML element when "as" prop is provided', () => {
    const { container } = render(
      <GridContainer as="section">
        <div>Content</div>
      </GridContainer>
    );

    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  it('should apply fluid style when fluid prop is true', () => {
    const { container } = render(
      <GridContainer fluid>
        <div>Content</div>
      </GridContainer>
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.style.maxWidth).toBe('100%');
  });

  it('should not apply fluid style when fluid prop is false', () => {
    const { container } = render(
      <GridContainer fluid={false}>
        <div>Content</div>
      </GridContainer>
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.style.maxWidth).toBe('');
  });
});

describe('GridRow', () => {
  it('should render children correctly', () => {
    render(
      <GridRow>
        <div data-testid="child">Row Content</div>
      </GridRow>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should apply grid-row class', () => {
    const { container } = render(
      <GridRow>
        <div>Content</div>
      </GridRow>
    );

    const gridRow = container.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-row');
  });

  it('should apply alignment class when align prop is provided', () => {
    const { container } = render(
      <GridRow align="center">
        <div>Content</div>
      </GridRow>
    );

    const gridRow = container.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-row-center');
  });

  it('should apply gap class when gap prop is provided', () => {
    const { container } = render(
      <GridRow gap="lg">
        <div>Content</div>
      </GridRow>
    );

    const gridRow = container.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-gap-lg');
  });

  it('should render as different HTML element when "as" prop is provided', () => {
    const { container } = render(
      <GridRow as="section">
        <div>Content</div>
      </GridRow>
    );

    expect(container.firstChild?.nodeName).toBe('SECTION');
  });
});

describe('GridCol', () => {
  it('should render children correctly', () => {
    render(
      <GridCol>
        <div data-testid="child">Col Content</div>
      </GridCol>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should apply default span class (12) when no span prop provided', () => {
    const { container } = render(
      <GridCol>
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-12');
  });

  it('should apply span class based on span prop', () => {
    const { container } = render(
      <GridCol span={6}>
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-6');
  });

  it('should apply responsive md class when md prop is provided', () => {
    const { container } = render(
      <GridCol span={12} md={6}>
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-12');
    expect(gridCol.className).toContain('grid-col-md-6');
  });

  it('should apply responsive lg class when lg prop is provided', () => {
    const { container } = render(
      <GridCol span={12} md={6} lg={4}>
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-12');
    expect(gridCol.className).toContain('grid-col-md-6');
    expect(gridCol.className).toContain('grid-col-lg-4');
  });

  it('should apply responsive xl class when xl prop is provided', () => {
    const { container } = render(
      <GridCol span={12} md={6} lg={4} xl={3}>
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-12');
    expect(gridCol.className).toContain('grid-col-md-6');
    expect(gridCol.className).toContain('grid-col-lg-4');
    expect(gridCol.className).toContain('grid-col-xl-3');
  });

  it('should apply vertical alignment class when align prop is provided', () => {
    const { container } = render(
      <GridCol align="middle">
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('grid-col-middle');
  });

  it('should render as different HTML element when "as" prop is provided', () => {
    const { container } = render(
      <GridCol as="article">
        <div>Content</div>
      </GridCol>
    );

    expect(container.firstChild?.nodeName).toBe('ARTICLE');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GridCol className="custom-col">
        <div>Content</div>
      </GridCol>
    );

    const gridCol = container.firstChild as HTMLElement;
    expect(gridCol.className).toContain('custom-col');
  });
});

describe('Grid (convenience component)', () => {
  it('should render children correctly', () => {
    render(
      <Grid>
        <div data-testid="child">Grid Content</div>
      </Grid>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should combine GridContainer and GridRow', () => {
    const { container } = render(
      <Grid>
        <div>Content</div>
      </Grid>
    );

    // Should have container with row inside
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.className).toContain('grid-container');

    const gridRow = gridContainer.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-row');
  });

  it('should pass fluid prop to GridContainer', () => {
    const { container } = render(
      <Grid fluid>
        <div>Content</div>
      </Grid>
    );

    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer.style.maxWidth).toBe('100%');
  });

  it('should pass align prop to GridRow', () => {
    const { container } = render(
      <Grid align="center">
        <div>Content</div>
      </Grid>
    );

    const gridContainer = container.firstChild as HTMLElement;
    const gridRow = gridContainer.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-row-center');
  });

  it('should pass gap prop to GridRow', () => {
    const { container } = render(
      <Grid gap="lg">
        <div>Content</div>
      </Grid>
    );

    const gridContainer = container.firstChild as HTMLElement;
    const gridRow = gridContainer.firstChild as HTMLElement;
    expect(gridRow.className).toContain('grid-gap-lg');
  });
});

describe('Grid System Integration', () => {
  it('should render complete grid structure with Container, Row, and Cols', () => {
    render(
      <GridContainer>
        <GridRow>
          <GridCol span={6}>
            <div data-testid="col-1">Column 1</div>
          </GridCol>
          <GridCol span={6}>
            <div data-testid="col-2">Column 2</div>
          </GridCol>
        </GridRow>
      </GridContainer>
    );

    expect(screen.getByTestId('col-1')).toBeInTheDocument();
    expect(screen.getByTestId('col-2')).toBeInTheDocument();
  });

  it('should handle responsive breakpoints correctly', () => {
    const { container } = render(
      <GridContainer>
        <GridRow>
          <GridCol span={12} md={6} lg={4} xl={3}>
            <div>Responsive Column</div>
          </GridCol>
        </GridRow>
      </GridContainer>
    );

    const col = container.querySelector('[class*="grid-col"]') as HTMLElement;
    expect(col.className).toContain('grid-col-12');
    expect(col.className).toContain('grid-col-md-6');
    expect(col.className).toContain('grid-col-lg-4');
    expect(col.className).toContain('grid-col-xl-3');
  });

  it('should allow nesting of grids', () => {
    render(
      <GridContainer>
        <GridRow>
          <GridCol span={12}>
            <GridRow>
              <GridCol span={6}>
                <div data-testid="nested-col">Nested Column</div>
              </GridCol>
            </GridRow>
          </GridCol>
        </GridRow>
      </GridContainer>
    );

    expect(screen.getByTestId('nested-col')).toBeInTheDocument();
  });
});
