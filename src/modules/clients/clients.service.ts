import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';

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

  async createClient(data: any) {
    // Validar límite de clientes si el data incluye companyId
    if (data.companyId) {
      const company = await this.companyModel.findById(data.companyId);
      if (company && company.maxClients > 0) {
        const currentClientCount = await this.clientModel.countDocuments({
          companyId: data.companyId,
        });

        if (currentClientCount >= company.maxClients) {
          throw new ForbiddenException(
            `La empresa "${company.businessName}" ha alcanzado el límite máximo de ${company.maxClients} clientes. ` +
              `Actualmente tiene ${currentClientCount} clientes registrados.`,
          );
        }
      }
    }

    const client = new this.clientModel(data);
    return client.save();
  }

  async findAll() {
    return this.clientModel.find({ isActive: true }).sort({ createdAt: -1 });
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
   * Método público para QR codes - Obtener cliente con premios disponibles
   */
  async getClientWithRewards(dni: string, companyCode: string) {
    // 1. Buscar empresa por código
    const company = await this.companyModel.findOne({ companyCode });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // 2. Buscar cliente
    const client = await this.clientModel.findOne({
      companyId: company._id,
      dni,
    });

    // 3. Obtener premios activos de la empresa
    const settings = await this.settingsModel.findOne({
      companyId: company._id,
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
