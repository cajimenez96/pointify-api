import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';

/**
 * Servicio de Autenticación Multi-Tenant
 * Soporta dos flujos de login:
 * 1. SuperAdmin Login (username + password)
 * 2. Tenant Login (companyCode + username + password)
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Login de SuperAdmin
   * SuperAdmins NO pertenecen a ninguna empresa (companyId = null)
   */
  async superAdminLogin(username: string, password: string) {
    // Buscar SuperAdmin con companyId null
    const user = await this.userModel.findOne({
      username,
      role: UserRole.SUPER_ADMIN,
      companyId: null,
      isActive: true,
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales de SuperAdmin inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales de SuperAdmin inválidas');
    }

    // Payload JWT para SuperAdmin (sin companyId)
    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      companyId: null,
      companyCode: null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        isSuperAdmin: true,
      },
    };
  }

  /**
   * Login de Usuario de Empresa (Tenant)
   * Usuarios pertenecen a una empresa específica
   */
  async tenantLogin(companyCode: string, username: string, password: string) {
    // 1. Buscar la empresa por código
    const company = await this.companyModel.findOne({
      companyCode,
    });

    if (!company) {
      throw new UnauthorizedException('Código de empresa inválido');
    }

    // 2. Validar que la empresa esté activa
    if (!company.isActive) {
      throw new UnauthorizedException(
        'Esta empresa está desactivada. Contacte al administrador.',
      );
    }

    // 3. Buscar usuario dentro de esa empresa
    const query = {
      companyId: company._id,
      username,
      isActive: true,
    };

    const user = await this.userModel.findOne(query);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 4. Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 5. Payload JWT para Tenant User (con companyId y companyCode)
    const payload = {
      sub: user._id,
      username: user.username,
      role: user.role,
      companyId: company._id.toString(),
      companyCode: company.companyCode,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyCode: company.companyCode,
        companyName: company.businessName,
      },
    };
  }

  /**
   * Crear usuario (usado por seed y por UsersModule)
   * @param companyId - null para SuperAdmin, ObjectId para tenant users
   */
  async createUser(
    username: string,
    password: string,
    name: string,
    dni: string,
    role: UserRole,
    companyId: string | null,
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      username,
      password: hashedPassword,
      name,
      dni,
      role,
      companyId: companyId ? new Types.ObjectId(companyId) : null,
    });
    const saved = await user.save();
    return saved;
  }
}
