import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { OnboardingChecklist } from './OnboardingChecklist';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTourStore } from '@/store/tourStore';

// Mock the stores
vi.mock('@/store/onboardingStore', () => ({
  useOnboardingStore: vi.fn(),
  ONBOARDING_TASKS: [
    {
      id: 'complete-tour',
      label: 'Completar o tour guiado',
      description: 'Conheça as principais funcionalidades do sistema',
    },
    {
      id: 'create-first-etp',
      label: 'Criar seu primeiro ETP',
      description: 'Inicie um novo Estudo Técnico Preliminar',
    },
    {
      id: 'generate-suggestion',
      label: 'Gerar uma sugestão de conteúdo',
      description: 'Use a IA para gerar sugestões para uma seção',
    },
    {
      id: 'export-etp',
      label: 'Exportar um ETP',
      description: 'Exporte seu estudo em PDF ou DOCX',
    },
  ],
}));

vi.mock('@/store/tourStore', () => ({
  useTourStore: vi.fn(),
}));

vi.mock('@/hooks/useTour', () => ({
  useTour: vi.fn(() => ({
    handleRestart: vi.fn(),
  })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('OnboardingChecklist', () => {
  const mockCompleteTask = vi.fn();
  const mockDismissChecklist = vi.fn();
  const mockGetCompletionPercentage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useOnboardingStore).mockReturnValue({
      isDismissed: false,
      completedTasks: [],
      completeTask: mockCompleteTask,
      uncompleteTask: vi.fn(),
      dismissChecklist: mockDismissChecklist,
      resetOnboarding: vi.fn(),
      isTaskCompleted: vi.fn((_id) => false),
      getCompletionPercentage: mockGetCompletionPercentage.mockReturnValue(0),
    });

    vi.mocked(useTourStore).mockReturnValue({
      hasCompletedTour: false,
      isRunning: false,
      stepIndex: 0,
      startTour: vi.fn(),
      stopTour: vi.fn(),
      completeTour: vi.fn(),
      resetTour: vi.fn(),
      setStepIndex: vi.fn(),
      shouldAutoStart: vi.fn(),
    });
  });

  const renderChecklist = (props?: { hasETPs?: boolean }) => {
    return render(
      <MemoryRouter>
        <OnboardingChecklist {...props} />
      </MemoryRouter>,
    );
  };

  describe('rendering', () => {
    it('should render the checklist when not dismissed', () => {
      renderChecklist();
      expect(screen.getByText('Primeiros Passos')).toBeInTheDocument();
    });

    it('should not render when dismissed', () => {
      vi.mocked(useOnboardingStore).mockReturnValue({
        ...vi.mocked(useOnboardingStore)(),
        isDismissed: true,
      });

      const { container } = renderChecklist();
      expect(container).toBeEmptyDOMElement();
    });

    it('should render all 4 tasks', () => {
      renderChecklist();
      expect(screen.getByText('Completar o tour guiado')).toBeInTheDocument();
      expect(screen.getByText('Criar seu primeiro ETP')).toBeInTheDocument();
      expect(
        screen.getByText('Gerar uma sugestão de conteúdo'),
      ).toBeInTheDocument();
      expect(screen.getByText('Exportar um ETP')).toBeInTheDocument();
    });

    it('should show progress bar with 0%', () => {
      mockGetCompletionPercentage.mockReturnValue(0);
      renderChecklist();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show progress bar with 50%', () => {
      mockGetCompletionPercentage.mockReturnValue(50);
      vi.mocked(useOnboardingStore).mockReturnValue({
        ...vi.mocked(useOnboardingStore)(),
        completedTasks: ['create-first-etp', 'generate-suggestion'],
        getCompletionPercentage: () => 50,
      });

      renderChecklist();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('should show celebration state when all tasks completed', () => {
      mockGetCompletionPercentage.mockReturnValue(100);
      vi.mocked(useOnboardingStore).mockReturnValue({
        ...vi.mocked(useOnboardingStore)(),
        completedTasks: [
          'complete-tour',
          'create-first-etp',
          'generate-suggestion',
          'export-etp',
        ],
        getCompletionPercentage: () => 100,
      });

      renderChecklist();
      expect(screen.getByText('Parabéns!')).toBeInTheDocument();
      expect(
        screen.getByText('Você completou todos os passos iniciais!'),
      ).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should dismiss checklist when X button clicked', () => {
      renderChecklist();

      const dismissButton = screen.getByLabelText('Ocultar checklist');
      fireEvent.click(dismissButton);

      expect(mockDismissChecklist).toHaveBeenCalled();
    });

    it('should navigate to /etps/new when create ETP task clicked', () => {
      renderChecklist();

      const createButton = screen.getByLabelText('Criar seu primeiro ETP');
      fireEvent.click(createButton);

      expect(mockNavigate).toHaveBeenCalledWith('/etps/new');
    });

    it('should navigate to /etps when export task clicked', () => {
      renderChecklist();

      const exportButton = screen.getByLabelText('Exportar um ETP');
      fireEvent.click(exportButton);

      expect(mockNavigate).toHaveBeenCalledWith('/etps');
    });
  });

  describe('auto-complete tour task', () => {
    it('should complete tour task when tour is completed', () => {
      vi.mocked(useTourStore).mockReturnValue({
        ...vi.mocked(useTourStore)(),
        hasCompletedTour: true,
      });

      renderChecklist();

      // The useMemo should trigger completeTask
      expect(mockCompleteTask).toHaveBeenCalledWith('complete-tour');
    });

    it('should not complete tour task if already completed', () => {
      vi.mocked(useTourStore).mockReturnValue({
        ...vi.mocked(useTourStore)(),
        hasCompletedTour: true,
      });
      vi.mocked(useOnboardingStore).mockReturnValue({
        ...vi.mocked(useOnboardingStore)(),
        completedTasks: ['complete-tour'],
      });

      renderChecklist();

      // Should not call completeTask if already in completedTasks
      expect(mockCompleteTask).not.toHaveBeenCalled();
    });
  });

  describe('auto-complete ETP task when user has existing ETPs (#1373)', () => {
    it('should complete create-first-etp task when hasETPs is true', () => {
      renderChecklist({ hasETPs: true });

      // The useMemo should trigger completeTask for create-first-etp
      expect(mockCompleteTask).toHaveBeenCalledWith('create-first-etp');
    });

    it('should not complete create-first-etp task when hasETPs is false', () => {
      renderChecklist({ hasETPs: false });

      // Should not call completeTask for create-first-etp
      expect(mockCompleteTask).not.toHaveBeenCalledWith('create-first-etp');
    });

    it('should not complete create-first-etp task if already completed', () => {
      vi.mocked(useOnboardingStore).mockReturnValue({
        ...vi.mocked(useOnboardingStore)(),
        completedTasks: ['create-first-etp'],
      });

      renderChecklist({ hasETPs: true });

      // Should not call completeTask if already in completedTasks
      expect(mockCompleteTask).not.toHaveBeenCalledWith('create-first-etp');
    });

    it('should not complete create-first-etp task when hasETPs is undefined', () => {
      renderChecklist();

      // Should not call completeTask when hasETPs is not provided (defaults to false)
      expect(mockCompleteTask).not.toHaveBeenCalledWith('create-first-etp');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels on buttons', () => {
      renderChecklist();

      expect(
        screen.getByLabelText('Expandir/recolher checklist'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Ocultar checklist')).toBeInTheDocument();
    });

    it('should have aria-label on progress bar', () => {
      renderChecklist();
      expect(screen.getByLabelText('0% completo')).toBeInTheDocument();
    });

    it('should have aria-label on task list', () => {
      renderChecklist();
      expect(
        screen.getByLabelText('Lista de tarefas de onboarding'),
      ).toBeInTheDocument();
    });
  });
});
