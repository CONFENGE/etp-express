import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ETPEditorContent } from './ETPEditorContent';
import { Tabs } from '@/components/ui/tabs';

describe('ETPEditorContent', () => {
  const mockSections = [
    {
      number: 1,
      title: 'Identificação',
      description: 'Dados básicos do projeto',
      content: '',
      isRequired: true,
    },
    {
      number: 2,
      title: 'Contexto',
      description: 'Contexto organizacional',
      content: 'Conteúdo existente',
      isRequired: false,
    },
    {
      number: 3,
      title: 'Objetivos',
      description: 'Objetivos do projeto',
      content: '',
      isRequired: true,
    },
  ];

  it('should render active section content', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    // Verifica se o título da seção ativa é renderizado
    expect(screen.getByText('Identificação')).toBeInTheDocument();
  });

  it('should render active section description', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    expect(screen.getByText('Dados básicos do projeto')).toBeInTheDocument();
  });

  it('should show "Obrigatória" badge for required active section', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    expect(screen.getByText('Obrigatória')).toBeInTheDocument();
  });

  it('should call onContentChange when textarea value changes', async () => {
    const user = userEvent.setup();
    const onContentChange = vi.fn();

    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={onContentChange}
        />
      </Tabs>,
    );

    const textarea = screen.getByPlaceholderText(
      /digite o conteúdo da seção identificação/i,
    );
    await user.type(textarea, 'Novo conteúdo');

    expect(onContentChange).toHaveBeenCalled();
  });

  it('should render textarea with current content and data-testid', () => {
    const currentContent = 'Conteúdo atual da seção';

    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent={currentContent}
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    const textarea = screen.getByDisplayValue(currentContent);
    expect(textarea).toBeInTheDocument();
    // Verify data-testid is present for E2E testing
    expect(screen.getByTestId('etp-content-textarea')).toBeInTheDocument();
  });

  it('should render "Gerar Sugestão" button when onGenerateSection is provided', () => {
    const onGenerateSection = vi.fn();

    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
          onGenerateSection={onGenerateSection}
        />
      </Tabs>,
    );

    const generateButtons = screen.getAllByRole('button', {
      name: /gerar sugestão/i,
    });
    expect(generateButtons.length).toBeGreaterThan(0);
  });

  it('should call onGenerateSection with correct section number', async () => {
    const user = userEvent.setup();
    const onGenerateSection = vi.fn();

    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
          onGenerateSection={onGenerateSection}
        />
      </Tabs>,
    );

    const generateButton = screen.getAllByRole('button', {
      name: /gerar sugestão/i,
    })[0];
    await user.click(generateButton);

    expect(onGenerateSection).toHaveBeenCalledWith(1);
  });

  it('should not render "Gerar Sugestão" button when onGenerateSection is not provided', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    const generateButtons = screen.queryAllByRole('button', {
      name: /gerar sugestao/i,
    });
    expect(generateButtons).toHaveLength(0);
  });

  it('should render correct placeholder for active section', () => {
    render(
      <Tabs defaultValue="1">
        <ETPEditorContent
          sections={mockSections}
          currentContent=""
          onContentChange={() => {}}
        />
      </Tabs>,
    );

    expect(
      screen.getByPlaceholderText(/digite o conteúdo da seção identificação/i),
    ).toBeInTheDocument();
  });
});
