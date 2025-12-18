import Joyride, {
  CallBackProps,
  STATUS,
  Step,
  ACTIONS,
  EVENTS,
} from 'react-joyride';
import { useTour } from '@/hooks/useTour';

/**
 * Tour steps for onboarding new users.
 * Each step targets a specific element and provides guidance.
 */
const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Bem-vindo ao ETP Express! 🎉</h2>
        <p className="text-muted-foreground">
          Este tour rápido vai te ajudar a conhecer as principais
          funcionalidades do sistema.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar-nav"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Menu de Navegação</h3>
        <p className="text-sm text-muted-foreground">
          Use o menu lateral para navegar entre Dashboard, seus ETPs e a
          ferramenta de Import & Analysis.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="new-etp-button"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Criar Novo ETP</h3>
        <p className="text-sm text-muted-foreground">
          Clique aqui para iniciar um novo Estudo Técnico Preliminar. Preencha
          as informações básicas e comece a gerar as seções.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-stats"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Estatísticas</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso dos seus ETPs: total criado, em andamento e
          concluídos.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="recent-etps"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">ETPs Recentes</h3>
        <p className="text-sm text-muted-foreground">
          Acesse rapidamente seus estudos mais recentes. Clique em qualquer ETP
          para editá-lo.
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Pronto para começar! 🚀</h2>
        <p className="text-muted-foreground mb-3">
          Ao editar um ETP, use o botão <strong>"Gerar com IA"</strong> para
          acelerar a criação das seções. O sistema vai pesquisar informações
          relevantes e gerar conteúdo automaticamente.
        </p>
        <p className="text-xs text-muted-foreground">
          Você pode reiniciar este tour a qualquer momento nas configurações.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

/**
 * Custom styles for the tour to match the app theme.
 */
const tourStyles = {
  options: {
    arrowColor: 'hsl(var(--background))',
    backgroundColor: 'hsl(var(--background))',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: 'hsl(var(--primary))',
    textColor: 'hsl(var(--foreground))',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '0.5rem',
    padding: '1rem',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  buttonBack: {
    color: 'hsl(var(--muted-foreground))',
    marginRight: '0.5rem',
  },
  buttonSkip: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  },
  buttonClose: {
    color: 'hsl(var(--muted-foreground))',
  },
};

/**
 * Localized strings for the tour UI.
 */
const locale = {
  back: 'Voltar',
  close: 'Fechar',
  last: 'Concluir',
  next: 'Próximo',
  open: 'Abrir',
  skip: 'Pular tour',
};

/**
 * AppTour component renders the guided tour overlay.
 * It automatically handles tour state through the useTour hook.
 */
export function AppTour() {
  const { isRunning, stepIndex, setStepIndex, completeTour, stopTour } =
    useTour();

  const handleCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      stopTour();
    }
  };

  return (
    <Joyride
      callback={handleCallback}
      continuous
      hideCloseButton={false}
      run={isRunning}
      scrollToFirstStep
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      steps={tourSteps}
      styles={tourStyles}
      locale={locale}
      disableOverlayClose
      spotlightClicks={false}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
