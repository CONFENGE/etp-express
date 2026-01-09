import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ETPEditorTabsList } from './ETPEditorTabsList';
import { Tabs } from '@/components/ui/tabs';

describe('ETPEditorTabsList', () => {
  const mockSections = [
    {
      id: '1',
      title: 'I - Necessidade',
      fullTitle: 'I - Necessidade da Contratação',
      completed: false,
    },
    {
      id: '2',
      title: 'II - Objetivos',
      fullTitle: 'II - Objetivos da Contratação',
      completed: true,
    },
    {
      id: '3',
      title: 'III - Descrição',
      fullTitle: 'III - Descrição da Solução',
      completed: false,
    },
  ];

  it('should render all section tabs with short titles (#1345)', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={mockSections} />
      </Tabs>,
    );

    expect(
      screen.getByRole('tab', { name: /I - Necessidade/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /II - Objetivos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /III - Descrição/i }),
    ).toBeInTheDocument();
  });

  it('should show completed indicator (✅) for completed sections', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={mockSections} />
      </Tabs>,
    );

    const completedTab = screen.getByRole('tab', {
      name: /✅ II - Objetivos/i,
    });
    expect(completedTab).toBeInTheDocument();
  });

  it('should not show completed indicator for incomplete sections', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={mockSections} />
      </Tabs>,
    );

    const tab1 = screen.getByRole('tab', { name: /I - Necessidade/i });
    const tab3 = screen.getByRole('tab', { name: /III - Descrição/i });

    expect(tab1.textContent).not.toContain('✅');
    expect(tab3.textContent).not.toContain('✅');
  });

  it('should render correct number of tabs', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={mockSections} />
      </Tabs>,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });

  it('should handle empty sections array', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={[]} />
      </Tabs>,
    );

    const tabs = screen.queryAllByRole('tab');
    expect(tabs).toHaveLength(0);
  });

  it('should show full title in tooltip on hover (#1345)', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={mockSections} />
      </Tabs>,
    );

    const tab = screen.getByRole('tab', { name: /I - Necessidade/i });
    await user.hover(tab);

    await waitFor(() => {
      // Radix Tooltip renders content in multiple places, use getAllBy and check at least one exists
      const tooltipElements = screen.getAllByText(
        'I - Necessidade da Contratação',
      );
      expect(tooltipElements.length).toBeGreaterThan(0);
    });
  });

  it('should work without fullTitle (backward compatibility)', () => {
    const sectionsWithoutFullTitle = [
      { id: '1', title: 'Seção 1', completed: false },
      { id: '2', title: 'Seção 2', completed: true },
    ];

    render(
      <Tabs defaultValue="1">
        <ETPEditorTabsList sections={sectionsWithoutFullTitle} />
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: /seção 1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /seção 2/i })).toBeInTheDocument();
  });
});
