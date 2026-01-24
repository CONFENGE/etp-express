import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FiscalizacaoNotificationService } from './fiscalizacao-notification.service';
import { EmailService } from '../../email/email.service';
import { Medicao } from '../../../entities/medicao.entity';
import { Ocorrencia } from '../../../entities/ocorrencia.entity';
import { Ateste } from '../../../entities/ateste.entity';

describe('FiscalizacaoNotificationService', () => {
  let service: FiscalizacaoNotificationService;
  let medicaoRepository: Repository<Medicao>;
  let ocorrenciaRepository: Repository<Ocorrencia>;
  let atesteRepository: Repository<Ateste>;
  let emailService: EmailService;

  const mockMedicaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOcorrenciaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAtesteRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalizacaoNotificationService,
        {
          provide: getRepositoryToken(Medicao),
          useValue: mockMedicaoRepository,
        },
        {
          provide: getRepositoryToken(Ocorrencia),
          useValue: mockOcorrenciaRepository,
        },
        {
          provide: getRepositoryToken(Ateste),
          useValue: mockAtesteRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<FiscalizacaoNotificationService>(
      FiscalizacaoNotificationService,
    );
    medicaoRepository = module.get<Repository<Medicao>>(
      getRepositoryToken(Medicao),
    );
    ocorrenciaRepository = module.get<Repository<Ocorrencia>>(
      getRepositoryToken(Ocorrencia),
    );
    atesteRepository = module.get<Repository<Ateste>>(
      getRepositoryToken(Ateste),
    );
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyMedicaoCriada', () => {
    it('should send notification when medição is created', async () => {
      const medicao = {
        id: '123',
        numero: 1,
        valorMedido: 10000,
        periodoInicio: new Date('2024-01-01'),
        periodoFim: new Date('2024-01-31'),
        contratoId: 'contrato-1',
        fiscalResponsavel: {
          email: 'fiscal@example.com',
          name: 'João Fiscal',
        },
        contrato: {
          numero: 'CONT-001/2024',
          objeto: 'Serviços de TI',
        },
        observacoes: 'Teste',
      } as any;

      mockEmailService.sendMail.mockResolvedValue(undefined);

      await service.notifyMedicaoCriada(medicao);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'fiscal@example.com',
          subject: expect.stringContaining('Nova Medição #1'),
          html: expect.stringContaining('João Fiscal'),
        }),
      );
    });

    it('should not send notification if fiscal responsável has no email', async () => {
      const medicao = {
        numero: 1,
        fiscalResponsavel: null,
      } as any;

      await service.notifyMedicaoCriada(medicao);

      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });

    it('should not throw error if email sending fails', async () => {
      const medicao = {
        numero: 1,
        fiscalResponsavel: {
          email: 'fiscal@example.com',
          name: 'João',
        },
        contrato: {
          numero: 'CONT-001',
          objeto: 'Teste',
        },
        valorMedido: 1000,
        periodoInicio: new Date(),
        periodoFim: new Date(),
      } as any;

      mockEmailService.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(service.notifyMedicaoCriada(medicao)).resolves.not.toThrow();
    });
  });

  describe('notifyMedicaoRejeitada', () => {
    it('should send rejection notification to medição creator', async () => {
      const medicao = {
        numero: 1,
        valorMedido: 5000,
        contratoId: 'contrato-1',
        createdBy: {
          email: 'criador@example.com',
          name: 'Maria Criadora',
        },
        contrato: {
          numero: 'CONT-001/2024',
          objeto: 'Serviços',
        },
      } as any;

      const ateste = {
        resultado: 'REJEITADO',
        justificativa: 'Documentação incompleta',
        dataAteste: new Date(),
        fiscal: {
          name: 'João Fiscal',
        },
      } as any;

      mockEmailService.sendMail.mockResolvedValue(undefined);

      await service.notifyMedicaoRejeitada(medicao, ateste);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'criador@example.com',
          subject: expect.stringContaining('REJEITADA'),
          html: expect.stringContaining('Documentação incompleta'),
        }),
      );
    });

    it('should not send notification if creator has no email', async () => {
      const medicao = {
        numero: 1,
        createdBy: null,
      } as any;

      const ateste = {} as any;

      await service.notifyMedicaoRejeitada(medicao, ateste);

      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('notifyOcorrenciaCritica', () => {
    it('should send critical notification to fiscal and gestor', async () => {
      const ocorrencia = {
        id: 'ocorrencia-1',
        tipo: 'FALHA',
        gravidade: 'CRITICA',
        descricao: 'Falha grave no sistema',
        acaoCorretiva: 'Substituir equipamento',
        dataOcorrencia: new Date(),
        prazoResolucao: new Date(),
        contratoId: 'contrato-1',
        contrato: {
          numero: 'CONT-001/2024',
          objeto: 'Fornecimento de TI',
          fiscalResponsavelId: 'fiscal-id',
          fiscalResponsavel: {
            email: 'fiscal@example.com',
          },
          gestorResponsavelId: 'gestor-id',
          gestorResponsavel: {
            email: 'gestor@example.com',
          },
        },
        registradoPor: {
          name: 'João',
        },
      } as any;

      mockEmailService.sendMail.mockResolvedValue(undefined);

      await service.notifyOcorrenciaCritica(ocorrencia);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'fiscal@example.com, gestor@example.com',
          subject: expect.stringContaining('OCORRÊNCIA CRÍTICA'),
          html: expect.stringContaining('Falha grave no sistema'),
        }),
      );
    });

    it('should not duplicate email if gestor is same as fiscal', async () => {
      const ocorrencia = {
        id: 'ocorrencia-1',
        tipo: 'ATRASO',
        gravidade: 'CRITICA',
        descricao: 'Atraso crítico',
        acaoCorretiva: 'Ação',
        dataOcorrencia: new Date(),
        prazoResolucao: new Date(),
        contrato: {
          numero: 'CONT-001',
          objeto: 'Teste',
          fiscalResponsavelId: 'same-id',
          fiscalResponsavel: {
            email: 'same@example.com',
          },
          gestorResponsavelId: 'same-id',
          gestorResponsavel: {
            email: 'same@example.com',
          },
        },
        registradoPor: {
          name: 'João',
        },
      } as any;

      mockEmailService.sendMail.mockResolvedValue(undefined);

      await service.notifyOcorrenciaCritica(ocorrencia);

      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'same@example.com',
        }),
      );
    });

    it('should not send notification if no recipients found', async () => {
      const ocorrencia = {
        contrato: {
          fiscalResponsavelId: null,
          fiscalResponsavel: null,
          gestorResponsavelId: null,
          gestorResponsavel: null,
        },
      } as any;

      await service.notifyOcorrenciaCritica(ocorrencia);

      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('checkPrazosMedicaoPendente', () => {
    it('should find and notify pending medições older than 5 days', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const medicoesPendentes = [
        {
          id: 'medicao-1',
          numero: 1,
          status: 'PENDENTE',
          createdAt: sevenDaysAgo,
          valorMedido: 1000,
          contratoId: 'contrato-1',
          fiscalResponsavel: {
            email: 'fiscal@example.com',
            name: 'João',
          },
          contrato: {
            numero: 'CONT-001',
            objeto: 'Teste',
          },
        },
      ] as any[];

      mockMedicaoRepository.find.mockResolvedValue(medicoesPendentes);
      mockEmailService.sendMail.mockResolvedValue(undefined);

      const result = await service.checkPrazosMedicaoPendente();

      expect(result).toBe(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Pendente há 7 dias'),
        }),
      );
    });

    it('should not notify medições created less than 5 days ago', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const medicoesPendentes = [
        {
          status: 'PENDENTE',
          createdAt: threeDaysAgo,
          fiscalResponsavel: {
            email: 'fiscal@example.com',
          },
        },
      ] as any[];

      mockMedicaoRepository.find.mockResolvedValue(medicoesPendentes);

      const result = await service.checkPrazosMedicaoPendente();

      expect(result).toBe(0);
      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('checkPrazosOcorrenciaAberta', () => {
    it('should find and notify ocorrências near deadline', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const ocorrenciasAbertas = [
        {
          id: 'ocorrencia-1',
          tipo: 'ATRASO',
          status: 'ABERTA',
          gravidade: 'ALTA',
          prazoResolucao: tomorrow,
          descricao: 'Teste',
          acaoCorretiva: 'Ação',
          contrato: {
            numero: 'CONT-001',
            fiscalResponsavel: {
              email: 'fiscal@example.com',
            },
            gestor: {
              email: 'gestor@example.com',
            },
          },
        },
      ] as any[];

      mockOcorrenciaRepository.find.mockResolvedValue(ocorrenciasAbertas);
      mockEmailService.sendMail.mockResolvedValue(undefined);

      const result = await service.checkPrazosOcorrenciaAberta();

      expect(result).toBe(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Prazo'),
        }),
      );
    });

    it('should not notify ocorrências with deadline > 3 days', async () => {
      const fiveDaysAhead = new Date();
      fiveDaysAhead.setDate(fiveDaysAhead.getDate() + 5);

      const ocorrenciasAbertas = [
        {
          status: 'ABERTA',
          prazoResolucao: fiveDaysAhead,
          contrato: {
            fiscalResponsavel: {
              email: 'fiscal@example.com',
            },
          },
        },
      ] as any[];

      mockOcorrenciaRepository.find.mockResolvedValue(ocorrenciasAbertas);

      const result = await service.checkPrazosOcorrenciaAberta();

      expect(result).toBe(0);
      expect(mockEmailService.sendMail).not.toHaveBeenCalled();
    });

    it('should notify overdue ocorrências', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const ocorrenciasAbertas = [
        {
          id: 'ocorrencia-1',
          tipo: 'INADIMPLENCIA',
          status: 'ABERTA',
          gravidade: 'CRITICA',
          prazoResolucao: yesterday,
          descricao: 'Inadimplente',
          acaoCorretiva: 'Cobrar',
          contrato: {
            numero: 'CONT-001',
            fiscalResponsavel: {
              email: 'fiscal@example.com',
            },
          },
        },
      ] as any[];

      mockOcorrenciaRepository.find.mockResolvedValue(ocorrenciasAbertas);
      mockEmailService.sendMail.mockResolvedValue(undefined);

      const result = await service.checkPrazosOcorrenciaAberta();

      expect(result).toBe(1);
      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('VENCIDO'),
        }),
      );
    });
  });
});
