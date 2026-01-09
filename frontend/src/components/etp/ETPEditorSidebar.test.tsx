import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ETPEditorSidebar } from './ETPEditorSidebar';

describe('ETPEditorSidebar', () => {
  const mockSections = [
    { id: '1', title: 'Seção 1', completed: true },
    { id: '2', title: 'Seção 2', completed: true },
    { id: '3', title: 'Seção 3', completed: false },
    { id: '4', title: 'Seção 4', completed: false },
  ];

  it('should render the sidebar with title', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
      />,
    );

    expect(screen.getByText('Geração IA')).toBeInTheDocument();
  });

  it('should display correct count of completed sections', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
      />,
    );

    expect(screen.getByText('2/4 seções geradas')).toBeInTheDocument();
  });

  it('should display button with correct text when not generating', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
        isGenerateAllDisabled={false}
      />,
    );

    const button = screen.getByRole('button', { name: /gerar todas seções/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should display button disabled with "Em breve" badge by default (#1372)', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
      />,
    );

    const button = screen.getByRole('button', { name: /gerar todas seções/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      'title',
      'Funcionalidade em desenvolvimento',
    );
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });

  it('should display button with loading text when generating', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={true}
      />,
    );

    const button = screen.getByRole('button', { name: /gerando\.\.\./i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should call onGenerateAll when button is clicked (when enabled)', async () => {
    const mockOnGenerateAll = vi.fn();
    const user = userEvent.setup();

    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
        isGenerateAllDisabled={false}
      />,
    );

    const button = screen.getByRole('button', { name: /gerar todas seções/i });
    await user.click(button);

    expect(mockOnGenerateAll).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onGenerateAll when button is disabled (#1372)', async () => {
    const mockOnGenerateAll = vi.fn();
    const user = userEvent.setup();

    render(
      <ETPEditorSidebar
        sections={mockSections}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
        isGenerateAllDisabled={true}
      />,
    );

    const button = screen.getByRole('button', { name: /gerar todas seções/i });
    await user.click(button);

    expect(mockOnGenerateAll).not.toHaveBeenCalled();
  });

  it('should display 0/0 when sections array is empty', () => {
    const mockOnGenerateAll = vi.fn();
    render(
      <ETPEditorSidebar
        sections={[]}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
      />,
    );

    expect(screen.getByText('0/0 seções geradas')).toBeInTheDocument();
  });

  it('should display all completed count when all sections are completed', () => {
    const mockOnGenerateAll = vi.fn();
    const allCompleted = mockSections.map((s) => ({ ...s, completed: true }));

    render(
      <ETPEditorSidebar
        sections={allCompleted}
        onGenerateAll={mockOnGenerateAll}
        isGenerating={false}
      />,
    );

    expect(screen.getByText('4/4 seções geradas')).toBeInTheDocument();
  });
});
