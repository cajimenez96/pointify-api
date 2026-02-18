import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SuperAdminLoginDto } from './dto/superadmin-login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    superAdminLogin: jest.fn(),
    tenantLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('superAdminLogin', () => {
    it('should call authService.superAdminLogin with correct parameters', async () => {
      const dto: SuperAdminLoginDto = {
        username: 'superadmin',
        password: 'password123',
      };

      const expectedResult = {
        access_token: 'mock-token',
        user: {
          id: '123',
          username: 'superadmin',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
        },
      };

      mockAuthService.superAdminLogin.mockResolvedValue(expectedResult);

      const result = await controller.superAdminLogin(dto);

      expect(authService.superAdminLogin).toHaveBeenCalledWith(
        dto.username,
        dto.password,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const dto: SuperAdminLoginDto = {
        username: 'invalid',
        password: 'wrong',
      };

      mockAuthService.superAdminLogin.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(controller.superAdminLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('tenantLogin', () => {
    it('should call authService.tenantLogin with correct parameters', async () => {
      const dto: TenantLoginDto = {
        companyCode: 'DEMO001',
        username: 'admin.demo',
        password: 'password123',
      };

      const expectedResult = {
        access_token: 'mock-token',
        user: {
          id: '456',
          username: 'admin.demo',
          role: 'ADMIN',
          companyCode: 'DEMO001',
          companyName: 'Demo Company',
        },
      };

      mockAuthService.tenantLogin.mockResolvedValue(expectedResult);

      const result = await controller.tenantLogin(dto);

      expect(authService.tenantLogin).toHaveBeenCalledWith(
        dto.companyCode,
        dto.username,
        dto.password,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const dto: TenantLoginDto = {
        companyCode: 'INVALID',
        username: 'wrong',
        password: 'wrong',
      };

      mockAuthService.tenantLogin.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(controller.tenantLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
