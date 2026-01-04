import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddPointsDto {
  @ApiProperty({
    description: 'DNI del cliente al que se le agregarán puntos',
    example: '11223344',
  })
  @IsNotEmpty({ message: 'El DNI del cliente es obligatorio' })
  @IsString()
  dni: string;

  @ApiProperty({
    description: 'Código único de la venta (para evitar duplicados)',
    example: 'SALE001',
  })
  @IsNotEmpty({ message: 'El código de venta es obligatorio' })
  @IsString()
  saleCode: string;
}

export class AddPointsResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Información del cliente actualizada',
    example: {
      name: 'Juan Pérez',
      currentPoints: 9,
      totalAccumulated: 15,
    },
  })
  client: {
    name: string;
    currentPoints: number;
    totalAccumulated: number;
  };

  @ApiProperty({
    description: 'Indica si el cliente alcanzó la meta de puntos para canjear',
    example: false,
  })
  rewardReached: boolean;

  @ApiProperty({
    description: 'Nombre del premio configurado',
    example: 'Café Gratis',
  })
  rewardName: string;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Puntos agregados exitosamente',
  })
  message: string;
}
