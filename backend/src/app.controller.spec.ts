import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DISCLAIMER } from './common/constants/messages';

describe('AppController', () => {
 let controller: AppController;
 let appService: AppService;

 const mockAppService = {
 getHealth: jest.fn(),
 getInfo: jest.fn(),
 };

 const mockHealthResponse = {
 status: 'ok',
 timestamp: '2025-01-13T12:00:00.000Z',
 warning: DISCLAIMER,
 message: 'ETP Express Backend is running',
 };

 const mockInfoResponse = {
 name: 'ETP Express',
 version: '1.0.0',
 description:
 'Sistema assistivo para elaboração de Estudos Técnicos Preliminares (Lei 14.133/2021)',
 warning: DISCLAIMER,
 features: [
 'Geração assistida por LLM (OpenAI GPT-4)',
 'Busca de contratações similares (Exa AI)',
 'Sistema de subagentes especializados',
 'Versionamento e auditoria completos',
 'Export para PDF, JSON e XML',
 'Analytics de UX',
 ],
 disclaimer: [
 'Este sistema NÃO substitui responsabilidade administrativa',
 'Este sistema NÃO é ato conclusivo',
 'Este sistema NÃO exime conferência humana',
 'Toda geração deve ser validada por servidor responsável',
 ],
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 controllers: [AppController],
 providers: [{ provide: AppService, useValue: mockAppService }],
 }).compile();

 controller = module.get<AppController>(AppController);
 appService = module.get<AppService>(AppService);

 // Reset mocks before each test
 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(controller).toBeDefined();
 });

 describe('getHealth', () => {
 it('should return health status', async () => {
 // Arrange
 mockAppService.getHealth.mockReturnValue(mockHealthResponse);

 // Act
 const result = controller.getHealth();

 // Assert
 expect(appService.getHealth).toHaveBeenCalled();
 expect(appService.getHealth).toHaveBeenCalledTimes(1);
 expect(result).toEqual(mockHealthResponse);
 expect(result.status).toBe('ok');
 expect(result.timestamp).toBeDefined();
 expect(result.message).toContain('ETP Express');
 });

 it('should include warning message in health response', async () => {
 // Arrange
 mockAppService.getHealth.mockReturnValue(mockHealthResponse);

 // Act
 const result = controller.getHealth();

 // Assert
 expect(result.warning).toBeDefined();
 expect(result.warning).toContain('ETP Express pode cometer erros');
 });
 });

 describe('getInfo', () => {
 it('should return system information', async () => {
 // Arrange
 mockAppService.getInfo.mockReturnValue(mockInfoResponse);

 // Act
 const result = controller.getInfo();

 // Assert
 expect(appService.getInfo).toHaveBeenCalled();
 expect(appService.getInfo).toHaveBeenCalledTimes(1);
 expect(result).toEqual(mockInfoResponse);
 expect(result.name).toBe('ETP Express');
 expect(result.version).toBe('1.0.0');
 });

 it('should include features list in system info', async () => {
 // Arrange
 mockAppService.getInfo.mockReturnValue(mockInfoResponse);

 // Act
 const result = controller.getInfo();

 // Assert
 expect(result.features).toBeDefined();
 expect(Array.isArray(result.features)).toBe(true);
 expect(result.features.length).toBe(6);
 expect(result.features).toContain(
 'Geração assistida por LLM (OpenAI GPT-4)',
 );
 });

 it('should include disclaimer list in system info', async () => {
 // Arrange
 mockAppService.getInfo.mockReturnValue(mockInfoResponse);

 // Act
 const result = controller.getInfo();

 // Assert
 expect(result.disclaimer).toBeDefined();
 expect(Array.isArray(result.disclaimer)).toBe(true);
 expect(result.disclaimer.length).toBe(4);
 expect(result.disclaimer).toContain(
 'Este sistema NÃO substitui responsabilidade administrativa',
 );
 });

 it('should include warning in system info', async () => {
 // Arrange
 mockAppService.getInfo.mockReturnValue(mockInfoResponse);

 // Act
 const result = controller.getInfo();

 // Assert
 expect(result.warning).toBeDefined();
 expect(result.warning).toContain('ETP Express pode cometer erros');
 });
 });
});
