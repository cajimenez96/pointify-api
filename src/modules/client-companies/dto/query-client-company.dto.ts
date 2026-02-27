import { IsOptional, IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para filtrar relaciones
 */
export class QueryClientCompanyDto {
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
