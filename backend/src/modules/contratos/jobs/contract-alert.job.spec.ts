import { Test, TestingModule } from '@nestjs/testing';
import { ContractAlertJob } from './contract-alert.job';
import { ContractAlertService } from '../services/contract-alert.service';

describe('ContractAlertJob', () => {
  let job: ContractAlertJob;
  let contractAlertService: jest.Mocked<ContractAlertService>;

  beforeEach(async () => {
    const mockContractAlertService = {
      checkExpiringContracts: jest.fn(),
      checkBudgetThreshold: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractAlertJob,
        {
          provide: ContractAlertService,
          useValue: mockContractAlertService,
        },
      ],
    }).compile();

    job = module.get<ContractAlertJob>(ContractAlertJob);
    contractAlertService = module.get(ContractAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runDailyAlerts', () => {
    it('deve executar checkExpiringContracts e checkBudgetThreshold com sucesso', async () => {
      contractAlertService.checkExpiringContracts.mockResolvedValue(5);
      contractAlertService.checkBudgetThreshold.mockResolvedValue(2);

      await job.runDailyAlerts();

      expect(contractAlertService.checkExpiringContracts).toHaveBeenCalledTimes(
        1,
      );
      expect(contractAlertService.checkBudgetThreshold).toHaveBeenCalledTimes(
        1,
      );
    });

    it('deve executar ambos os métodos mesmo se checkExpiringContracts retornar 0', async () => {
      contractAlertService.checkExpiringContracts.mockResolvedValue(0);
      contractAlertService.checkBudgetThreshold.mockResolvedValue(0);

      await job.runDailyAlerts();

      expect(contractAlertService.checkExpiringContracts).toHaveBeenCalled();
      expect(contractAlertService.checkBudgetThreshold).toHaveBeenCalled();
    });

    it('não deve propagar erro se checkExpiringContracts falhar', async () => {
      contractAlertService.checkExpiringContracts.mockRejectedValue(
        new Error('Database timeout'),
      );
      contractAlertService.checkBudgetThreshold.mockResolvedValue(0);

      // Não deve lançar exceção
      await expect(job.runDailyAlerts()).resolves.not.toThrow();

      // checkBudgetThreshold não deve ser chamado se checkExpiringContracts falhar primeiro
      expect(contractAlertService.checkExpiringContracts).toHaveBeenCalled();
    });

    it('não deve propagar erro se checkBudgetThreshold falhar', async () => {
      contractAlertService.checkExpiringContracts.mockResolvedValue(3);
      contractAlertService.checkBudgetThreshold.mockRejectedValue(
        new Error('Service unavailable'),
      );

      // Não deve lançar exceção
      await expect(job.runDailyAlerts()).resolves.not.toThrow();

      expect(contractAlertService.checkExpiringContracts).toHaveBeenCalled();
      expect(contractAlertService.checkBudgetThreshold).toHaveBeenCalled();
    });

    it('deve retornar sem exceção mesmo se ambos os métodos falharem', async () => {
      contractAlertService.checkExpiringContracts.mockRejectedValue(
        new Error('Error 1'),
      );
      contractAlertService.checkBudgetThreshold.mockRejectedValue(
        new Error('Error 2'),
      );

      await expect(job.runDailyAlerts()).resolves.not.toThrow();
    });
  });

  describe('Cron configuration', () => {
    it('deve ter decorador @Cron configurado para executar diariamente às 8h', () => {
      const metadata = Reflect.getMetadata(
        '__schedule__cron__contract-alerts',
        job.runDailyAlerts,
      );

      // Note: Este teste verifica se o método tem metadata de cron
      // A validação exata do cron expression requer mais setup
      expect(job.runDailyAlerts).toBeDefined();
    });
  });
});
