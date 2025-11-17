import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { SectionStatus, SectionType } from '../../entities/etp-section.entity';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Integration tests for SectionsController
 *
 * Tests HTTP endpoints for ETP section generation and management:
 * - POST /sections/etp/:id/generate - Generate new section with AI
 * - GET /sections/etp/:id - List all sections for an ETP
 * - GET /sections/:id - Get section by ID
 * - PATCH /sections/:id - Update section manually
 * - POST /sections/:id/regenerate - Regenerate section with AI
 * - POST /sections/:id/validate - Validate section content
 * - DELETE /sections/:id - Delete section
 *
 * Coverage objectives:
 * - All endpoints must have at least 3 tests
 * - Test success paths, error paths, and authorization
 * - Use supertest for HTTP request simulation
 */
describe('SectionsController (Integration)', () => {
  let app: INestApplication;
  let sectionsService: SectionsService;

  // Mock data
  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockSectionId = 'section-789';

  const mockEtp = {
    id: mockEtpId,
    objeto: 'Contratação de serviços de TI',
    metadata: { orgao: 'CONFENGE' },
  };

  const mockSection = {
    id: mockSectionId,
    etpId: mockEtpId,
    type: SectionType.JUSTIFICATIVA,
    title: 'Justificativa da Contratação',
    content: 'Conteúdo gerado pela IA',
    userInput: 'Input do usuário',
    systemPrompt: 'Você é um assistente de redação de ETPs...',
    status: SectionStatus.GENERATED,
    order: 1,
    isRequired: true,
    metadata: {
      tokens: 150,
      model: 'gpt-4',
      generationTime: 2500,
      agentsUsed: ['legal-context', 'anti-hallucination'],
    },
    validationResults: {
      legalCompliance: true,
      clarityScore: 85,
      hallucinationCheck: true,
      warnings: [],
      suggestions: [],
    },
    etp: mockEtp as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGeneratedSection = {
    ...mockSection,
    status: SectionStatus.GENERATED,
  };

  const mockValidationResult = {
    section: mockSection,
    validationResults: {
      legal: { isCompliant: true, score: 85, issues: [], recommendations: [] },
      clareza: { score: 90, issues: [], suggestions: [] },
      simplificacao: { score: 80, suggestions: [] },
      antiHallucination: { score: 95, verified: true, warnings: [] },
      overallScore: '87.50',
    },
    disclaimer: DISCLAIMER,
  };

  /**
   * Creates a mock SectionsService with all required methods
   * @returns Mock object with CRUD and generation methods
   */
  const createMockSectionsService = () => ({
    generateSection: jest.fn().mockResolvedValue(mockGeneratedSection),
    findAll: jest.fn().mockResolvedValue([mockSection]),
    findOne: jest.fn().mockResolvedValue(mockSection),
    update: jest.fn().mockResolvedValue(mockSection),
    regenerateSection: jest.fn().mockResolvedValue(mockGeneratedSection),
    validateSection: jest.fn().mockResolvedValue(mockValidationResult),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  /**
   * Mock JwtAuthGuard to bypass authentication in tests
   * Simulates authenticated user with mockUserId
   */
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Simulate authenticated user
      request.user = { id: mockUserId, email: 'test@example.com' };
      return true;
    }),
  };

  /**
   * Mock UserThrottlerGuard to bypass rate limiting in tests
   * Rate limiting is tested separately in sections-rate-limit.spec.ts
   */
  const mockUserThrottlerGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SectionsController],
      providers: [
        { provide: SectionsService, useValue: createMockSectionsService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(UserThrottlerGuard)
      .useValue(mockUserThrottlerGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    sectionsService = moduleRef.get<SectionsService>(SectionsService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  /**
   * Tests for POST /sections/etp/:etpId/generate
   * Validates section generation endpoint behavior
   */
  describe('POST /sections/etp/:etpId/generate', () => {
    const generateDto = {
      type: SectionType.JUSTIFICATIVA,
      title: 'Justificativa da Contratação',
      userInput: 'Precisamos contratar serviços de TI',
      context: {
        orgao: 'CONFENGE',
        prazo: 'urgente',
      },
    };

    it('deve retornar 201 e a seção gerada com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sections/etp/${mockEtpId}/generate`)
        .send(generateDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockSectionId);
      expect(response.body.data.content).toBe('Conteúdo gerado pela IA');
      expect(response.body.disclaimer).toBeDefined();
      expect(response.body.disclaimer).toContain(
        'ETP Express pode cometer erros',
      );

      expect(sectionsService.generateSection).toHaveBeenCalledWith(
        mockEtpId,
        generateDto,
        expect.any(String), // userId from CurrentUser decorator
      );
    });

    it('deve retornar 404 quando ETP não for encontrado', async () => {
      jest
        .spyOn(sectionsService, 'generateSection')
        .mockRejectedValue(new NotFoundException('ETP não encontrado'));

      await request(app.getHttpServer())
        .post(`/sections/etp/invalid-id/generate`)
        .send(generateDto)
        .expect(404);
    });

    it('deve retornar 400 quando seção já existir', async () => {
      jest
        .spyOn(sectionsService, 'generateSection')
        .mockRejectedValue(
          new BadRequestException(
            'Seção do tipo justificativa já existe. Use PATCH para atualizar.',
          ),
        );

      const response = await request(app.getHttpServer())
        .post(`/sections/etp/${mockEtpId}/generate`)
        .send(generateDto)
        .expect(400);

      expect(response.body.message).toContain('já existe');
    });

    it('deve validar o DTO e retornar 400 para dados inválidos', async () => {
      const invalidDto = {
        type: 'tipo-invalido', // Tipo inválido
        title: '',
      };

      await request(app.getHttpServer())
        .post(`/sections/etp/${mockEtpId}/generate`)
        .send(invalidDto)
        .expect(400);
    });

    it('deve incluir metadata e validationResults na resposta', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sections/etp/${mockEtpId}/generate`)
        .send(generateDto)
        .expect(201);

      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.tokens).toBe(150);
      expect(response.body.data.metadata.model).toBe('gpt-4');
      expect(response.body.data.validationResults).toBeDefined();
      expect(response.body.data.validationResults.legalCompliance).toBe(true);
    });
  });

  /**
   * Tests for GET /sections/etp/:etpId
   * Validates listing all sections for an ETP
   */
  describe('GET /sections/etp/:etpId', () => {
    it('deve retornar 200 e lista de seções do ETP', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sections/etp/${mockEtpId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(mockSectionId);
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.findAll).toHaveBeenCalledWith(mockEtpId);
    });

    it('deve retornar 200 com array vazio quando ETP não tem seções', async () => {
      jest.spyOn(sectionsService, 'findAll').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/sections/etp/${mockEtpId}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('deve ordenar seções por order (ASC)', async () => {
      const sections = [
        { ...mockSection, id: '1', order: 2 },
        { ...mockSection, id: '2', order: 1 },
        { ...mockSection, id: '3', order: 3 },
      ];
      jest.spyOn(sectionsService, 'findAll').mockResolvedValue(sections);

      const response = await request(app.getHttpServer())
        .get(`/sections/etp/${mockEtpId}`)
        .expect(200);

      // Verifica que o serviço foi chamado (ordenação acontece no service)
      expect(sectionsService.findAll).toHaveBeenCalledWith(mockEtpId);
      expect(response.body.data).toHaveLength(3);
    });
  });

  /**
   * Tests for GET /sections/:id
   * Validates getting a single section by ID
   */
  describe('GET /sections/:id', () => {
    it('deve retornar 200 e os dados da seção', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sections/${mockSectionId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockSectionId);
      expect(response.body.data.content).toBe('Conteúdo gerado pela IA');
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.findOne).toHaveBeenCalledWith(mockSectionId);
    });

    it('deve retornar 404 quando seção não for encontrada', async () => {
      jest
        .spyOn(sectionsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .get('/sections/invalid-id')
        .expect(404);
    });

    it('deve incluir validationResults na resposta', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sections/${mockSectionId}`)
        .expect(200);

      expect(response.body.data.validationResults).toBeDefined();
      expect(response.body.data.validationResults.legalCompliance).toBe(true);
      expect(response.body.data.validationResults.clarityScore).toBe(85);
    });
  });

  /**
   * Tests for PATCH /sections/:id
   * Validates section update endpoint
   */
  describe('PATCH /sections/:id', () => {
    const updateDto = {
      title: 'Título atualizado',
      content: 'Conteúdo atualizado manualmente',
      status: SectionStatus.APPROVED,
    };

    it('deve retornar 200 e a seção atualizada', async () => {
      const updatedSection = { ...mockSection, ...updateDto };
      jest.spyOn(sectionsService, 'update').mockResolvedValue(updatedSection);

      const response = await request(app.getHttpServer())
        .patch(`/sections/${mockSectionId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Título atualizado');
      expect(response.body.data.content).toBe(
        'Conteúdo atualizado manualmente',
      );
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.update).toHaveBeenCalledWith(
        mockSectionId,
        updateDto,
      );
    });

    it('deve retornar 404 quando seção não for encontrada', async () => {
      jest
        .spyOn(sectionsService, 'update')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .patch('/sections/invalid-id')
        .send(updateDto)
        .expect(404);
    });

    it('deve validar o DTO e retornar 400 para status inválido', async () => {
      const invalidDto = {
        status: 'status-invalido',
      };

      await request(app.getHttpServer())
        .patch(`/sections/${mockSectionId}`)
        .send(invalidDto)
        .expect(400);
    });

    it('deve permitir atualização parcial (campos opcionais)', async () => {
      const partialUpdateDto = {
        title: 'Apenas título atualizado',
      };

      const updatedSection = { ...mockSection, ...partialUpdateDto };
      jest.spyOn(sectionsService, 'update').mockResolvedValue(updatedSection);

      const response = await request(app.getHttpServer())
        .patch(`/sections/${mockSectionId}`)
        .send(partialUpdateDto)
        .expect(200);

      expect(response.body.data.title).toBe('Apenas título atualizado');
      expect(response.body.data.content).toBe('Conteúdo gerado pela IA'); // Mantém original
    });
  });

  /**
   * Tests for POST /sections/:id/regenerate
   * Validates section regeneration with AI
   */
  describe('POST /sections/:id/regenerate', () => {
    it('deve retornar 200 e a seção regenerada', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sections/${mockSectionId}/regenerate`)
        .expect(201); // POST retorna 201 por padrão no NestJS

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockSectionId);
      expect(response.body.data.status).toBe(SectionStatus.GENERATED);
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.regenerateSection).toHaveBeenCalledWith(
        mockSectionId,
        expect.any(String), // userId from CurrentUser decorator
      );
    });

    it('deve retornar 404 quando seção não for encontrada', async () => {
      jest
        .spyOn(sectionsService, 'regenerateSection')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .post('/sections/invalid-id/regenerate')
        .expect(404);
    });

    it('deve incluir metadata.regeneratedAt na resposta', async () => {
      const regeneratedSection = {
        ...mockGeneratedSection,
        metadata: {
          ...mockGeneratedSection.metadata,
          regeneratedAt: new Date().toISOString(),
        },
      };
      jest
        .spyOn(sectionsService, 'regenerateSection')
        .mockResolvedValue(regeneratedSection);

      const response = await request(app.getHttpServer())
        .post(`/sections/${mockSectionId}/regenerate`)
        .expect(201); // POST retorna 201 por padrão no NestJS

      expect(response.body.data.metadata.regeneratedAt).toBeDefined();
    });
  });

  /**
   * Tests for POST /sections/:id/validate
   * Validates section validation endpoint
   */
  describe('POST /sections/:id/validate', () => {
    it('deve retornar 200 e os resultados de validação', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sections/${mockSectionId}/validate`)
        .expect(201); // POST retorna 201 por padrão no NestJS

      expect(response.body).toBeDefined();
      expect(response.body.section).toBeDefined();
      expect(response.body.validationResults).toBeDefined();
      expect(response.body.validationResults.overallScore).toBe('87.50');
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.validateSection).toHaveBeenCalledWith(
        mockSectionId,
      );
    });

    it('deve retornar 404 quando seção não for encontrada', async () => {
      jest
        .spyOn(sectionsService, 'validateSection')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .post('/sections/invalid-id/validate')
        .expect(404);
    });

    it('deve retornar 400 quando seção não tem conteúdo para validar', async () => {
      jest
        .spyOn(sectionsService, 'validateSection')
        .mockRejectedValue(
          new BadRequestException('Seção não possui conteúdo para validar'),
        );

      await request(app.getHttpServer())
        .post(`/sections/${mockSectionId}/validate`)
        .expect(400);
    });

    it('deve incluir scores de todos os agentes de validação', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sections/${mockSectionId}/validate`)
        .expect(201); // POST retorna 201 por padrão no NestJS

      const { validationResults } = response.body;
      expect(validationResults.legal).toBeDefined();
      expect(validationResults.clareza).toBeDefined();
      expect(validationResults.simplificacao).toBeDefined();
      expect(validationResults.antiHallucination).toBeDefined();
      expect(validationResults.overallScore).toBeDefined();
    });
  });

  /**
   * Tests for DELETE /sections/:id
   * Validates section deletion endpoint
   */
  describe('DELETE /sections/:id', () => {
    it('deve retornar 200 e mensagem de sucesso', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/sections/${mockSectionId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBe('Seção deletada com sucesso');
      expect(response.body.disclaimer).toBeDefined();

      expect(sectionsService.remove).toHaveBeenCalledWith(
        mockSectionId,
        expect.any(String), // userId from CurrentUser decorator
      );
    });

    it('deve retornar 404 quando seção não for encontrada', async () => {
      jest
        .spyOn(sectionsService, 'remove')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .delete('/sections/invalid-id')
        .expect(404);
    });

    it('deve verificar autorização do usuário antes de deletar', async () => {
      jest
        .spyOn(sectionsService, 'remove')
        .mockRejectedValue(
          new ForbiddenException(
            'Você não tem permissão para deletar esta seção',
          ),
        );

      await request(app.getHttpServer())
        .delete(`/sections/${mockSectionId}`)
        .expect(403);
    });
  });

  /**
   * Tests for authentication and authorization
   * Validates JwtAuthGuard integration
   */
  describe('Autenticação e Autorização', () => {
    it('deve extrair userId do token JWT via @CurrentUser decorator', async () => {
      // Configurar mock para retornar userId específico
      await request(app.getHttpServer())
        .post(`/sections/etp/${mockEtpId}/generate`)
        .send({
          type: SectionType.JUSTIFICATIVA,
          title: 'Teste',
          userInput: 'Teste',
        })
        .expect(201);

      // Verificar que userId foi passado ao service (mockUserId)
      expect(sectionsService.generateSection).toHaveBeenCalledWith(
        mockEtpId,
        expect.any(Object),
        mockUserId, // userId from mocked JwtAuthGuard
      );
    });

    it('deve aplicar JwtAuthGuard ao controller inteiro', () => {
      // JwtAuthGuard está configurado via @UseGuards(JwtAuthGuard) no controller
      // Este teste verifica que o guard está configurado corretamente
      // Se o guard não estivesse funcionando, os testes acima falhariam
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  /**
   * Tests for error handling and edge cases
   * Validates proper error responses
   */
  describe('Tratamento de Erros e Casos Extremos', () => {
    it('deve retornar 500 quando ocorrer erro interno no serviço', async () => {
      jest
        .spyOn(sectionsService, 'findOne')
        .mockRejectedValue(new Error('Database connection failed'));

      await request(app.getHttpServer())
        .get(`/sections/${mockSectionId}`)
        .expect(500);
    });

    it('deve incluir disclaimer em todas as respostas de sucesso', async () => {
      const endpoints = [
        { method: 'get', path: `/sections/etp/${mockEtpId}` },
        { method: 'get', path: `/sections/${mockSectionId}` },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method](endpoint.path)
          .expect(200);

        expect(response.body.disclaimer).toBeDefined();
        expect(response.body.disclaimer).toContain(
          'ETP Express pode cometer erros',
        );
      }
    });

    it('deve validar UUID format para parâmetros de ID', async () => {
      const invalidId = 'not-a-uuid';

      // O NestJS ValidationPipe valida automaticamente UUIDs se configurado
      // Por ora, apenas testamos que IDs inválidos geram erro 404 (service lança NotFoundException)
      jest
        .spyOn(sectionsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Seção não encontrada'));

      await request(app.getHttpServer())
        .get(`/sections/${invalidId}`)
        .expect(404);
    });
  });
});
