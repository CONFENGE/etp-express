import { Test, TestingModule } from '@nestjs/testing';
import { DemoUserController } from '../demo-user.controller';
import {
  DemoUserService,
  DemoUserWithEtpCount,
  CreateDemoUserResponse,
} from '../demo-user.service';
import { CreateDemoUserDto } from '../dto/create-demo-user.dto';
import { ResetDemoUserDto } from '../dto/reset-demo-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../guards/system-admin.guard';
import { UserRole } from '../../../entities/user.entity';

describe('DemoUserController', () => {
  let controller: DemoUserController;
  let service: DemoUserService;

  const mockDemoUser: DemoUserWithEtpCount = {
    id: 'demo-user-uuid',
    email: 'demo@example.com',
    name: 'Demo User',
    cargo: 'Tester',
    role: UserRole.DEMO,
    isActive: true,
    etpLimitCount: 3,
    etpCount: 1,
    isBlocked: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
  };

  const mockCreateResponse: CreateDemoUserResponse = {
    user: mockDemoUser,
    generatedPassword: 'abc123xyz789',
  };

  const mockDemoUserService = {
    createDemoUser: jest.fn(),
    findAllDemoUsers: jest.fn(),
    findOneDemoUser: jest.fn(),
    removeDemoUser: jest.fn(),
    resetDemoUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoUserController],
      providers: [
        {
          provide: DemoUserService,
          useValue: mockDemoUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SystemAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DemoUserController>(DemoUserController);
    service = module.get<DemoUserService>(DemoUserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new demo user', async () => {
      const createDemoUserDto: CreateDemoUserDto = {
        email: 'newdemo@example.com',
        name: 'New Demo User',
        cargo: 'Tester',
      };

      mockDemoUserService.createDemoUser.mockResolvedValue(mockCreateResponse);

      const result = await controller.create(createDemoUserDto);

      expect(service.createDemoUser).toHaveBeenCalledWith(createDemoUserDto);
      expect(result.user).toEqual(mockDemoUser);
      expect(result.generatedPassword).toBeDefined();
    });

    it('should create demo user without cargo', async () => {
      const createDemoUserDto: CreateDemoUserDto = {
        email: 'newdemo@example.com',
        name: 'New Demo User',
      };

      const responseWithoutCargo = {
        ...mockCreateResponse,
        user: { ...mockDemoUser, cargo: null },
      };
      mockDemoUserService.createDemoUser.mockResolvedValue(
        responseWithoutCargo,
      );

      const result = await controller.create(createDemoUserDto);

      expect(service.createDemoUser).toHaveBeenCalledWith(createDemoUserDto);
      expect(result.user.cargo).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all demo users', async () => {
      const demoUsers = [mockDemoUser];
      mockDemoUserService.findAllDemoUsers.mockResolvedValue(demoUsers);

      const result = await controller.findAll();

      expect(service.findAllDemoUsers).toHaveBeenCalled();
      expect(result).toEqual(demoUsers);
    });

    it('should return empty array when no demo users exist', async () => {
      mockDemoUserService.findAllDemoUsers.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAllDemoUsers).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should include blocked status in response', async () => {
      const blockedUser = { ...mockDemoUser, etpCount: 3, isBlocked: true };
      mockDemoUserService.findAllDemoUsers.mockResolvedValue([blockedUser]);

      const result = await controller.findAll();

      expect(result[0].isBlocked).toBe(true);
      expect(result[0].etpCount).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a demo user by ID', async () => {
      mockDemoUserService.findOneDemoUser.mockResolvedValue(mockDemoUser);

      const result = await controller.findOne(mockDemoUser.id);

      expect(service.findOneDemoUser).toHaveBeenCalledWith(mockDemoUser.id);
      expect(result).toEqual(mockDemoUser);
    });

    it('should include ETP count in response', async () => {
      const userWithEtps = { ...mockDemoUser, etpCount: 2 };
      mockDemoUserService.findOneDemoUser.mockResolvedValue(userWithEtps);

      const result = await controller.findOne(mockDemoUser.id);

      expect(result.etpCount).toBe(2);
    });
  });

  describe('remove', () => {
    it('should delete a demo user', async () => {
      mockDemoUserService.removeDemoUser.mockResolvedValue(undefined);

      await controller.remove(mockDemoUser.id);

      expect(service.removeDemoUser).toHaveBeenCalledWith(mockDemoUser.id);
    });
  });

  describe('reset', () => {
    it('should reset demo user without password regeneration', async () => {
      const resetDto: ResetDemoUserDto = {
        regeneratePassword: false,
      };

      const resetResponse = {
        user: { ...mockDemoUser, etpCount: 0, isBlocked: false },
      };
      mockDemoUserService.resetDemoUser.mockResolvedValue(resetResponse);

      const result = await controller.reset(mockDemoUser.id, resetDto);

      expect(service.resetDemoUser).toHaveBeenCalledWith(
        mockDemoUser.id,
        false,
      );
      expect(result.user.etpCount).toBe(0);
      expect(result.generatedPassword).toBeUndefined();
    });

    it('should reset demo user with password regeneration', async () => {
      const resetDto: ResetDemoUserDto = {
        regeneratePassword: true,
      };

      const resetResponse = {
        user: { ...mockDemoUser, etpCount: 0, isBlocked: false },
        generatedPassword: 'newpass123',
      };
      mockDemoUserService.resetDemoUser.mockResolvedValue(resetResponse);

      const result = await controller.reset(mockDemoUser.id, resetDto);

      expect(service.resetDemoUser).toHaveBeenCalledWith(mockDemoUser.id, true);
      expect(result.generatedPassword).toBe('newpass123');
    });

    it('should default to no password regeneration when not specified', async () => {
      const resetDto: ResetDemoUserDto = {};

      const resetResponse = {
        user: { ...mockDemoUser, etpCount: 0, isBlocked: false },
      };
      mockDemoUserService.resetDemoUser.mockResolvedValue(resetResponse);

      const result = await controller.reset(mockDemoUser.id, resetDto);

      expect(service.resetDemoUser).toHaveBeenCalledWith(
        mockDemoUser.id,
        false,
      );
      expect(result.generatedPassword).toBeUndefined();
    });

    it('should reactivate blocked user on reset', async () => {
      const resetDto: ResetDemoUserDto = {};

      const resetResponse = {
        user: {
          ...mockDemoUser,
          isActive: true,
          etpCount: 0,
          isBlocked: false,
        },
      };
      mockDemoUserService.resetDemoUser.mockResolvedValue(resetResponse);

      const result = await controller.reset(mockDemoUser.id, resetDto);

      expect(result.user.isActive).toBe(true);
      expect(result.user.isBlocked).toBe(false);
    });
  });
});
