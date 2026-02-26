import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';

import {
  ClientCompany,
  ClientCompanyDocument,
} from '../../schemas/client-company.schema';

type TotalPointsResult = {
  _id: null;
  total: number;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(ClientCompany.name)
    private clientCompanyModel: Model<ClientCompanyDocument>,
  ) {}
  async getStats(companyId: Types.ObjectId) {
    const companyIdStr = companyId.toString();
    // Total de clientes de esta empresa (desde ClientCompany)
    const totalClients = await this.clientCompanyModel.countDocuments({
      companyId,
    });

    // Total de transacciones de esta empresa
    const totalTransactions = await this.transactionModel.countDocuments({
      companyId: companyIdStr,
    });

    // Total de puntos emitidos (desde ClientCompany)
    const totalPointsResult =
      await this.clientCompanyModel.aggregate<TotalPointsResult>([
        {
          $match: {
            companyId,
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
