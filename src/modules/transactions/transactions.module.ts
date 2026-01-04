import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../../schemas/transaction.schema';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import { ClientsModule } from '../clients/clients.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
    ClientsModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
