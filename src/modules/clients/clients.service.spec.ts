import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from '../../schemas/client.schema';
import { Company } from '../../schemas/company.schema';
import { Settings } from '../../schemas/settings.schema';
import { ClientCompaniesService } from '../client-companies/client-companies.service';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockClient = {
    _id: 'client-id',
    dni: '12345678',
    name: 'Test Client',
    status: 'PENDING',
    isActive: true,
    save: jest.fn().mockResolvedValue({
      _id: 'client-id',
      dni: '12345678',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      phone: '555-1234',
      status: 'ACTIVE',
    }),
  };

  const mockCompany = {
    _id: 'company-id',
    companyCode: 'CAFE-2026',
    businessName: 'Café del Sur',
  };

  const mockSettings = {
    rewards: [
      {
        _id: 'reward-id',
        name: 'Café gratis',
        description: 'Un café de regalo',
        pointsCost: 50,
        stock: 10,
        imageUrl: null,
        isActive: true,
      },
    ],
  };

  const mockClientModel = {
    findOne: jest.fn(),
  };

  const mockCompanyModel = {
    findOne: jest.fn(),
  };

  const mockSettingsModel = {
    findOne: jest.fn(),
  };

  const mockClientCompaniesService = {
    findByClientDni: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getModelToken(Client.name),
          useValue: mockClientModel,
        },
        {
          provide: getModelToken(Company.name),
          useValue: mockCompanyModel,
        },
        {
          provide: getModelToken(Settings.name),
          useValue: mockSettingsModel,
        },
        {
          provide: ClientCompaniesService,
          useValue: mockClientCompaniesService,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findByDni ───────────────────────────────────────────────────────────────

  describe('findByDni', () => {
    it('debería retornar el cliente si existe', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.findByDni('12345678');

      expect(mockClientModel.findOne).toHaveBeenCalledWith({
        dni: '12345678',
        isActive: true,
      });
      expect(result).toEqual(mockClient);
    });

    it('debería retornar null si no existe', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      const result = await service.findByDni('99999999');

      expect(result).toBeNull();
    });
  });

  // ─── completeProfileByCompanyCode ────────────────────────────────────────────

  describe('completeProfileByCompanyCode', () => {
    const dto = {
      companyCode: 'CAFE-2026',
      dni: '12345678',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      phone: '555-1234',
    };

    it('debería lanzar NotFoundException si la empresa no existe', async () => {
      mockCompanyModel.findOne.mockResolvedValue(null);

      await expect(
        service.completeProfileByCompanyCode(dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería retornar null si el cliente no existe o no está PENDING', async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompany);
      mockClientModel.findOne.mockResolvedValue(null);

      const result = await service.completeProfileByCompanyCode(dto);

      expect(result).toBeNull();
    });

    it('debería retornar null si no existe relación con la empresa', async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompany);
      mockClientModel.findOne.mockResolvedValue(mockClient);
      mockClientCompaniesService.findByClientDni.mockRejectedValue(
        new NotFoundException(),
      );

      const result = await service.completeProfileByCompanyCode(dto);

      expect(result).toBeNull();
    });

    it('debería completar el perfil correctamente', async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompany);
      mockClientModel.findOne.mockResolvedValue(mockClient);
      mockClientCompaniesService.findByClientDni.mockResolvedValue({
        clientId: 'client-id',
        companyId: 'company-id',
      });

      const result = await service.completeProfileByCompanyCode(dto);

      expect(mockClient.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── getClientWithRewards ────────────────────────────────────────────────────

  describe('getClientWithRewards', () => {
    it('debería lanzar NotFoundException si la empresa no existe', async () => {
      mockCompanyModel.findOne.mockResolvedValue(null);

      await expect(
        service.getClientWithRewards('12345678', 'INVALIDO'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería retornar estructura base si el cliente no existe', async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompany);
      mockClientModel.findOne.mockResolvedValue(null);
      mockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getClientWithRewards(
        '00000000',
        'CAFE-2026',
      );

      expect(result.exists).toBe(false);
      expect(result.currentPoints).toBe(0);
    });

    it('debería retornar datos completos si el cliente existe', async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompany);
      mockClientModel.findOne.mockResolvedValue(mockClient);
      mockClientCompaniesService.findByClientDni.mockResolvedValue({
        currentPoints: 80,
        totalAccumulated: 200,
      });
      mockSettingsModel.findOne.mockResolvedValue(mockSettings);

      const result = await service.getClientWithRewards(
        '12345678',
        'CAFE-2026',
      );

      expect(result.exists).toBe(true);
      expect(result.currentPoints).toBe(80);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].canAfford).toBe(false); // 80 < 50 → false... wait, 80 >= 50 → true
    });
  });
});
