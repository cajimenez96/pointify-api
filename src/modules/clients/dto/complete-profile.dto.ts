import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

/**
 * DTO para completar el perfil de un Shadow User (PENDING -> ACTIVE)
 * Endpoint público que requiere companyCode para identificar la empresa
 */
export class CompleteProfileDto {
  @ApiProperty({
    description: 'Código de la empresa donde está registrado el cliente',
    example: 'CAFE-2026',
  })
  @IsNotEmpty({ message: 'El código de empresa es obligatorio' })
  @IsString()
  companyCode: string;

  @ApiProperty({
    description: 'DNI del cliente a actualizar',
    example: '11223344',
  })
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @IsString()
  dni: string;

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez',
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'juan.perez@example.com',
  })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @ApiProperty({
    description: 'Número de teléfono del cliente',
    example: '555-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
