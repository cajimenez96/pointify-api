import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para filtrar relaciones
 */
export class QueryClientCompanyDto {
  @ApiProperty({
    description: 'Filtrar por estado',
    enum: ['PENDING', 'ACTIVE'],
    required: false,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE'])
  status?: string;

  @ApiProperty({
    description: 'Filtrar por relaciones activas/inactivas',
    type: Boolean,
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({
    description: 'Filtrar por ID de cliente específico',
    required: false,
    example: '507f1f77bcf86cd799439022',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  clientId?: string;
}
