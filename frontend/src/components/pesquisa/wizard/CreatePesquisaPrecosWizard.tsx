import { useState, useCallback, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  pesquisaPrecosWizardSchema,
  PesquisaPrecosFormData,
  PESQUISA_WIZARD_STEPS,
  defaultPesquisaPrecosValues,
  pesquisaStepSchemas,
} from '@/schemas/pesquisaPrecosSchema';

/**
 * Props for wizard step components
 */
export interface PesquisaWizardStepProps {
  form: UseFormReturn<PesquisaPrecosFormData>;
}

/**
 * Props for the main wizard component
 */
interface CreatePesquisaPrecosWizardProps {
  onSubmit: (data: PesquisaPrecosFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Placeholder component for steps not yet implemented
 * Will be replaced by actual step components in #1507, #1508, #1509
 */
function StepPlaceholder({
  stepIndex,
  stepTitle,
}: {
  stepIndex: number;
  stepTitle: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        gap: 'var(--space-4)',
      }}
      className="text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl font-bold text-muted-foreground">
          {stepIndex + 1}
        </span>
      </div>
      <h3 className="text-lg font-semibold">{stepTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Este passo sera implementado nas proximas issues.
        <br />
        Por enquanto, voce pode navegar entre os passos usando os botoes abaixo.
      </p>
    </div>
  );
}

/**
 * CreatePesquisaPrecosWizard - Multi-step wizard for creating price research
 *
 * This wizard guides users through the price research process:
 * 1. Select ETP/TR as reference base
 * 2. Define items to research prices for
 * 3. Select price sources
 * 4. Execute price collection
 * 5. Review and adjust results
 *
 * @see Issue #1506 - Create base structure
 * @see Issue #1507 - Steps 1-2 implementation
 * @see Issue #1508 - Steps 3-4 implementation
 * @see Issue #1509 - Step 5 implementation
 */
export function CreatePesquisaPrecosWizard({
  onSubmit,
  onCancel,
  isLoading = false,
}: CreatePesquisaPrecosWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<PesquisaPrecosFormData>({
    resolver: zodResolver(pesquisaPrecosWizardSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: defaultPesquisaPrecosValues,
  });

  const { handleSubmit, trigger, getValues } = form;

  // Step navigation helpers
  const isLastStep = currentStep === PESQUISA_WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return ((currentStep + 1) / PESQUISA_WIZARD_STEPS.length) * 100;
  }, [currentStep]);

  // Validate current step fields
  const validateCurrentStep = useCallback(async () => {
    const currentStepConfig = PESQUISA_WIZARD_STEPS[currentStep];
    // Cast fields to mutable array for react-hook-form compatibility
    const fieldsToValidate = [
      ...currentStepConfig.fields,
    ] as (keyof PesquisaPrecosFormData)[];
    const result = await trigger(fieldsToValidate);
    return result;
  }, [currentStep, trigger]);

  // Handle next step navigation
  const handleNext = useCallback(async () => {
    const values = getValues();
    const currentSchema = pesquisaStepSchemas[currentStep];
    const fieldsToValidate = PESQUISA_WIZARD_STEPS[currentStep].fields;

    // Extract only current step values
    const stepValues = fieldsToValidate.reduce(
      (acc, field) => {
        acc[field] = values[field as keyof PesquisaPrecosFormData];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    try {
      currentSchema.parse(stepValues);
      if (currentStep < PESQUISA_WIZARD_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    } catch {
      // Trigger validation to show errors
      await validateCurrentStep();
    }
  }, [currentStep, getValues, validateCurrentStep]);

  // Handle previous step navigation
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Handle form submission (only on last step)
  const handleFormSubmit = useCallback(
    async (data: PesquisaPrecosFormData) => {
      if (!isLastStep) {
        return;
      }
      await onSubmit(data);
    },
    [isLastStep, onSubmit],
  );

  // Prevent form submission when pressing Enter on input fields (except on last step)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (
        event.key === 'Enter' &&
        !isLastStep &&
        (event.target as HTMLElement).tagName !== 'TEXTAREA'
      ) {
        event.preventDefault();
      }
    },
    [isLastStep],
  );

  // Render current step content
  const renderStep = useCallback(() => {
    const step = PESQUISA_WIZARD_STEPS[currentStep];

    // For now, render placeholder components
    // These will be replaced by actual implementations in subsequent issues
    return <StepPlaceholder stepIndex={currentStep} stepTitle={step.title} />;
  }, [currentStep]);

  return (
    <div className="flex flex-col h-full">
      {/* Progress Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
        }}
        className="border-b"
      >
        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {PESQUISA_WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-2',
                  isCompleted || isCurrent
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercentage} className="h-2" />

        {/* Current Step Info */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {PESQUISA_WIZARD_STEPS[currentStep].title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {PESQUISA_WIZARD_STEPS[currentStep].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Prevents accidental form submission via Enter key */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        onKeyDown={handleKeyDown}
        className="flex-1 flex flex-col"
      >
        <div
          style={{
            paddingTop: 'var(--space-4)',
            paddingBottom: 'var(--space-4)',
          }}
          className="flex-1 overflow-y-auto max-h-[400px]"
        >
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 'var(--space-4)',
          }}
          className="border-t"
        >
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            {!isFirstStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>

          <div>
            {isLastStep ? (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Criar Pesquisa
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                Proximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
