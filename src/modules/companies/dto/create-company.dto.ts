import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsDate,
  IsNumber,
  ValidateNested,
  IsEmail,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContactInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  companyCode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, {
    message: 'cuitCuil debe tener exactamente 11 dígitos numéricos',
  })
  cuitCuil: string;

  @IsString()
  @IsOptional()
  address?: string;

  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsNotEmpty()
  contactInfo: ContactInfoDto;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  subscriptionEndDate?: Date | null;

  @IsNumber()
  @IsOptional()
  maxUsers?: number;

  @IsNumber()
  @IsOptional()
  maxClients?: number;
}
