import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para actualizar una relación Cliente-Empresa
 */
export class UpdateClientCompanyDto {
  @ApiProperty({
    description: 'Si la relación está activa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
