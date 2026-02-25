import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import {
  ClientCompany,
  ClientCompanyDocument,
} from '../../schemas/client-company.schema';

@Injectable()
export class SuperAdminDashboardService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(ClientCompany.name)
    private clientCompanyModel: Model<ClientCompanyDocument>,
  ) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      activeCompanies,
      newCompaniesThisMonth,
      usersByRoleResult,
      totalClients,
      newClientsThisMonth,
      totalTransactions,
      transactionsByTypeResult,
      pointsResult,
      topByClients,
      topByTransactions,
      expiringSubscriptions,
    ] = await Promise.all([
      // Companies
      this.companyModel.countDocuments(),
      this.companyModel.countDocuments({ isActive: true }),
      this.companyModel.countDocuments({ createdAt: { $gte: startOfMonth } }),

      // Users by role
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      // Clients
      this.clientModel.countDocuments({ isActive: true }),
      this.clientModel.countDocuments({ createdAt: { $gte: startOfMonth } }),

      // Transactions
      this.transactionModel.countDocuments(),
      this.transactionModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),

      // Points economy
      this.transactionModel.aggregate([
        { $group: { _id: '$type', totalPoints: { $sum: '$points' } } },
      ]),

      // Top 5 companies by client count
      this.clientCompanyModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$companyId', clientCount: { $sum: 1 } } },
        { $sort: { clientCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        {
          $project: {
            _id: '$company._id',
            companyCode: '$company.companyCode',
            businessName: '$company.businessName',
            isActive: '$company.isActive',
            clientCount: 1,
          },
        },
      ]),

      // Top 5 companies by transaction count
      this.transactionModel.aggregate([
        { $group: { _id: '$companyId', transactionCount: { $sum: 1 } } },
        { $sort: { transactionCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        {
          $project: {
            _id: '$company._id',
            companyCode: '$company.companyCode',
            businessName: '$company.businessName',
            isActive: '$company.isActive',
            transactionCount: 1,
          },
        },
      ]),

      // Expiring subscriptions (next 30 days)
      this.companyModel
        .find({
          isActive: true,
          subscriptionEndDate: { $ne: null, $lte: in30Days, $gte: now },
        })
        .select('companyCode businessName subscriptionEndDate')
        .lean(),
    ]);

    // Transform aggregation results
    const usersByRole = { superadmin: 0, admin: 0, cashier: 0 };
    usersByRoleResult.forEach((r: { _id: string; count: number }) => {
      if (r._id in usersByRole)
        usersByRole[r._id as keyof typeof usersByRole] = r.count;
    });

    const transactionsByType = { earn: 0, redeem: 0 };
    transactionsByTypeResult.forEach((r: { _id: string; count: number }) => {
      if (r._id === 'EARN') transactionsByType.earn = r.count;
      if (r._id === 'REDEEM') transactionsByType.redeem = r.count;
    });

    let totalPointsIssued = 0;
    let totalPointsRedeemed = 0;
    pointsResult.forEach((r: { _id: string; totalPoints: number }) => {
      if (r._id === 'EARN') totalPointsIssued = r.totalPoints;
      if (r._id === 'REDEEM') totalPointsRedeemed = r.totalPoints;
    });

    const expiringMapped = expiringSubscriptions.map((c: any) => ({
      _id: c._id,
      companyCode: c.companyCode,
      businessName: c.businessName,
      subscriptionEndDate: c.subscriptionEndDate,
      daysRemaining: Math.ceil(
        (new Date(c.subscriptionEndDate).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
      ),
    }));

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      newCompaniesThisMonth,
      totalUsers:
        usersByRole.superadmin + usersByRole.admin + usersByRole.cashier,
      usersByRole,
      totalClients,
      newClientsThisMonth,
      totalTransactions,
      transactionsByType,
      totalPointsIssued,
      totalPointsRedeemed,
      topCompaniesByClients: topByClients,
      topCompaniesByTransactions: topByTransactions,
      expiringSubscriptions: expiringMapped,
    };
  }
}
