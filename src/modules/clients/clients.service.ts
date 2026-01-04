import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  async findByDni(dni: string) {
    return this.clientModel.findOne({ dni, isActive: true });
  }

  async createClient(data: any) {
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
}
