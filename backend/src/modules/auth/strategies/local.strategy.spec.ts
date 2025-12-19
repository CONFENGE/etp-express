import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
 let strategy: LocalStrategy;
 let authService: AuthService;

 const mockAuthService = {
 validateUser: jest.fn(),
 };

 const mockOrganization = {
 id: 'org-123',
 name: 'CONFENGE',
 cnpj: '12.345.678/0001-90',
 domainWhitelist: ['confenge.gov.br'],
 isActive: true,
 stripeCustomerId: null,
 createdAt: new Date(),
 updatedAt: new Date(),
 users: [],
 };

 const mockUser = {
 id: '123',
 email: 'test@example.com',
 name: 'Test User',
 role: 'servidor',
 organizationId: 'org-123',
 organization: mockOrganization,
 cargo: 'Analista',
 isActive: true,
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [
 LocalStrategy,
 { provide: AuthService, useValue: mockAuthService },
 ],
 }).compile();

 strategy = module.get<LocalStrategy>(LocalStrategy);
 authService = module.get<AuthService>(AuthService);

 // Reset mocks before each test
 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(strategy).toBeDefined();
 });

 describe('validate', () => {
 it('should return user object when credentials are valid', async () => {
 // Arrange
 const email = 'test@example.com';
 const password = 'password123';
 mockAuthService.validateUser.mockResolvedValue(mockUser);

 // Act
 const result = await strategy.validate(email, password);

 // Assert
 expect(authService.validateUser).toHaveBeenCalledWith(email, password);
 expect(authService.validateUser).toHaveBeenCalledTimes(1);
 expect(result).toEqual(mockUser);
 });

 it('should throw UnauthorizedException when credentials are invalid', async () => {
 // Arrange
 const email = 'test@example.com';
 const password = 'wrongpassword';
 mockAuthService.validateUser.mockResolvedValue(null);

 // Act & Assert
 await expect(strategy.validate(email, password)).rejects.toThrow(
 UnauthorizedException,
 );
 await expect(strategy.validate(email, password)).rejects.toThrow(
 'Credenciais inválidas',
 );
 expect(authService.validateUser).toHaveBeenCalledWith(email, password);
 });

 it('should throw UnauthorizedException when user is not found', async () => {
 // Arrange
 const email = 'nonexistent@example.com';
 const password = 'password123';
 mockAuthService.validateUser.mockResolvedValue(null);

 // Act & Assert
 await expect(strategy.validate(email, password)).rejects.toThrow(
 UnauthorizedException,
 );
 expect(authService.validateUser).toHaveBeenCalledWith(email, password);
 });
 });
});
