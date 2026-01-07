import { useState, useCallback } from 'react';
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
} from '@/schemas/etpWizardSchema';
import { Step0TemplateSelection } from './Step0TemplateSelection';
import { Step1Identification } from './Step1Identification';
import { Step2ObjectJustification } from './Step2ObjectJustification';
import { Step3Requirements } from './Step3Requirements';
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
  step4Schema,
  step5Schema,
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

  const { handleSubmit, trigger, getValues } = form;

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
        setCurrentStep((prev) => prev + 1);
      }
    } catch {
      // Trigger validation to show errors
      await validateCurrentStep();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFormSubmit = async (data: ETPWizardFormData) => {
    await onSubmit(data);
  };

  const progressPercentage = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

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
        return <Step4Costs form={form} />;
      case 5:
        return <Step5Risks form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Section */}
      <div className="space-y-4 pb-4 border-b">
        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-2',
                index <= currentStep ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {step.title}
              </span>
            </div>
          ))}
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
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex-1 flex flex-col"
      >
        <div className="flex-1 py-4 overflow-y-auto max-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
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
