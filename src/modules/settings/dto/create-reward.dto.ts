import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

/**
 * DTO para crear un premio en el catálogo
 */
export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Ej: "Café Gratis", "Taza Personalizada"

  @IsString()
  @IsOptional()
  description?: string; // Descripción del premio

  @IsNumber()
  @Min(1)
  pointsCost: number; // Ej: 50 puntos

  @IsNumber()
  @IsOptional()
  stock?: number | null; // null = infinito, 0 = agotado, N = disponibles

  @IsString()
  @IsOptional()
  imageUrl?: string; // URL de imagen del premio
}
