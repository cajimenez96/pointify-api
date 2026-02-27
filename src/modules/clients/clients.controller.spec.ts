import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../../guards/auth.guard';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;

  const mockClientsService = {
    findAll: jest.fn(),
    createClient: jest.fn(),
    findByDni: jest.fn(),
    getClientWithRewards: jest.fn(),
    completeProfileByCompanyCode: jest.fn(),
  };

  const mockClient = {
    _id: 'client-id',
    dni: '12345678',
    name: 'Test Client',
    companyCode: 'COMP123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyContextGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listClients', () => {
    it('should return all clients for the logged in admin company', async () => {
      const req = { user: { companyCode: 'COMP123' } };
      mockClientsService.findAll.mockResolvedValue([mockClient]);

      const result = await controller.listClients(req);

      expect(service.findAll).toHaveBeenCalledWith('COMP123');
      expect(result).toEqual([mockClient]);
    });
  });

  describe('getClientByDni', () => {
    it('should return public client info', async () => {
      const dni = '12345678';
      const companyCode = 'COMP123';
      const mockResponse = { ...mockClient, rewards: [] };

      mockClientsService.getClientWithRewards.mockResolvedValue(mockResponse);

      const result = await controller.getClientByDni(dni, companyCode);

      expect(service.getClientWithRewards).toHaveBeenCalledWith(dni, companyCode);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      const dto = {
        dni: '87654321',
        name: 'New',
        companyCode: 'COMP123',
      };
      
      mockClientsService.createClient.mockResolvedValue(dto);

      const result = await controller.createClient(dto);

      expect(service.createClient).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dto);
    });
  });

  describe('completeProfile', () => {
    it('should complete client profile', async () => {
      const dto = {
        dni: '123',
        name: 'Full Name',
        email: 'email@test.com',
        companyCode: 'COMP123',
      };

      mockClientsService.completeProfileByCompanyCode.mockResolvedValue({
        message: 'Success',
        client: dto,
      });

      const result = await controller.completeProfile(dto);

      expect(service.completeProfileByCompanyCode).toHaveBeenCalledWith(
        dto.dni,
        dto.companyCode,
        { name: dto.name, email: dto.email, phone: undefined }
      );
      expect(result).toEqual({
        message: 'Success',
        client: dto,
      });
    });
  });
});
