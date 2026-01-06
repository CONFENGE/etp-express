import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useOnboardingStore, ONBOARDING_TASKS } from '@/store/onboardingStore';
import { useTourStore } from '@/store/tourStore';
import { useTour } from '@/hooks/useTour';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state */
  defaultExpanded?: boolean;
}

/**
 * OnboardingChecklist component displays a checklist of first steps for new users.
 *
 * Features:
 * - Collapsible card with progress indicator
 * - Auto-completes "Complete tour" when tour is finished
 * - Persists state in localStorage
 * - Can be dismissed permanently
 * - Celebration animation when all tasks complete
 */
export function OnboardingChecklist({
  className,
  defaultExpanded = true,
}: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const { handleRestart: restartTour } = useTour();
  const { hasCompletedTour } = useTourStore();
  const {
    isDismissed,
    completedTasks,
    completeTask,
    dismissChecklist,
    getCompletionPercentage,
  } = useOnboardingStore();

  // Auto-complete tour task if tour was completed
  useMemo(() => {
    if (hasCompletedTour && !completedTasks.includes('complete-tour')) {
      completeTask('complete-tour');
    }
  }, [hasCompletedTour, completedTasks, completeTask]);

  const completionPercentage = getCompletionPercentage();
  const allCompleted = completionPercentage === 100;

  const handleTaskClick = useCallback(
    (taskId: string) => {
      switch (taskId) {
        case 'complete-tour':
          restartTour();
          break;
        case 'create-first-etp':
          navigate('/etps/new');
          break;
        case 'generate-suggestion':
        case 'export-etp':
          // These require an existing ETP, navigate to ETPs list
          navigate('/etps');
          break;
      }
    },
    [navigate, restartTour],
  );

  const handleDismiss = useCallback(() => {
    dismissChecklist();
  }, [dismissChecklist]);

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  const tasks = ONBOARDING_TASKS.map((task) => ({
    ...task,
    completed: completedTasks.includes(task.id),
  }));

  return (
    <Collapsible defaultOpen={defaultExpanded} className={cn(className)}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {allCompleted ? (
                  <Trophy
                    className="h-5 w-5 text-yellow-500"
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                )}
                <CardTitle className="text-base">
                  {allCompleted ? 'Parabens!' : 'Primeiros Passos'}
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                {allCompleted
                  ? 'Voce completou todos os passos iniciais!'
                  : 'Complete estas tarefas para comecar'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Expandir/recolher checklist"
                >
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:hidden" />
                  <ChevronUp className="h-4 w-4 transition-transform duration-200 hidden group-data-[state=open]:block" />
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismiss}
                aria-label="Ocultar checklist"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress
              value={completionPercentage}
              className="h-2"
              aria-label={`${completionPercentage}% completo`}
            />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <ul
              className="space-y-2"
              aria-label="Lista de tarefas de onboarding"
            >
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    onClick={() => handleTaskClick(task.id)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                      'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      task.completed && 'opacity-60',
                    )}
                    aria-label={`${task.label}${task.completed ? ' - Completo' : ''}`}
                  >
                    {task.completed ? (
                      <CheckCircle2
                        className="h-5 w-5 text-green-500 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          task.completed && 'line-through',
                        )}
                      >
                        {task.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.description}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
