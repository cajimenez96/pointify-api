import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { CreateClientDto } from './dto/client.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async findByDni(dni: string) {
    return this.clientModel.findOne({ dni, isActive: true });
  }

  /**
   * Crea un cliente nuevo usando companyCode (endpoint público)
   */
  async createClient(dto: CreateClientDto) {
    // 1. Buscar empresa por código
    const company = await this.companyModel.findOne({
      companyCode: dto.companyCode,
    });
    if (!company) {
      throw new NotFoundException(
        `Empresa con código "${dto.companyCode}" no encontrada`,
      );
    }

    // 2. Validar que la empresa esté activa
    if (!company.isActive) {
      throw new ForbiddenException('La empresa no está activa');
    }

    // 3. Validar límite de clientes
    if (company.maxClients > 0) {
      const currentClientCount = await this.clientModel.countDocuments({
        companyId: company._id,
      });

      if (currentClientCount >= company.maxClients) {
        throw new ForbiddenException(
          `La empresa "${company.businessName}" ha alcanzado el límite máximo de ${company.maxClients} clientes.`,
        );
      }
    }

    // 4. Verificar que el DNI no exista en esta empresa
    const existingClient = await this.clientModel.findOne({
      companyId: company._id,
      dni: dto.dni,
    });
    if (existingClient) {
      throw new ForbiddenException(
        `Ya existe un cliente con DNI "${dto.dni}" en esta empresa`,
      );
    }

    // 5. Crear cliente
    const client = new this.clientModel({
      companyId: company._id,
      dni: dto.dni,
      name: dto.name,
      phone: dto.phone || '',
      email: dto.email || '',
      status: 'ACTIVE',
      currentPoints: 0,
      totalAccumulated: 0,
    });

    return client.save();
  }

  /**
   * Crea un cliente interno (usado por transacciones - Shadow User)
   */
  async createClientInternal(companyId: Types.ObjectId, data: Partial<Client>) {
    const company = await this.companyModel.findById(companyId);
    if (company && company.maxClients > 0) {
      const currentClientCount = await this.clientModel.countDocuments({
        companyId,
      });

      if (currentClientCount >= company.maxClients) {
        throw new ForbiddenException(
          `La empresa ha alcanzado el límite máximo de ${company.maxClients} clientes.`,
        );
      }
    }

    const client = new this.clientModel({ companyId, ...data });
    return client.save();
  }

  async findAll(companyId?: string) {
    const filter: any = { isActive: true };
    if (companyId) {
      filter.companyId = companyId;
    }
    return this.clientModel.find(filter).sort({ createdAt: -1 });
  }

  async incrementPoints(dni: string, points: number) {
    return this.clientModel.findOneAndUpdate(
      { dni },
      {
        $inc: {
          currentPoints: points,
          totalAccumulated: points,
        },
      },
      { new: true },
    );
  }

  async redeemReward(dni: string) {
    // Resetea los puntos actuales a 0 cuando se canjea el premio
    return this.clientModel.findOneAndUpdate(
      { dni },
      { $set: { currentPoints: 0 } },
      { new: true },
    );
  }

  async updateProfile(
    dni: string,
    data: { name: string; email: string; phone: string },
  ) {
    // Completa el perfil de un Shadow User (PENDING -> ACTIVE)
    return this.clientModel.findOneAndUpdate(
      { dni, status: 'PENDING' },
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: 'ACTIVE',
      },
      { new: true },
    );
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

    // 2. Buscar cliente por DNI y filtrar manualmente (Robustez ante índices corruptos)
    const clients = await this.clientModel.find({ dni: dto.dni });
    const client = clients.find(
      (c) =>
        c.companyId.toString() === company._id.toString() &&
        c.status === 'PENDING',
    );
    if (!client) {
      // Retorna null para que el controlador lance 404
      return null;
    }

    client.name = dto.name;
    client.email = dto.email;
    client.phone = dto.phone || '';
    client.status = 'ACTIVE';

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

    // 2. Buscar cliente
    // 2. Buscar cliente por DNI y filtrar manualmente
    const clients = await this.clientModel.find({ dni });
    const client = clients.find(
      (c) => c.companyId.toString() === company._id.toString(),
    );

    // 3. Obtener premios activos de la empresa
    const settings = await this.settingsModel.findOne({
      $or: [{ companyId: company._id }, { companyId: company._id.toString() }],
      // TODO: eliminar el to string() ya que mas adelante se buscara por object id
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
            canAfford: client ? client.currentPoints >= r.pointsCost : false,
            pointsNeeded: client
              ? Math.max(0, r.pointsCost - client.currentPoints)
              : r.pointsCost,
          }))
      : [];

    // 4. Si cliente no existe, devolver estructura base
    if (!client) {
      return {
        exists: false,
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

    // 5. Cliente existe, devolver datos completos
    return {
      exists: true,
      dni: client.dni,
      name: client.name,
      email: client.email,
      phone: client.phone,
      currentPoints: client.currentPoints,
      totalAccumulated: client.totalAccumulated,
      status: client.status,
      company: {
        companyCode: company.companyCode,
        businessName: company.businessName,
      },
      rewards: activeRewards,
    };
  }
}
