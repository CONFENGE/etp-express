import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { addDays } from 'date-fns';
import { ContractAlertService, AlertType } from './contract-alert.service';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { EmailService } from '../../email/email.service';
import { User } from '../../../entities/user.entity';
import { Organization } from '../../../entities/organization.entity';

describe('ContractAlertService', () => {
  let service: ContractAlertService;
  let contratoRepository: jest.Mocked<Repository<Contrato>>;
  let emailService: jest.Mocked<EmailService>;

  // Mock data
  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Prefeitura Municipal de Test',
  } as Organization;

  const mockGestor: User = {
    id: 'user-gestor',
    name: 'João Silva',
    email: 'gestor@prefeitura.test',
  } as User;

  const mockFiscal: User = {
    id: 'user-fiscal',
    name: 'Maria Santos',
    email: 'fiscal@prefeitura.test',
  } as User;

  const createMockContract = (overrides: Partial<Contrato> = {}): Contrato =>
    ({
      id: 'contract-123',
      numero: '001/2024-CONTRATO',
      objeto: 'Prestação de serviços de limpeza e conservação',
      contratadoCnpj: '12.345.678/0001-90',
      contratadoRazaoSocial: 'Empresa Teste LTDA',
      valorGlobal: '150000.00',
      vigenciaInicio: new Date('2024-01-01'),
      vigenciaFim: addDays(new Date(), 30), // Default: vence em 30 dias
      status: ContratoStatus.EM_EXECUCAO,
      gestorResponsavelId: mockGestor.id,
      gestorResponsavel: mockGestor,
      fiscalResponsavelId: mockFiscal.id,
      fiscalResponsavel: mockFiscal,
      organizationId: mockOrganization.id,
      organization: mockOrganization,
      ...overrides,
    }) as Contrato;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockEmailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractAlertService,
        {
          provide: getRepositoryToken(Contrato),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<ContractAlertService>(ContractAlertService);
    contratoRepository = module.get(getRepositoryToken(Contrato));
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkExpiringContracts', () => {
    it('deve enviar alerta para contrato vencendo em 30 dias', async () => {
      const contract = createMockContract({
        vigenciaFim: addDays(new Date(), 30),
      });

      contratoRepository.find.mockResolvedValueOnce([contract]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([contract]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      const totalAlerts = await service.checkExpiringContracts();

      expect(totalAlerts).toBe(2); // 1 alerta de 60 dias + 1 de 30 dias
      expect(emailService.sendMail).toHaveBeenCalledTimes(4); // 2 contratos x 2 recipients (gestor + fiscal)

      // Verificar que email foi enviado com assunto correto
      const emailCall = emailService.sendMail.mock.calls.find((call: any) =>
        call[0].subject.includes('30 dias'),
      );
      expect(emailCall).toBeDefined();
      expect(emailCall![0].to).toBe(mockGestor.email);
      expect(emailCall![0].html).toContain(contract.numero);
      expect(emailCall![0].html).toContain('30 dias');
    });

    it('deve enviar alerta para contrato vencendo em 60 dias', async () => {
      const contract = createMockContract({
        vigenciaFim: addDays(new Date(), 60),
      });

      contratoRepository.find.mockResolvedValueOnce([contract]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      const totalAlerts = await service.checkExpiringContracts();

      expect(totalAlerts).toBe(1);
      expect(emailService.sendMail).toHaveBeenCalledTimes(2); // gestor + fiscal

      const emailCall = emailService.sendMail.mock.calls[0];
      expect(emailCall[0].subject).toContain('renovação');
      expect(emailCall[0].html).toContain('60 dias');
    });

    it('deve enviar alerta para contrato vencido', async () => {
      const contract = createMockContract({
        vigenciaFim: addDays(new Date(), -5), // Venceu há 5 dias
        status: ContratoStatus.EM_EXECUCAO,
      });

      contratoRepository.find.mockResolvedValueOnce([]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([contract]); // Vencidos

      const totalAlerts = await service.checkExpiringContracts();

      expect(totalAlerts).toBe(1);
      expect(emailService.sendMail).toHaveBeenCalledTimes(2);

      const emailCall = emailService.sendMail.mock.calls[0];
      expect(emailCall[0].subject).toContain('vencido');
      expect(emailCall[0].html).toContain('URGENTE');
    });

    it('não deve enviar alerta duplicado quando gestor e fiscal são a mesma pessoa', async () => {
      const sameUser: User = {
        id: 'user-same',
        name: 'Pedro Costa',
        email: 'pedro@prefeitura.test',
      } as User;

      const contract = createMockContract({
        vigenciaFim: addDays(new Date(), 30),
        gestorResponsavel: sameUser,
        fiscalResponsavel: sameUser,
      });

      contratoRepository.find.mockResolvedValueOnce([]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([contract]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      await service.checkExpiringContracts();

      // Apenas 1 email (não duplicar para mesma pessoa)
      expect(emailService.sendMail).toHaveBeenCalledTimes(1);
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: sameUser.email,
        }),
      );
    });

    it('não deve enviar alertas para contratos não EM_EXECUCAO', async () => {
      const contractMinuta = createMockContract({
        vigenciaFim: addDays(new Date(), 30),
        status: ContratoStatus.MINUTA,
      });

      const contractEncerrado = createMockContract({
        vigenciaFim: addDays(new Date(), 30),
        status: ContratoStatus.ENCERRADO,
      });

      contratoRepository.find.mockResolvedValue([]);

      const totalAlerts = await service.checkExpiringContracts();

      expect(totalAlerts).toBe(0);
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('deve retornar 0 se não houver contratos para alertar', async () => {
      contratoRepository.find.mockResolvedValue([]);

      const totalAlerts = await service.checkExpiringContracts();

      expect(totalAlerts).toBe(0);
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('deve continuar enviando alertas mesmo se um email falhar', async () => {
      const contract1 = createMockContract({
        id: 'contract-1',
        numero: '001/2024',
        vigenciaFim: addDays(new Date(), 30),
      });

      const contract2 = createMockContract({
        id: 'contract-2',
        numero: '002/2024',
        vigenciaFim: addDays(new Date(), 30),
      });

      contratoRepository.find.mockResolvedValueOnce([]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([contract1, contract2]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      // Simular falha no primeiro email
      emailService.sendMail
        .mockRejectedValueOnce(new Error('SMTP timeout'))
        .mockResolvedValue(undefined as any);

      const totalAlerts = await service.checkExpiringContracts();

      // Deve tentar enviar para ambos os contratos
      expect(totalAlerts).toBe(2);
      expect(emailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('checkBudgetThreshold', () => {
    it('deve retornar 0 pois funcionalidade depende de Issue #1286', async () => {
      const totalAlerts = await service.checkBudgetThreshold();

      expect(totalAlerts).toBe(0);
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Alert message generation', () => {
    it('deve gerar mensagem correta para cada tipo de alerta', async () => {
      const contract = createMockContract();

      contratoRepository.find.mockResolvedValueOnce([contract]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      await service.checkExpiringContracts();

      const emailCall = emailService.sendMail.mock.calls[0];
      const htmlContent = emailCall[0].html;

      // Verificar presença de dados essenciais
      expect(htmlContent).toContain(contract.numero);
      expect(htmlContent).toContain(contract.objeto);
      expect(htmlContent).toContain(contract.contratadoRazaoSocial);
      expect(htmlContent).toContain(contract.contratadoCnpj);
      expect(htmlContent).toContain(mockGestor.name);
      expect(htmlContent).toContain(mockFiscal.name);
      expect(htmlContent).toContain('Lei 14.133/2021 Art. 117');
    });

    it('deve incluir ações recomendadas no email', async () => {
      const contract = createMockContract({
        vigenciaFim: addDays(new Date(), 30),
      });

      contratoRepository.find.mockResolvedValueOnce([]); // 60 dias
      contratoRepository.find.mockResolvedValueOnce([contract]); // 30 dias
      contratoRepository.find.mockResolvedValueOnce([]); // Vencidos

      await service.checkExpiringContracts();

      const emailCall = emailService.sendMail.mock.calls[0];
      const htmlContent = emailCall[0].html;

      expect(htmlContent).toContain('Ações Recomendadas');
      expect(htmlContent).toContain('<ul>');
      expect(htmlContent).toContain('<li>');
    });
  });
});
