import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminDashboardController } from './superadmin-dashboard.controller';
import { SuperAdminDashboardService } from './superadmin-dashboard.service';

describe('SuperAdminDashboardController', () => {
  let controller: SuperAdminDashboardController;
  let service: SuperAdminDashboardService;

  const mockDashboardService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminDashboardController],
      providers: [
        {
          provide: SuperAdminDashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<SuperAdminDashboardController>(
      SuperAdminDashboardController,
    );
    service = module.get<SuperAdminDashboardService>(
      SuperAdminDashboardService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        totalCompanies: 10,
        activeCompanies: 8,
        inactiveCompanies: 2,
        newCompaniesThisMonth: 3,
        totalUsers: 14,
        usersByRole: {
          superadmin: 1,
          admin: 5,
          cashier: 8,
        },
        totalClients: 150,
        newClientsThisMonth: 25,
        totalTransactions: 500,
        transactionsByType: {
          earn: 300,
          redeem: 200,
        },
        totalPointsIssued: 15000,
        totalPointsRedeemed: 8000,
        topCompaniesByClients: [],
        topCompaniesByTransactions: [],
        expiringSubscriptions: [],
      };

      mockDashboardService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle empty stats', async () => {
      const emptyStats = {
        totalCompanies: 0,
        activeCompanies: 0,
        inactiveCompanies: 0,
        newCompaniesThisMonth: 0,
        totalUsers: 0,
        usersByRole: { superadmin: 0, admin: 0, cashier: 0 },
        totalClients: 0,
        newClientsThisMonth: 0,
        totalTransactions: 0,
        transactionsByType: { earn: 0, redeem: 0 },
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        topCompaniesByClients: [],
        topCompaniesByTransactions: [],
        expiringSubscriptions: [],
      };

      mockDashboardService.getStats.mockResolvedValue(emptyStats);

      const result = await controller.getStats();

      expect(result).toEqual(emptyStats);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database connection failed');
      mockDashboardService.getStats.mockRejectedValue(error);

      await expect(controller.getStats()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
