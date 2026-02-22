import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para actualizar una relación Cliente-Empresa
 */
export class UpdateClientCompanyDto {
  @ApiProperty({
    description: 'Estado de la relación',
    enum: ['PENDING', 'ACTIVE'],
    example: 'ACTIVE',
    required: false,
  })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE'])
  status?: string;

  @ApiProperty({
    description: 'Si la relación está activa',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
