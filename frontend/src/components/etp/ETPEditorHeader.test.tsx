import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ETPEditorHeader } from './ETPEditorHeader';

describe('ETPEditorHeader', () => {
  it('should render ETP title', () => {
    render(<ETPEditorHeader etpTitle="Test ETP Title" onSave={() => {}} />);

    expect(screen.getByText('Test ETP Title')).toBeInTheDocument();
  });

  it('should render ETP description when provided', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        etpDescription="Test Description"
        onSave={() => {}}
      />,
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const { container } = render(
      <ETPEditorHeader etpTitle="Test Title" onSave={() => {}} />,
    );

    const description = container.querySelector('.text-muted-foreground');
    expect(description).not.toBeInTheDocument();
  });

  it('should call onSave when Save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<ETPEditorHeader etpTitle="Test Title" onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /salvar/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should show "Salvando..." text when isSaving is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isSaving={true}
      />,
    );

    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('should disable Save button when isSaving is true', () => {
    render(
      <ETPEditorHeader
        etpTitle="Test Title"
        onSave={() => {}}
        isSaving={true}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /salvando/i });
    expect(saveButton).toBeDisabled();
  });

  it('should render all action buttons', () => {
    render(<ETPEditorHeader etpTitle="Test Title" onSave={() => {}} />);

    expect(
      screen.getByRole('button', { name: /visualizar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /exportar/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });
});
