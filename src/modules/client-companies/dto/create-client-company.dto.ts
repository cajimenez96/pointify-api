import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para crear una relación Cliente-Empresa
 */
export class CreateClientCompanyDto {
  @ApiProperty({
    description: 'ID del cliente (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439022',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  clientId: string;
}
