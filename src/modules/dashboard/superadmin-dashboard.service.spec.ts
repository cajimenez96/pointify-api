import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SuperAdminDashboardService } from './superadmin-dashboard.service';
import { Company } from '../../schemas/company.schema';
import { User } from '../../schemas/user.schema';
import { Client } from '../../schemas/client.schema';
import { Transaction } from '../../schemas/transaction.schema';

describe('SuperAdminDashboardService', () => {
  let service: SuperAdminDashboardService;
  let companyModel: Model<any>;
  let userModel: Model<any>;
  let clientModel: Model<any>;
  let transactionModel: Model<any>;

  const mockModel = () => ({
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminDashboardService,
        {
          provide: getModelToken(Company.name),
          useValue: mockModel(),
        },
        {
          provide: getModelToken(User.name),
          useValue: mockModel(),
        },
        {
          provide: getModelToken(Client.name),
          useValue: mockModel(),
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockModel(),
        },
      ],
    }).compile();

    service = module.get<SuperAdminDashboardService>(
      SuperAdminDashboardService,
    );
    companyModel = module.get<Model<any>>(getModelToken(Company.name));
    userModel = module.get<Model<any>>(getModelToken(User.name));
    clientModel = module.get<Model<any>>(getModelToken(Client.name));
    transactionModel = module.get<Model<any>>(
      getModelToken(Transaction.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      // Mock company counts
      (companyModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(10) // totalCompanies
        .mockResolvedValueOnce(8) // activeCompanies
        .mockResolvedValueOnce(3); // newCompaniesThisMonth

      // Mock users by role aggregation
      (userModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'superadmin', count: 1 },
        { _id: 'admin', count: 5 },
        { _id: 'cashier', count: 8 },
      ]);

      // Mock client counts
      (clientModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(150) // totalClients
        .mockResolvedValueOnce(25); // newClientsThisMonth

      // Mock transaction count
      (transactionModel.countDocuments as jest.Mock).mockResolvedValueOnce(
        500,
      );

      // Mock transactions by type
      (transactionModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([
          { _id: 'EARN', count: 300 },
          { _id: 'REDEEM', count: 200 },
        ])
        .mockResolvedValueOnce([
          { _id: 'EARN', totalPoints: 15000 },
          { _id: 'REDEEM', totalPoints: 8000 },
        ])
        .mockResolvedValueOnce([
          {
            _id: 'company1',
            companyCode: 'ESP001',
            businessName: 'Empresa Test 1',
            isActive: true,
            transactionCount: 150,
          },
        ]);

      // Mock top companies by clients
      (clientModel.aggregate as jest.Mock).mockResolvedValueOnce([
        {
          _id: 'company1',
          companyCode: 'ESP001',
          businessName: 'Empresa Test 1',
          isActive: true,
          clientCount: 50,
        },
      ]);

      // Mock expiring subscriptions
      (companyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'company2',
              companyCode: 'ESP002',
              businessName: 'Empresa Test 2',
              subscriptionEndDate: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000,
              ),
            },
          ]),
        }),
      });

      const result = await service.getStats();

      expect(result).toEqual({
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
        topCompaniesByClients: expect.any(Array),
        topCompaniesByTransactions: expect.any(Array),
        expiringSubscriptions: expect.arrayContaining([
          expect.objectContaining({
            _id: 'company2',
            companyCode: 'ESP002',
            businessName: 'Empresa Test 2',
            daysRemaining: expect.any(Number),
          }),
        ]),
      });
    });

    it('should handle empty database', async () => {
      (companyModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (userModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.aggregate as jest.Mock).mockResolvedValue([]);
      (companyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getStats();

      expect(result.totalCompanies).toBe(0);
      expect(result.activeCompanies).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalClients).toBe(0);
      expect(result.totalTransactions).toBe(0);
      expect(result.totalPointsIssued).toBe(0);
      expect(result.totalPointsRedeemed).toBe(0);
    });

    it('should correctly calculate inactive companies', async () => {
      (companyModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(0);

      (userModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.aggregate as jest.Mock).mockResolvedValue([]);
      (companyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getStats();

      expect(result.totalCompanies).toBe(20);
      expect(result.activeCompanies).toBe(15);
      expect(result.inactiveCompanies).toBe(5);
    });

    it('should aggregate user counts by role correctly', async () => {
      (companyModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (userModel.aggregate as jest.Mock).mockResolvedValueOnce([
        { _id: 'admin', count: 10 },
        { _id: 'cashier', count: 25 },
      ]);
      (clientModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.aggregate as jest.Mock).mockResolvedValue([]);
      (companyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getStats();

      expect(result.usersByRole).toEqual({
        superadmin: 0,
        admin: 10,
        cashier: 25,
      });
      expect(result.totalUsers).toBe(35);
    });

    it('should calculate days remaining for expiring subscriptions', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      (companyModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (userModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.countDocuments as jest.Mock).mockResolvedValue(0);
      (transactionModel.aggregate as jest.Mock).mockResolvedValue([]);
      (clientModel.aggregate as jest.Mock).mockResolvedValue([]);
      (companyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'company1',
              companyCode: 'ESP001',
              businessName: 'Empresa Test',
              subscriptionEndDate: futureDate,
            },
          ]),
        }),
      });

      const result = await service.getStats();

      expect(result.expiringSubscriptions).toHaveLength(1);
      expect(result.expiringSubscriptions[0].daysRemaining).toBeGreaterThan(0);
      expect(result.expiringSubscriptions[0].daysRemaining).toBeLessThanOrEqual(
        11,
      );
    });
  });
});
