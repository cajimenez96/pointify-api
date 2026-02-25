import {
  Injectable,
  NotFoundException,
  // mejora post-mvp
  // UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// mejora post-mvp
// import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import {
  ClientCompany,
  ClientCompanyDocument,
} from '../../schemas/client-company.schema';
import { CompleteProfileDto } from './dto/complete-profile.dto';

import { ClientCompaniesService } from '../client-companies/client-companies.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    // @InjectModel(ClientCompany.name)// mejora post-mvp
    // private clientCompanyModel: Model<ClientCompanyDocument>,
    private readonly clientCompaniesService: ClientCompaniesService,
    // private jwtService: JwtService, // mejora post-mvp
  ) {}

  async findByDni(dni: string) {
    return this.clientModel.findOne({ dni, isActive: true });
  }

  /**
   * Completa el perfil de un Shadow User usando companyCode (endpoint público)
   */
  async completeProfileByCompanyCode(dto: CompleteProfileDto) {
    // 1. Buscar empresa por código
    const company = await this.companyModel.findOne({
      companyCode: dto.companyCode,
    });

    if (!company) {
      throw new NotFoundException(
        `Empresa con código "${dto.companyCode}" no encontrada`,
      );
    }

    // 2. Buscar cliente por DNI (ya no filtramos por companyId)
    const client = await this.clientModel.findOne({
      dni: dto.dni,
      status: 'PENDING',
    });

    if (!client) {
      return null; // Retorna null para que el controlador lance 404
    }
    // 3. Verificar que existe relación con la empresa
    const relation = await this.clientCompaniesService.findByClientDni(
      dto.dni,
      new Types.ObjectId(company._id),
    );
    if (!relation) {
      return null;
    }

    // 4. Actualizar perfil
    client.name = dto.name;
    client.email = dto.email;
    client.phone = dto.phone || '';
    client.status = 'ACTIVE';
    // mejora post-mvp
    // client.password = await bcrypt.hash(dto.password, 10);

    return client.save();
  }

  /**
   * Método público para QR codes - Obtener cliente con premios disponibles
   */
  async getClientWithRewards(dni: string, companyCode: string) {
    // 1. Buscar empresa por código
    const company = await this.companyModel.findOne({ companyCode });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const companyObjectId = new Types.ObjectId(company._id);

    // 2. Buscar cliente por DNI
    const client = await this.clientModel.findOne({ dni });

    // 3. Obtener relación cliente-empresa (puntos)
    let currentPoints = 0;
    let totalAccumulated = 0;
    let status = 'PENDING';
    let hasRelation = false;

    if (client) {
      try {
        const clientRelation =
          await this.clientCompaniesService.findByClientDni(
            dni,
            companyObjectId,
          );
        currentPoints = clientRelation.currentPoints;
        totalAccumulated = clientRelation.totalAccumulated;
        status = client.status;
        hasRelation = true;
      } catch {
        // Si no existe relación, usar valores por defecto
        currentPoints = 0;
        totalAccumulated = 0;
        hasRelation = false;
      }
    }

    // 4. Obtener premios activos de la empresa
    const settings = await this.settingsModel.findOne({
      $or: [
        { companyId: companyObjectId },
        { companyId: companyObjectId.toString() },
      ],
    });

    const activeRewards = settings
      ? settings.rewards
          .filter((r) => r.isActive && (r.stock === null || r.stock > 0))
          .map((r: any) => ({
            _id: r._id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            stock: r.stock,
            imageUrl: r.imageUrl,
            canAfford: currentPoints >= r.pointsCost,
            pointsNeeded: Math.max(0, r.pointsCost - currentPoints),
          }))
      : [];

    // 5. Si cliente no existe, devolver estructura base
    if (!client) {
      return {
        exists: false,
        hasRelation: false,
        dni,
        name: null,
        currentPoints: 0,
        totalAccumulated: 0,
        status: 'PENDING',
        company: {
          companyCode: company.companyCode,
          businessName: company.businessName,
        },
        rewards: activeRewards,
      };
    }

    // 6. Cliente existe, devolver datos completos
    return {
      exists: true,
      hasRelation,
      dni: client.dni,
      name: client.name,
      email: client.email,
      phone: client.phone,
      currentPoints,
      totalAccumulated,
      status,
      company: {
        companyCode: company.companyCode,
        businessName: company.businessName,
      },
      rewards: activeRewards,
    };
  }

  // mejora post-mvp
  // async loginClient(dni: string, password: string) {
  //   const client = await this.clientModel.findOne({ dni, isActive: true });

  //   if (!client) {
  //     throw new UnauthorizedException('DNI no encontrado');
  //   }
  //   if (client.status === 'PENDING') {
  //     throw new UnauthorizedException(
  //       'Cuenta pendiente. Completá tu perfil primero.',
  //     );
  //   }
  //   if (!client.password) {
  //     throw new UnauthorizedException(
  //       'Este cliente no tiene contraseña configurada',
  //     );
  //   }

  //   const isValid = await bcrypt.compare(password, client.password);
  //   if (!isValid) {
  //     throw new UnauthorizedException('Contraseña incorrecta');
  //   }

  //   const payload = { sub: client._id, dni: client.dni, role: 'client' };

  //   return {
  //     access_token: this.jwtService.sign(payload),
  //     client: {
  //       id: client._id,
  //       dni: client.dni,
  //       name: client.name,
  //       email: client.email,
  //       status: client.status,
  //     },
  //   };
  // }
  // mejora post-mvp
  // async getMyProfile(clientId: string) {
  //   console.log('estoy aqui');
  //   console.log(clientId);
  //   const client = await this.clientModel
  //     .findById(clientId)
  //     .select('-password');

  //   if (!client) {
  //     throw new NotFoundException('Cliente no encontrado');
  //   }

  //   const relations = await this.clientCompanyModel
  //     .find({ clientId: new Types.ObjectId(clientId) })
  //     .populate('companyId', 'businessName companyCode isActive')
  //     .exec();

  //   const companies = relations.map((r: any) => ({
  //     companyId: r.companyId._id,
  //     businessName: r.companyId.businessName,
  //     companyCode: r.companyId.companyCode,
  //     isActive: r.companyId.isActive,
  //     currentPoints: r.currentPoints,
  //     totalAccumulated: r.totalAccumulated,
  //     memberSince: r.createdAt,
  //   }));

  //   return {
  //     id: client._id,
  //     dni: client.dni,
  //     name: client.name,
  //     email: client.email,
  //     phone: client.phone,
  //     status: client.status,
  //     companies,
  //   };
  // }

  /** Listar todos los clientes de una empresa */
  async listClientsByCompany(
    companyId: Types.ObjectId,
    query: any,
  ): Promise<any[]> {
    const queryDto: any = {};
    console.log('estoy aqui');
    if (query.clientId) {
      queryDto.clientId = query.clientId;
    }

    const relations = await this.clientCompaniesService.findAll(
      companyId,
      queryDto,
    );

    // Transformar la respuesta para que sea más legible
    return relations.map((relation: any) => ({
      relationId: relation._id,
      client: {
        id: relation.clientId._id,
        dni: relation.clientId.dni,
        name: relation.clientId.name,
        email: relation.clientId.email,
        phone: relation.clientId.phone,
        status: relation.clientId.status,
      },
      currentPoints: relation.currentPoints,
      totalAccumulated: relation.totalAccumulated,
      isActive: relation.isActive,
      memberSince: relation.createdAt,
      lastUpdate: relation.updatedAt,
    }));
  }
}
