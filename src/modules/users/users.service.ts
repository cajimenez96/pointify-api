import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private readonly authService: AuthService,
  ) {}

  /**
   * Crear usuario para una empresa específica (solo SuperAdmin)
   */
  async create(dto: CreateUserBySuperAdminDto): Promise<UserDocument> {
    // Validar que la empresa existe
    const company = await this.companyModel.findById(dto.companyId);
    if (!company) {
      throw new NotFoundException(
        `Empresa con ID "${dto.companyId}" no encontrada`,
      );
    }

    // Validar límite de usuarios (maxUsers)
    // 0 = sin límite, cualquier otro número = límite específico
    if (company.maxUsers > 0) {
      const currentUserCount = await this.userModel.countDocuments({
        companyId: dto.companyId,
      });

      if (currentUserCount >= company.maxUsers) {
        throw new ForbiddenException(
          `La empresa "${company.businessName}" ha alcanzado el límite máximo de ${company.maxUsers} usuarios. ` +
            `Actualmente tiene ${currentUserCount} usuarios registrados.`,
        );
      }
    }

    // Validar unicidad de username dentro de la empresa
    const existingByUsername = await this.userModel.findOne({
      companyId: dto.companyId,
      username: dto.username,
    });
    if (existingByUsername) {
      throw new ConflictException(
        `El username "${dto.username}" ya está en uso en esta empresa`,
      );
    }

    // Validar unicidad de dni dentro de la empresa
    const existingByDni = await this.userModel.findOne({
      companyId: dto.companyId,
      dni: dto.dni,
    });
    if (existingByDni) {
      throw new ConflictException(
        `El DNI "${dto.dni}" ya está registrado en esta empresa`,
      );
    }

    // Usar AuthService para crear el usuario con password hasheado
    const user = await this.authService.createUser(
      dto.username,
      dto.password,
      dto.name,
      dto.dni,
      dto.role,
      dto.companyId,
    );

    return user;
  }

  /**
   * Actualizar usuario
   * Puede ser usado por SuperAdmin o Admin de la misma empresa
   */
  async update(
    userId: string,
    dto: UpdateUserDto,
    requestingUser: UserDocument,
  ): Promise<UserDocument> {
    // Buscar usuario a actualizar
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado`);
    }

    // Validar permisos: SuperAdmin puede editar cualquier usuario
    // Admin solo puede editar usuarios de su propia empresa
    const isSuperAdmin = requestingUser.role === UserRole.SUPER_ADMIN;
    const isSameCompany =
      requestingUser.companyId?.toString() === user.companyId?.toString();

    if (!isSuperAdmin && !isSameCompany) {
      throw new ForbiddenException(
        'No tienes permisos para editar este usuario',
      );
    }

    // Si está actualizando username, validar unicidad dentro de la empresa
    if (dto.username && dto.username !== user.username) {
      const existingByUsername = await this.userModel.findOne({
        companyId: user.companyId,
        username: dto.username,
        _id: { $ne: userId }, // Excluir el mismo usuario
      });

      if (existingByUsername) {
        throw new ConflictException(
          `El username "${dto.username}" ya está en uso en esta empresa`,
        );
      }
    }

    // Si está actualizando DNI, validar unicidad dentro de la empresa
    if (dto.dni && dto.dni !== user.dni) {
      const existingByDni = await this.userModel.findOne({
        companyId: user.companyId,
        dni: dto.dni,
        _id: { $ne: userId }, // Excluir el mismo usuario
      });

      if (existingByDni) {
        throw new ConflictException(
          `El DNI "${dto.dni}" ya está registrado en esta empresa`,
        );
      }
    }

    // Construir objeto de actualización con tipos explícitos
    const updateData: Partial<User> = {};

    if (dto.username) updateData.username = dto.username;
    if (dto.name) updateData.name = dto.name;
    if (dto.dni) updateData.dni = dto.dni;
    if (dto.role) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Si se proporciona password, hashearlo
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    // Validar que hay algo para actualizar
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }

    // Actualizar usuario
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado`);
    }

    return updatedUser;
  }

  /**
   * Listar usuarios con filtros y paginación
   */
  async findAll(queryDto: QueryUsersDto) {
    const { companyId, username, role, page = 1, limit = 20 } = queryDto;

    const filter: any = {};

    if (companyId) {
      // MongoDB can match ObjectId with string, so let's just use the string directly
      filter.companyId = companyId;
    }

    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }

    if (role) {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('companyId', 'companyCode businessName')
        .select('-password') // No devolver passwords
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    // Mapear companyId a company para mejor legibilidad
    const mappedData = data.map((user) => {
      const userObj = user.toObject();
      return {
        ...userObj,
        company: userObj.companyId,
        companyId: userObj.companyId?._id || null,
      };
    });

    return {
      data: mappedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
