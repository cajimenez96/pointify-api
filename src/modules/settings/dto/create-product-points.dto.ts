import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

/**
 * DTO para agregar configuración de puntos por producto
 */
export class CreateProductPointsDto {
  @IsString()
  @IsNotEmpty()
  productName: string; // Ej: "Café Espresso", "Hamburguesa Classic"

  @IsNumber()
  @Min(1)
  pointsValue: number; // Ej: 10 puntos
}
