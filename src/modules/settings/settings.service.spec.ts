import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Settings } from '../../schemas/settings.schema';

/**
 * Helper: crea un mock de SettingsDocument con arrays mutables
 */
const createMockSettings = (overrides: any = {}) => {
  const doc: any = {
    _id: 'settings-id',
    companyId: 'company-123',
    pointsConfig: [],
    rewards: [],
    isActive: true,
    campaignStartDate: null,
    campaignEndDate: null,
    ...overrides,
  };
  doc.save = jest.fn().mockImplementation(() => Promise.resolve(doc));
  return doc;
};

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsModel: any;

  const companyId = 'company-123';

  // Mock class-based model (soporta new + static methods)
  const MockSettingsModel: any = jest.fn().mockImplementation((data) => {
    const instance: any = {
      ...data,
      pointsConfig: data.pointsConfig || [],
      rewards: data.rewards || [],
      isActive: data.isActive ?? true,
    };
    instance.save = jest.fn().mockImplementation(() => Promise.resolve(instance));
    return instance;
  });
  MockSettingsModel.findOne = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    MockSettingsModel.findOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getModelToken(Settings.name),
          useValue: MockSettingsModel,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    settingsModel = module.get(getModelToken(Settings.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== findOrCreate ==========

  describe('findOrCreate', () => {
    it('should return existing settings', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.findOrCreate(companyId);

      expect(MockSettingsModel.findOne).toHaveBeenCalledWith({ companyId });
      expect(result).toBe(mockSettings);
      expect(mockSettings.save).not.toHaveBeenCalled();
    });

    it('should create new settings if not found', async () => {
      MockSettingsModel.findOne.mockResolvedValue(null);

      const result = await service.findOrCreate(companyId);

      expect(MockSettingsModel.findOne).toHaveBeenCalledWith({ companyId });
      expect(MockSettingsModel).toHaveBeenCalledWith({
        companyId,
        pointsConfig: [],
        rewards: [],
        isActive: true,
      });
      expect(result.save).toHaveBeenCalled();
    });
  });

  // ========== getSettings ==========

  describe('getSettings', () => {
    it('should delegate to findOrCreate', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings(companyId);

      expect(result).toBe(mockSettings);
    });
  });

  // ========== updateCampaignSettings ==========

  describe('updateCampaignSettings', () => {
    it('should update isActive', async () => {
      const mockSettings = createMockSettings({ isActive: true });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateCampaignSettings(companyId, { isActive: false });

      expect(mockSettings.isActive).toBe(false);
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should update campaignStartDate with a valid date', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateCampaignSettings(companyId, {
        campaignStartDate: '2026-01-01T00:00:00.000Z',
      });

      expect(mockSettings.campaignStartDate).toEqual(
        new Date('2026-01-01T00:00:00.000Z'),
      );
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should set campaignEndDate to null when passed null', async () => {
      const mockSettings = createMockSettings({
        campaignEndDate: new Date('2026-12-31'),
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateCampaignSettings(companyId, {
        campaignEndDate: null,
      });

      expect(mockSettings.campaignEndDate).toBeNull();
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should not modify fields that are not in the DTO', async () => {
      const mockSettings = createMockSettings({
        isActive: true,
        campaignStartDate: new Date('2026-01-01'),
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateCampaignSettings(companyId, { isActive: false });

      expect(mockSettings.isActive).toBe(false);
      expect(mockSettings.campaignStartDate).toEqual(new Date('2026-01-01'));
    });
  });

  // ========== PRODUCTOS ==========

  describe('addProductPoints', () => {
    it('should add a new product to pointsConfig', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.addProductPoints(companyId, {
        productName: 'Café Espresso',
        pointsValue: 10,
      });

      expect(mockSettings.pointsConfig).toHaveLength(1);
      expect(mockSettings.pointsConfig[0]).toEqual({
        productName: 'Café Espresso',
        pointsValue: 10,
        isActive: true,
      });
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if product already exists', async () => {
      const mockSettings = createMockSettings({
        pointsConfig: [
          { productName: 'Café Espresso', pointsValue: 10, isActive: true },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.addProductPoints(companyId, {
          productName: 'café espresso', // case insensitive
          pointsValue: 15,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with descriptive message', async () => {
      const mockSettings = createMockSettings({
        pointsConfig: [
          { productName: 'Latte', pointsValue: 10, isActive: true },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.addProductPoints(companyId, {
          productName: 'Latte',
          pointsValue: 5,
        }),
      ).rejects.toThrow('El producto "Latte" ya está configurado');
    });
  });

  describe('updateProductPoints', () => {
    it('should update pointsValue of existing product', async () => {
      const mockSettings = createMockSettings({
        pointsConfig: [
          { productName: 'Café Espresso', pointsValue: 10, isActive: true },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateProductPoints(companyId, 'Café Espresso', 20);

      expect(mockSettings.pointsConfig[0].pointsValue).toBe(20);
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.updateProductPoints(companyId, 'Inexistente', 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with product name in message', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.updateProductPoints(companyId, 'Café Mocha', 10),
      ).rejects.toThrow('Producto "Café Mocha" no encontrado');
    });
  });

  describe('removeProductPoints', () => {
    it('should remove the product from pointsConfig', async () => {
      const mockSettings = createMockSettings({
        pointsConfig: [
          { productName: 'Café Espresso', pointsValue: 10, isActive: true },
          { productName: 'Cappuccino', pointsValue: 15, isActive: true },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.removeProductPoints(companyId, 'Café Espresso');

      expect(mockSettings.pointsConfig).toHaveLength(1);
      expect(mockSettings.pointsConfig[0].productName).toBe('Cappuccino');
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.removeProductPoints(companyId, 'Inexistente'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveProducts', () => {
    it('should return only active products', async () => {
      const mockSettings = createMockSettings({
        pointsConfig: [
          { productName: 'Café', pointsValue: 10, isActive: true },
          { productName: 'Galleta', pointsValue: 5, isActive: false },
          { productName: 'Latte', pointsValue: 15, isActive: true },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getActiveProducts(companyId);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.productName)).toEqual(['Café', 'Latte']);
    });

    it('should return empty array when no products exist', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getActiveProducts(companyId);

      expect(result).toEqual([]);
    });
  });

  // ========== PREMIOS ==========

  describe('addReward', () => {
    it('should add a reward with all fields', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.addReward(companyId, {
        name: 'Café Gratis',
        description: 'Un café de cortesía',
        pointsCost: 50,
        stock: 100,
        imageUrl: 'https://img.example.com/cafe.jpg',
      });

      expect(mockSettings.rewards).toHaveLength(1);
      expect(mockSettings.rewards[0]).toEqual({
        name: 'Café Gratis',
        description: 'Un café de cortesía',
        pointsCost: 50,
        stock: 100,
        isActive: true,
        imageUrl: 'https://img.example.com/cafe.jpg',
      });
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should set defaults for optional fields', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.addReward(companyId, {
        name: 'Taza',
        pointsCost: 100,
      });

      expect(mockSettings.rewards[0]).toEqual(
        expect.objectContaining({
          name: 'Taza',
          description: '',
          pointsCost: 100,
          stock: null,
          isActive: true,
          imageUrl: null,
        }),
      );
    });
  });

  describe('updateReward', () => {
    const rewardId = 'reward-abc-123';

    it('should update specified fields only', async () => {
      const mockSettings = createMockSettings({
        rewards: [
          {
            _id: { toString: () => rewardId },
            name: 'Café Gratis',
            description: '',
            pointsCost: 50,
            stock: null,
            isActive: true,
            imageUrl: null,
          },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateReward(companyId, rewardId, {
        pointsCost: 75,
        description: 'Café premium',
      });

      expect(mockSettings.rewards[0].pointsCost).toBe(75);
      expect(mockSettings.rewards[0].description).toBe('Café premium');
      expect(mockSettings.rewards[0].name).toBe('Café Gratis'); // no cambia
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should update isActive field', async () => {
      const mockSettings = createMockSettings({
        rewards: [
          {
            _id: { toString: () => rewardId },
            name: 'Taza',
            description: '',
            pointsCost: 100,
            stock: 10,
            isActive: true,
            imageUrl: null,
          },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.updateReward(companyId, rewardId, { isActive: false });

      expect(mockSettings.rewards[0].isActive).toBe(false);
    });

    it('should throw NotFoundException if reward not found', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.updateReward(companyId, 'nonexistent-id', { pointsCost: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with descriptive message', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.updateReward(companyId, 'bad-id', {}),
      ).rejects.toThrow('Premio no encontrado');
    });
  });

  describe('deleteReward', () => {
    const rewardId = 'reward-abc-123';

    it('should soft delete reward (set isActive to false)', async () => {
      const mockSettings = createMockSettings({
        rewards: [
          {
            _id: { toString: () => rewardId },
            name: 'Café Gratis',
            isActive: true,
          },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await service.deleteReward(companyId, rewardId);

      expect(mockSettings.rewards[0].isActive).toBe(false);
      expect(mockSettings.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if reward not found', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.deleteReward(companyId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveRewards', () => {
    it('should return only active rewards with stock available', async () => {
      const mockSettings = createMockSettings({
        rewards: [
          { name: 'A', isActive: true, stock: 10 },
          { name: 'B', isActive: false, stock: 5 },   // inactivo
          { name: 'C', isActive: true, stock: 0 },     // sin stock
          { name: 'D', isActive: true, stock: null },   // stock infinito
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getActiveRewards(companyId);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(['A', 'D']);
    });

    it('should return empty array when no active rewards', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getActiveRewards(companyId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllRewards', () => {
    it('should return all rewards including inactive', async () => {
      const mockSettings = createMockSettings({
        rewards: [
          { name: 'A', isActive: true },
          { name: 'B', isActive: false },
        ],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getAllRewards(companyId);

      expect(result).toHaveLength(2);
    });
  });

  describe('getRewardById', () => {
    const rewardId = 'reward-abc-123';

    it('should return the reward by id', async () => {
      const mockReward = {
        _id: { toString: () => rewardId },
        name: 'Café Gratis',
        pointsCost: 50,
      };
      const mockSettings = createMockSettings({
        rewards: [mockReward],
      });
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getRewardById(companyId, rewardId);

      expect(result).toBe(mockReward);
    });

    it('should throw NotFoundException if reward not found', async () => {
      const mockSettings = createMockSettings();
      MockSettingsModel.findOne.mockResolvedValue(mockSettings);

      await expect(
        service.getRewardById(companyId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
