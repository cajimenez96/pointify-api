import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: CompaniesService;

  const mockCompany = {
    _id: '507f1f77bcf86cd799439011',
    companyCode: 'ESP001',
    businessName: 'Empresa Test',
    cuitCuil: '20-12345678-9',
    address: 'Calle Test 123',
    phone: '1234567890',
    email: 'test@empresa.com',
    defaultPoints: 10,
    subscriptionEndDate: new Date('2025-12-31'),
    maxUsers: 50,
    isActive: true,
  };

  const mockCompaniesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
    service = module.get<CompaniesService>(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new company', async () => {
      const createDto: CreateCompanyDto = {
        companyCode: 'ESP001',
        businessName: 'Empresa Test',
        cuitCuil: '20-12345678-9',
        address: 'Calle Test 123',
        phone: '1234567890',
        email: 'test@empresa.com',
        defaultPoints: 10,
        subscriptionEndDate: new Date('2025-12-31'),
        maxUsers: 50,
      };

      mockCompaniesService.create.mockResolvedValue(mockCompany);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCompany);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const createDto: CreateCompanyDto = {
        companyCode: 'ESP001',
        businessName: 'Empresa Test',
        cuitCuil: '20-12345678-9',
        address: 'Calle Test 123',
        phone: '1234567890',
        email: 'test@empresa.com',
        defaultPoints: 10,
        subscriptionEndDate: new Date('2025-12-31'),
        maxUsers: 50,
      };

      const error = new Error('Company code already exists');
      mockCompaniesService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return paginated companies', async () => {
      const paginatedResult = {
        data: [mockCompany],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      mockCompaniesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query parameters to service', async () => {
      const queryDto = {
        businessName: 'Test',
        isActive: true,
        page: 2,
        limit: 10,
      };

      mockCompaniesService.findAll.mockResolvedValue({
        data: [],
        pagination: {
          total: 0,
          page: 2,
          limit: 10,
          totalPages: 0,
        },
      });

      await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should handle empty results', async () => {
      const emptyResult = {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      };

      mockCompaniesService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll({});

      expect(result).toEqual(emptyResult);
    });
  });

  describe('update', () => {
    it('should update a company', async () => {
      const updateDto: UpdateCompanyDto = {
        businessName: 'Empresa Actualizada',
        isActive: false,
      };

      const updatedCompany = {
        ...mockCompany,
        ...updateDto,
      };

      mockCompaniesService.update.mockResolvedValue(updatedCompany);

      const result = await controller.update('507f1f77bcf86cd799439011', updateDto);

      expect(result).toEqual(updatedCompany);
      expect(service.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
    });

    it('should propagate update errors', async () => {
      const updateDto: UpdateCompanyDto = {
        businessName: 'Test',
      };

      const error = new Error('Company not found');
      mockCompaniesService.update.mockRejectedValue(error);

      await expect(
        controller.update('invalid-id', updateDto),
      ).rejects.toThrow(error);
    });
  });
});
