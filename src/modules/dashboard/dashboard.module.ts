import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from '../../schemas/transaction.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SuperAdminDashboardService } from './superadmin-dashboard.service';
import { SuperAdminDashboardController } from './superadmin-dashboard.controller';
import {
  ClientCompany,
  ClientCompanySchema,
} from '../../schemas/client-company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Client.name, schema: ClientSchema },
      { name: ClientCompany.name, schema: ClientCompanySchema },
    ]),
  ],
  providers: [DashboardService, SuperAdminDashboardService],
  controllers: [DashboardController, SuperAdminDashboardController],
})
export class DashboardModule {}
