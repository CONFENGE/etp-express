import { Test, TestingModule } from '@nestjs/testing';
import { FiscalizacaoNotificationJob } from './fiscalizacao-notification.job';
import { FiscalizacaoNotificationService } from '../services/fiscalizacao-notification.service';

describe('FiscalizacaoNotificationJob', () => {
  let job: FiscalizacaoNotificationJob;
  let fiscalizacaoNotificationService: FiscalizacaoNotificationService;

  const mockFiscalizacaoNotificationService = {
    checkPrazosMedicaoPendente: jest.fn(),
    checkPrazosOcorrenciaAberta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalizacaoNotificationJob,
        {
          provide: FiscalizacaoNotificationService,
          useValue: mockFiscalizacaoNotificationService,
        },
      ],
    }).compile();

    job = module.get<FiscalizacaoNotificationJob>(FiscalizacaoNotificationJob);
    fiscalizacaoNotificationService =
      module.get<FiscalizacaoNotificationService>(
        FiscalizacaoNotificationService,
      );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(job).toBeDefined();
  });

  describe('runDailyPrazosCheck', () => {
    it('should check both medições and ocorrências', async () => {
      mockFiscalizacaoNotificationService.checkPrazosMedicaoPendente.mockResolvedValue(
        3,
      );
      mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta.mockResolvedValue(
        2,
      );

      await job.runDailyPrazosCheck();

      expect(
        mockFiscalizacaoNotificationService.checkPrazosMedicaoPendente,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta,
      ).toHaveBeenCalledTimes(1);
    });

    it('should not throw error if service fails', async () => {
      mockFiscalizacaoNotificationService.checkPrazosMedicaoPendente.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(job.runDailyPrazosCheck()).resolves.not.toThrow();
    });

    it('should log total notifications sent', async () => {
      mockFiscalizacaoNotificationService.checkPrazosMedicaoPendente.mockResolvedValue(
        5,
      );
      mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta.mockResolvedValue(
        3,
      );

      const logSpy = jest.spyOn(job['logger'], 'log');

      await job.runDailyPrazosCheck();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('8 notificações enviadas'),
      );
    });
  });

  describe('runOcorrenciasCriticasCheck', () => {
    it('should check only ocorrências', async () => {
      mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta.mockResolvedValue(
        4,
      );

      await job.runOcorrenciasCriticasCheck();

      expect(
        mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockFiscalizacaoNotificationService.checkPrazosMedicaoPendente,
      ).not.toHaveBeenCalled();
    });

    it('should not throw error if service fails', async () => {
      mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(job.runOcorrenciasCriticasCheck()).resolves.not.toThrow();
    });

    it('should log notifications sent', async () => {
      mockFiscalizacaoNotificationService.checkPrazosOcorrenciaAberta.mockResolvedValue(
        2,
      );

      const logSpy = jest.spyOn(job['logger'], 'log');

      await job.runOcorrenciasCriticasCheck();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 notificações enviadas'),
      );
    });
  });
});
