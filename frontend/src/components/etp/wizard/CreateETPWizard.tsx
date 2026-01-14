import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  etpWizardSchema,
  ETPWizardFormData,
  WIZARD_STEPS,
  defaultWizardValues,
  step0Schema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  DYNAMIC_FIELDS_STEP,
} from '@/schemas/etpWizardSchema';
import { Step0TemplateSelection } from './Step0TemplateSelection';
import { Step1Identification } from './Step1Identification';
import { Step2ObjectJustification } from './Step2ObjectJustification';
import { Step3Requirements } from './Step3Requirements';
import { Step4DynamicFields } from './Step4DynamicFields';
import { Step4Costs } from './Step4Costs';
import { Step5Risks } from './Step5Risks';

interface CreateETPWizardProps {
  onSubmit: (data: ETPWizardFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const stepSchemas = [
  step0Schema,
  step1Schema,
  step2Schema,
  step3Schema,
  step6Schema, // Dynamic fields (step 4 in UI)
  step4Schema, // Costs (step 5 in UI)
  step5Schema, // Risks (step 6 in UI)
];

export function CreateETPWizard({
  onSubmit,
  onCancel,
  isLoading = false,
}: CreateETPWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<ETPWizardFormData>({
    resolver: zodResolver(etpWizardSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: defaultWizardValues,
  });

  const { handleSubmit, trigger, getValues, watch } = form;

  // Watch templateType to determine if dynamic fields step should be shown
  const templateType = watch('templateType');

  // #1330 - Determine if a step should be skipped
  const shouldSkipStep = useCallback(
    (stepIndex: number) => {
      // Skip dynamic fields step (step 4) when no template is selected
      if (stepIndex === DYNAMIC_FIELDS_STEP && !templateType) {
        return true;
      }
      return false;
    },
    [templateType],
  );

  // #1330 - Get visible steps (excluding skipped ones) for stepper display
  const visibleSteps = useMemo(() => {
    return WIZARD_STEPS.filter((_, index) => !shouldSkipStep(index));
  }, [shouldSkipStep]);

  // #1330 - Find the next valid step (skipping any that should be skipped)
  const getNextStep = useCallback(
    (current: number): number => {
      let next = current + 1;
      while (next < WIZARD_STEPS.length && shouldSkipStep(next)) {
        next++;
      }
      return Math.min(next, WIZARD_STEPS.length - 1);
    },
    [shouldSkipStep],
  );

  // #1330 - Find the previous valid step (skipping any that should be skipped)
  const getPrevStep = useCallback(
    (current: number): number => {
      let prev = current - 1;
      while (prev >= 0 && shouldSkipStep(prev)) {
        prev--;
      }
      return Math.max(prev, 0);
    },
    [shouldSkipStep],
  );

  // #1330 - Map current step index to visible step index for progress display
  const getVisibleStepIndex = useCallback(
    (stepIndex: number): number => {
      let visibleIndex = 0;
      for (let i = 0; i < stepIndex; i++) {
        if (!shouldSkipStep(i)) {
          visibleIndex++;
        }
      }
      return visibleIndex;
    },
    [shouldSkipStep],
  );

  // Calculate derived state early to use in handlers
  const visibleStepIndex = getVisibleStepIndex(currentStep);
  const progressPercentage =
    ((visibleStepIndex + 1) / visibleSteps.length) * 100;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const validateCurrentStep = useCallback(async () => {
    const currentStepConfig = WIZARD_STEPS[currentStep];
    const result = await trigger(
      currentStepConfig.fields as (keyof ETPWizardFormData)[],
    );
    return result;
  }, [currentStep, trigger]);

  const handleNext = async () => {
    // Validate only the current step fields
    const values = getValues();
    const currentSchema = stepSchemas[currentStep];
    const fieldsToValidate = WIZARD_STEPS[currentStep].fields;

    // Extract only current step values
    const stepValues = fieldsToValidate.reduce(
      (acc, field) => {
        acc[field] = values[field as keyof ETPWizardFormData];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    try {
      currentSchema.parse(stepValues);
      if (currentStep < WIZARD_STEPS.length - 1) {
        // #1330 - Use getNextStep to skip steps that should be hidden
        setCurrentStep(getNextStep(currentStep));
      }
    } catch {
      // Trigger validation to show errors
      await validateCurrentStep();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // #1330 - Use getPrevStep to skip steps that should be hidden
      setCurrentStep(getPrevStep(currentStep));
    }
  };

  const handleFormSubmit = async (data: ETPWizardFormData) => {
    // Only allow submit on last step - prevents accidental submission via Enter key
    if (!isLastStep) {
      return;
    }
    await onSubmit(data);
  };

  // Prevent form submission when pressing Enter on input fields (except on last step)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      event.key === 'Enter' &&
      !isLastStep &&
      (event.target as HTMLElement).tagName !== 'TEXTAREA'
    ) {
      event.preventDefault();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step0TemplateSelection form={form} />;
      case 1:
        return <Step1Identification form={form} />;
      case 2:
        return <Step2ObjectJustification form={form} />;
      case 3:
        return <Step3Requirements form={form} />;
      case 4:
        return <Step4DynamicFields form={form} />;
      case 5:
        return <Step4Costs form={form} />;
      case 6:
        return <Step5Risks form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)' }} className="border-b">
        {/* Step Indicators - #1330: Only show visible steps (excluding skipped ones) */}
        <div className="flex justify-between items-center">
          {visibleSteps.map((step, displayIndex) => {
            // Find the original step index for comparison with currentStep
            const originalIndex = WIZARD_STEPS.findIndex(
              (s) => s.id === step.id,
            );
            const isCompleted = originalIndex < currentStep;
            const isCurrent = originalIndex === currentStep;

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
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    displayIndex + 1
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">
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
            {WIZARD_STEPS[currentStep].title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {WIZARD_STEPS[currentStep].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Prevents accidental form submission via Enter key (#1332) */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        onKeyDown={handleKeyDown}
        className="flex-1 flex flex-col"
      >
        <div style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }} className="flex-1 overflow-y-auto max-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-4)' }} className="border-t">
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            {currentStep > 0 && (
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
                    Criar ETP
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} disabled={isLoading}>
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
