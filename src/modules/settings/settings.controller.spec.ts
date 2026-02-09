import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: SettingsService;

  const mockSettingsService = {
    getSettings: jest.fn(),
    updateCampaignSettings: jest.fn(),
    addProductPoints: jest.fn(),
    updateProductPoints: jest.fn(),
    removeProductPoints: jest.fn(),
    getActiveProducts: jest.fn(),
    addReward: jest.fn(),
    updateReward: jest.fn(),
    deleteReward: jest.fn(),
    getAllRewards: jest.fn(),
    getActiveRewards: jest.fn(),
  };

  const mockReq = { companyId: 'company-123' };

  const mockGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockGuard)
      .overrideGuard(CompanyContextGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<SettingsController>(SettingsController);
    settingsService = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========== CONFIGURACIÓN GENERAL ==========

  describe('getSettings', () => {
    it('should call settingsService.getSettings with companyId', async () => {
      const mockResult = { _id: 'settings-1', companyId: 'company-123' };
      mockSettingsService.getSettings.mockResolvedValue(mockResult);

      const result = await controller.getSettings(mockReq);

      expect(settingsService.getSettings).toHaveBeenCalledWith('company-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateCampaignSettings', () => {
    it('should call settingsService.updateCampaignSettings with companyId and dto', async () => {
      const dto = { isActive: false, campaignEndDate: '2026-12-31' };
      const mockResult = { _id: 'settings-1', isActive: false };
      mockSettingsService.updateCampaignSettings.mockResolvedValue(mockResult);

      const result = await controller.updateCampaignSettings(mockReq, dto);

      expect(settingsService.updateCampaignSettings).toHaveBeenCalledWith(
        'company-123',
        dto,
      );
      expect(result).toEqual(mockResult);
    });
  });

  // ========== PRODUCTOS ==========

  describe('addProductPoints', () => {
    it('should call settingsService.addProductPoints with companyId and dto', async () => {
      const dto = { productName: 'Café Espresso', pointsValue: 10 };
      mockSettingsService.addProductPoints.mockResolvedValue({});

      await controller.addProductPoints(mockReq, dto);

      expect(settingsService.addProductPoints).toHaveBeenCalledWith(
        'company-123',
        dto,
      );
    });
  });

  describe('updateProductPoints', () => {
    it('should call settingsService.updateProductPoints with correct params', async () => {
      mockSettingsService.updateProductPoints.mockResolvedValue({});

      await controller.updateProductPoints(mockReq, 'Café Espresso', 20);

      expect(settingsService.updateProductPoints).toHaveBeenCalledWith(
        'company-123',
        'Café Espresso',
        20,
      );
    });
  });

  describe('removeProductPoints', () => {
    it('should call settingsService.removeProductPoints with companyId and productName', async () => {
      mockSettingsService.removeProductPoints.mockResolvedValue({});

      await controller.removeProductPoints(mockReq, 'Cappuccino');

      expect(settingsService.removeProductPoints).toHaveBeenCalledWith(
        'company-123',
        'Cappuccino',
      );
    });
  });

  describe('getActiveProducts', () => {
    it('should call settingsService.getActiveProducts with companyId', async () => {
      const products = [
        { productName: 'Café', pointsValue: 10, isActive: true },
      ];
      mockSettingsService.getActiveProducts.mockResolvedValue(products);

      const result = await controller.getActiveProducts(mockReq);

      expect(settingsService.getActiveProducts).toHaveBeenCalledWith(
        'company-123',
      );
      expect(result).toEqual(products);
    });
  });

  // ========== PREMIOS ==========

  describe('addReward', () => {
    it('should call settingsService.addReward with companyId and dto', async () => {
      const dto = { name: 'Café Gratis', pointsCost: 50, stock: 100 };
      mockSettingsService.addReward.mockResolvedValue({});

      await controller.addReward(mockReq, dto);

      expect(settingsService.addReward).toHaveBeenCalledWith(
        'company-123',
        dto,
      );
    });
  });

  describe('updateReward', () => {
    it('should call settingsService.updateReward with companyId, rewardId and dto', async () => {
      const dto = { pointsCost: 75 };
      mockSettingsService.updateReward.mockResolvedValue({});

      await controller.updateReward(mockReq, 'reward-123', dto);

      expect(settingsService.updateReward).toHaveBeenCalledWith(
        'company-123',
        'reward-123',
        dto,
      );
    });
  });

  describe('deleteReward', () => {
    it('should call settingsService.deleteReward with companyId and rewardId', async () => {
      mockSettingsService.deleteReward.mockResolvedValue({});

      await controller.deleteReward(mockReq, 'reward-123');

      expect(settingsService.deleteReward).toHaveBeenCalledWith(
        'company-123',
        'reward-123',
      );
    });
  });

  describe('getAllRewards', () => {
    it('should call settingsService.getAllRewards with companyId', async () => {
      const rewards = [{ name: 'Café Gratis', pointsCost: 50 }];
      mockSettingsService.getAllRewards.mockResolvedValue(rewards);

      const result = await controller.getAllRewards(mockReq);

      expect(settingsService.getAllRewards).toHaveBeenCalledWith('company-123');
      expect(result).toEqual(rewards);
    });
  });

  describe('getActiveRewards', () => {
    it('should call settingsService.getActiveRewards with companyId', async () => {
      const rewards = [
        { name: 'Taza', pointsCost: 100, isActive: true, stock: 5 },
      ];
      mockSettingsService.getActiveRewards.mockResolvedValue(rewards);

      const result = await controller.getActiveRewards(mockReq);

      expect(settingsService.getActiveRewards).toHaveBeenCalledWith(
        'company-123',
      );
      expect(result).toEqual(rewards);
    });
  });
});
