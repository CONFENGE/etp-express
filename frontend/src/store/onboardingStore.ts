import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ONBOARDING_STORAGE_KEY = 'etp-express-onboarding';

export interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface OnboardingState {
  /** Whether the checklist has been dismissed */
  isDismissed: boolean;
  /** Completed task IDs */
  completedTasks: string[];

  // Actions
  /** Mark a task as completed */
  completeTask: (taskId: string) => void;
  /** Mark a task as incomplete */
  uncompleteTask: (taskId: string) => void;
  /** Dismiss the checklist */
  dismissChecklist: () => void;
  /** Reset the onboarding state */
  resetOnboarding: () => void;
  /** Check if a task is completed */
  isTaskCompleted: (taskId: string) => boolean;
  /** Get completion percentage */
  getCompletionPercentage: () => number;
}

/** Default onboarding tasks */
export const ONBOARDING_TASKS: Omit<OnboardingTask, 'completed'>[] = [
  {
    id: 'complete-tour',
    label: 'Completar o tour guiado',
    description: 'Conheca as principais funcionalidades do sistema',
  },
  {
    id: 'create-first-etp',
    label: 'Criar seu primeiro ETP',
    description: 'Inicie um novo Estudo Tecnico Preliminar',
  },
  {
    id: 'generate-suggestion',
    label: 'Gerar uma sugestao de conteudo',
    description: 'Use a IA para gerar sugestoes para uma secao',
  },
  {
    id: 'export-etp',
    label: 'Exportar um ETP',
    description: 'Exporte seu estudo em PDF ou DOCX',
  },
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isDismissed: false,
      completedTasks: [],

      completeTask: (taskId: string) => {
        const { completedTasks } = get();
        if (!completedTasks.includes(taskId)) {
          set({ completedTasks: [...completedTasks, taskId] });
        }
      },

      uncompleteTask: (taskId: string) => {
        const { completedTasks } = get();
        set({ completedTasks: completedTasks.filter((id) => id !== taskId) });
      },

      dismissChecklist: () => set({ isDismissed: true }),

      resetOnboarding: () => set({ isDismissed: false, completedTasks: [] }),

      isTaskCompleted: (taskId: string) => {
        return get().completedTasks.includes(taskId);
      },

      getCompletionPercentage: () => {
        const { completedTasks } = get();
        return Math.round(
          (completedTasks.length / ONBOARDING_TASKS.length) * 100,
        );
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      partialize: (state) => ({
        isDismissed: state.isDismissed,
        completedTasks: state.completedTasks,
      }),
    },
  ),
);
