import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
