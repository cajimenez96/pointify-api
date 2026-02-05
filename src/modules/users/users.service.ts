import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuthService } from '../auth/auth.service';

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
   * Listar usuarios con filtros y paginación
   */
  async findAll(queryDto: QueryUsersDto) {
    const { companyId, username, role, page = 1, limit = 20 } = queryDto;

    const filter: any = {};

    if (companyId) {
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
