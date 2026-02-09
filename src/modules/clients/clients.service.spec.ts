import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClientsService } from './clients.service';
import { Client } from './schemas/client.schema';
import { Company } from '../companies/schemas/company.schema';
import { Settings } from '../settings/schemas/settings.schema';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientModel: any;
  let companyModel: any;

  const mockClient = {
    _id: 'client-id',
    dni: '12345678',
    name: 'Test Client',
    companyCode: 'COMP123',
    currentPoints: 100,
    save: jest.fn(),
  };

  const mockClientModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCompanyModel = {
    findOne: jest.fn(),
  };

  const mockSettingsModel = {
    findOne: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientModel = module.get(getModelToken(Client.name));
    companyModel = module.get(getModelToken(Company.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all clients for a company', async () => {
      const companyCode = 'COMP123';
      const clients = [mockClient];
      
      mockClientModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(clients),
      });

      const result = await service.findAll(companyCode);

      expect(clientModel.find).toHaveBeenCalledWith({ companyCode });
      expect(result).toEqual(clients);
    });
  });

  describe('createClient', () => {
    it('should create a new client if not exists', async () => {
      const createDto = {
        dni: '87654321',
        name: 'New Client',
        companyCode: 'COMP123',
      };

      mockClientModel.findOne.mockResolvedValue(null); // No existe
      mockClientModel.create.mockResolvedValue({ ...createDto, _id: 'new-id' });

      // Mock transaction mocks if used, or standard create
      // Assuming createClient usage
      const result = await service.createClient(createDto);

      expect(clientModel.findOne).toHaveBeenCalledWith({
        dni: createDto.dni,
        companyCode: createDto.companyCode,
      });
      expect(clientModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
    });

    it('should throw ConflictException if client already exists', async () => {
      const createDto = {
        dni: '12345678',
        name: 'Existing Client',
        companyCode: 'COMP123',
      };

      mockClientModel.findOne.mockResolvedValue(mockClient);

      await expect(service.createClient(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByDni', () => {
    it('should return a client if found', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.findByDni('12345678', 'COMP123');
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException if client not found', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      await expect(service.findByDni('99999999', 'COMP123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
