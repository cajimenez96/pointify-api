import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientCompaniesService } from './client-companies.service';
import { ClientCompaniesController } from './client-companies.controller';
import {
  ClientCompany,
  ClientCompanySchema,
} from '../../schemas/client-company.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { Client, ClientSchema } from '../../schemas/client.schema'; // 👈 AGREGAR

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientCompany.name, schema: ClientCompanySchema },
      { name: Company.name, schema: CompanySchema }, // Para el guard
      { name: Client.name, schema: ClientSchema },
    ]),
  ],
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
  exports: [ClientCompaniesService], // Para usar en otros módulos
})
export class ClientCompaniesModule {}
