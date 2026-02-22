import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para filtrar relaciones
 */
export class QueryClientCompanyDto {
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsMongoId()
  clientId?: string; // Para buscar por cliente específico
}
