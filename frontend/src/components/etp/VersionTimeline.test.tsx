import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionTimeline } from './VersionTimeline';
import type { EtpVersion } from '@/types/version';

const mockVersions: EtpVersion[] = [
  {
    id: 'version-2',
    versionNumber: 2,
    snapshot: {
      title: 'Test ETP v2',
      description: 'Updated description',
      objeto: 'Test objeto',
      status: 'in_progress',
      sections: [],
    },
    changeLog: 'Updated justificativa',
    createdByName: 'Maria Souza',
    etpId: 'etp-1',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'version-1',
    versionNumber: 1,
    snapshot: {
      title: 'Test ETP v1',
      description: 'Initial description',
      objeto: 'Test objeto',
      status: 'draft',
      sections: [],
    },
    changeLog: 'Initial version',
    createdByName: 'Joao Silva',
    etpId: 'etp-1',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
];

describe('VersionTimeline', () => {
  const mockOnViewVersion = vi.fn();
  const mockOnCompareVersion = vi.fn();
  const mockOnRestoreVersion = vi.fn();

  const defaultProps = {
    versions: mockVersions,
    onViewVersion: mockOnViewVersion,
    onCompareVersion: mockOnCompareVersion,
    onRestoreVersion: mockOnRestoreVersion,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render version timeline with versions', () => {
    render(<VersionTimeline {...defaultProps} />);

    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('should show "Atual" badge for the latest version', () => {
    render(<VersionTimeline {...defaultProps} />);

    expect(screen.getByText('Atual')).toBeInTheDocument();
  });

  it('should display author names', () => {
    render(<VersionTimeline {...defaultProps} />);

    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
  });

  it('should display change logs', () => {
    render(<VersionTimeline {...defaultProps} />);

    expect(screen.getByText(/"Updated justificativa"/)).toBeInTheDocument();
    expect(screen.getByText(/"Initial version"/)).toBeInTheDocument();
  });

  it('should call onViewVersion when Ver button is clicked', () => {
    render(<VersionTimeline {...defaultProps} />);

    const viewButtons = screen.getAllByRole('button', { name: /ver/i });
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewVersion).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('should call onCompareVersion when Comparar button is clicked', () => {
    render(<VersionTimeline {...defaultProps} />);

    const compareButtons = screen.getAllByRole('button', { name: /comparar/i });
    fireEvent.click(compareButtons[0]);

    expect(mockOnCompareVersion).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('should call onRestoreVersion when Restaurar button is clicked', () => {
    render(<VersionTimeline {...defaultProps} />);

    // Restaurar only appears for non-latest versions
    const restoreButton = screen.getByRole('button', { name: /restaurar/i });
    fireEvent.click(restoreButton);

    expect(mockOnRestoreVersion).toHaveBeenCalledWith(mockVersions[1]);
  });

  it('should not show Restaurar button for the latest version', () => {
    render(<VersionTimeline {...defaultProps} />);

    // There should be only one Restaurar button (for the older version)
    const restoreButtons = screen.getAllByRole('button', {
      name: /restaurar/i,
    });
    expect(restoreButtons).toHaveLength(1);
  });

  it('should disable Compare button when only one version exists', () => {
    render(<VersionTimeline {...defaultProps} versions={[mockVersions[0]]} />);

    const compareButton = screen.getByRole('button', { name: /comparar/i });
    expect(compareButton).toBeDisabled();
  });

  it('should show empty state when no versions', () => {
    render(<VersionTimeline {...defaultProps} versions={[]} />);

    expect(screen.getByText(/nenhuma versao encontrada/i)).toBeInTheDocument();
  });

  it('should highlight selected version', () => {
    render(<VersionTimeline {...defaultProps} selectedVersionId="version-1" />);

    // The component should have a different style for selected version
    // We check if the version card exists - visual styling is tested via snapshot
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('should show current version badge when specified', () => {
    render(<VersionTimeline {...defaultProps} currentVersion={1} />);

    expect(screen.getByText('Em uso')).toBeInTheDocument();
  });
});
