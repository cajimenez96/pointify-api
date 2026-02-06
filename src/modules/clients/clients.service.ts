import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
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
}
