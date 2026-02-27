import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService as any);
    configService = mockConfigService as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object from JWT payload for SuperAdmin', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'superadmin',
        role: 'SUPER_ADMIN',
        companyId: null,
        companyCode: null,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        companyId: null,
        companyCode: null,
      });
    });

    it('should return user object from JWT payload for tenant user', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439022',
        username: 'admin.demo',
        role: 'ADMIN',
        companyId: '507f1f77bcf86cd799439033',
        companyCode: 'DEMO001',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        companyId: payload.companyId,
        companyCode: payload.companyCode,
      });
    });

    it('should map sub field to userId', async () => {
      const payload = {
        sub: 'user-id-123',
        username: 'testuser',
        role: 'CASHIER',
        companyId: 'company-id-456',
        companyCode: 'TEST001',
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe(payload.sub);
      expect(result).not.toHaveProperty('sub');
    });

    it('should handle cashier role correctly', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439044',
        username: 'cashier.demo',
        role: 'CASHIER',
        companyId: '507f1f77bcf86cd799439033',
        companyCode: 'DEMO001',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
        role: 'CASHIER',
        companyId: payload.companyId,
        companyCode: payload.companyCode,
      });
    });
  });
});
