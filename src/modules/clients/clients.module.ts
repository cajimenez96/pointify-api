import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// // mejora post-mvp
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import {
  ClientCompany,
  ClientCompanySchema,
} from '../../schemas/client-company.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

import { ClientCompaniesModule } from '../client-companies/client-companies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: ClientCompany.name, schema: ClientCompanySchema },
    ]),
    //// mejora post-mvp
    // JwtModule.registerAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     secret: config.get('JWT_SECRET') || 'your-secret-key',
    //     signOptions: { expiresIn: '30d' },
    //   }),
    // }),
    ClientCompaniesModule,
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
