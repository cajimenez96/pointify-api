import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';

/**
 * DTO para filtrar relaciones
 */
export class QueryClientCompanyDto {
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string; // Para buscar por cliente específico
}
