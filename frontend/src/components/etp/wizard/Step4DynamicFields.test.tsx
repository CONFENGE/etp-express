import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step4DynamicFields } from './Step4DynamicFields';
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
}: {
  templateType: EtpTemplateType | null;
}) {
  const form = useForm<ETPWizardFormData>({
    resolver: zodResolver(etpWizardSchema),
    defaultValues: {
      ...defaultWizardValues,
      templateType,
    },
  });

  return <Step4DynamicFields form={form} />;
}

describe('Step4DynamicFields', () => {
  describe('rendering', () => {
    it('should render info message when no template is selected', () => {
      render(<TestWrapper templateType={null} />);

      expect(
        screen.getByText(
          /selecione um template no passo anterior para ver campos especificos/i,
        ),
      ).toBeInTheDocument();
    });

    it('should render OBRAS fields when OBRAS template is selected', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      expect(
        screen.getByText('Campos Especificos - Obras e Engenharia'),
      ).toBeInTheDocument();
    });

    it('should render TI fields when TI template is selected', () => {
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      expect(
        screen.getByText('Campos Especificos - Tecnologia da Informacao'),
      ).toBeInTheDocument();
    });

    it('should render SERVICOS fields when SERVICOS template is selected', () => {
      render(<TestWrapper templateType={EtpTemplateType.SERVICOS} />);

      expect(
        screen.getByText('Campos Especificos - Servicos Continuos'),
      ).toBeInTheDocument();
    });

    it('should render MATERIAIS fields when MATERIAIS template is selected', () => {
      render(<TestWrapper templateType={EtpTemplateType.MATERIAIS} />);

      expect(
        screen.getByText('Campos Especificos - Materiais e Bens'),
      ).toBeInTheDocument();
    });
  });

  describe('integration with DynamicFieldsRenderer', () => {
    it('should pass templateType to DynamicFieldsRenderer', () => {
      render(<TestWrapper templateType={EtpTemplateType.OBRAS} />);

      // Should show OBRAS specific fields
      expect(screen.getByLabelText(/art\/rrt/i)).toBeInTheDocument();
    });

    it('should show required fields indicator', () => {
      render(<TestWrapper templateType={EtpTemplateType.TI} />);

      // Should show the required badge explanation
      expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
      expect(
        screen.getByText(/campos marcados sao obrigatorios/i),
      ).toBeInTheDocument();
    });
  });
});
