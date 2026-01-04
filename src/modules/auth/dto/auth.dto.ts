import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'DNI del usuario (admin o cajero)',
    example: '12345678',
  })
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @IsString()
  dni: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'admin123',
  })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT para autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    example: {
      id: '507f1f77bcf86cd799439011',
      dni: '12345678',
      name: 'Admin User',
      role: 'admin',
    },
  })
  user: {
    id: string;
    dni: string;
    name: string;
    role: string;
  };
}
