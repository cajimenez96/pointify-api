import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../schemas/user.schema';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439022',
    username: 'test.user',
    name: 'Test User',
    dni: '12345678',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const mockRequestUser = {
    _id: '507f1f77bcf86cd799439033',
    username: 'admin.user',
    role: UserRole.SUPER_ADMIN,
    companyId: null,
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateUserBySuperAdminDto = {
      companyId: '507f1f77bcf86cd799439022',
      username: 'nuevo.usuario',
      password: 'password123',
      name: 'Nuevo Usuario',
      dni: '87654321',
      role: UserRole.CASHIER,
    };

    it('should create a user successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockUser as any);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Company not found');
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const queryDto = { companyId: '507f1f77bcf86cd799439022', page: 1, limit: 20 };

    it('should return paginated users', async () => {
      const mockResponse = {
        data: [mockUser],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResponse as any);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should accept filters', async () => {
      const filtersDto = {
        companyId: '507f1f77bcf86cd799439022',
        role: UserRole.ADMIN,
        username: 'admin',
      };

      jest.spyOn(service, 'findAll').mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      } as any);

      await controller.findAll(filtersDto);

      expect(service.findAll).toHaveBeenCalledWith(filtersDto);
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      name: 'Updated Name',
      isActive: false,
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedUser as any);

      const mockReq = { user: mockRequestUser } as any;
      const result = await controller.update('user-id', updateDto, mockReq);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(
        'user-id',
        updateDto,
        mockRequestUser,
      );
    });

    it('should pass requesting user to service', async () => {
      jest.spyOn(service, 'update').mockResolvedValue(mockUser as any);

      const mockReq = { user: mockRequestUser } as any;
      await controller.update('user-id', updateDto, mockReq);

      expect(service.update).toHaveBeenCalledWith(
        'user-id',
        updateDto,
        mockRequestUser,
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('User not found');
      jest.spyOn(service, 'update').mockRejectedValue(error);

      const mockReq = { user: mockRequestUser } as any;
      await expect(
        controller.update('invalid-id', updateDto, mockReq),
      ).rejects.toThrow(error);
    });
  });
});
