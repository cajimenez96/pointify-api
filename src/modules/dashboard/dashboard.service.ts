import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';

type TotalPointsResult = {
  _id: null;
  total: number;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}
  async getStats(companyId: string) {
    const companyIdStr = companyId.toString();
    // Total de clientes de esta empresa
    const totalClients = await this.clientModel.countDocuments({
      companyId: companyIdStr,
      isActive: true,
    });

    // Total de transacciones de esta empresa
    const totalTransactions = await this.transactionModel.countDocuments({
      companyId: companyIdStr,
    });

    // Total de puntos emitidos (suma de totalAccumulated de todos los clientes)
    const totalPointsResult =
      await this.clientModel.aggregate<TotalPointsResult>([
        {
          $match: {
            companyId: companyIdStr,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAccumulated' },
          },
        },
      ]);
    const totalPointsIssued = totalPointsResult[0]?.total || 0;

    // Transacciones recientes de esta empresa
    const recentTransactions = await this.transactionModel
      .find({ companyId })
      .populate('clientId', 'name dni')
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      totalClients,
      totalTransactions,
      totalPointsIssued,
      recentTransactions,
    };
  }
}
