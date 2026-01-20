import { Test, TestingModule } from '@nestjs/testing';
import { EditalController } from './edital.controller';
import { EditalGenerationService } from './edital-generation.service';
import { GenerateEditalDto, GenerateEditalResponseDto } from './dto';
import { User } from '../../entities/user.entity';
import { EditalStatus } from '../../entities/edital.entity';

/**
 * Testes unitários para EditalController.
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Milestone: M14 - Geração de Edital
 */
describe('EditalController', () => {
  let controller: EditalController;
  let generationService: EditalGenerationService;

  const mockUser: Partial<User> = {
    id: 'user-456',
    organizationId: 'org-123',
    email: 'test@example.com',
    role: 'user' as any,
  };

  const mockGeneratedEdital: GenerateEditalResponseDto = {
    id: 'edital-001',
    numero: '001/2024-PREGAO',
    objeto: 'Contratação de serviços de desenvolvimento',
    modalidade: 'PREGAO',
    tipoContratacaoDireta: null,
    valorEstimado: '250000',
    status: EditalStatus.DRAFT,
    createdAt: new Date(),
    metadata: {
      aiEnhanced: true,
      latencyMs: 1500,
      tokens: 300,
      model: 'gpt-4.1-nano',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditalController],
      providers: [
        {
          provide: EditalGenerationService,
          useValue: {
            generateFromEtp: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EditalController>(EditalController);
    generationService = module.get<EditalGenerationService>(EditalGenerationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /editais/generate', () => {
    it('should generate Edital from ETP successfully', async () => {
      // Arrange
      const dto: GenerateEditalDto = {
        etpId: 'etp-789',
        termoReferenciaId: 'tr-001',
        pesquisaPrecosId: 'pesquisa-001',
      };

      jest
        .spyOn(generationService, 'generateFromEtp')
        .mockResolvedValue(mockGeneratedEdital);

      // Act
      const result = await controller.generateFromEtp(dto, mockUser as User);

      // Assert
      expect(result).toEqual(mockGeneratedEdital);
      expect(generationService.generateFromEtp).toHaveBeenCalledWith(
        dto,
        mockUser.id,
        mockUser.organizationId,
      );
    });

    it('should generate Edital with only ETP (no TR/Pesquisa)', async () => {
      // Arrange
      const dtoMinimal: GenerateEditalDto = {
        etpId: 'etp-789',
      };

      jest
        .spyOn(generationService, 'generateFromEtp')
        .mockResolvedValue(mockGeneratedEdital);

      // Act
      const result = await controller.generateFromEtp(dtoMinimal, mockUser as User);

      // Assert
      expect(result).toEqual(mockGeneratedEdital);
      expect(generationService.generateFromEtp).toHaveBeenCalledWith(
        dtoMinimal,
        mockUser.id,
        mockUser.organizationId,
      );
    });
  });
});
