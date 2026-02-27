import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from '../../schemas/user.schema';
import { Company } from '../../schemas/company.schema';
import { AuthService } from '../auth/auth.service';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<any>;
  let companyModel: Model<any>;
  let authService: AuthService;

  const mockCompany = {
    _id: '507f1f77bcf86cd799439011',
    companyCode: 'DEMO-2026',
    businessName: 'Empresa Demo',
    maxUsers: 10,
    isActive: true,
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439022',
    companyId: '507f1f77bcf86cd799439011',
    username: 'admin.demo',
    name: 'Admin Demo',
    dni: '12345678',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const mockSuperAdmin = {
    _id: '507f1f77bcf86cd799439033',
    companyId: null,
    username: 'superadmin',
    name: 'Super Admin',
    dni: '99999999',
    role: UserRole.SUPER_ADMIN,
    isActive: true,
  };

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockCompanyModel = {
    findById: jest.fn(),
  };

  const mockAuthService = {
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Company.name),
          useValue: mockCompanyModel,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<any>>(getModelToken(User.name));
    companyModel = module.get<Model<any>>(getModelToken(Company.name));
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateUserBySuperAdminDto = {
      companyId: '507f1f77bcf86cd799439011',
      username: 'nuevo.usuario',
      password: 'password123',
      name: 'Nuevo Usuario',
      dni: '87654321',
      role: UserRole.CASHIER,
    };

    it('should throw NotFoundException if company does not exist', async () => {
      jest.spyOn(companyModel, 'findById').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Empresa con ID "${createDto.companyId}" no encontrada`,
      );
    });

    it('should throw ForbiddenException if user limit reached', async () => {
      const companyWithLimit = { ...mockCompany, maxUsers: 2 };
      jest.spyOn(companyModel, 'findById').mockResolvedValue(companyWithLimit);
      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(2);

      await expect(service.create(createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow user creation if maxUsers is 0 (unlimited)', async () => {
      const companyUnlimited = { ...mockCompany, maxUsers: 0 };
      jest.spyOn(companyModel, 'findById').mockResolvedValue(companyUnlimited);
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(authService, 'createUser').mockResolvedValue(mockUser as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(userModel.countDocuments).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      jest.spyOn(companyModel, 'findById').mockResolvedValue(mockCompany);
      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(5);
      jest
        .spyOn(userModel, 'findOne')
        .mockResolvedValue(mockUser); // username check returns existing user

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if DNI already exists', async () => {
      jest.spyOn(companyModel, 'findById').mockResolvedValue(mockCompany);
      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(5);
      
      const mockFindOne = jest.spyOn(userModel, 'findOne');
      mockFindOne
        .mockResolvedValueOnce(null) // username check passes
        .mockResolvedValueOnce(mockUser); // DNI check fails

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create user successfully when validations pass', async () => {
      jest.spyOn(companyModel, 'findById').mockResolvedValue(mockCompany);
      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(5);
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(authService, 'createUser').mockResolvedValue(mockUser as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(authService.createUser).toHaveBeenCalledWith(
        createDto.username,
        createDto.password,
        createDto.name,
        createDto.dni,
        createDto.role,
        createDto.companyId,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      name: 'Updated Name',
      isActive: false,
    };

    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(userModel, 'findById').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', updateDto, mockSuperAdmin as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if Admin tries to update user from different company', async () => {
      const differentCompanyUser = {
        ...mockUser,
        companyId: 'different-company-id',
      };
      jest.spyOn(userModel, 'findById').mockResolvedValue(differentCompanyUser);

      await expect(
        service.update('user-id', updateDto, mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SuperAdmin to update any user', async () => {
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(userModel, 'findByIdAndUpdate').mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.update('user-id', updateDto, mockSuperAdmin as any);

      expect(result).toBeDefined();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should allow Admin to update user from same company', async () => {
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(userModel, 'findByIdAndUpdate').mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.update('user-id', updateDto, mockUser as any);

      expect(result).toBeDefined();
    });

    it('should throw ConflictException if new username already exists', async () => {
      const updateWithUsername = { username: 'existing.username' };
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(userModel, 'findOne').mockResolvedValue({ _id: 'other-id' });

      await expect(
        service.update('user-id', updateWithUsername, mockSuperAdmin as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if new DNI already exists', async () => {
      const updateWithDni = { dni: '99999999' };
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(userModel, 'findOne').mockResolvedValue({ _id: 'other-id' });

      await expect(
        service.update('user-id', updateWithDni, mockSuperAdmin as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if no fields to update', async () => {
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);

      await expect(
        service.update('user-id', {}, mockSuperAdmin as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      const mockExec = jest.fn().mockResolvedValue(users.map(u => ({
        ...u,
        toObject: () => ({ ...u, companyId: mockCompany }),
      })));

      jest.spyOn(userModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: mockExec,
      } as any);

      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by companyId', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);

      jest.spyOn(userModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: mockExec,
      } as any);

      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(0);

      await service.findAll({ companyId: '507f1f77bcf86cd799439011' });

      expect(userModel.find).toHaveBeenCalledWith({
        companyId: '507f1f77bcf86cd799439011',
      });
    });

    it('should filter by username', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);

      jest.spyOn(userModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: mockExec,
      } as any);

      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(0);

      await service.findAll({ username: 'admin' });

      expect(userModel.find).toHaveBeenCalledWith({
        username: { $regex: 'admin', $options: 'i' },
      });
    });

    it('should filter by role', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);

      jest.spyOn(userModel, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: mockExec,
      } as any);

      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(0);

      await service.findAll({ role: UserRole.ADMIN });

      expect(userModel.find).toHaveBeenCalledWith({ role: UserRole.ADMIN });
    });

    it('should handle pagination correctly', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockChain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: mockExec,
      };

      jest.spyOn(userModel, 'find').mockReturnValue(mockChain as any);
      jest.spyOn(userModel, 'countDocuments').mockResolvedValue(50);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockChain.skip).toHaveBeenCalledWith(10);
      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });
  });
});
