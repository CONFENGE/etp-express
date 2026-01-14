/**
 * Apple HIG Grid System Components
 * Flexible 12-column responsive grid following Apple Human Interface Guidelines
 */

import React from 'react';
import '../../styles/tokens/grid.css';

/**
 * Grid Container Props
 */
export interface GridContainerProps {
  children: React.ReactNode;
  className?: string;
  fluid?: boolean; // If true, removes max-width constraint
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Grid Container Component
 * Centers content and applies responsive margins
 */
export const GridContainer: React.FC<GridContainerProps> = ({
  children,
  className = '',
  fluid = false,
  as: Component = 'div',
}) => {
  const classes = ['grid-container', className]
    .filter(Boolean)
    .join(' ')
    .trim();

  const style = fluid ? { maxWidth: '100%' } : undefined;

  return (
    <Component className={classes} style={style}>
      {children}
    </Component>
  );
};

/**
 * Grid Row Props
 */
export interface GridRowProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'default' | 'sm' | 'lg';
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Grid Row Component
 * Flex container for grid columns
 */
export const GridRow: React.FC<GridRowProps> = ({
  children,
  className = '',
  align,
  gap,
  as: Component = 'div',
}) => {
  const alignClass = align ? `grid-row-${align}` : '';
  const gapClass = gap ? `grid-gap${gap !== 'default' ? `-${gap}` : ''}` : '';

  const classes = ['grid-row', alignClass, gapClass, className]
    .filter(Boolean)
    .join(' ')
    .trim();

  return <Component className={classes}>{children}</Component>;
};

/**
 * Grid Column Props
 */
export interface GridColProps {
  children?: React.ReactNode;
  className?: string;
  /** Column span (1-12) for mobile */
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Column span for tablet (md: 768px+) */
  md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Column span for desktop (lg: 1024px+) */
  lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Column span for large desktop (xl: 1280px+) */
  xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Vertical alignment */
  align?: 'top' | 'middle' | 'bottom' | 'stretch';
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Grid Column Component
 * Responsive column with flexible sizing
 */
export const GridCol: React.FC<GridColProps> = ({
  children,
  className = '',
  span = 12,
  md,
  lg,
  xl,
  align,
  as: Component = 'div',
}) => {
  const spanClass = `grid-col-${span}`;
  const mdClass = md ? `grid-col-md-${md}` : '';
  const lgClass = lg ? `grid-col-lg-${lg}` : '';
  const xlClass = xl ? `grid-col-xl-${xl}` : '';
  const alignClass = align ? `grid-col-${align}` : '';

  const classes = [
    spanClass,
    mdClass,
    lgClass,
    xlClass,
    alignClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return <Component className={classes}>{children}</Component>;
};

/**
 * Convenience component: Grid (combines Container + Row)
 * For simpler layouts that don't need separate container/row
 */
export interface GridProps {
  children: React.ReactNode;
  className?: string;
  fluid?: boolean;
  align?: GridRowProps['align'];
  gap?: GridRowProps['gap'];
}

export const Grid: React.FC<GridProps> = ({
  children,
  className = '',
  fluid = false,
  align,
  gap,
}) => {
  return (
    <GridContainer fluid={fluid} className={className}>
      <GridRow align={align} gap={gap}>
        {children}
      </GridRow>
    </GridContainer>
  );
};

// Default export for convenience
export default {
  Container: GridContainer,
  Row: GridRow,
  Col: GridCol,
  Grid,
};
