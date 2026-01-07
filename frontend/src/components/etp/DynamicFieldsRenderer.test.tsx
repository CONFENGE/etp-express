import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DynamicFieldsRenderer } from './DynamicFieldsRenderer';
import {
  etpWizardSchema,
  ETPWizardFormData,
  defaultWizardValues,
} from '@/schemas/etpWizardSchema';
import { EtpTemplateType } from '@/types/template';

/**
 * Test wrapper component to provide form context.
 */
function TestWrapper({
  templateType,
  onFormChange,
}: {
  templateType: EtpTemplateType | null;
  onFormChange?: (data: ETPWizardFormData) => void;
}) {
  const form = useForm<ETPWizardFormData>({
    resolver: zodResolver(etpWizardSchema),
    defaultValues: {
      ...defaultWizardValues,
      templateType,
    },
  });

  // Expose form values for testing
  if (onFormChange) {
    const values = form.watch();
    onFormChange(values);
  }

  return <DynamicFieldsRenderer form={form} templateType={templateType} />;
}

describe('DynamicFieldsRenderer', () => {
  describe('no template selected', () => {
    it('should show info message when no template is selected', () => {
      render(<TestWrapper templateType={null} />);

      expect(
        screen.getByText(
          /selecione um template no passo anterior para ver campos especificos/i,
        ),
      ).toBeInTheDocument();
    });

    it('should render info icon', () => {
      render(<TestWrapper templateType={null} />);

      // The Info icon is rendered in the component
      const infoContainer = screen.getByText(
        /selecione um template no passo anterior/i,
      ).parentElement;
      expect(infoContainer?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('OBRAS template', () => {
    it('should render OBRAS specific fields', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      expect(
        screen.getByText('Campos Especificos - Obras e Engenharia'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/art\/rrt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/memorial descritivo/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/cronograma fisico-financeiro/i),
      ).toBeInTheDocument();
    });

    it('should show required badge for required fields', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      // ART/RRT is required, so there should be a required indicator
      const artField = screen.getByLabelText(/art\/rrt/i);
      const fieldContainer = artField.closest('.space-y-2');
      expect(
        fieldContainer?.querySelector('[aria-label="campo obrigatório"]'),
      ).toBeInTheDocument();
    });

    it('should render BDI field as number input', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      const bdiInput = screen.getByLabelText(/bdi de referencia/i);
      expect(bdiInput).toHaveAttribute('type', 'number');
    });
  });

  describe('TI template', () => {
    it('should render TI specific fields', () => {
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      expect(
        screen.getByText('Campos Especificos - Tecnologia da Informacao'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/especificacoes tecnicas/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/niveis de servico/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/requisitos de seguranca/i),
      ).toBeInTheDocument();
    });

    it('should render methodology as select', () => {
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      // The select trigger should be present - look for the trigger button
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Metodologia de Trabalho')).toBeInTheDocument();
    });

    it('should allow selecting methodology option', async () => {
      const user = userEvent.setup();
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      const methodologySelect = screen.getByRole('combobox');
      await user.click(methodologySelect);

      // Options should be visible
      expect(screen.getByText('Agil (Scrum/Kanban)')).toBeInTheDocument();
      expect(screen.getByText('Cascata (Waterfall)')).toBeInTheDocument();
      expect(screen.getByText('Hibrida')).toBeInTheDocument();
    });
  });

  describe('SERVICOS template', () => {
    it('should render SERVICOS specific fields', () => {
      render(<TestWrapper templateType={EtpTemplateType.SERVICOS} />);

      expect(
        screen.getByText('Campos Especificos - Servicos Continuos'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/produtividade/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postos de trabalho/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/frequencia do servico/i),
      ).toBeInTheDocument();
    });

    it('should render postos de trabalho as number input', () => {
      render(<TestWrapper templateType={EtpTemplateType.SERVICOS} />);

      const postosInput = screen.getByLabelText(/postos de trabalho/i);
      expect(postosInput).toHaveAttribute('type', 'number');
      expect(postosInput).toHaveAttribute('min', '1');
    });
  });

  describe('MATERIAIS template', () => {
    it('should render MATERIAIS specific fields', () => {
      render(<TestWrapper templateType={EtpTemplateType.MATERIAIS} />);

      expect(
        screen.getByText('Campos Especificos - Materiais e Bens'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/especificacoes tecnicas/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/garantia minima/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/codigo catmat\/catser/i),
      ).toBeInTheDocument();
    });
  });

  describe('form interaction', () => {
    it('should update form value when input is changed', async () => {
      const user = userEvent.setup();
      let formValues: ETPWizardFormData = {
        ...defaultWizardValues,
        templateType: EtpTemplateType.OBRAS,
      };

      render(
        <TestWrapper
          templateType={EtpTemplateType.OBRAS}
          onFormChange={(values) => {
            formValues = values;
          }}
        />,
      );

      const artInput = screen.getByLabelText(/art\/rrt/i);
      await user.type(artInput, '1234567890');

      expect(formValues.dynamicFields?.artRrt).toBe('1234567890');
    });

    it('should update form value for textarea fields', async () => {
      const user = userEvent.setup();
      let formValues: ETPWizardFormData = {
        ...defaultWizardValues,
        templateType: EtpTemplateType.OBRAS,
      };

      render(
        <TestWrapper
          templateType={EtpTemplateType.OBRAS}
          onFormChange={(values) => {
            formValues = values;
          }}
        />,
      );

      const memorialInput = screen.getByLabelText(/memorial descritivo/i);
      await user.type(memorialInput, 'Descricao tecnica detalhada');

      expect(formValues.dynamicFields?.memorialDescritivo).toBe(
        'Descricao tecnica detalhada',
      );
    });
  });

  describe('accessibility', () => {
    it('should have proper form field labels', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      // All inputs should have associated labels
      const artInput = screen.getByLabelText(/art\/rrt/i);
      expect(artInput).toHaveAttribute('id', 'dynamicFields.artRrt');
    });

    it('should show character count for fields with maxLength', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      // ART/RRT has maxLength of 50 and is the first field
      expect(screen.getByText('0/50')).toBeInTheDocument();
    });
  });

  describe('section header', () => {
    it('should display correct icon for OBRAS', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      expect(screen.getByText('🏗️')).toBeInTheDocument();
    });

    it('should display correct icon for TI', () => {
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      expect(screen.getByText('💻')).toBeInTheDocument();
    });

    it('should display correct icon for SERVICOS', () => {
      render(<TestWrapper templateType={EtpTemplateType.SERVICOS} />);

      expect(screen.getByText('🔧')).toBeInTheDocument();
    });

    it('should display correct icon for MATERIAIS', () => {
      render(<TestWrapper templateType={EtpTemplateType.MATERIAIS} />);

      expect(screen.getByText('📦')).toBeInTheDocument();
    });
  });
});
