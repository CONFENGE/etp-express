/**
 * Apple HIG Grid System - Visual Examples
 * Demonstrates responsive grid layouts
 */

import React from 'react';
import { GridContainer, GridRow, GridCol, Grid } from './Grid';

/**
 * Example 1: Basic 12-column grid
 */
export const BasicGridExample: React.FC = () => {
  return (
    <GridContainer>
      <GridRow>
        <GridCol span={12}>
          <div style={{ background: '#E3F2FD', padding: '16px', borderRadius: '8px' }}>
            Full Width (12 columns)
          </div>
        </GridCol>
      </GridRow>
      <GridRow>
        <GridCol span={6}>
          <div style={{ background: '#E8F5E9', padding: '16px', borderRadius: '8px' }}>
            Half Width (6 columns)
          </div>
        </GridCol>
        <GridCol span={6}>
          <div style={{ background: '#FFF3E0', padding: '16px', borderRadius: '8px' }}>
            Half Width (6 columns)
          </div>
        </GridCol>
      </GridRow>
      <GridRow>
        <GridCol span={4}>
          <div style={{ background: '#FCE4EC', padding: '16px', borderRadius: '8px' }}>
            1/3 Width (4 columns)
          </div>
        </GridCol>
        <GridCol span={4}>
          <div style={{ background: '#F3E5F5', padding: '16px', borderRadius: '8px' }}>
            1/3 Width (4 columns)
          </div>
        </GridCol>
        <GridCol span={4}>
          <div style={{ background: '#EDE7F6', padding: '16px', borderRadius: '8px' }}>
            1/3 Width (4 columns)
          </div>
        </GridCol>
      </GridRow>
    </GridContainer>
  );
};

/**
 * Example 2: Responsive grid (mobile-first)
 * Mobile: Stack vertically (12 cols each)
 * Tablet: 2 columns (6 cols each)
 * Desktop: 3 columns (4 cols each)
 */
export const ResponsiveGridExample: React.FC = () => {
  const cardStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    minHeight: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <GridContainer>
      <GridRow gap="default">
        <GridCol span={12} md={6} lg={4}>
          <div style={cardStyle}>
            Mobile: 12 cols<br />
            Tablet: 6 cols<br />
            Desktop: 4 cols
          </div>
        </GridCol>
        <GridCol span={12} md={6} lg={4}>
          <div style={cardStyle}>
            Mobile: 12 cols<br />
            Tablet: 6 cols<br />
            Desktop: 4 cols
          </div>
        </GridCol>
        <GridCol span={12} md={6} lg={4}>
          <div style={cardStyle}>
            Mobile: 12 cols<br />
            Tablet: 6 cols<br />
            Desktop: 4 cols
          </div>
        </GridCol>
      </GridRow>
    </GridContainer>
  );
};

/**
 * Example 3: Dashboard layout with sidebar
 * Mobile: Stack (sidebar on top)
 * Desktop: Sidebar (3 cols) + Content (9 cols)
 */
export const DashboardLayoutExample: React.FC = () => {
  return (
    <GridContainer>
      <GridRow>
        <GridCol span={12} lg={3}>
          <div
            style={{
              background: '#37474F',
              color: 'white',
              padding: '24px',
              borderRadius: '12px',
              minHeight: '300px',
            }}
          >
            <h3>Sidebar</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '12px' }}>Dashboard</li>
              <li style={{ marginBottom: '12px' }}>ETPs</li>
              <li style={{ marginBottom: '12px' }}>Templates</li>
              <li style={{ marginBottom: '12px' }}>Settings</li>
            </ul>
          </div>
        </GridCol>
        <GridCol span={12} lg={9}>
          <div
            style={{
              background: '#ECEFF1',
              padding: '24px',
              borderRadius: '12px',
              minHeight: '300px',
            }}
          >
            <h2>Main Content</h2>
            <p>Desktop: 9 columns | Mobile: 12 columns (full width)</p>
          </div>
        </GridCol>
      </GridRow>
    </GridContainer>
  );
};

/**
 * Example 4: Nested grids
 */
