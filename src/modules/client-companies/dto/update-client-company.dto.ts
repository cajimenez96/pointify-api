import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO para actualizar una relación Cliente-Empresa
 */
export class UpdateClientCompanyDto {
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
