import {
  IsOptional,
  IsString,
  IsMongoId,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../schemas/user.schema';

export class QueryUsersDto {
  @IsMongoId()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
