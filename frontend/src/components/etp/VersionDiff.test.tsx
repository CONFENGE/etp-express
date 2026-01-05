import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionDiff } from './VersionDiff';
import type { VersionComparisonResult } from '@/types/version';

describe('VersionDiff', () => {
  const baseComparison: VersionComparisonResult = {
    version1: {
      id: 'v1',
      versionNumber: 1,
      createdAt: '2026-01-01T10:00:00Z',
    },
    version2: {
      id: 'v2',
      versionNumber: 2,
      createdAt: '2026-01-02T10:00:00Z',
    },
    differences: {
      metadata: {},
      sections: { added: [], removed: [], modified: [] },
    },
    disclaimer: 'Test disclaimer',
  };

  it('should show no differences message when no changes', () => {
    render(<VersionDiff comparison={baseComparison} />);

    expect(
      screen.getByText(/nenhuma diferenca encontrada/i),
    ).toBeInTheDocument();
  });

  it('should show version comparison header', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: { title: { old: 'Old Title', new: 'New Title' } },
        sections: { added: [], removed: [], modified: [] },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('should display metadata changes', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: {
          title: { old: 'Old Title', new: 'New Title' },
          status: { old: 'draft', new: 'in_progress' },
        },
        sections: { added: [], removed: [], modified: [] },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText('Titulo')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Old Title')).toBeInTheDocument();
    expect(screen.getByText('New Title')).toBeInTheDocument();
  });

  it('should display added sections', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: {},
        sections: {
          added: [
            {
              id: 'section-1',
              type: 'JUSTIFICATIVA',
              title: 'Justificativa',
            },
          ],
          removed: [],
          modified: [],
        },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText('Justificativa')).toBeInTheDocument();
    expect(screen.getByText('Adicionado')).toBeInTheDocument();
  });

  it('should display removed sections', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: {},
        sections: {
          added: [],
          removed: [
            {
              id: 'section-1',
              type: 'ANALISE_RISCOS',
              title: 'Analise de Riscos',
            },
          ],
          modified: [],
        },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText('Analise de Riscos')).toBeInTheDocument();
    expect(screen.getByText('Removido')).toBeInTheDocument();
  });

  it('should display modified sections', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: {},
        sections: {
          added: [],
          removed: [],
          modified: [
            {
              id: 'section-1',
              type: 'OBJETO',
              changes: { content: { changed: true } },
            },
          ],
        },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText('Modificado')).toBeInTheDocument();
    // Multiple elements contain OBJETO, use getAllByText
    expect(screen.getAllByText(/OBJETO/i).length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    render(<VersionDiff comparison={baseComparison} isLoading />);

    // Should show a loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should display section count in header', () => {
    const comparison = {
      ...baseComparison,
      differences: {
        metadata: {},
        sections: {
          added: [{ id: '1', type: 'A', title: 'A' }],
          removed: [{ id: '2', type: 'B', title: 'B' }],
          modified: [{ id: '3', type: 'C', changes: {} }],
        },
      },
    };

    render(<VersionDiff comparison={comparison} />);

    expect(screen.getByText(/1 adicionadas/)).toBeInTheDocument();
    expect(screen.getByText(/1 removidas/)).toBeInTheDocument();
    expect(screen.getByText(/1 modificadas/)).toBeInTheDocument();
  });
});
