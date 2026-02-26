import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from '../../schemas/transaction.schema';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

import { ClientCompaniesModule } from '../client-companies/client-companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    ClientCompaniesModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
