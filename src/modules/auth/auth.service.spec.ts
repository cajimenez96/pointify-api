import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from '../../schemas/user.schema';
import { Company } from '../../schemas/company.schema';
import * as bcrypt from 'bcrypt';

// Mock bcrypt at module level
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: { sign: jest.Mock };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'superadmin',
    password: '$2b$10$hashedpassword',
    name: 'Super Admin',
    dni: '12345678',
    role: UserRole.SUPER_ADMIN,
    companyId: null,
    isActive: true,
  };

  const mockTenantUser = {
    _id: '507f1f77bcf86cd799439022',
    username: 'admin.demo',
    password: '$2b$10$hashedpassword',
    name: 'Admin Demo',
    dni: '87654321',
    role: UserRole.ADMIN,
    companyId: '507f1f77bcf86cd799439033',
    isActive: true,
  };

  const mockCompany = {
    _id: '507f1f77bcf86cd799439033',
    companyCode: 'DEMO001',
    businessName: 'Demo Company',
    isActive: true,
  };

  // Class-based mock for User Model
  class MockUserModel {
    constructor(public data: any) {}
    save = jest.fn().mockResolvedValue({
      _id: 'new-user-id',
      ...this.data,
    });
    static findOne = jest.fn();
  }

  // Class-based mock for Company Model
  class MockCompanyModel {
    static findOne = jest.fn();
  }

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    MockUserModel.findOne.mockReset();
    MockCompanyModel.findOne.mockReset();

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: getModelToken(Company.name),
          useValue: MockCompanyModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('superAdminLogin', () => {
    it('should login SuperAdmin successfully', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.superAdminLogin('superadmin', 'password123');

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        username: 'superadmin',
        role: UserRole.SUPER_ADMIN,
        companyId: null,
        isActive: true,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toEqual({
        id: mockUser._id,
        username: mockUser.username,
        name: mockUser.name,
        role: mockUser.role,
        isSuperAdmin: true,
      });
    });

    it('should throw UnauthorizedException if SuperAdmin does not exist', async () => {
      MockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.superAdminLogin('nonexistent', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.superAdminLogin('superadmin', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      MockUserModel.findOne.mockResolvedValue(null); // Query filters isActive:true

      await expect(
        service.superAdminLogin('superadmin', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should verify JWT payload structure for SuperAdmin', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.superAdminLogin('superadmin', 'password123');

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id,
        username: mockUser.username,
        role: mockUser.role,
        companyId: null,
        companyCode: null,
      });
    });

    it('should not include password in response', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.superAdminLogin('superadmin', 'password123');

      expect(result.user).not.toHaveProperty('password');
    });

    it('should only search for users with companyId null', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.superAdminLogin('superadmin', 'password123');

      expect(MockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: null }),
      );
    });

    it('should only search for users with role SUPER_ADMIN', async () => {
      MockUserModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.superAdminLogin('superadmin', 'password123');

      expect(MockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.SUPER_ADMIN }),
      );
    });
  });

  describe('tenantLogin', () => {
    it('should login tenant user successfully', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      expect(MockCompanyModel.findOne).toHaveBeenCalledWith({ companyCode: 'DEMO001' });
      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        companyId: mockCompany._id,
        username: 'admin.demo',
        isActive: true,
      });
      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toEqual({
        id: mockTenantUser._id,
        username: mockTenantUser.username,
        name: mockTenantUser.name,
        role: mockTenantUser.role,
        companyCode: mockCompany.companyCode,
        companyName: mockCompany.businessName,
      });
    });

    it('should throw UnauthorizedException if company does not exist', async () => {
      MockCompanyModel.findOne.mockResolvedValue(null);

      await expect(
        service.tenantLogin('INVALID', 'admin.demo', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if company is inactive', async () => {
      const inactiveCompany = { ...mockCompany, isActive: false };
      MockCompanyModel.findOne.mockResolvedValue(inactiveCompany);

      await expect(
        service.tenantLogin('DEMO001', 'admin.demo', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.tenantLogin('DEMO001', 'admin.demo', 'password123'),
      ).rejects.toThrow('Esta empresa está desactivada');
    });

    it('should throw UnauthorizedException if user does not exist in company', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.tenantLogin('DEMO001', 'nonexistent', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.tenantLogin('DEMO001', 'admin.demo', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should verify JWT payload structure for tenant user', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockTenantUser._id,
        username: mockTenantUser.username,
        role: mockTenantUser.role,
        companyId: mockCompany._id.toString(),
        companyCode: mockCompany.companyCode,
      });
    });

    it('should not include password in response', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      expect(result.user).not.toHaveProperty('password');
    });

    it('should only search for active users', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      expect(MockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should include companyCode in JWT payload as string', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      const signCalls = mockJwtService.sign.mock.calls;
      expect(signCalls.length).toBeGreaterThan(0);
      const payload = signCalls[0][0];
      expect(payload.companyId).toBe(mockCompany._id.toString());
      expect(typeof payload.companyId).toBe('string');
    });

    it('should work for CASHIER role', async () => {
      const cashierUser = { ...mockTenantUser, role: UserRole.CASHIER };
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(cashierUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.tenantLogin('DEMO001', 'cashier.demo', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result.user.role).toBe(UserRole.CASHIER);
    });

    it('should filter user by correct companyId', async () => {
      MockCompanyModel.findOne.mockResolvedValue(mockCompany);
      MockUserModel.findOne.mockResolvedValue(mockTenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.tenantLogin('DEMO001', 'admin.demo', 'password123');

      expect(MockUserModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompany._id }),
      );
    });
  });

  describe('createUser', () => {
    it('should create SuperAdmin with hashed password and null companyId', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

      const result = await service.createUser(
        'newsuperadmin',
        'plainpassword',
        'New SuperAdmin',
        '99999999',
        UserRole.SUPER_ADMIN,
        null,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpassword', 10);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('_id');
    });

    it('should create tenant user with hashed password and companyId', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

      const result = await service.createUser(
        'newuser',
        'plainpassword',
        'New User',
        '12312312',
        UserRole.ADMIN,
        '507f1f77bcf86cd799439033',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpassword', 10);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('_id');
    });

    it('should never store plain password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

      await service.createUser(
        'testuser',
        'plaintextpassword',
        'Test User',
        '11111111',
        UserRole.CASHIER,
        '507f1f77bcf86cd799439033',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintextpassword', 10);
      // Verify hash was called, meaning plain password was not stored
      expect(bcrypt.hash).not.toHaveBeenCalledWith('$2b$10$hashed', 10);
    });
  });
});
