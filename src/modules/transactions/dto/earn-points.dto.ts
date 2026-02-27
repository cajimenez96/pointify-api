import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para sumar puntos (EARN)
 */
export class EarnPointsDto {
  @IsString()
  @IsNotEmpty()
  dni: string; // DNI del cliente

  @IsString()
  @IsNotEmpty()
  saleCode: string; // Código único de venta

  @IsString()
  @IsNotEmpty()
  productName: string; // Nombre del producto comprado (debe existir en pointsConfig)
}
