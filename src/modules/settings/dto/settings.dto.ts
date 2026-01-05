import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Cantidad de puntos necesarios para obtener el premio',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La meta de puntos debe ser un número' })
  @Min(1, { message: 'La meta de puntos debe ser al menos 1' })
  pointsTarget?: number;

  @ApiProperty({
    description: 'Nombre del premio que se otorga',
    example: 'Café Gratis',
    required: false,
  })
  @IsOptional()
  @IsString()
  rewardName?: string;

  @ApiProperty({
    description: 'Monto mínimo de compra para otorgar puntos (uso futuro)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El monto mínimo debe ser un número' })
  @Min(0, { message: 'El monto mínimo no puede ser negativo' })
  minPurchaseAmount?: number;

  @ApiProperty({
    description: 'Cantidad máxima de ganadores permitidos (0 = ilimitado)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El máximo de ganadores debe ser un número' })
  @Min(0, { message: 'El máximo de ganadores no puede ser negativo' })
  maxWinners?: number;
}

export class SettingsResponseDto {
  @ApiProperty({
    description: 'ID del documento de configuración',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Clave única de la configuración (siempre "default")',
    example: 'default',
  })
  key: string;

  @ApiProperty({
    description: 'Meta de puntos para canjear premio',
    example: 10,
  })
  pointsTarget: number;

  @ApiProperty({
    description: 'Nombre del premio',
    example: 'Café Gratis',
  })
  rewardName: string;

  @ApiProperty({
    description: 'Monto mínimo de compra',
    example: 0,
  })
  minPurchaseAmount: number;

  @ApiProperty({
    description: 'Fecha de inicio de la campaña (null = sin límite)',
    example: '2026-01-01T00:00:00.000Z',
    required: false,
  })
  campaignStartDate: Date;

  @ApiProperty({
    description: 'Fecha de fin de la campaña (null = sin límite)',
    example: '2026-12-31T23:59:59.000Z',
    required: false,
  })
  campaignEndDate: Date;

  @ApiProperty({
    description: 'Estado activo de la campaña (toggle manual)',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Cantidad máxima de ganadores permitidos (0 = ilimitado)',
    example: 10,
  })
  maxWinners: number;

  @ApiProperty({
    description: 'Cantidad actual de premios otorgados',
    example: 3,
  })
  currentWinners: number;
}
