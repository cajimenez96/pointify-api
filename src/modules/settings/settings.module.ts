import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Settings, SettingsSchema } from '../../schemas/settings.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
