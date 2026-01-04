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
}
