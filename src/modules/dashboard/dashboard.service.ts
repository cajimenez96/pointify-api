import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async getStats() {
    const totalClients = await this.clientModel.countDocuments({
      isActive: true,
    });
    const totalTransactions = await this.transactionModel.countDocuments();

    const totalPointsResult = await this.clientModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAccumulated' } } },
    ]);
    const totalPointsIssued = totalPointsResult[0]?.total || 0;

    const recentTransactions = await this.transactionModel
      .find()
      .populate('clientId', 'name dni')
      .populate('cashierId', 'name')
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
