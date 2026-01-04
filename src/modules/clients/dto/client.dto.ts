import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'DNI del cliente (documento de identidad)',
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
    description: 'Número de teléfono del cliente',
    example: '555-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'juan.perez@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;
}

export class ClientResponseDto {
  @ApiProperty({
    description: 'ID del cliente en la base de datos',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'DNI del cliente',
    example: '11223344',
  })
  dni: string;

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Teléfono del cliente',
    example: '555-1234',
  })
  phone: string;

  @ApiProperty({
    description: 'Email del cliente',
    example: 'juan.perez@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Puntos actuales disponibles para canjear',
    example: 8,
  })
  currentPoints: number;

  @ApiProperty({
    description: 'Total de puntos acumulados históricamente',
    example: 25,
  })
  totalAccumulated: number;

  @ApiProperty({
    description: 'Estado del cliente (activo/inactivo)',
    example: true,
  })
  isActive: boolean;
}