export const NestedGridExample: React.FC = () => {
  return (
    <GridContainer>
      <GridRow>
        <GridCol span={12}>
          <div
            style={{
              background: '#E0F2F1',
              padding: '16px',
              borderRadius: '12px',
            }}
          >
            <h3>Outer Container (12 cols)</h3>
            <GridRow>
              <GridCol span={6}>
                <div
                  style={{
                    background: '#B2DFDB',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  Nested Left (6 cols)
                </div>
              </GridCol>
              <GridCol span={6}>
                <div
                  style={{
                    background: '#80CBC4',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  Nested Right (6 cols)
                </div>
              </GridCol>
            </GridRow>
          </div>
        </GridCol>
      </GridRow>
    </GridContainer>
  );
};

/**
 * Example 5: Convenience Grid component
 */
export const ConvenienceGridExample: React.FC = () => {
  return (
    <Grid align="center" gap="lg">
      <GridCol span={12} md={4}>
        <div
          style={{
            background: '#FF6B6B',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          Card 1
        </div>
      </GridCol>
      <GridCol span={12} md={4}>
        <div
          style={{
            background: '#4ECDC4',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          Card 2
        </div>
      </GridCol>
      <GridCol span={12} md={4}>
        <div
          style={{
            background: '#FFE66D',
            color: '#333',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          Card 3
        </div>
      </GridCol>
    </Grid>
  );
};

/**
 * Example 6: Alignment and gap variations
 */
export const AlignmentExample: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Start alignment */}
      <GridContainer>
        <GridRow align="start">
          <GridCol span={3}>
            <div style={{ background: '#BBDEFB', padding: '16px', borderRadius: '8px' }}>
              Start
            </div>
          </GridCol>
        </GridRow>
      </GridContainer>

      {/* Center alignment */}
      <GridContainer>
        <GridRow align="center">
          <GridCol span={3}>
            <div style={{ background: '#C8E6C9', padding: '16px', borderRadius: '8px' }}>
              Center
            </div>
          </GridCol>
        </GridRow>
      </GridContainer>

      {/* End alignment */}
      <GridContainer>
        <GridRow align="end">
          <GridCol span={3}>
            <div style={{ background: '#FFE0B2', padding: '16px', borderRadius: '8px' }}>
              End
            </div>
          </GridCol>
        </GridRow>
      </GridContainer>

      {/* Space between */}
      <GridContainer>
        <GridRow align="between">
          <GridCol span={3}>
            <div style={{ background: '#F8BBD0', padding: '16px', borderRadius: '8px' }}>
              Between
            </div>
          </GridCol>
          <GridCol span={3}>
            <div style={{ background: '#E1BEE7', padding: '16px', borderRadius: '8px' }}>
              Between
            </div>
          </GridCol>
        </GridRow>
      </GridContainer>
    </div>
  );
};

/**
 * Full Demo Page
 */
export const GridSystemDemo: React.FC = () => {
  return (
    <div style={{ padding: '40px', background: '#F5F5F5' }}>
      <h1 style={{ marginBottom: '40px' }}>Apple HIG Grid System</h1>

      <section style={{ marginBottom: '60px' }}>
        <h2>1. Basic 12-Column Grid</h2>
        <BasicGridExample />
      </section>

      <section style={{ marginBottom: '60px' }}>
        <h2>2. Responsive Grid (Resize to see)</h2>
        <ResponsiveGridExample />
      </section>

      <section style={{ marginBottom: '60px' }}>
        <h2>3. Dashboard Layout</h2>
        <DashboardLayoutExample />
      </section>

      <section style={{ marginBottom: '60px' }}>
        <h2>4. Nested Grids</h2>
        <NestedGridExample />
      </section>

      <section style={{ marginBottom: '60px' }}>
        <h2>5. Convenience Grid Component</h2>
        <ConvenienceGridExample />
      </section>

      <section style={{ marginBottom: '60px' }}>
        <h2>6. Alignment Variations</h2>
        <AlignmentExample />
      </section>
    </div>
  );
};
