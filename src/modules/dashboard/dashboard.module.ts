import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../../schemas/client.schema';
import {
  Transaction,
  TransactionSchema,
} from '../../schemas/transaction.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SuperAdminDashboardService } from './superadmin-dashboard.service';
import { SuperAdminDashboardController } from './superadmin-dashboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [DashboardService, SuperAdminDashboardService],
  controllers: [DashboardController, SuperAdminDashboardController],
})
export class DashboardModule {}
