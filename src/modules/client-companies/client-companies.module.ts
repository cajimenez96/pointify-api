import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientCompaniesService } from './client-companies.service';
import { ClientCompaniesController } from './client-companies.controller';
import {
  ClientCompany,
  ClientCompanySchema,
} from '../../schemas/client-company.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientCompany.name, schema: ClientCompanySchema },
      { name: Company.name, schema: CompanySchema }, // Para el guard
    ]),
  ],
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
  exports: [ClientCompaniesService], // Para usar en otros módulos
})
export class ClientCompaniesModule {}
